import { useCallback } from 'react';
import { Instruction, InstructionType } from '../types';

export const useLadderEditor = (
  instructions: Instruction[],
  setInstructions: React.Dispatch<React.SetStateAction<Instruction[]>>
) => {
  
  const updateInstruction = useCallback((index: number, partial: Partial<Instruction>) => {
    setInstructions(prev => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], ...partial };
      }
      return next;
    });
  }, [setInstructions]);

  const deleteInstruction = useCallback((index: number) => {
    setInstructions(prev => {
      const next = [...prev];
      if (index >= 0 && index < next.length) {
        next.splice(index, 1);
      }
      return next;
    });
  }, [setInstructions]);

  const insertInstruction = useCallback((index: number, type: InstructionType, value: string) => {
    setInstructions(prev => {
      const next = [...prev];
      // Generate a simple ID (in real app use UUID)
      const newId = Math.max(0, ...next.map(i => i.id), 999) + 1;
      const newInst: Instruction = { id: newId, type, value };
      
      // Insert AFTER the selected index
      // If index is -1 (no selection), push to end? Or invalid?
      // For now assume index is valid.
      const insertPos = index + 1;
      next.splice(insertPos, 0, newInst);
      return next;
    });
  }, [setInstructions]);

  const insertSeries = (index: number) => insertInstruction(index, 'AND', 'X?');
  const insertParallel = (index: number) => insertInstruction(index, 'OR', 'Y?');

  return { updateInstruction, deleteInstruction, insertSeries, insertParallel };
};