
import React, { useState } from 'react';
import { FileText, X, Check, AlertCircle } from 'lucide-react';
import { parseMnemonic } from '../logic/mnemonicParser';
import { Instruction } from '../types';

interface MnemonicImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (instructions: Instruction[]) => void;
}

export const MnemonicImporter: React.FC<MnemonicImporterProps> = ({ isOpen, onClose, onImport }) => {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleParse = () => {
    try {
      const instructions = parseMnemonic(text);
      if (instructions.length === 0) {
        setError('No valid instructions found.');
        return;
      }
      onImport(instructions);
      onClose();
      setText('');
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handlePasteDemo = () => {
    const demo = `// Self-Holding Circuit
LD X0
OR Y0
ANI X1
OUT Y0

// Second Rung
LD X2
OUT Y1`;
    setText(demo);
    setError(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] scale-100 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800">
              <FileText className="text-blue-600" />
              Import Mnemonic Code
            </h3>
            <p className="text-xs text-gray-400 mt-1">Paste raw instruction list (IL) text below.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-hidden flex flex-col gap-4">
          <textarea
            className="w-full flex-1 border border-gray-300 rounded-lg p-4 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none bg-slate-50 text-slate-700 shadow-inner"
            placeholder={`LD X0\nOR Y0\nANI X1\nOUT Y0`}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError(null);
            }}
            spellCheck={false}
          />

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200 flex items-center gap-2 animate-in slide-in-from-bottom-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}
          
          <div className="flex justify-between items-center">
             <button onClick={handlePasteDemo} className="text-xs text-blue-600 hover:underline font-medium">
                Paste Example Code
             </button>
             <span className="text-xs text-gray-400">
                Supported: LD, LDI, AND, ANI, OR, ORI, OUT, ORB, ANB
             </span>
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 bg-gray-50/50 rounded-b-xl flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors font-medium text-sm"
          >
            Cancel
          </button>
          <button 
            onClick={handleParse}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all active:scale-95 font-bold flex items-center gap-2 text-sm"
          >
            <Check size={18} />
            Parse & Load
          </button>
        </div>
      </div>
    </div>
  );
};
