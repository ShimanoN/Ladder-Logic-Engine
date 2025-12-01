
import { Instruction, InstructionType } from '../types';

const KNOWN_KEYWORDS = new Set([
  'LD', 'LDI', 'AND', 'ANI', 'OR', 'ORI', 'OUT', 'ORB', 'ANB', 
  'MOV', 'RST', 
  'LD=', 'AND=', 'OR=', 'LD_EQ', 'AND_EQ', 'OR_EQ',
  'MPS', 'MRD', 'MPP', 
  'MOVP', 'SET'
]);

/**
 * Normalizes instruction types (e.g., "LD=" -> "LD_EQ").
 */
const normalizeType = (raw: string): InstructionType | null => {
  const upper = raw.toUpperCase();
  if (upper === 'LD=' || upper === 'LD_EQ') return 'LD_EQ';
  if (upper === 'AND=' || upper === 'AND_EQ') return 'AND_EQ';
  if (upper === 'OR=' || upper === 'OR_EQ') return 'OR_EQ';
  if (KNOWN_KEYWORDS.has(upper)) return upper as InstructionType;
  return null;
};

/**
 * Smart Parser for Ladder Logic mnemonics.
 * Can handle:
 * - "LD X0"
 * - "LD= iStep 10" (Comparator)
 * - "4 LD X0" (GX Works line numbers)
 * - "0 *[Note]" (Comments)
 */
export const parseMnemonic = (text: string): Instruction[] => {
  const lines = text.split(/\r?\n/);
  const instructions: Instruction[] = [];
  let idCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('//') || line.startsWith(';') || line.startsWith('*')) {
      continue;
    }

    // Tokenize by whitespace/tabs
    const tokens = line.split(/\s+/);
    
    // Heuristic Scan: Find the first token that looks like an instruction
    let foundType: InstructionType | null = null;
    let typeIndex = -1;

    for (let t = 0; t < tokens.length; t++) {
      let token = tokens[t].toUpperCase();
      
      // Handle split comparators like "LD ="
      if (token === 'LD' || token === 'AND' || token === 'OR') {
         if (tokens[t+1] === '=') {
            token += '=';
         }
      }

      const normalized = normalizeType(token);
      if (normalized) {
        foundType = normalized;
        typeIndex = t;
        break;
      }
    }

    if (!foundType) {
       // Skip lines with no recognizable instructions (noise)
       continue;
    }

    // Extract Operands
    // If we merged "LD" and "=" (typeIndex advanced), we need to be careful.
    // Simpler approach: normalizeType handles "LD=" if tokens were joined,
    // but if "LD" and "=" were separate tokens, our loop caught "LD" but normalizeType('LD') is valid.
    
    // Let's refine argument gathering
    let args: string[] = [];
    let startArgIndex = typeIndex + 1;
    
    // Special case: If parser found "LD" but next token is "=", consume it.
    if (tokens[startArgIndex] === '=') {
       if (foundType === 'LD') foundType = 'LD_EQ';
       if (foundType === 'AND') foundType = 'AND_EQ';
       if (foundType === 'OR') foundType = 'OR_EQ';
       startArgIndex++;
    }

    // Collect remaining tokens as args
    for (let k = startArgIndex; k < tokens.length; k++) {
       const arg = tokens[k];
       if (arg && !arg.startsWith('//') && !arg.startsWith(';')) {
          args.push(arg);
       } else {
          break; // Stop at comment
       }
    }

    // Determine primary value
    // For Comparators: "LD= A B", value = A
    // For MOV: "MOV A B", value = A
    // For MPS/MRD/MPP: value = ""
    let value = args.length > 0 ? args[0] : '';
    
    // Clean up value (remove trailing comments attached to token)
    // (Basic implementation assumes clean tokens due to split)

    instructions.push({
      id: idCounter++,
      type: foundType,
      value,
      args: args.length > 0 ? args : undefined
    });
  }

  return instructions;
};
