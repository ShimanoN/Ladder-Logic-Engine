
import React, { useState, useEffect, useMemo } from 'react';
import { parseLadderLogic } from './logic/parser';
import { calculatePowerFlow } from './logic/powerFlow'; // Import BFS Logic
import { LadderGrid } from './components/LadderGrid';
import { PersistenceControls } from './components/PersistenceControls'; // Import UI
import { MnemonicImporter } from './components/MnemonicImporter'; // Import Mnemonic UI
import { Instruction, GridCell } from './types';
import { useLadderEditor } from './hooks/useLadderEditor';
import { useLadderSimulator } from './hooks/useLadderSimulator';
import { PlayCircle, Cpu, RefreshCw, Trash2, GitMerge, Plus, CornerDownRight, X, Play, Square, Zap, FileText } from 'lucide-react';

const TEST_CASE_SELF_HOLDING: Instruction[] = [
  { id: 1, type: "LD", value: "X0" },
  { id: 2, type: "OR", value: "Y0" },
  { id: 3, type: "ANI", value: "X1" },
  { id: 4, type: "OUT", value: "Y0" }
];

const TEST_CASE_NESTED_ORB: Instruction[] = [
  { id: 1, type: "LD", value: "X0" },   // Block A Start
  { id: 2, type: "LD", value: "X1" },   // Block B Start (Nested)
  { id: 3, type: "AND", value: "X2" },  // Block B continue
  { id: 4, type: "ORB", value: "" },    // Merge B into A
  { id: 5, type: "OUT", value: "Y0" }
];

