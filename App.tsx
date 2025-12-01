import React, { useState, useEffect } from 'react';
import { parseLadderLogic } from './logic/parser';
import { LadderGrid } from './components/LadderGrid';
import { Instruction, GridCell } from './types';
import { useLadderEditor } from './hooks/useLadderEditor';
import { PlayCircle, Cpu, RefreshCw, Trash2, Layers, GitMerge, Plus, CornerDownRight, X, Save } from 'lucide-react';

const TEST_CASE_SELF_HOLDING: Instruction[] = [
  { id: 1, type: "LD", value: "X0" },
  { id: 2, type: "OR", value: "Y0" },
  { id: 3, type: "ANI", value: "X1" },
  { id: 4, type: "OUT", value: "Y0" }
];

const TEST_CASE_MULTI_RUNG: Instruction[] = [
  { id: 1, type: "LD", value: "M0" },
  { id: 2, type: "OUT", value: "Y0" },
  { id: 3, type: "LD", value: "X0" }, 
  { id: 4, type: "OR", value: "X1" }, 
  { id: 5, type: "AND", value: "X2" }, 
  { id: 6, type: "OUT", value: "Y1" }
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

  const { updateInstruction, deleteInstruction, insertSeries, insertParallel } = useLadderEditor(instructions, setInstructions);

  useEffect(() => {
    const newGrid = parseLadderLogic(instructions);
    setGrid(newGrid);
    // Reset selection if out of bounds (e.g. after delete)
    if (selectedIndex !== null && selectedIndex >= instructions.length) {
      setSelectedIndex(null);
    }
  }, [instructions, selectedIndex]);

  const loadCase = (data: Instruction[]) => {
    setInstructions([...data]);
    setSelectedIndex(null);
  };
  
  const handleClear = () => {
    setInstructions([]);
    setSelectedIndex(null);
  };

  const handleCellClick = (index: number | null) => {
    setSelectedIndex(index);
  };

  const selectedInst = selectedIndex !== null ? instructions[selectedIndex] : null;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-20">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <Cpu size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Ladder Logic Engine</h1>
              <p className="text-xs text-gray-500 font-mono">React + TS + Recursive Parser + Editor</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            <button 
              onClick={handleClear}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
            >
              <Trash2 size={16} />
              Clear
            </button>
            <button 
              onClick={() => loadCase(TEST_CASE_SELF_HOLDING)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-all active:scale-95"
            >
              <PlayCircle size={16} />
              Self-Hold
            </button>
            <button 
              onClick={() => loadCase(TEST_CASE_MULTI_RUNG)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-all active:scale-95"
            >
              <Layers size={16} />
              Multi-Rung
            </button>
            <button 
              onClick={() => loadCase(TEST_CASE_NESTED_ORB)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md shadow-sm transition-all active:scale-95"
            >
              <GitMerge size={16} />
              Nested (ORB)
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        
        {/* Editor Toolbar (Conditional) */}
        {selectedInst && selectedIndex !== null && (
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

        <section 
          className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
          onClick={() => setSelectedIndex(null)} // Click outside to deselect
        >
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="font-semibold text-gray-700 flex items-center gap-2">
              <RefreshCw size={16} className="text-gray-400" />
              Visual Grid
            </h2>
            <div className="text-xs text-gray-400 font-mono">
              {selectedIndex !== null ? 'EDIT MODE' : 'READ ONLY'}
            </div>
          </div>
          <div className="p-6 overflow-hidden min-h-[300px]">
            <LadderGrid 
              grid={grid} 
              onCellClick={handleCellClick}
              selectedSourceIndex={selectedIndex}
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
                    onClick={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between p-2 rounded border transition-colors cursor-pointer ${
                      idx === selectedIndex 
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
                    <span className="text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200 shadow-sm min-w-[3rem] text-center">
                      {inst.value || '-'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-800 rounded-xl shadow-md p-6 text-slate-300">
             <h3 className="text-sm font-bold text-white uppercase tracking-wide mb-4 border-b border-slate-600 pb-2">
              Phase 4: Interaction Bridge
            </h3>
            <p className="text-sm leading-relaxed mb-4">
              <strong className="text-blue-400">Click & Edit:</strong> Select any grid component to modify its value, delete it, or insert new logic.
            </p>
            <ul className="text-sm space-y-2 list-disc pl-4 text-slate-400">
               <li><span className="text-white font-bold">Source Mapping:</span> The grid knows which JSON instruction created it.</li>
               <li><span className="text-white font-bold">Smart Mutation:</span> Adding "Series" injects AND; "Parallel" injects OR.</li>
               <li><span className="text-white font-bold">Real-time:</span> Changes in the editor reflect immediately on the grid.</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}