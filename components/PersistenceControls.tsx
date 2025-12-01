
import React, { useRef } from 'react';
import { Download, Upload, Save, FolderOpen } from 'lucide-react';
import { Instruction, LadderData } from '../types';

interface PersistenceControlsProps {
  instructions: Instruction[];
  onLoad: (instructions: Instruction[]) => void;
}

export const PersistenceControls: React.FC<PersistenceControlsProps> = ({ instructions, onLoad }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveLocal = () => {
    localStorage.setItem('ladder_logic_autosave', JSON.stringify(instructions));
    alert('Project saved to browser storage.');
  };

  const handleLoadLocal = () => {
    const saved = localStorage.getItem('ladder_logic_autosave');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        onLoad(parsed);
      } catch (e) {
        alert('Failed to load local save.');
      }
    } else {
      alert('No saved project found.');
    }
  };

  const handleExport = () => {
    const data: LadderData = {
      instructions,
      meta: {
        version: "1.0",
        date: new Date().toISOString()
      }
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ladder_logic_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const json = JSON.parse(text);
        
        // Basic Validation
        if (json.instructions && Array.isArray(json.instructions)) {
           onLoad(json.instructions);
        } else if (Array.isArray(json)) {
           // Legacy/Direct array support
           onLoad(json);
        } else {
           alert('Invalid file format.');
        }
      } catch (err) {
        alert('Failed to parse JSON.');
      }
    };
    reader.readAsText(file);
    // Reset
    e.target.value = ''; 
  };

  return (
    <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
       <button onClick={handleSaveLocal} title="Save to Browser" className="p-2 text-gray-600 hover:text-blue-600 hover:bg-white rounded transition-colors">
         <Save size={18} />
       </button>
       <button onClick={handleLoadLocal} title="Load from Browser" className="p-2 text-gray-600 hover:text-blue-600 hover:bg-white rounded transition-colors">
         <FolderOpen size={18} />
       </button>
       <div className="w-px h-4 bg-gray-300 mx-1"></div>
       <button onClick={handleExport} title="Export JSON" className="p-2 text-gray-600 hover:text-blue-600 hover:bg-white rounded transition-colors">
         <Download size={18} />
       </button>
       <button onClick={handleImportClick} title="Import JSON" className="p-2 text-gray-600 hover:text-blue-600 hover:bg-white rounded transition-colors">
         <Upload size={18} />
       </button>
       <input 
         type="file" 
         ref={fileInputRef} 
         onChange={handleFileChange} 
         accept=".json" 
         className="hidden" 
       />
    </div>
  );
};
