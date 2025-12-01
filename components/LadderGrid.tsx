
import React from 'react';
import { GridCell, Instruction } from '../types';

interface LadderGridProps {
  grid: GridCell[][];
  onCellClick?: (sourceIndex: number | null) => void;
  selectedSourceIndex?: number | null;
  ioState?: Record<string, boolean>;
  timers?: Record<string, number>;
  counters?: Record<string, number>;
  simulationEnabled?: boolean;
  energizedPaths?: Set<string>; 
}

const InstructionBlock: React.FC<{ 
  instruction: Instruction; 
  isSelected: boolean;
  isActive: boolean;    
  isEnergized: boolean; 
  timerValue?: number;
  counterValue?: number;
}> = ({ instruction, isSelected, isActive, isEnergized, timerValue, counterValue }) => {
  const { type, value, args } = instruction;

  const isCoil = type === 'OUT' || type === 'SET';
  const isSet = type === 'SET';
  const isRst = type === 'RST';
  const isInverse = type === 'LDI' || type === 'ANI' || type === 'ORI';
  
  const isComparator = type.includes('_EQ');
  const isFunc = type === 'MOV' || type === 'MOVP';
  const isStack = type === 'MPS' || type === 'MRD' || type === 'MPP';

  const isTimer = isCoil && value.startsWith('T');
  const isCounter = isCoil && value.startsWith('C');

  let baseColor = 'text-slate-800 border-black';
  let bgFill = 'bg-transparent';
  let iconColor = 'bg-black'; 
  
  // Color Logic
  if (isSelected) {
    baseColor = 'text-blue-900 border-blue-700';
    iconColor = 'bg-blue-700';
  } else {
    // For coils/functions, green if logic flow reaches them (isEnergized)
    // For contacts, green if their own logic state is True (isActive)
    if (isCoil || isFunc || isRst) {
      if (isEnergized) {
        baseColor = 'text-green-700 border-green-600';
        bgFill = 'bg-green-100/50';
      }
    } else if (isComparator || !isStack) {
      if (isActive) {
        baseColor = 'text-green-700 border-green-600';
        bgFill = 'bg-green-50/30';
        iconColor = 'bg-green-600';
      }
    }
  }

  // 1. STACK INSTRUCTIONS (Nodes)
  if (isStack) {
     return (
        <div className="flex items-center justify-center w-full h-full relative z-10">
           {type === 'MPS' && <div className="text-gray-600 font-bold">▼</div>}
           {type === 'MRD' && <div className="text-gray-600 font-bold text-lg">├</div>}
           {type === 'MPP' && <div className="text-gray-600 font-bold text-lg">└</div>}
        </div>
     );
  }

  // 2. FUNCTION BLOCKS (MOV, MOVP, TMR, CTR)
  if (isFunc || isTimer || isCounter) {
    let typeLabel: string = type;
    let mainText = value;
    let subText = args?.slice(1).join(' ') || '';
    let valDisplay = '';

    if (isTimer) {
       typeLabel = 'TMR';
       mainText = value; 
       subText = args?.[1] || 'K?';
       valDisplay = `${((timerValue || 0) / 1000).toFixed(1)}s`;
    } else if (isCounter) {
       typeLabel = 'CTR';
       mainText = value;
       subText = args?.[1] || 'K?';
       valDisplay = `${counterValue || 0}`;
    } else if (isFunc) {
       // Display "MOV K10 D0"
       mainText = args ? args.join(' ') : value;
       subText = '';
    }

    return (
      <div className={`
        flex flex-col items-center justify-center z-10 relative px-1 py-1 rounded cursor-pointer transition-all
        ${isSelected ? 'scale-110 shadow-lg' : 'hover:bg-gray-50'}
      `} onClick={e => e.stopPropagation()}>
        <div className={`
           border-2 ${baseColor} ${bgFill} min-w-[80px] h-14 flex flex-col items-center justify-center px-2 py-1 shadow-sm bg-white relative
        `}>
           <span className="font-bold text-[10px] text-gray-500 uppercase absolute top-0.5 left-1">{typeLabel}</span>
           <span className="font-bold text-xs mt-3 whitespace-nowrap">{mainText} {subText}</span>
           {valDisplay && <span className="font-mono text-[10px] text-blue-600 font-bold bg-white/80 px-1 rounded mt-0.5 absolute bottom-0.5 right-1">{valDisplay}</span>}
        </div>
      </div>
    );
  }

  // 3. COMPARATORS
  if (isComparator) {
    const op = type === 'LD_EQ' || type === 'AND_EQ' || type === 'OR_EQ' ? '=' : '?';
    const arg1 = value;
    const arg2 = args?.[1] || '?';
    
    return (
      <div className={`
        flex flex-col items-center justify-center z-10 relative px-1 py-1 rounded cursor-pointer transition-all
        ${isSelected ? 'scale-110' : ''}
      `}>
         <div className={`
            font-mono font-bold text-xs px-2 py-1 border-2 ${baseColor} ${bgFill} bg-white rounded
         `}>
            [ {op} {arg1} {arg2} ]
         </div>
      </div>
    );
  }

  // 4. STANDARD COILS / CONTACTS
  return (
    <div className={`
      flex flex-col items-center justify-center z-10 relative px-1 py-1 rounded cursor-pointer transition-all
      ${isSelected ? 'bg-blue-100 ring-2 ring-blue-500 scale-110 shadow-lg' : 'hover:bg-gray-50'}
    `}>
      <div className={`
        relative flex items-center justify-center font-mono font-bold text-sm transition-colors duration-200
        ${(isCoil || isRst)
          ? `w-12 h-12 rounded-full border-2 ${baseColor} ${isEnergized && !isSelected ? 'bg-green-100 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : ''}`
          : `w-10 h-8 border-x-2 ${baseColor} ${bgFill}`
        }
      `}>
         {isInverse && !isCoil && (
           <div className={`absolute w-full h-0.5 rotate-[-45deg] ${iconColor}`}></div>
         )}
         
         {isRst && <span className="absolute text-[9px] font-bold text-red-600 -top-1">RST</span>}
         {isSet && <span className="absolute text-[10px] font-bold text-yellow-600 -top-1 bg-yellow-50 px-1 rounded border border-yellow-200">SET</span>}

         <span className="z-10 bg-white/80 px-0.5 select-none text-xs truncate max-w-[40px] text-center" title={value}>{value}</span>
      </div>
      
      <span className={`text-[9px] mt-1 uppercase tracking-wider select-none ${isSelected ? 'text-blue-600 font-bold' : ((isCoil ? isEnergized : isActive) ? 'text-green-600 font-bold' : 'text-gray-400')}`}>
        {type.replace('_EQ','=')}
      </span>
    </div>
  );
};

export const LadderGrid: React.FC<LadderGridProps> = ({ 
  grid, 
  onCellClick, 
  selectedSourceIndex,
  ioState = {},
  timers = {},
  counters = {},
  simulationEnabled = false,
  energizedPaths = new Set()
}) => {
  if (!grid || grid.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
        No instructions. Load a test case or Import Text.
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
              
              // 1. Logic State Calculation
              let isActive = false;
              if (simulationEnabled && cell.instruction) {
                 const inst = cell.instruction;
                 const type = inst.type;
                 // Coils/Latch
                 if (type === 'OUT' || type === 'RST' || type === 'SET') {
                    isActive = !!ioState[inst.value];
                 } 
                 // Contacts
                 else if (type === 'LD' || type === 'AND' || type === 'OR') {
                    isActive = !!ioState[inst.value];
                 } else if (type === 'LDI' || type === 'ANI' || type === 'ORI') {
                    isActive = !ioState[inst.value];
                 }
                 // Comparators (Logic is handled in sim, but for visual greenness we check stack logic?)
                 // Actually, useLadderSimulator hook state doesn't export the specific True/False of comparison result per instruction.
                 // We will approximate: if the instruction is on an Energized Path input side, AND it passes power, it is Active.
                 // But simply: Input Energized + Logic Passes = Active.
                 // We computed this in powerFlow implicitly. 
                 // Let's rely on 'conducts' logic approximation or just assume if input energized and output energized -> it passed.
                 if (type.includes('_EQ')) {
                    const inputEn = energizedPaths.has(`${colIndex},${rowIndex},in`);
                    const outputEn = energizedPaths.has(`${colIndex},${rowIndex},out`);
                    isActive = inputEn && outputEn;
                 }
              }

              const inputEnergized = energizedPaths.has(`${colIndex},${rowIndex},in`);
              const outputEnergized = energizedPaths.has(`${colIndex},${rowIndex},out`);
              
              const activeWire = 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]';
              const inactiveWire = 'bg-black';

              return (
                <div 
                  key={`${rowIndex}-${colIndex}`} 
                  className="relative w-32 h-24 flex items-center justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onCellClick) onCellClick(cell.sourceIndex);
                  }}
                >
                  {/* Wires */}
                  {(cell.connections.left || cell.x === 0) && (
                     <div className={`absolute left-0 top-1/2 w-1/2 h-0.5 -translate-y-1/2 ${inputEnergized ? activeWire : inactiveWire}`}></div>
                  )}
                  {cell.connections.right && (
                     <div className={`absolute right-0 top-1/2 w-1/2 h-0.5 -translate-y-1/2 ${outputEnergized ? activeWire : inactiveWire}`}></div>
                  )}
                  {cell.connections.up && (
                     <div className={`absolute right-0 top-0 h-1/2 w-0.5 translate-x-[0.5px] ${outputEnergized ? activeWire : inactiveWire}`}></div>
                  )}
                  {cell.connections.down && (
                     <div className={`absolute right-0 top-1/2 h-1/2 w-0.5 translate-x-[0.5px] ${outputEnergized ? activeWire : inactiveWire}`}></div>
                  )}

                  {cell.instruction ? (
                    <InstructionBlock 
                      instruction={cell.instruction} 
                      isSelected={isSelected}
                      isActive={isActive}
                      isEnergized={inputEnergized} 
                      timerValue={timers?.[cell.instruction.value]}
                      counterValue={counters?.[cell.instruction.value]}
                    />
                  ) : (
                    (cell.connections.left && cell.connections.right || cell.connections.up || cell.connections.down) ? (
                      <div className={`w-2 h-2 rounded-full ${inputEnergized && outputEnergized ? 'bg-green-500' : 'bg-transparent'}`}></div> 
                    ) : null
                  )}
                </div>
              );
            })}
          </div>
        ))}
         <div className="absolute top-0 bottom-0 right-0 w-1 bg-blue-500 z-20 opacity-30"></div>
      </div>
    </div>
  );
};
