
import { useState, useCallback, useRef, useEffect } from 'react';
import { Instruction, SimulationState } from '../types';
import { runScanCycle } from '../logic/simulator';

export const useLadderSimulator = (instructions: Instruction[]) => {
  // Use Ref for simulation state to avoid stale closures in interval
  const stateRef = useRef<SimulationState>({
    io: {},
    data: {},
    timers: {},
    counters: {},
    edgeMemory: {},
    mpsStack: []
  });

  // Exposed State for React rendering (synced periodically)
  const [displayState, setDisplayState] = useState<SimulationState>(stateRef.current);
  const [isSimulating, setIsSimulating] = useState(false);
  const loopRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Simulation Loop
  const runLoop = useCallback(() => {
    const now = Date.now();
    const dt = now - lastTimeRef.current;
    lastTimeRef.current = now;

    // Run Logic
    const nextState = runScanCycle(instructions, stateRef.current, dt);
    
    // Update Ref
    stateRef.current = nextState;
    
    // Trigger Re-render (could throttle this if needed)
    setDisplayState({ ...nextState });
  }, [instructions]);

  // Start/Stop Logic
  const toggleSimulation = useCallback(() => {
    setIsSimulating(prev => {
      const shouldRun = !prev;
      
      if (shouldRun) {
        lastTimeRef.current = Date.now();
        // Run at ~10Hz (100ms) for visual simulation. 
        // Real PLCs run faster, but for UI feedback 100ms is good.
        // Using setInterval for simplicity over RAF.
        loopRef.current = window.setInterval(runLoop, 100);
      } else {
        if (loopRef.current) {
           clearInterval(loopRef.current);
           loopRef.current = null;
        }
      }
      return shouldRun;
    });
  }, [runLoop]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (loopRef.current) clearInterval(loopRef.current);
    };
  }, []);

  // Force toggle an input bit
  const toggleBit = useCallback((key: string) => {
    if (!isSimulating) return;

    // Direct update to Ref
    stateRef.current.io[key] = !stateRef.current.io[key];
    
    // Optional: Run one immediate cycle for responsiveness
    // But let the loop handle it to keep dt consistent
  }, [isSimulating]);

  // Reset
  const resetSimulation = useCallback(() => {
    const empty: SimulationState = { io: {}, data: {}, timers: {}, counters: {}, edgeMemory: {}, mpsStack: [] };
    stateRef.current = empty;
    setDisplayState(empty);
    if (loopRef.current) {
        clearInterval(loopRef.current);
        loopRef.current = null;
    }
    setIsSimulating(false);
  }, []);

  return {
    ioState: displayState.io,
    dataState: displayState.data,
    timers: displayState.timers,
    counters: displayState.counters,
    isSimulating,
    toggleSimulation,
    toggleBit,
    setIoState: resetSimulation
  };
};