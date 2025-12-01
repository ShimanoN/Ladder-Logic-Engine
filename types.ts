
export type InstructionType = 
  | 'LD' | 'LDI' | 'AND' | 'ANI' | 'OR' | 'ORI' | 'OUT' | 'ORB' | 'ANB' 
  | 'MOV' | 'RST' 
  | 'LD_EQ' | 'AND_EQ' | 'OR_EQ' 
  | 'MPS' | 'MRD' | 'MPP' 
  | 'MOVP' 
  | 'SET';

export interface Instruction {
  id: number;
  type: InstructionType;
  value: string; // Primary operand (e.g., "X0", "K10", "iStep").
  args?: string[]; // All operands
}

export interface GridConnections {
  up: boolean;    
  down: boolean;  
  left: boolean;  
  right: boolean; 
}

export interface GridCell {
  x: number;
  y: number;
  instruction: Instruction | null;
  connections: GridConnections;
  isPowerRail?: boolean; 
  sourceIndex: number | null; 
}

export interface LadderData {
  instructions: Instruction[];
  meta: {
    version: string;
    date: string;
  }
}

export interface SimulationState {
  io: Record<string, boolean>;
  data: Record<string, number>;
  timers: Record<string, number>;    
  counters: Record<string, number>;  
  edgeMemory: Record<string, boolean>; 
  mpsStack: boolean[]; // For MPS/MRD/MPP branching logic
}
