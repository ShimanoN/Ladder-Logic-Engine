
import { Instruction } from '../types';

/**
 * Executes a single scan cycle of the Ladder Logic program.
 * 
 * @param instructions The linear list of PLC instructions.
 * @param prevState The current state of all I/O variables (X0, Y0, M0, etc.).
 * @returns The new state of I/O variables after execution.
 */
export const runScanCycle = (
  instructions: Instruction[],
  prevState: Record<string, boolean>
): Record<string, boolean> => {
  // Create a copy of the state to modify during the scan (for immediate updates like in some PLCs)
  // or accumulation. Typically outputs update memory.
  const state = { ...prevState };
  
  // The logic execution stack (Accumulator Stack)
  const stack: boolean[] = [];

  const getValue = (key: string) => !!state[key];

  instructions.forEach(inst => {
    switch(inst.type) {
      case 'LD':
        stack.push(getValue(inst.value));
        break;
      
      case 'LDI':
        stack.push(!getValue(inst.value));
        break;
      
      case 'AND': {
        const top = stack.pop() ?? false;
        stack.push(top && getValue(inst.value));
        break;
      }
      
      case 'ANI': {
        const top = stack.pop() ?? false;
        stack.push(top && !getValue(inst.value));
        break;
      }
      
      case 'OR': {
        const top = stack.pop() ?? false;
        stack.push(top || getValue(inst.value));
        break;
      }
      
      case 'ORI': {
        const top = stack.pop() ?? false;
        stack.push(top || !getValue(inst.value));
        break;
      }
      
      // Block Logic (Stack Operations)
      case 'ORB': {
        // Pop top two blocks and OR them
        const a = stack.pop() ?? false;
        const b = stack.pop() ?? false;
        stack.push(b || a);
        break;
      }
      
      case 'ANB': {
        // Pop top two blocks and AND them
        const a = stack.pop() ?? false;
        const b = stack.pop() ?? false;
        stack.push(b && a);
        break;
      }
      
      case 'OUT': {
        // Assign the result of the logic stack to the variable
        // OUT does not pop the stack in many dialects (allowing parallel OUTs), 
        // but here we just read the peek.
        const top = stack[stack.length - 1] ?? false;
        state[inst.value] = top;
        break;
      }
    }
  });

  return state;
};
