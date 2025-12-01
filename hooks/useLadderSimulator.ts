
import { useState, useCallback } from 'react';
import { Instruction } from '../types';
import { runScanCycle } from '../logic/simulator';

export const useLadderSimulator = (instructions: Instruction[]) => {
  const [ioState, setIoState] = useState<Record<string, boolean>>({});
  const [isSimulating, setIsSimulating] = useState(false);

  // Toggle simulation mode
  const toggleSimulation = useCallback(() => {
    setIsSimulating(prev => {
      const next = !prev;
      if (next) {
        // On Start: Run one scan to initialize outputs based on current inputs
        setIoState(current => runScanCycle(instructions, current));
      }
      return next;
    });
  }, [instructions]);

  // Force toggle an input bit (e.g., clicking X0)
  const toggleBit = useCallback((key: string) => {
    if (!isSimulating) return;

    setIoState(prev => {
      // 1. Force the Input Change
      const nextInputs = { ...prev, [key]: !prev[key] };
      
      // 2. Run Scan Cycle Immediately (Reactive Simulation)
      // In a real PLC, this happens in a loop. Here we trigger on event.
      return runScanCycle(instructions, nextInputs);
    });
  }, [isSimulating, instructions]);

  return {
    ioState,
    isSimulating,
    toggleSimulation,
    toggleBit,
    setIoState // Exposed for reset/loading
  };
};
