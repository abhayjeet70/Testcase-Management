import React from 'react';

export function HighlightMatch({
  text,
  ranges,
}: {
  text: string;
  ranges: [number, number][];
}) {
  if (!ranges.length) return <>{text}</>;
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  sorted.forEach(([start, end], i) => {
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(
      <mark key={i} className="bg-amber-200 text-[#3D2E1F] rounded px-0.5">
        {text.slice(start, end)}
      </mark>
    );
    cursor = end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}

export function findMatchRanges(text: string, query: string): [number, number][] {
  const lower = text.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const idx = lower.indexOf(q);
  if (idx === -1) return [];
  return [[idx, idx + q.length]];
}

export function fuzzyScore(label: string, keywords: string[], query: string): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  const hay = (label + ' ' + keywords.join(' ')).toLowerCase();
  if (hay.includes(q)) return 100;
  let qi = 0;
  for (let i = 0; i < hay.length && qi < q.length; i++) {
    if (hay[i] === q[qi]) qi++;
  }
  return qi === q.length ? 50 : 0;
}
