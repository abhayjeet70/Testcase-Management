import { TestCaseTemplate } from '../types';
import { saveTestCase, saveDocument, getDocumentsAll } from './storage';
import { ensureCustomColumn } from './customColumnHelpers';
import { getDefaultStatus } from './appSettings';

export function applyTemplateToDocument(
  template: TestCaseTemplate,
  projectId: string,
  documentId: string,
  options?: { syncModuleCode?: boolean }
): number {
  if (options?.syncModuleCode !== false && template.moduleName) {
    const existing = getDocumentsAll().find(d => d.id === documentId);
    if (existing) {
      saveDocument({
        ...existing,
        module_code: template.moduleName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12),
      });
    }
  }

  const priorityCol = ensureCustomColumn(projectId, 'Priority', 'Dropdown');
  let count = 0;

  template.testCases.forEach(item => {
    const custom_values: Record<string, string> = {};
    if (item.priority) {
      custom_values[priorityCol.id] = item.priority;
    }
    saveTestCase({
      project_id: projectId,
      document_id: documentId,
      name: item.name,
      test_objective: item.test_objective,
      test_steps: item.test_steps,
      issues: item.issues || '',
      status: item.status || template.defaultStatus || getDefaultStatus(),
      custom_values,
    });
    count++;
  });

  return count;
}

export function exportTemplatesJson(templates: TestCaseTemplate[]): string {
  return JSON.stringify({
    version: 1 as const,
    exportedAt: new Date().toISOString(),
    templates: templates.filter(t => !t.isBuiltIn),
  }, null, 2);
}