export default function App() {
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [grid, setGrid] = useState<GridCell[][]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isImporterOpen, setIsImporterOpen] = useState(false);

  // Editor Hook
  const { updateInstruction, deleteInstruction, insertSeries, insertParallel } = useLadderEditor(instructions, setInstructions);
  
  // Simulator Hook
  const { ioState, isSimulating, toggleSimulation, toggleBit, setIoState } = useLadderSimulator(instructions);

  // 1. Parse Grid when instructions change
  useEffect(() => {
    const newGrid = parseLadderLogic(instructions);
    setGrid(newGrid);
    if (selectedIndex !== null && selectedIndex >= instructions.length) {
      setSelectedIndex(null);
    }
  }, [instructions, selectedIndex]);

  // 2. Calculate Power Flow (Live Wires) when Grid or IO changes
  const energizedPaths = useMemo(() => {
    if (!isSimulating) return new Set<string>();
    return calculatePowerFlow(grid, ioState);
  }, [grid, ioState, isSimulating]);

  const loadCase = (data: Instruction[]) => {
    if (isSimulating) toggleSimulation();
    setInstructions([...data]);
    setSelectedIndex(null);
    setIoState({});
  };
  
  const handleClear = () => {
    if (isSimulating) toggleSimulation();
    setInstructions([]);
    setSelectedIndex(null);
    setIoState({});
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
                Phase 7: Text Importer
                {isSimulating && <span className="text-green-600 font-bold animate-pulse flex items-center gap-1">● RUNNING</span>}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-center md:justify-end items-center w-full md:w-auto">
             
             {/* Persistence Controls */}
             <PersistenceControls instructions={instructions} onLoad={loadCase} />

             {/* Mnemonic Import Button */}
             <button 
               onClick={() => setIsImporterOpen(true)}
               className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
               title="Import Mnemonic Text"
             >
               <FileText size={18} />
             </button>

             <div className="w-px h-8 bg-gray-300 hidden md:block"></div>

             {/* SIMULATION TOGGLE */}
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
              onClick={() => loadCase(TEST_CASE_SELF_HOLDING)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-all active:scale-95"
            >
              <PlayCircle size={16} />
              Demo
            </button>
            <button 
              onClick={() => loadCase(TEST_CASE_NESTED_ORB)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md shadow-sm transition-all active:scale-95"
            >
              <GitMerge size={16} />
              Nested
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        
        {/* Editor Toolbar (Edit Mode Only) */}
        {!isSimulating && selectedInst && selectedIndex !== null && (
          <section className="bg-blue-900 text-white rounded-xl shadow-lg p-4 animate-in fade-in slide-in-from-top-4 border border-blue-800">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 w-full md:w-auto">
                 <div className="bg-blue-800 px-3 py-1.5 rounded font-mono text-sm font-bold border border-blue-700">
                   ID: {selectedIndex}
                 </div>
                 <div className="flex-1 md:flex-none">
                    <label className="text-xs text-blue-300 font-bold uppercase tracking-wider block mb-1">Value</label>
                    <div className="flex gap-2">
                       <input 
                         type="text" 
                         value={selectedInst.value} 
                         onChange={(e) => updateInstruction(selectedIndex, { value: e.target.value })}
                         className="bg-blue-800 border border-blue-700 rounded px-2 py-1 text-white font-mono w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                       />
                    </div>
                 </div>
                 <div className="h-8 w-px bg-blue-700 mx-2 hidden md:block"></div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                 <button 
                   onClick={() => insertSeries(selectedIndex)}
                   className="flex items-center gap-2 px-3 py-1.5 bg-blue-700 hover:bg-blue-600 rounded text-sm transition-colors border border-blue-600"
                   title="Insert AND after"
                 >
                    <Plus size={16} />
                    Series
                 </button>
                 <button 
                   onClick={() => insertParallel(selectedIndex)}
                   className="flex items-center gap-2 px-3 py-1.5 bg-purple-700 hover:bg-purple-600 rounded text-sm transition-colors border border-purple-600"
                   title="Insert OR after"
                 >
                    <CornerDownRight size={16} />
                    Parallel
                 </button>
                 <div className="w-px h-8 bg-blue-700 mx-1"></div>
                 <button 
                   onClick={() => deleteInstruction(selectedIndex)}
                   className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded text-sm transition-colors border border-red-500"
                 >
                    <Trash2 size={16} />
                    Delete
                 </button>
                 <button 
                   onClick={() => setSelectedIndex(null)}
                   className="p-1.5 hover:bg-blue-800 rounded text-blue-300 hover:text-white transition-colors"
                 >
                   <X size={20} />
                 </button>
              </div>
            </div>
          </section>
        )}
        
        {/* Simulation Banner */}
        {isSimulating && (
           <section className="bg-green-100 text-green-800 rounded-xl border border-green-200 p-4 flex flex-col sm:flex-row items-center justify-between animate-in fade-in gap-4">
              <div className="flex items-center gap-3">
                 <Zap className="text-green-600" />
                 <div>
                    <h3 className="font-bold">Simulation Mode Active</h3>
                    <p className="text-xs text-green-700">Click on any Contact (X0, X1...) to toggle inputs. Watch the wires light up!</p>
                 </div>
              </div>
              
              {/* Simple I/O Monitor */}
              <div className="flex flex-wrap gap-2 justify-center">
                 {Object.entries(ioState).sort().map(([key, val]) => (
                    <div key={key} 
                      className={`px-2 py-1 rounded border font-mono text-xs font-bold cursor-pointer select-none transition-colors ${
                        val 
                          ? 'bg-green-500 text-white border-green-600 shadow-sm' 
                          : 'bg-white text-gray-500 border-gray-300'
                      }`}
                      onClick={() => toggleBit(key)}
                    >
                       {key}:{val ? '1' : '0'}
                    </div>
                 ))}
              </div>
           </section>
        )}

        <section 
          className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-colors duration-500 ${isSimulating ? 'border-green-300 shadow-[0_0_20px_rgba(34,197,94,0.1)]' : 'border-gray-200'}`}
          onClick={() => {
             if (!isSimulating) setSelectedIndex(null);
          }} 
        >
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="font-semibold text-gray-700 flex items-center gap-2">
              <RefreshCw size={16} className="text-gray-400" />
              Visual Grid
            </h2>
            <div className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${isSimulating ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
              {isSimulating ? 'LIVE RUNNING' : selectedIndex !== null ? 'EDIT MODE' : 'READ ONLY'}
            </div>
          </div>
          <div className="p-6 overflow-hidden min-h-[300px]">
            <LadderGrid 
              grid={grid} 
              onCellClick={handleCellClick}
              selectedSourceIndex={selectedIndex}
              ioState={ioState}
              simulationEnabled={isSimulating}
              energizedPaths={energizedPaths}
            />
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4 border-b pb-2">
              Instruction Stream
            </h3>
            {instructions.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No instructions loaded.</p>
            ) : (
              <div className="space-y-2 font-mono text-sm max-h-60 overflow-y-auto pr-2">
                {instructions.map((inst, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => handleCellClick(idx)}
                    className={`flex items-center justify-between p-2 rounded border transition-colors cursor-pointer ${
                      idx === selectedIndex && !isSimulating
                        ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' 
                        : 'bg-slate-50 border-slate-100 hover:border-blue-200 hover:bg-white'
                    }`}
                  >
                    <span className="w-8 text-gray-400 text-xs text-right select-none">{idx}</span>
                    <span className={`font-bold ${
                      inst.type === 'LD' ? 'text-green-600' : 
                      inst.type === 'OR' || inst.type === 'ORB' ? 'text-purple-600' :
                      inst.type === 'OUT' ? 'text-blue-600' : 'text-gray-700'
                    }`}>
                      {inst.type}
                    </span>
                    <span className={`px-2 py-0.5 rounded border shadow-sm min-w-[3rem] text-center transition-colors ${
                      isSimulating && ioState[inst.value] 
                        ? 'bg-green-500 text-white border-green-600 font-bold'
                        : 'text-gray-900 bg-white border-gray-200'
                    }`}>
                      {inst.value || '-'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-800 rounded-xl shadow-md p-6 text-slate-300">
             <h3 className="text-sm font-bold text-white uppercase tracking-wide mb-4 border-b border-slate-600 pb-2">
              Phase 7: Mnemonic Importer
            </h3>
            <p className="text-sm leading-relaxed mb-4">
              <strong className="text-green-400">Copy & Paste Logic:</strong> You can now import text-based Ladder Logic.
            </p>
            <ul className="text-sm space-y-2 list-disc pl-4 text-slate-400">
               <li><span className="text-white font-bold">Standard format:</span> Supports generic <code>LD X0</code> style syntax.</li>
               <li><span className="text-white font-bold">Integration:</span> Quickly test logic from existing PLC projects or tutorials.</li>
               <li><span className="text-white font-bold">Parsing:</span> Automatically validates instructions and skips comments.</li>
            </ul>
          </div>
        </section>

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
