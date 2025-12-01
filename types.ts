export type InstructionType = 'LD' | 'LDI' | 'AND' | 'ANI' | 'OR' | 'ORI' | 'OUT' | 'ORB' | 'ANB';

export interface Instruction {
  id: number;
  type: InstructionType;
  value: string;
}

export interface GridConnections {
  up: boolean;    // Vertical line going up on the RIGHT edge
  down: boolean;  // Vertical line going down on the RIGHT edge
  left: boolean;  // Horizontal input
  right: boolean; // Horizontal output
}

export interface GridCell {
  x: number;
  y: number;
  instruction: Instruction | null;
  connections: GridConnections;
  isPowerRail?: boolean; // Special flag for the left-most cells
  sourceIndex: number | null; // The index in the Instruction[] array that generated this cell
}