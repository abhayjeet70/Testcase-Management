export interface ShortcutDefinition {
  keys: string;
  label: string;
  category: 'Editing' | 'Navigation' | 'Selection' | 'History' | 'Export' | 'Search' | 'Help';
}

export const KEYBOARD_SHORTCUTS: ShortcutDefinition[] = [
  { keys: 'Ctrl + N', label: 'New test case', category: 'Editing' },
  { keys: 'Ctrl + D', label: 'Duplicate row', category: 'Editing' },
  { keys: 'Ctrl + S', label: 'Save / commit edit', category: 'Editing' },
  { keys: 'Ctrl + Z', label: 'Undo', category: 'History' },
  { keys: 'Ctrl + Y', label: 'Redo', category: 'History' },
  { keys: 'Ctrl + Shift + Z', label: 'Redo', category: 'History' },
  { keys: 'Ctrl + A', label: 'Select all filtered rows', category: 'Selection' },
  { keys: 'Esc', label: 'Clear selection / close dialog', category: 'Selection' },
  { keys: 'Delete', label: 'Delete selected row(s)', category: 'Selection' },
  { keys: 'Enter', label: 'Edit name on selected row', category: 'Navigation' },
  { keys: 'Arrow Up / Down', label: 'Navigate rows', category: 'Navigation' },
  { keys: 'Ctrl + F', label: 'Focus table search', category: 'Search' },
  { keys: 'Ctrl + Shift + F', label: 'Workspace search', category: 'Search' },
  { keys: 'Ctrl + Shift + P', label: 'Command palette', category: 'Search' },
  { keys: 'Ctrl + Shift + E', label: 'Export document', category: 'Export' },
  { keys: 'Ctrl + /', label: 'Keyboard shortcuts help', category: 'Help' },
];

import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

export function isModKey(e: KeyboardEvent | ReactKeyboardEvent): boolean {
  return e.ctrlKey || e.metaKey;
}
