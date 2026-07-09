import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Command } from 'lucide-react';
import { getCommandPaletteItems, filterCommands, CommandContext, CommandPaletteItem } from '../../utils/commandPalette';
import { HighlightMatch, findMatchRanges } from '../search/HighlightMatch';

interface Props {
  open: boolean;
  onClose: () => void;
  context: CommandContext;
}

export default function CommandPalette({ open, onClose, context }: Props) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const allItems = useMemo(() => getCommandPaletteItems(context), [context]);
  const items = useMemo(() => filterCommands(allItems, query), [allItems, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => { setSelected(0); }, [query]);

  const runItem = useCallback((item: CommandPaletteItem) => {
    if (item.disabled) return;
    onClose();
    item.run();
  }, [context, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, items.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === 'Enter') { e.preventDefault(); const item = items[selected]; if (item) runItem(item); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, items, selected, onClose, runItem]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="fixed top-[12%] left-1/2 -translate-x-1/2 w-[min(640px,92vw)] bg-white/95 backdrop-blur-xl border border-[#E7D6C4]/80 shadow-2xl rounded-xl overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E7D6C4]/60">
          <Command className="w-5 h-5 text-[#8B5A2B] shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type a command or search…"
            className="flex-1 text-base bg-transparent outline-none text-[#3B2A1D] placeholder:text-[#7A6A5A]"
          />
        </div>
        <div className="max-h-[50vh] overflow-y-auto py-1" role="listbox">
          {items.map((item, idx) => {
            const ranges = query ? findMatchRanges(item.label, query) : [];
            return (
              <div
                key={item.id}
                role="option"
                aria-selected={idx === selected}
                aria-disabled={item.disabled}
                className={`px-4 py-2.5 border-l-2 flex items-center justify-between gap-3 ${
                  idx === selected ? 'bg-[#8B5A2B]/12 border-[#8B5A2B]' : 'border-transparent'
                } ${item.disabled ? 'opacity-50' : ''}`}
              >
                <div>
                  <span className="text-sm font-medium text-[#3B2A1D]">
                    <HighlightMatch text={item.label} ranges={ranges} />
                  </span>
                  {item.detail && <p className="text-xs text-[#7A6A5A]">{item.detail}</p>}
                </div>
                {item.shortcut && (
                  <kbd className="text-[10px] font-mono text-[#7A6A5A] shrink-0">{item.shortcut}</kbd>
                )}
              </div>
            );
          })}
        </div>
        <div className="px-4 py-2 border-t border-[#E7D6C4]/60 text-[10px] text-[#7A6A5A]">
          ↑↓ navigate · Enter run · Esc close
        </div>
      </div>
    </div>
  );
}
