import { CustomColumn, TestCase } from '../types';
import { getCustomColumns, saveCustomColumn } from './storage';

export function ensureCustomColumn(
  projectId: string,
  name: string,
  type: CustomColumn['type'] = 'Text'
): CustomColumn {
  const cols = getCustomColumns(projectId);
  const existing = cols.find(c => c.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing;
  return saveCustomColumn({ project_id: projectId, name, type });
}

export function getCustomColumnValue(
  tc: TestCase,
  columnName: string,
  columns: CustomColumn[]
): string {
  const col = columns.find(c => c.name.toLowerCase() === columnName.toLowerCase());
  if (!col || !tc.custom_values) return '';
  return tc.custom_values[col.id] || '';
}

export function setBulkCustomValue(
  testCaseIds: string[],
  columnId: string,
  value: string,
  allCases: TestCase[],
  onSave: (tc: TestCase) => void
): void {
  testCaseIds.forEach(id => {
    const tc = allCases.find(c => c.id === id);
    if (!tc) return;
    onSave({
      ...tc,
      custom_values: { ...(tc.custom_values || {}), [columnId]: value },
    });
  });
}
