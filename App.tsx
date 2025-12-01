
import React, { useState, useEffect, useMemo } from 'react';
import { parseLadderLogic } from './logic/parser';
import { calculatePowerFlow } from './logic/powerFlow';
import { LadderGrid } from './components/LadderGrid';
import { PersistenceControls } from './components/PersistenceControls';
import { MnemonicImporter } from './components/MnemonicImporter';
import { Instruction, GridCell } from './types';
import { useLadderEditor } from './hooks/useLadderEditor';
import { useLadderSimulator } from './hooks/useLadderSimulator';
import { PlayCircle, Cpu, RefreshCw, Trash2, GitMerge, Plus, CornerDownRight, X, Play, Square, Zap, FileText, Database, Clock, Layers } from 'lucide-react';

const TEST_CASE_FX_STATE_MACHINE: Instruction[] = [
  // A simplified State Machine using Comparators and SET
  { id: 1, type: "LD", value: "M8000" }, // Always ON
  { id: 2, type: "MOV", value: "0", args: ["0", "iStep"] }, // Init
  
  // State 0
  { id: 3, type: "LD_EQ", value: "iStep", args: ["iStep", "0"] },
  { id: 4, type: "AND", value: "X0" }, // Start Button
  { id: 5, type: "MOVP", value: "10", args: ["10", "iStep"] }, // Next State

  // State 10 (Action)
  { id: 6, type: "LD_EQ", value: "iStep", args: ["iStep", "10"] },
  { id: 7, type: "SET", value: "Y0" },
  { id: 8, type: "LD_EQ", value: "iStep", args: ["iStep", "10"] },
  { id: 9, type: "AND", value: "X1" }, // Sensor
  { id: 10, type: "MOVP", value: "20", args: ["20", "iStep"] },

  // State 20 (Finish)
  { id: 11, type: "LD_EQ", value: "iStep", args: ["iStep", "20"] },
  { id: 12, type: "RST", value: "Y0" },
  { id: 13, type: "SET", value: "Y1" }
];

