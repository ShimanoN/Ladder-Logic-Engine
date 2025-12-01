
import { GridCell } from '../types';

type PathKey = string; // Format: "x,y,in" | "x,y,out"

interface QueueItem {
  x: number;
  y: number;
  type: 'in' | 'out';
}

/**
 * Calculates which parts of the grid are energized (Live Wires).
 * Uses a BFS traversal starting from the Left Power Rail.
 */
export const calculatePowerFlow = (
  grid: GridCell[][],
  ioState: Record<string, boolean>
): Set<PathKey> => {
  const energized = new Set<PathKey>();
  const queue: QueueItem[] = [];
  const visited = new Set<string>(); // To prevent infinite loops in cyclic graphs

  if (!grid || grid.length === 0) return energized;

  const rows = grid.length;
  const cols = grid[0].length;

  // 1. Initialize Source: Left Power Rail feeds into x=0
  for (let y = 0; y < rows; y++) {
    // If a cell exists at x=0, power enters its Input side
    if (grid[y][0]) {
      queue.push({ x: 0, y, type: 'in' });
    }
  }

  // 2. BFS Traversal
  while (queue.length > 0) {
    const { x, y, type } = queue.shift()!;
    const key = `${x},${y},${type}`;

    if (visited.has(key)) continue;
    visited.add(key);
    energized.add(key);

    const cell = grid[y][x];
    if (!cell) continue;

    if (type === 'in') {
      // --- LOGIC CONDUCTION CHECK ---
      // We are at the Input (Left) side. Can we pass to Output (Right)?
      let conducts = false;

      if (!cell.instruction) {
        // Wire / Virtual Cell: Always conducts
        conducts = true;
      } else {
        const val = cell.instruction.value;
        const logicState = !!ioState[val];
        
        switch (cell.instruction.type) {
          case 'LD': 
          case 'AND': 
          case 'OR':
            conducts = logicState === true;
            break;
          case 'LDI': 
          case 'ANI': 
          case 'ORI':
            conducts = logicState === false;
            break;
          case 'OUT':
            // Output coils typically pass power through to the rail (or next instruction)
            conducts = true; 
            break;
          default:
            conducts = true; // ORB/ANB etc
        }
      }

      if (conducts) {
        queue.push({ x, y, type: 'out' });
      }

    } else if (type === 'out') {
      // --- WIRE PROPAGATION ---
      // We are at the Output (Right) side / Vertical Rail.

      // 1. Propagate Right (Horizontal)
      if (cell.connections.right) {
        if (x + 1 < cols && grid[y][x+1]) {
          queue.push({ x: x + 1, y, type: 'in' });
        }
      }

      // 2. Propagate Down (Vertical on Right Edge)
      if (cell.connections.down) {
        if (y + 1 < rows && grid[y+1][x]) {
          queue.push({ x, y: y + 1, type: 'out' });
        }
      }

      // 3. Propagate Up (Vertical on Right Edge)
      if (cell.connections.up) {
        if (y - 1 >= 0 && grid[y-1][x]) {
          queue.push({ x, y: y - 1, type: 'out' });
        }
      }
    }
  }

  return energized;
};
