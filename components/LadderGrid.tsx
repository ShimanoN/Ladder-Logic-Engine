import React from 'react';
import { GridCell, Instruction } from '../types';

interface LadderGridProps {
  grid: GridCell[][];
  onCellClick?: (sourceIndex: number | null) => void;
  selectedSourceIndex?: number | null;
}

const InstructionBlock: React.FC<{ 
  instruction: Instruction; 
  isSelected: boolean;
}> = ({ instruction, isSelected }) => {
  const isCoil = instruction.type === 'OUT';
  const isInverse = instruction.type.includes('I') || instruction.type === 'ANI' || instruction.type === 'LDI';

  return (
    <div className={`
      flex flex-col items-center justify-center z-10 relative px-1 py-1 rounded cursor-pointer transition-all
      ${isSelected ? 'bg-blue-100 ring-2 ring-blue-500 scale-110 shadow-lg' : 'bg-white hover:bg-gray-50'}
    `}>
      {/* Symbol */}
      <div className={`
        relative flex items-center justify-center font-mono font-bold text-sm transition-colors
        ${isCoil 
          ? `w-12 h-12 rounded-full border-2 ${isSelected ? 'border-blue-600 text-blue-700' : 'border-blue-600 text-blue-800'}`
          : `w-10 h-8 border-x-2 ${isSelected ? 'border-blue-700 text-blue-900' : 'border-black text-slate-800'}`
        }
      `}>
         {/* Inverse Slash */}
         {isInverse && !isCoil && (
           <div className={`absolute w-full h-0.5 rotate-[-45deg] ${isSelected ? 'bg-blue-700' : 'bg-black'}`}></div>
         )}
         
         <span className="z-10 bg-white/80 px-0.5 select-none">{instruction.value}</span>
      </div>
      
      {/* Type Label */}
      <span className={`text-[10px] mt-1 uppercase tracking-wider select-none ${isSelected ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
        {instruction.type}
      </span>
    </div>
  );
};

export const LadderGrid: React.FC<LadderGridProps> = ({ grid, onCellClick, selectedSourceIndex }) => {
  if (!grid || grid.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
        No instructions to render. Load a test case.
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto ladder-scroll bg-gray-50 border border-gray-200 rounded-lg p-8 shadow-inner">
      <div className="inline-flex flex-col gap-0 relative">
        
        {/* Left Power Rail */}
        <div className="absolute top-0 bottom-0 left-0 w-1 bg-red-500 z-20"></div>

        {grid.map((row, rowIndex) => (
          <div key={rowIndex} className="flex">
            {row.map((cell, colIndex) => {
              const isSelected = cell.sourceIndex !== null && cell.sourceIndex === selectedSourceIndex;
              
              return (
                <div 
                  key={`${rowIndex}-${colIndex}`} 
                  className="relative w-32 h-24 flex items-center justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onCellClick) onCellClick(cell.sourceIndex);
                  }}
                >
                  {/* --- WIRING LAYER --- */}
                  
                  {/* Horizontal: Left Connection */}
                  {(cell.connections.left || cell.x === 0) && (
                     <div className="absolute left-0 top-1/2 w-1/2 h-0.5 bg-black -translate-y-1/2"></div>
                  )}
                  
                  {/* Horizontal: Right Connection */}
                  {cell.connections.right && (
                     <div className="absolute right-0 top-1/2 w-1/2 h-0.5 bg-black -translate-y-1/2"></div>
                  )}

                  {/* Vertical: Merge Line Up (Right Edge) */}
                  {cell.connections.up && (
                     <div className="absolute right-0 top-0 h-1/2 w-0.5 bg-black translate-x-[0.5px]"></div>
                  )}

                  {/* Vertical: Merge Line Down (Right Edge) */}
                  {cell.connections.down && (
                     <div className="absolute right-0 top-1/2 h-1/2 w-0.5 bg-black translate-x-[0.5px]"></div>
                  )}

                  {/* --- COMPONENT LAYER --- */}
                  {cell.instruction ? (
                    <InstructionBlock 
                      instruction={cell.instruction} 
                      isSelected={isSelected}
                    />
                  ) : (
                    // Wire Joint Visualization
                    (cell.connections.left && cell.connections.right) ? (
                      <div className="w-4 h-4 bg-transparent rounded-full"></div> 
                    ) : null
                  )}
                </div>
              );
            })}
          </div>
        ))}

         {/* Right Power Rail Alignment */}
         <div className="absolute top-0 bottom-0 right-0 w-1 bg-blue-500 z-20 opacity-50"></div>
      </div>
    </div>
  );
};