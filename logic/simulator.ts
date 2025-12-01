
import { Instruction, SimulationState } from '../types';

const parseOperand = (op: string, dataState: Record<string, number>): number => {
  if (!op) return 0;
  if (op.startsWith('K')) return parseInt(op.substring(1), 10) || 0;
  if (op.startsWith('D')) return dataState[op] || 0;
  // Fallback: Check if it looks like a number
  if (/^-?\d+$/.test(op)) return parseInt(op, 10);
  // Named Variable lookup
  return dataState[op] || 0;
};

export const runScanCycle = (
  instructions: Instruction[],
  prevState: SimulationState,
  dt: number
): SimulationState => {
  const io = { ...prevState.io };
  const data = { ...prevState.data };
  const timers = { ...prevState.timers };
  const counters = { ...prevState.counters };
  const edgeMemory = { ...prevState.edgeMemory };
  const mpsStack = [...(prevState.mpsStack || [])]; 
  
  const stack: boolean[] = [];

  const getBit = (key: string) => !!io[key];

  instructions.forEach(inst => {
    switch(inst.type) {
      // --- BIT LOGIC ---
      case 'LD': stack.push(getBit(inst.value)); break;
      case 'LDI': stack.push(!getBit(inst.value)); break;
      case 'AND': stack.push((stack.pop()??false) && getBit(inst.value)); break;
      case 'ANI': stack.push((stack.pop()??false) && !getBit(inst.value)); break;
      case 'OR': stack.push((stack.pop()??false) || getBit(inst.value)); break;
      case 'ORI': stack.push((stack.pop()??false) || !getBit(inst.value)); break;
      case 'ORB': stack.push((stack.pop()??false) || (stack.pop()??false)); break;
      case 'ANB': stack.push((stack.pop()??false) && (stack.pop()??false)); break;
      
      // --- COMPARATORS (Phase 10) ---
      case 'LD_EQ': {
        const valA = parseOperand(inst.value, data);
        const valB = parseOperand(inst.args?.[1] || '0', data);
        stack.push(valA === valB);
        break;
      }
      case 'AND_EQ': {
        const top = stack.pop() ?? false;
        const valA = parseOperand(inst.value, data);
        const valB = parseOperand(inst.args?.[1] || '0', data);
        stack.push(top && (valA === valB));
        break;
      }
      case 'OR_EQ': {
        const top = stack.pop() ?? false;
        const valA = parseOperand(inst.value, data);
        const valB = parseOperand(inst.args?.[1] || '0', data);
        stack.push(top || (valA === valB));
        break;
      }

      // --- STACK INSTRUCTIONS (Phase 11) ---
      case 'MPS': 
        mpsStack.push(stack[stack.length - 1] ?? false);
        break;
      case 'MRD': 
        if (mpsStack.length > 0) {
           stack.push(mpsStack[mpsStack.length - 1]);
        } else {
           stack.push(false);
        }
        break;
      case 'MPP': 
        if (mpsStack.length > 0) {
           stack.push(mpsStack.pop()!);
        } else {
           stack.push(false);
        }
        break;

      // --- OUTPUTS ---
      case 'OUT': {
        const top = stack[stack.length - 1] ?? false;
        const target = inst.value;
        if (target.startsWith('T')) {
          const presetMs = (inst.args?.[1] ? parseOperand(inst.args[1], data) : 0) * 100;
          if (top) {
             const next = (timers[target] || 0) + dt;
             timers[target] = next;
             io[target] = next >= presetMs;
          } else {
             timers[target] = 0;
             io[target] = false;
          }
        } else if (target.startsWith('C')) {
          const preset = inst.args?.[1] ? parseOperand(inst.args[1], data) : 0;
          const prevIn = edgeMemory[target] || false;
          edgeMemory[target] = top;
          if (!prevIn && top) {
             const next = (counters[target] || 0) + 1;
             counters[target] = next;
             if (next >= preset) io[target] = true;
          }
        } else {
          io[target] = top;
        }
        break;
      }

      case 'SET': { // Phase 12 Latch
        const top = stack[stack.length - 1] ?? false;
        if (top) io[inst.value] = true;
        break;
      }

      case 'RST': {
        const top = stack[stack.length - 1] ?? false;
        if (top) {
           const t = inst.value;
           if (t.startsWith('T')) { timers[t] = 0; io[t] = false; }
           else if (t.startsWith('C')) { counters[t] = 0; io[t] = false; edgeMemory[t] = false; }
           else if (t.startsWith('D')) { data[t] = 0; }
           else { io[t] = false; }
        }
        break;
      }

      // --- DATA ---
      case 'MOV': {
        const top = stack[stack.length - 1] ?? false;
        if (top && inst.args?.length === 2) {
          data[inst.args[1]] = parseOperand(inst.args[0], data);
        }
        break;
      }

      case 'MOVP': { // Pulse Move
        const top = stack[stack.length - 1] ?? false;
        // Unique ID for edge detection using instruction ID (assuming unqiue)
        const edgeKey = `MOVP_${inst.id}`;
        const prev = edgeMemory[edgeKey] || false;
        edgeMemory[edgeKey] = top;
        
        if (!prev && top && inst.args?.length === 2) {
           data[inst.args[1]] = parseOperand(inst.args[0], data);
        }
        break;
      }
    }
  });

  return { io, data, timers, counters, edgeMemory, mpsStack };
};
