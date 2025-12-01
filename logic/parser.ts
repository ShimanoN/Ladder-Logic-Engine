
import { Instruction, GridCell } from '../types';

interface BlockContext {
  startX: number;
  endX: number;
  activeRows: Set<number>;
  minY: number;
}

interface MpsContext {
  x: number;
  y: number; // The row where MPS occurred
}

/**
 * Transforms a linear list of PLC instructions into a 2D sparse grid.
 * Supports Nested Logic (ORB/ANB) and Vertical Bus (MPS/MRD/MPP).
 */
export const parseLadderLogic = (instructions: Instruction[]): GridCell[][] => {
  let cells: GridCell[] = [];
  
  // Global Grid State
  let maxYUsed = 0;
  
  // Stack for Nested Blocks (ORB/ANB)
  const blockStack: BlockContext[] = [];
  
  // Stack for MPS (Vertical Bus)
  const mpsStack: MpsContext[] = [];

  // Current Active Block
  let currentBlock: BlockContext = {
    startX: 0,
    endX: 0,
    activeRows: new Set<number>([0]),
    minY: 0
  };

  instructions.forEach((inst, index) => {
    // --- TYPE CATEGORIZATION ---
    const isComparator = inst.type === 'LD_EQ' || inst.type === 'AND_EQ' || inst.type === 'OR_EQ';
    const isStart = inst.type === 'LD' || inst.type === 'LDI' || inst.type === 'LD_EQ';
    const isParallel = inst.type === 'OR' || inst.type === 'ORI' || inst.type === 'OR_EQ';
    
    // Series: Standard + Comparators + Terminals
    const isSeries = 
      inst.type === 'AND' || inst.type === 'ANI' || inst.type === 'AND_EQ' || 
      inst.type === 'OUT' || inst.type === 'MOV' || inst.type === 'RST' || 
      inst.type === 'MOVP' || inst.type === 'SET';

    const isBlockLogic = inst.type === 'ORB' || inst.type === 'ANB';
    const isStackOp = inst.type === 'MPS' || inst.type === 'MRD' || inst.type === 'MPP';

    // 1. Handle New Blocks (LD)
    if (isStart) {
      if (index === 0) {
        maxYUsed = 0;
        currentBlock = { startX: 0, endX: 0, activeRows: new Set([0]), minY: 0 };
        blockStack.length = 0;
        mpsStack.length = 0;
      } else {
        blockStack.push({ ...currentBlock, activeRows: new Set(currentBlock.activeRows) });
        const newY = maxYUsed + 1;
        maxYUsed = newY;
        currentBlock = {
          startX: 0, 
          endX: 0,
          activeRows: new Set([newY]),
          minY: newY
        };
      }
    } 
    
    // 2. Handle Parallel Branches (OR)
    else if (isParallel) {
        const branchSourceRow = currentBlock.minY; 
        const newY = maxYUsed + 1;
        maxYUsed = newY;
        
        if (currentBlock.startX > 0) {
           const prevX = currentBlock.startX - 1;
           const sourceCell = cells.find(c => c.x === prevX && c.y === branchSourceRow);
           if (sourceCell) sourceCell.connections.down = true;

           let wireCell = cells.find(c => c.x === prevX && c.y === newY);
           if (!wireCell) {
             wireCell = {
               x: prevX, y: newY, instruction: null,
               connections: { up: true, right: true, left: false, down: false },
               sourceIndex: null
             };
             cells.push(wireCell);
           }
        }
        currentBlock.activeRows.add(newY);
    }
    
    // 3. Handle Block Merges (ORB / ANB)
    else if (isBlockLogic) {
        if (blockStack.length > 0) {
            const prevBlock = blockStack.pop()!;
            if (inst.type === 'ORB') {
                const commonEndX = Math.max(prevBlock.endX, currentBlock.endX);
                fillHorizontalWires(cells, prevBlock, commonEndX);
                fillHorizontalWires(cells, currentBlock, commonEndX);
                const combinedActive = new Set([...prevBlock.activeRows, ...currentBlock.activeRows]);
                currentBlock = {
                    startX: prevBlock.startX,
                    endX: commonEndX,
                    activeRows: combinedActive,
                    minY: Math.min(prevBlock.minY, currentBlock.minY)
                };
            } else if (inst.type === 'ANB') {
                const offset = prevBlock.endX;
                const blockRows = getAllRowsInBlock(currentBlock, cells); 
                cells.forEach(cell => {
                    if (blockRows.has(cell.y) && cell.y >= currentBlock.minY) {
                         cell.x += offset;
                    }
                });
                currentBlock = {
                    startX: prevBlock.startX,
                    endX: prevBlock.endX + currentBlock.endX,
                    activeRows: currentBlock.activeRows,
                    minY: prevBlock.minY
                };
            }
        }
        return; 
    }

    // 4. Handle Series Convergence
    else if (isSeries) {
        if (currentBlock.activeRows.size > 1) {
             const rows = Array.from(currentBlock.activeRows).sort((a,b) => a-b);
             const minRow = rows[0];
             const maxRow = rows[rows.length - 1];
             const rightMostX = currentBlock.endX - 1;
             
             cells.forEach(cell => {
                 if (cell.x === rightMostX && currentBlock.activeRows.has(cell.y)) {
                     cell.connections.right = true;
                     if (cell.y < maxRow) cell.connections.down = true;
                     if (cell.y > minRow) cell.connections.up = true;
                 }
             });
             currentBlock.activeRows = new Set([currentBlock.minY]);
        }
    }

    // --- PLACEMENT LOGIC ---
    let placeX = currentBlock.endX;
    let placeY = currentBlock.minY; 

    // Handle MPS/MRD/MPP (Vertical Bus)
    if (isStackOp) {
       if (inst.type === 'MPS') {
          // Push Branch Point
          placeX = currentBlock.endX; 
          placeY = currentBlock.minY;
          mpsStack.push({ x: placeX, y: placeY });
          
       } else if (inst.type === 'MRD') {
          // Peek Branch Point
          if (mpsStack.length > 0) {
             const point = mpsStack[mpsStack.length - 1];
             placeX = point.x; 
             const newY = maxYUsed + 1;
             maxYUsed = newY;
             placeY = newY;
             
             drawVerticalBus(cells, point.x, point.y, newY);
             
             currentBlock.activeRows.add(newY);
          }
       } else if (inst.type === 'MPP') {
          // Pop Branch Point
          if (mpsStack.length > 0) {
             const point = mpsStack.pop()!;
             placeX = point.x;
             const newY = maxYUsed + 1;
             maxYUsed = newY;
             placeY = newY;
             
             drawVerticalBus(cells, point.x, point.y, newY);
             currentBlock.activeRows.add(newY);
          }
       }
    }
    // Handle Standard Logic
    else if (isParallel) {
        const rows = Array.from(currentBlock.activeRows).sort((a,b)=>a-b);
        placeY = rows[rows.length-1]; 
        placeX = currentBlock.startX; 
    } 
    else if (isSeries) {
        placeX = currentBlock.endX;
        placeY = currentBlock.minY; 
    }
    
    // Create Cell
    // CRITICAL FIX: Explicitly disable 'left' connection for MRD/MPP
    // These instructions represent a vertical drop, so connecting left (horizontally)
    // creates a visual "short circuit" artifact.
    const isVerticalBranch = inst.type === 'MRD' || inst.type === 'MPP';

    const newCell: GridCell = {
      x: placeX,
      y: placeY,
      instruction: inst,
      connections: {
        left: isVerticalBranch ? false : placeX > 0,
        right: (inst.type !== 'OUT' && inst.type !== 'MOV' && inst.type !== 'RST' && inst.type !== 'SET' && inst.type !== 'MOVP'), 
        up: false,
        down: false,
      },
      sourceIndex: index
    };
    cells.push(newCell);

    // Update Block Cursor
    if (isParallel) {
        currentBlock.endX = Math.max(currentBlock.endX, placeX + 1);
    } else if (isStackOp) {
        if (inst.type === 'MRD' || inst.type === 'MPP') {
           currentBlock.endX = placeX + 1;
           currentBlock.minY = placeY;
        } else {
           currentBlock.endX = placeX + 1;
        }
    } else {
        currentBlock.endX = placeX + 1;
    }
  });

  // Final Grid Gen
  if (cells.length === 0) return [];
  const gridMaxX = Math.max(...cells.map(c => c.x));
  const gridMaxY = Math.max(maxYUsed, ...cells.map(c => c.y));

  const grid: GridCell[][] = [];
  for (let y = 0; y <= gridMaxY; y++) {
    const row: GridCell[] = [];
    for (let x = 0; x <= gridMaxX; x++) {
      const found = cells.find(c => c.x === x && c.y === y);
      if (found) row.push(found);
      else row.push({
        x, y, instruction: null,
        connections: { left: false, right: false, up: false, down: false },
        sourceIndex: null
      });
    }
    grid.push(row);
  }
  return grid;
};

