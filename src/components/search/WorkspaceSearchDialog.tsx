import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search } from 'lucide-react';
import { searchWorkspace, WorkspaceSearchResult } from '../../utils/workspaceSearch';
import { HighlightMatch } from './HighlightMatch';

interface Props {
  open: boolean;
  onClose: () => void;
  onNavigate: (result: WorkspaceSearchResult) => void;
}

export default function WorkspaceSearchDialog({ open, onClose, onNavigate }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WorkspaceSearchResult[]>([]);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const t = setTimeout(() => {
      setResults(searchWorkspace({ query, limit: 80 }));
      setSelected(0);
    }, 150);
    return () => clearTimeout(t);
  }, [query]);

  const runSelected = useCallback(() => {
    const r = results[selected];
    if (r) {
      onNavigate(r);
      onClose();
    }
  }, [results, selected, onNavigate, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === 'Enter') { e.preventDefault(); runSelected(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, results.length, onClose, runSelected]);

  if (!open) return null;

  const grouped = results.reduce<Record<string, WorkspaceSearchResult[]>>((acc, r) => {
    const key = r.type.toUpperCase();
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  let flatIdx = 0;

  return (
    <div className="fixed inset-0 z-[200] bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="fixed top-[12%] left-1/2 -translate-x-1/2 w-[min(640px,92vw)] bg-white/95 backdrop-blur-xl border border-[#E7D6C4]/80 shadow-2xl rounded-xl overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E7D6C4]/60">
          <Search className="w-5 h-5 text-[#8B5A2B] shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search projects, documents, test cases…"
            className="flex-1 text-base bg-transparent outline-none text-[#3B2A1D] placeholder:text-[#7A6A5A]"
          />
          <span className="text-[10px] text-[#7A6A5A] font-mono">Esc</span>
        </div>
        <div className="max-h-[50vh] overflow-y-auto py-2" role="listbox">
          {!query && results.length === 0 && (
            <p className="px-4 py-6 text-sm text-[#7A6A5A] text-center">Type to search across your workspace</p>
          )}
          {query && results.length === 0 && (
            <p className="px-4 py-6 text-sm text-[#7A6A5A] text-center">No matches for &quot;{query}&quot;</p>
          )}
          {(Object.entries(grouped) as [string, WorkspaceSearchResult[]][]).map(([group, items]) => (
            <div key={group}>
              <div className="px-4 py-1 text-[10px] font-bold text-[#8B5A2B] uppercase tracking-wider">{group}</div>
              {items.map(r => {
                const idx = flatIdx++;
                const isSel = idx === selected;
                return (
                  <div
                    key={r.id + r.type}
                    role="option"
                    aria-selected={isSel}
                    className={`px-4 py-2.5 cursor-default border-l-2 ${isSel ? 'bg-[#8B5A2B]/12 border-[#8B5A2B]' : 'border-transparent'}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#3B2A1D]">
                        <HighlightMatch text={r.title} ranges={r.matchRanges} />
                      </span>
                      {r.isArchived && (
                        <span className="text-[9px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-bold">Archived</span>
                      )}
                    </div>
                    <p className="text-xs text-[#7A6A5A] truncate">{r.subtitle}</p>
                    {r.snippet && (
                      <p className="text-xs text-[#7A6A5A] mt-0.5 truncate">
                        <HighlightMatch text={r.snippet} ranges={r.matchRanges} />
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="px-4 py-2 border-t border-[#E7D6C4]/60 text-[10px] text-[#7A6A5A]">
          ↑↓ navigate · Enter open · Esc close
        </div>
      </div>
    </div>
  );
}
