import { Project, TestCaseDocument, ProjectModule } from '../types';
import { getProjects, getDocumentsAll, getTestCasesAll, getModules } from './storage';
import { getAppSettings } from './appSettings';

export function deriveProjectPrefix(projectName: string): string {
  const words = projectName.replace(/[^a-zA-Z0-9\s]/g, '').trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words.slice(0, 3).map(w => w[0]).join('').toUpperCase().slice(0, 4);
  }
  const alnum = projectName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return alnum.slice(0, 3) || 'TC';
}

export function deriveModuleCode(name: string): string {
  const base = name.replace(/\.docx$/i, '').replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
  const code = base.replace(/\s+/g, '_').toUpperCase().slice(0, 12);
  return code || 'MOD';
}

export function formatTestCaseId(prefix: string, module: string, number: number): string {
  return `${prefix}-${module}-${String(number).padStart(3, '0')}`;
}

export function parseTestCaseId(id: string): { prefix: string; module: string; number: number } | null {
  const match = id.match(/^([A-Z0-9]+)-([A-Z0-9_]+)-(\d{3,})$/);
  if (!match) return null;
  return { prefix: match[1], module: match[2], number: parseInt(match[3], 10) };
}

export function getResolvedPrefix(project: Project): string {
  return project.id_prefix?.trim() || deriveProjectPrefix(project.project_name);
}

export function getResolvedModuleCode(
  document: TestCaseDocument,
  module?: ProjectModule
): string {
  if (document.module_code?.trim()) return document.module_code.trim().toUpperCase();
  if (module?.module_code?.trim()) return module.module_code.trim().toUpperCase();
  if (module?.name) return deriveModuleCode(module.name);
  return deriveModuleCode(document.name);
}

export function generateNextTestCaseId(
  projectId: string,
  documentId: string,
  excludeCaseId?: string
): string {
  const project = getProjects().find(p => p.id === projectId);
  const document = getDocumentsAll().find(d => d.id === documentId);
  if (!project || !document) return 'TC-001';

  const prefix = getResolvedPrefix(project);
  const module = document.module_id
    ? getModules(projectId).find(m => m.id === document.module_id)
    : undefined;
  const moduleCode = getResolvedModuleCode(document, module);

  const cases = getTestCasesAll().filter(
    tc => tc.document_id === documentId && tc.id !== excludeCaseId
  );

  const pattern = new RegExp(`^${prefix}-${moduleCode}-(\\d+)$`);
  let maxNum = 0;
  cases.forEach(tc => {
    const m = tc.test_case_no.match(pattern);
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    const parsed = parseTestCaseId(tc.test_case_no);
    if (parsed && parsed.prefix === prefix && parsed.module === moduleCode) {
      maxNum = Math.max(maxNum, parsed.number);
    }
  });

  return formatTestCaseId(prefix, moduleCode, maxNum + 1);
}

export function generateLegacyTestCaseNo(documentId: string, excludeCaseId?: string): string {
  const cases = getTestCasesAll().filter(
    tc => tc.document_id === documentId && tc.id !== excludeCaseId
  );
  const nums = cases
    .map(tc => {
      const match = tc.test_case_no.match(/TC-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(n => n > 0);
  const nextInt = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `TC-${String(nextInt).padStart(3, '0')}`;
}

export function generateTestCaseNo(
  projectId: string,
  documentId: string,
  excludeCaseId?: string
): string {
  if (getAppSettings().autoNumberingEnabled) {
    return generateNextTestCaseId(projectId, documentId, excludeCaseId);
  }
  return generateLegacyTestCaseNo(documentId, excludeCaseId);
}

export function isDuplicateTestCaseId(
  testCaseNo: string,
  documentId: string,
  excludeCaseId?: string
): boolean {
  return getTestCasesAll().some(
    tc => tc.document_id === documentId && tc.id !== excludeCaseId && tc.test_case_no === testCaseNo
  );
}