// --- Helpers ---

function fillHorizontalWires(cells: GridCell[], block: BlockContext, targetX: number) {
    block.activeRows.forEach(rowY => {
        const rowCells = cells.filter(c => c.y === rowY);
        const maxX = rowCells.length > 0 ? Math.max(...rowCells.map(c => c.x)) : block.startX - 1;
        for (let x = maxX + 1; x < targetX; x++) {
            cells.push({
                x, y: rowY, instruction: null,
                connections: { left: true, right: true, up: false, down: false },
                sourceIndex: null
            });
        }
        const lastCell = cells.find(c => c.x === targetX - 1 && c.y === rowY);
        if (lastCell) lastCell.connections.right = true;
    });
}

function getAllRowsInBlock(block: BlockContext, cells: GridCell[]): Set<number> {
    const rows = new Set<number>();
    cells.forEach(c => {
        if (c.y >= block.minY) rows.add(c.y);
    });
    return rows;
}

function drawVerticalBus(cells: GridCell[], x: number, fromY: number, toY: number) {
   for (let y = fromY; y <= toY; y++) {
      let cell = cells.find(c => c.x === x && c.y === y);
      
      if (!cell) {
         cell = {
            x, y, instruction: null,
            connections: { left: false, right: false, up: false, down: false },
            sourceIndex: null
         };
         cells.push(cell);
      }
      
      if (y === fromY) {
         cell.connections.down = true;
      }
      else if (y === toY) {
         cell.connections.up = true;
         cell.connections.right = true; 
      }
      else {
         cell.connections.up = true;
         cell.connections.down = true;
      }
   }
}
