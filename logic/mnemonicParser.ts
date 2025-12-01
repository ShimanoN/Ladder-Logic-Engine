
import { Instruction, InstructionType } from '../types';

const VALID_TYPES: Set<string> = new Set([
  'LD', 'LDI', 'AND', 'ANI', 'OR', 'ORI', 'OUT', 'ORB', 'ANB'
]);

/**
 * Parses raw text into Instruction objects.
 * Format: "TYPE VALUE" (e.g., "LD X0") per line.
 */
export const parseMnemonic = (text: string): Instruction[] => {
  const lines = text.split(/\r?\n/);
  const instructions: Instruction[] = [];
  let idCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Ignore empty lines and comments
    if (!line || line.startsWith('//') || line.startsWith(';')) {
      continue;
    }

    // Split by whitespace
    const parts = line.split(/\s+/);
    const typeRaw = parts[0].toUpperCase();
    
    // Handle value (optional for Block instructions)
    const value = parts.length > 1 ? parts[1].toUpperCase() : '';

    if (!VALID_TYPES.has(typeRaw)) {
      throw new Error(`Line ${i + 1}: Unknown instruction type '${parts[0]}'`);
    }

    const type = typeRaw as InstructionType;

    instructions.push({
      id: idCounter++,
      type,
      value
    });
  }

  return instructions;
};
