import React from 'react';
import { X } from 'lucide-react';
import { KEYBOARD_SHORTCUTS } from '../../constants/keyboardShortcuts';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsDialog({ open, onClose }: Props) {
  if (!open) return null;

  const categories = [...new Set(KEYBOARD_SHORTCUTS.map(s => s.category))];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white border border-[#E7D6C4] rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E7D6C4]">
          <h2 className="text-sm font-bold text-[#3B2A1D]">Keyboard Shortcuts</h2>
          <button type="button" onClick={onClose} className="text-[#7A6A5A] hover:text-[#3B2A1D]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-5 space-y-5">
          {categories.map(cat => (
            <div key={cat}>
              <h3 className="text-[10px] font-bold text-[#8B5A2B] uppercase tracking-wider mb-2">{cat}</h3>
              <div className="space-y-1.5">
                {KEYBOARD_SHORTCUTS.filter(s => s.category === cat).map(s => (
                  <div key={s.keys + s.label} className="flex items-center justify-between text-sm">
                    <span className="text-[#3B2A1D]">{s.label}</span>
                    <kbd className="text-[11px] font-mono bg-[#FFF4E8] border border-[#E7D6C4] px-2 py-0.5 rounded text-[#8B5A2B]">
                      {s.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