export default function App() {
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [grid, setGrid] = useState<GridCell[][]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isImporterOpen, setIsImporterOpen] = useState(false);

  // Editor Hook
  const { updateInstruction, deleteInstruction, insertSeries, insertParallel } = useLadderEditor(instructions, setInstructions);
  
  // Simulator Hook
  const { ioState, dataState, timers, counters, isSimulating, toggleSimulation, toggleBit, setIoState } = useLadderSimulator(instructions);

  // 1. Parse Grid when instructions change
  useEffect(() => {
    const newGrid = parseLadderLogic(instructions);
    setGrid(newGrid);
    if (selectedIndex !== null && selectedIndex >= instructions.length) {
      setSelectedIndex(null);
    }
  }, [instructions, selectedIndex]);

  // 2. Calculate Power Flow
  const energizedPaths = useMemo(() => {
    if (!isSimulating) return new Set<string>();
    return calculatePowerFlow(grid, ioState);
  }, [grid, ioState, isSimulating]);

  const loadCase = (data: Instruction[]) => {
    if (isSimulating) toggleSimulation();
    setInstructions([...data]);
    setSelectedIndex(null);
    setIoState(); 
  };
  
  const handleClear = () => {
    if (isSimulating) toggleSimulation();
    setInstructions([]);
    setSelectedIndex(null);
    setIoState();
  };

  const handleCellClick = (index: number | null) => {
    if (index === null) return;
    
    if (isSimulating) {
      const inst = instructions[index];
      if (inst && inst.value) {
        toggleBit(inst.value);
      }
    } else {
      setSelectedIndex(index);
    }
  };

  const selectedInst = selectedIndex !== null ? instructions[selectedIndex] : null;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-20">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className={`p-2 rounded-lg text-white transition-colors duration-500 ${isSimulating ? 'bg-green-600 shadow-[0_0_15px_rgba(22,163,74,0.5)]' : 'bg-blue-600'}`}>
              <Cpu size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">Ladder Logic Engine</h1>
              <p className="text-xs text-gray-500 font-mono flex items-center gap-2">
                Phase 12: FX Compatibility & State Machine
                {isSimulating && <span className="text-green-600 font-bold animate-pulse flex items-center gap-1">● RUNNING</span>}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-center md:justify-end items-center w-full md:w-auto">
             
             <PersistenceControls instructions={instructions} onLoad={loadCase} />

             <button 
               onClick={() => setIsImporterOpen(true)}
               className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
               title="Import Mnemonic Text"
             >
               <FileText size={18} />
             </button>

             <div className="w-px h-8 bg-gray-300 hidden md:block"></div>

            <button 
              onClick={toggleSimulation}
              className={`flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-full shadow-md transition-all active:scale-95 ${
                isSimulating 
                  ? 'bg-red-100 text-red-600 hover:bg-red-200 border border-red-200'
                  : 'bg-green-600 text-white hover:bg-green-700 hover:shadow-lg'
              }`}
            >
              {isSimulating ? (
                <>
                  <Square size={18} fill="currentColor" /> STOP
                </>
              ) : (
                <>
                  <Play size={18} fill="currentColor" /> RUN
                </>
              )}
            </button>
            
            <button 
              onClick={handleClear}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
            >
              <Trash2 size={16} />
            </button>
            <button 
              onClick={() => loadCase(TEST_CASE_FX_STATE_MACHINE)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-md transition-all active:scale-95"
            >
              <Layers size={16} />
              Real FX
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        
        {/* Editor Toolbar */}
        {!isSimulating && selectedInst && selectedIndex !== null && (
          <section className="bg-blue-900 text-white rounded-xl shadow-lg p-4 animate-in fade-in slide-in-from-top-4 border border-blue-800">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 w-full md:w-auto">
                 <div className="bg-blue-800 px-3 py-1.5 rounded font-mono text-sm font-bold border border-blue-700">
                   ID: {selectedIndex}
                 </div>
                 <div className="flex-1 md:flex-none">
                    <label className="text-xs text-blue-300 font-bold uppercase tracking-wider block mb-1">Value</label>
                    <input 
                      type="text" 
                      value={selectedInst.value} 
                      onChange={(e) => updateInstruction(selectedIndex, { value: e.target.value })}
                      className="bg-blue-800 border border-blue-700 rounded px-2 py-1 text-white font-mono w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                 </div>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                 <button onClick={() => insertSeries(selectedIndex)} className="px-3 py-1.5 bg-blue-700 rounded text-sm">Series</button>
                 <button onClick={() => insertParallel(selectedIndex)} className="px-3 py-1.5 bg-purple-700 rounded text-sm">Parallel</button>
                 <button onClick={() => deleteInstruction(selectedIndex)} className="px-3 py-1.5 bg-red-600 rounded text-sm">Delete</button>
                 <button onClick={() => setSelectedIndex(null)} className="p-1.5 text-blue-300 hover:text-white"><X size={20} /></button>
              </div>
            </div>
          </section>
        )}
        
        {/* Simulation Banner & Monitors */}
        {isSimulating && (
           <section className="bg-green-100 text-green-800 rounded-xl border border-green-200 p-4 flex flex-col items-center justify-between animate-in fade-in gap-4">
              <div className="w-full flex items-center justify-center gap-3 border-b border-green-200 pb-2 mb-2">
                 <Zap className="text-green-600" />
                 <h3 className="font-bold">Simulation Active</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 w-full gap-4">
                 {/* I/O Monitor */}
                 <div className="bg-white/50 p-3 rounded-lg border border-green-200">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-green-700 mb-2">Bit Monitor (X/Y/M)</h4>
                    <div className="flex flex-wrap gap-2">
                       {Object.entries(ioState).filter(([k]) => !k.startsWith('T') && !k.startsWith('C')).length === 0 && <span className="text-xs text-gray-400 italic">No Active I/O</span>}
                       {Object.entries(ioState).filter(([k]) => !k.startsWith('T') && !k.startsWith('C')).sort().map(([key, val]) => (
                          <div key={key} 
                            className={`px-2 py-1 rounded border font-mono text-xs font-bold cursor-pointer select-none transition-colors ${
                              val ? 'bg-green-500 text-white border-green-600' : 'bg-white text-gray-500 border-gray-300'
                            }`}
                            onClick={() => toggleBit(key)}
                          >
                             {key}:{val ? '1' : '0'}
                          </div>
                       ))}
                    </div>
                 </div>

                 {/* Timer/Counter Monitor */}
                 <div className="bg-white/50 p-3 rounded-lg border border-teal-200">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-2">Timer/Counter (T/C)</h4>
                    <div className="flex flex-wrap gap-2">
                       {Object.entries(timers).map(([key, val]) => (
                          <div key={key} className="px-2 py-1 rounded border border-teal-300 bg-teal-50 font-mono text-xs font-bold text-teal-800">
                             {key}: {(val/1000).toFixed(1)}s
                          </div>
                       ))}
                    </div>
                 </div>

                 {/* Data Monitor */}
                 <div className="bg-white/50 p-3 rounded-lg border border-orange-200">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-orange-700 mb-2">Data Register (D)</h4>
                    <div className="flex flex-wrap gap-2">
                       {Object.entries(dataState).sort().map(([key, val]) => (
                          <div key={key} className="px-2 py-1 rounded border border-orange-300 bg-orange-50 font-mono text-xs font-bold text-orange-800">
                             {key}: <span className="text-black">{val}</span>
                          </div>
                       ))}
                    </div>
                 </div>
              </div>
           </section>
        )}

        <section 
          className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-colors duration-500 ${isSimulating ? 'border-green-300 shadow-[0_0_20px_rgba(34,197,94,0.1)]' : 'border-gray-200'}`}
          onClick={() => { if (!isSimulating) setSelectedIndex(null); }} 
        >
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="font-semibold text-gray-700 flex items-center gap-2">
              <RefreshCw size={16} className="text-gray-400" />
              Visual Grid
            </h2>
            <div className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${isSimulating ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
              {isSimulating ? 'LIVE RUNNING' : 'EDIT MODE'}
            </div>
          </div>
          <div className="p-6 overflow-hidden min-h-[300px]">
            <LadderGrid 
              grid={grid} 
              onCellClick={handleCellClick}
              selectedSourceIndex={selectedIndex}
              ioState={ioState}
              timers={timers}
              counters={counters}
              simulationEnabled={isSimulating}
              energizedPaths={energizedPaths}
            />
          </div>
        </section>

        {/* Info Box */}
        <div className="bg-slate-800 rounded-xl shadow-md p-6 text-slate-300">
             <h3 className="text-sm font-bold text-white uppercase tracking-wide mb-4 border-b border-slate-600 pb-2">
              Phase 12 Complete: Architecture Reached Maximum Level
            </h3>
            <p className="text-sm leading-relaxed mb-4">
              The engine is now a fully functional PLC Simulator compatible with Mitsubishi FX Series syntax.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <ul className="space-y-2 list-disc pl-4 text-slate-400">
                 <li><span className="text-white font-bold">Smart Import:</span> Can parse "Dirty" text copied directly from GX Works.</li>
                 <li><span className="text-white font-bold">State Machine:</span> Supports <code>LD=</code>, <code>AND=</code> comparators for iStep control.</li>
              </ul>
              <ul className="space-y-2 list-disc pl-4 text-slate-400">
                 <li><span className="text-white font-bold">Stack Logic:</span> Implements <code>MPS/MRD/MPP</code> for complex branching.</li>
                 <li><span className="text-white font-bold">Latch & Pulse:</span> Supports <code>SET</code> (Latch) and <code>MOVP</code> (Rising Edge).</li>
              </ul>
            </div>
        </div>

        {/* Modal */}
        <MnemonicImporter 
          isOpen={isImporterOpen} 
          onClose={() => setIsImporterOpen(false)} 
          onImport={loadCase} 
        />
      </main>
    </div>
  );
}
