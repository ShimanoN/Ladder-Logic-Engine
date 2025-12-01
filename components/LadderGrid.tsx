
import React from 'react';
import { GridCell, Instruction } from '../types';

interface LadderGridProps {
  grid: GridCell[][];
  onCellClick?: (sourceIndex: number | null) => void;
  selectedSourceIndex?: number | null;
  ioState?: Record<string, boolean>;
  simulationEnabled?: boolean;
  energizedPaths?: Set<string>; // New prop: Set of energized coordinate keys
}

const InstructionBlock: React.FC<{ 
  instruction: Instruction; 
  isSelected: boolean;
  isActive: boolean;    // Logic State (True/False)
  isEnergized: boolean; // Power State (Receiving Power)
}> = ({ instruction, isSelected, isActive, isEnergized }) => {
  const isCoil = instruction.type === 'OUT';
  const isInverse = instruction.type.includes('I') || instruction.type === 'ANI' || instruction.type === 'LDI';

  // Logic for color:
  // Selected -> Blue.
  // Coil -> Green ONLY if Energized.
  // Contact -> Green text/border if Logic True (to show status), but maybe simpler if we stick to one paradigm.
  // Let's stick to: Contacts show logic state (Green=Closed), Coils show Power state (Green=On).
  
  let baseColor = 'text-slate-800 border-black';
  let bgFill = 'bg-transparent';
  let iconColor = 'bg-black'; // The slash color
  
  if (isSelected) {
    baseColor = 'text-blue-900 border-blue-700';
    iconColor = 'bg-blue-700';
  } else {
    if (isCoil) {
      // Coils only light up if they have power
      if (isEnergized) {
        baseColor = 'text-green-700 border-green-600';
        bgFill = 'bg-green-100/50';
      }
    } else {
      // Contacts light up if they are logically True (Closed)
      // This helps debug "Why is power stopping here?"
      if (isActive) {
        baseColor = 'text-green-700 border-green-600';
        bgFill = 'bg-green-50/30';
        iconColor = 'bg-green-600';
      }
    }
  }

  return (
    <div className={`
      flex flex-col items-center justify-center z-10 relative px-1 py-1 rounded cursor-pointer transition-all
      ${isSelected ? 'bg-blue-100 ring-2 ring-blue-500 scale-110 shadow-lg' : 'bg-white hover:bg-gray-50'}
    `}>
      {/* Symbol */}
      <div className={`
        relative flex items-center justify-center font-mono font-bold text-sm transition-colors duration-200
        ${isCoil 
          ? `w-12 h-12 rounded-full border-2 ${baseColor} ${isEnergized && !isSelected ? 'bg-green-100 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : ''}`
          : `w-10 h-8 border-x-2 ${baseColor} ${bgFill}`
        }
      `}>
         {/* Inverse Slash */}
         {isInverse && !isCoil && (
           <div className={`absolute w-full h-0.5 rotate-[-45deg] ${iconColor}`}></div>
         )}
         
         <span className="z-10 bg-white/80 px-0.5 select-none text-xs">{instruction.value}</span>
      </div>
      
      {/* Type Label */}
      <span className={`text-[10px] mt-1 uppercase tracking-wider select-none ${isSelected ? 'text-blue-600 font-bold' : ((isCoil ? isEnergized : isActive) ? 'text-green-600 font-bold' : 'text-gray-400')}`}>
        {instruction.type}
      </span>
    </div>
  );
};

export const LadderGrid: React.FC<LadderGridProps> = ({ 
  grid, 
  onCellClick, 
  selectedSourceIndex,
  ioState = {},
  simulationEnabled = false,
  energizedPaths = new Set()
}) => {
  if (!grid || grid.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
        No instructions to render. Load a test case.
      </div>
    );
  }

  return (
    <div className={`
      w-full overflow-x-auto ladder-scroll bg-gray-50 border border-gray-200 rounded-lg p-8 shadow-inner transition-colors duration-500
      ${simulationEnabled ? 'border-green-300 bg-green-50/10' : ''}
    `}>
      <div className="inline-flex flex-col gap-0 relative">
        
        {/* Left Power Rail */}
        <div className={`absolute top-0 bottom-0 left-0 w-1 z-20 transition-colors duration-300 ${simulationEnabled ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-red-500'}`}></div>

        {grid.map((row, rowIndex) => (
          <div key={rowIndex} className="flex">
            {row.map((cell, colIndex) => {
              const isSelected = cell.sourceIndex !== null && cell.sourceIndex === selectedSourceIndex;
              
              // 1. Logic State Calculation (True/False)
              let isActive = false;
              if (simulationEnabled && cell.instruction) {
                 const val = cell.instruction.value;
                 const type = cell.instruction.type;
                 const stateVal = !!ioState[val];
                 
                 // Contacts (Inputs)
                 if (type === 'LD' || type === 'AND' || type === 'OR') {
                    isActive = stateVal; // NO contact: Active if True
                 } else if (type === 'LDI' || type === 'ANI' || type === 'ORI') {
                    isActive = !stateVal; // NC contact: Active if False
                 } 
                 // Coils (Outputs)
                 else if (type === 'OUT') {
                    isActive = stateVal; // Coil: Active if True
                 }
              }

              // 2. Power Flow Calculation (Energized Wires)
              const inputEnergized = energizedPaths.has(`${colIndex},${rowIndex},in`);
              const outputEnergized = energizedPaths.has(`${colIndex},${rowIndex},out`);

              // Colors for wires
              const inactiveWire = 'bg-black';
              const activeWire = 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]';

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
                  
                  {/* Horizontal: Left Connection (Input Side) */}
                  {(cell.connections.left || cell.x === 0) && (
                     <div className={`absolute left-0 top-1/2 w-1/2 h-0.5 -translate-y-1/2 transition-colors duration-300 ${inputEnergized ? activeWire : inactiveWire}`}></div>
                  )}
                  
                  {/* Horizontal: Right Connection (Output Side) */}
                  {cell.connections.right && (
                     <div className={`absolute right-0 top-1/2 w-1/2 h-0.5 -translate-y-1/2 transition-colors duration-300 ${outputEnergized ? activeWire : inactiveWire}`}></div>
                  )}

                  {/* Vertical: Merge Line Up (Right Edge -> Output Side) */}
                  {cell.connections.up && (
                     <div className={`absolute right-0 top-0 h-1/2 w-0.5 translate-x-[0.5px] transition-colors duration-300 ${outputEnergized ? activeWire : inactiveWire}`}></div>
                  )}

                  {/* Vertical: Merge Line Down (Right Edge -> Output Side) */}
                  {cell.connections.down && (
                     <div className={`absolute right-0 top-1/2 h-1/2 w-0.5 translate-x-[0.5px] transition-colors duration-300 ${outputEnergized ? activeWire : inactiveWire}`}></div>
                  )}

                  {/* --- COMPONENT LAYER --- */}
                  {cell.instruction ? (
                    <InstructionBlock 
                      instruction={cell.instruction} 
                      isSelected={isSelected}
                      isActive={isActive}
                      isEnergized={inputEnergized} // Pass input energy to light up coil
                    />
                  ) : (
                    // Wire Joint Visualization
                    (cell.connections.left && cell.connections.right) ? (
                      <div className={`w-3 h-3 rounded-full transition-colors duration-300 ${inputEnergized && outputEnergized ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]' : 'bg-transparent'}`}></div> 
                    ) : null
                  )}
                </div>
              );
            })}
          </div>
        ))}

         {/* Right Power Rail Alignment */}
         <div className="absolute top-0 bottom-0 right-0 w-1 bg-blue-500 z-20 opacity-30"></div>
      </div>
    </div>
  );
};
