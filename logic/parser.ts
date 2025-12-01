import { Instruction, GridCell } from '../types';

interface BlockContext {
  startX: number;
  endX: number; // The current right-most X of the block
  activeRows: Set<number>; // The rows that are currently "open" at the end of the block
  minY: number; // Top row of this block
}

/**
 * Transforms a linear list of PLC instructions into a 2D sparse grid.
 * Uses a Recursive Stack approach to handle nested logic (ORB/ANB).
 */
export const parseLadderLogic = (instructions: Instruction[]): GridCell[][] => {
  let cells: GridCell[] = [];
  
  // Global Grid State
  let maxYUsed = 0;
  
  // Stack for Nested Blocks
  const blockStack: BlockContext[] = [];
  
  // Current Active Block
  let currentBlock: BlockContext = {
    startX: 0,
    endX: 0,
    activeRows: new Set<number>([0]),
    minY: 0
  };

  instructions.forEach((inst, index) => {
    const isStart = inst.type === 'LD' || inst.type === 'LDI';
    const isParallel = inst.type === 'OR' || inst.type === 'ORI';
    const isSeries = inst.type === 'AND' || inst.type === 'ANI' || inst.type === 'OUT';
    const isBlockLogic = inst.type === 'ORB' || inst.type === 'ANB';

    // 1. Handle New Blocks (LD)
    if (isStart) {
      if (index === 0) {
        // Init Global State
        maxYUsed = 0;
        currentBlock = { startX: 0, endX: 0, activeRows: new Set([0]), minY: 0 };
        blockStack.length = 0;
      } else {
        // Nested Logic: New LD implies start of a secondary block
        // Push current block to stack
        blockStack.push({ ...currentBlock, activeRows: new Set(currentBlock.activeRows) });
        
        // Start new block below everything existing
        const newY = maxYUsed + 1;
        maxYUsed = newY;
        
        currentBlock = {
          startX: 0, // Visual start at left rail (will be shifted if ANB)
          endX: 0,
          activeRows: new Set([newY]),
          minY: newY
        };
      }
    } 
    
    // 2. Handle Parallel Branches (OR) - "Local" Parallel
    else if (isParallel) {
        // Standard OR: Branches off the *start* of the current block
        // and merges into the current stream.
        
        const branchSourceRow = currentBlock.minY; // Simplified: branches from top of current block
        // Note: Real parsers might track "split points". Here we assume block start.
        
        const newY = maxYUsed + 1;
        maxYUsed = newY;
        
        // Visual Wiring: Draw vertical line drop from branch source
        if (currentBlock.startX > 0) {
           const prevX = currentBlock.startX - 1;
           // Connect down from source
           const sourceCell = cells.find(c => c.x === prevX && c.y === branchSourceRow);
           if (sourceCell) sourceCell.connections.down = true;

           // Create wire corner at new row
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
        
        // Update Block State
        // The instruction is placed at startX of block (or aligned)
        // We just add this new row to the active set
        currentBlock.activeRows.add(newY);
    }
    
    // 3. Handle Block Merges (ORB / ANB)
    else if (isBlockLogic) {
        if (blockStack.length === 0) return; // Error safety

        const prevBlock = blockStack.pop()!;
        
        if (inst.type === 'ORB') {
            // Parallel Merge of PrevBlock (Top) and CurrentBlock (Bottom)
            // 1. Align EndX: Both blocks must end at the same column to merge visually
            const commonEndX = Math.max(prevBlock.endX, currentBlock.endX);
            
            // Extend PrevBlock with wires if needed
            fillHorizontalWires(cells, prevBlock, commonEndX);
            // Extend CurrentBlock with wires if needed
            fillHorizontalWires(cells, currentBlock, commonEndX);
            
            // 2. Merge Contexts
            // The new block spans from minY of Prev to maxY of Current (conceptually)
            // Active rows are the union of both
            const combinedActive = new Set([...prevBlock.activeRows, ...currentBlock.activeRows]);
            
            currentBlock = {
                startX: prevBlock.startX, // They started at same place (usually 0)
                endX: commonEndX,
                activeRows: combinedActive,
                minY: Math.min(prevBlock.minY, currentBlock.minY)
            };
            
        } else if (inst.type === 'ANB') {
            // Series Merge: PrevBlock -> CurrentBlock
            // CurrentBlock needs to be shifted to start where PrevBlock ended.
            
            const offset = prevBlock.endX;
            
            // Shift all cells belonging to CurrentBlock
            const blockRows = getAllRowsInBlock(currentBlock, cells); 
            
            cells.forEach(cell => {
                if (blockRows.has(cell.y)) {
                    // Only shift cells that were part of this new block segment
                    if (cell.y >= currentBlock.minY) {
                         cell.x += offset;
                    }
                }
            });
            
            currentBlock = {
                startX: prevBlock.startX, // The chain starts at start of A
                endX: prevBlock.endX + currentBlock.endX,
                activeRows: currentBlock.activeRows, // The output is the output of B
                minY: prevBlock.minY
            };
        }
        
        // No cell generated for Logic Ops
        return; 
    }

    // 4. Handle Series / Convergence (AND / OUT)
    else if (isSeries) {
        // Series logic applies to the *current active block*
        
        // Check for Parallel Convergence (Closing a block)
        if (currentBlock.activeRows.size > 1) {
             const rows = Array.from(currentBlock.activeRows).sort((a,b) => a-b);
             const minRow = rows[0];
             const maxRow = rows[rows.length - 1];

             // We want to add Right+Vert connections to the right-most cells of active rows.
             const rightMostX = currentBlock.endX - 1; // Last filled column
             
             cells.forEach(cell => {
                 if (cell.x === rightMostX && currentBlock.activeRows.has(cell.y)) {
                     cell.connections.right = true;
                     if (cell.y < maxRow) cell.connections.down = true;
                     if (cell.y > minRow) cell.connections.up = true;
                 }
             });
             
             // 2. Reset Y to top of block
             // 3. Reset ActiveRows to single row
             currentBlock.activeRows = new Set([currentBlock.minY]);
        }
    }

    // --- PLACEMENT LOGIC ---
    
    // Determine Placement (X, Y)
    let placeX = currentBlock.endX;
    let placeY = currentBlock.minY; // Default to top line of block

    if (isParallel) {
        // Parallel puts instruction on a new row, but at startX of block
        const rows = Array.from(currentBlock.activeRows).sort((a,b)=>a-b);
        placeY = rows[rows.length-1]; // The last added row (highest Y)
        placeX = currentBlock.startX; // Reset to start of block
    } 
    else if (isSeries) {
        // Series adds to end
        placeX = currentBlock.endX;
        placeY = currentBlock.minY; // Always merges to top
    }
    
    // Create Cell
    const newCell: GridCell = {
      x: placeX,
      y: placeY,
      instruction: inst,
      connections: {
        left: placeX > 0,
        right: inst.type !== 'OUT', 
        up: false,
        down: false,
      },
      sourceIndex: index
    };
    cells.push(newCell);

    // Update Block Cursor
    if (isParallel) {
        currentBlock.endX = Math.max(currentBlock.endX, placeX + 1);
    } else {
        // Series advances X
        currentBlock.endX = placeX + 1;
    }
  });

  // 5. Grid Generation
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
    // For every active row in the block, ensure there is continuity up to targetX
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
        
        // Ensure the last cell connects right (to the merge point)
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