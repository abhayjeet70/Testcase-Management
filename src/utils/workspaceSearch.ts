import { ScreenshotSlot } from '../types';
import {
  getProjects,
  getDocumentsAll,
  getTestCasesAll,
  getModulesAll,
  getTagsAll,
  getCustomColumnsAll,
} from './storage';

export type WorkspaceSearchResultType =
  | 'project'
  | 'document'
  | 'test_case'
  | 'module'
  | 'tag'
  | 'developer'
  | 'screenshot';

export interface WorkspaceSearchResult {
  id: string;
  type: WorkspaceSearchResultType;
  title: string;
  subtitle: string;
  matchedField: string;
  snippet: string;
  matchRanges: [number, number][];
  score: number;
  projectId: string;
  documentId?: string;
  testCaseId?: string;
  moduleId?: string;
  tagId?: string;
  screenshotId?: string;
  developerName?: string;
  isArchived?: boolean;
}

export interface WorkspaceSearchOptions {
  query: string;
  limit?: number;
  types?: WorkspaceSearchResultType[];
}

const SNIPPET_MAX = 120;
const DEVELOPER_COLUMN = 'developer';

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ');
}

function containsQuery(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase());
}

function scoreField(value: string, query: string, isTitle: boolean): number {
  const hay = value.toLowerCase();
  const q = query.toLowerCase();
  if (!hay.includes(q)) return 0;
  if (isTitle && hay.startsWith(q)) return 100;
  if (isTitle) return 30;
  return 10;
}

function findMatchRanges(text: string, query: string): [number, number][] {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  if (!q) return [];
  const ranges: [number, number][] = [];
  let start = 0;
  while (start < lower.length) {
    const idx = lower.indexOf(q, start);
    if (idx === -1) break;
    ranges.push([idx, idx + q.length]);
    start = idx + q.length;
  }
  return ranges;
}

function buildSnippet(
  text: string,
  query: string
): { snippet: string; matchRanges: [number, number][] } {
  const q = query.trim();
  if (!q) {
    return { snippet: text.slice(0, SNIPPET_MAX), matchRanges: [] };
  }

  const lower = text.toLowerCase();
  const qLower = q.toLowerCase();
  const idx = lower.indexOf(qLower);
  if (idx === -1) {
    return { snippet: text.slice(0, SNIPPET_MAX), matchRanges: [] };
  }

  const pad = 30;
  let start = Math.max(0, idx - pad);
  let end = Math.min(text.length, start + SNIPPET_MAX);
  if (end - start < SNIPPET_MAX) {
    start = Math.max(0, end - SNIPPET_MAX);
  }

  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  const raw = text.slice(start, end);
  const snippet = prefix + raw + suffix;
  const matchStart = idx - start + prefix.length;

  return {
    snippet,
    matchRanges: [[matchStart, matchStart + q.length]],
  };
}

function slotLabel(slot?: ScreenshotSlot): string {
  switch (slot) {
    case 'comparison_original':
      return 'Comparison (Original)';
    case 'comparison_updated':
      return 'Comparison (Updated)';
    case 'primary':
    default:
      return 'Primary';
  }
}

function projectSubtitle(
  projectId: string,
  projectById: Map<string, { project_name: string }>
): string {
  return projectById.get(projectId)?.project_name ?? 'Unknown project';
}

function documentSubtitle(
  projectId: string,
  documentId: string | undefined,
  projectById: Map<string, { project_name: string }>,
  documentById: Map<string, { name: string }>
): string {
  const projectName = projectById.get(projectId)?.project_name ?? 'Unknown project';
  if (!documentId) return projectName;
  const docName = documentById.get(documentId)?.name;
  return docName ? `${projectName} › ${docName}` : projectName;
}

function isArchivedContext(
  projectId: string,
  documentId: string | undefined,
  projectById: Map<string, { archived: boolean }>,
  documentById: Map<string, { archived?: boolean }>
): boolean {
  const projectArchived = projectById.get(projectId)?.archived ?? false;
  const documentArchived = documentId
    ? documentById.get(documentId)?.archived ?? false
    : false;
  return projectArchived || documentArchived;
}

export function searchWorkspace({
  query,
  limit = 80,
  types,
}: WorkspaceSearchOptions): WorkspaceSearchResult[] {
  const q = normalizeQuery(query);
  if (!q) return [];

  const allowedTypes = types?.length ? new Set(types) : null;
  const shouldSearch = (type: WorkspaceSearchResultType): boolean =>
    !allowedTypes || allowedTypes.has(type);

  const projects = getProjects();
  const documents = getDocumentsAll();
  const testCases = getTestCasesAll();
  const modules = getModulesAll();
  const tags = getTagsAll();
  const customColumns = getCustomColumnsAll();

  const projectById = new Map(projects.map(p => [p.id, p]));
  const documentById = new Map(documents.map(d => [d.id, d]));

  const developerColumns = customColumns.filter(
    col => col.name.toLowerCase() === DEVELOPER_COLUMN
  );
  const developerColumnIdsByProject = new Map<string, string[]>();
  developerColumns.forEach(col => {
    const existing = developerColumnIdsByProject.get(col.project_id) ?? [];
    existing.push(col.id);
    developerColumnIdsByProject.set(col.project_id, existing);
  });

  const results: WorkspaceSearchResult[] = [];

  const pushMatch = (result: Omit<WorkspaceSearchResult, 'snippet' | 'matchRanges'> & {
    displayText: string;
  }) => {
    const { displayText, ...rest } = result;
    const { snippet, matchRanges } = buildSnippet(displayText, q);
    results.push({ ...rest, snippet, matchRanges });
  };

  if (shouldSearch('project')) {
    for (const project of projects) {
      const fields: Array<{ key: string; value: string; isTitle: boolean }> = [
        { key: 'project_name', value: project.project_name, isTitle: true },
        { key: 'description', value: project.description ?? '', isTitle: false },
      ];

      for (const field of fields) {
        if (!field.value || !containsQuery(field.value, q)) continue;
        const score = scoreField(field.value, q, field.isTitle);
        pushMatch({
          id: project.id,
          type: 'project',
          title: project.project_name,
          subtitle: 'Project',
          matchedField: field.key,
          score,
          projectId: project.id,
          isArchived: project.archived,
          displayText: field.value,
        });
      }
    }
  }

  if (shouldSearch('document')) {
    for (const document of documents) {
      const fields: Array<{ key: string; value: string; isTitle: boolean }> = [
        { key: 'name', value: document.name, isTitle: true },
        { key: 'description', value: document.description ?? '', isTitle: false },
      ];

      for (const field of fields) {
        if (!field.value || !containsQuery(field.value, q)) continue;
        const score = scoreField(field.value, q, field.isTitle);
        pushMatch({
          id: document.id,
          type: 'document',
          title: document.name,
          subtitle: projectSubtitle(document.project_id, projectById),
          matchedField: field.key,
          score,
          projectId: document.project_id,
          documentId: document.id,
          moduleId: document.module_id,
          isArchived: isArchivedContext(
            document.project_id,
            document.id,
            projectById,
            documentById
          ),
          displayText: field.value,
        });
      }
    }
  }

  if (shouldSearch('module')) {
    for (const module of modules) {
      const fields: Array<{ key: string; value: string; isTitle: boolean }> = [
        { key: 'name', value: module.name, isTitle: true },
        { key: 'description', value: module.description ?? '', isTitle: false },
        { key: 'module_code', value: module.module_code ?? '', isTitle: false },
      ];

      for (const field of fields) {
        if (!field.value || !containsQuery(field.value, q)) continue;
        const score = scoreField(field.value, q, field.isTitle);
        pushMatch({
          id: module.id,
          type: 'module',
          title: module.name,
          subtitle: projectSubtitle(module.project_id, projectById),
          matchedField: field.key,
          score,
          projectId: module.project_id,
          moduleId: module.id,
          displayText: field.value,
        });
      }
    }
  }

  if (shouldSearch('tag')) {
    for (const tag of tags) {
      if (!containsQuery(tag.name, q)) continue;
      const score = scoreField(tag.name, q, true);
      pushMatch({
        id: tag.id,
        type: 'tag',
        title: tag.name,
        subtitle: projectSubtitle(tag.project_id, projectById),
        matchedField: 'name',
        score,
        projectId: tag.project_id,
        tagId: tag.id,
        displayText: tag.name,
      });
    }
  }

  if (shouldSearch('test_case')) {
    for (const testCase of testCases) {
      const fields: Array<{ key: string; value: string; isTitle: boolean }> = [
        { key: 'test_case_no', value: testCase.test_case_no, isTitle: true },
        { key: 'name', value: testCase.name, isTitle: true },
        { key: 'test_objective', value: testCase.test_objective, isTitle: false },
        { key: 'test_steps', value: stripHtml(testCase.test_steps), isTitle: false },
        { key: 'issues', value: testCase.issues, isTitle: false },
        { key: 'status', value: testCase.status, isTitle: false },
      ];

      for (const field of fields) {
        if (!field.value || !containsQuery(field.value, q)) continue;
        const score = scoreField(field.value, q, field.isTitle);
        pushMatch({
          id: testCase.id,
          type: 'test_case',
          title: `${testCase.test_case_no} — ${testCase.name}`,
          subtitle: documentSubtitle(
            testCase.project_id,
            testCase.document_id,
            projectById,
            documentById
          ),
          matchedField: field.key,
          score,
          projectId: testCase.project_id,
          documentId: testCase.document_id,
          testCaseId: testCase.id,
          isArchived: isArchivedContext(
            testCase.project_id,
            testCase.document_id,
            projectById,
            documentById
          ),
          displayText: field.value,
        });
      }
    }
  }

  if (shouldSearch('developer')) {
    const seenDevelopers = new Set<string>();

    for (const testCase of testCases) {
      const columnIds = developerColumnIdsByProject.get(testCase.project_id) ?? [];
      if (!columnIds.length || !testCase.custom_values) continue;

      for (const columnId of columnIds) {
        const developerName = (testCase.custom_values[columnId] ?? '').trim();
        if (!developerName || !containsQuery(developerName, q)) continue;

        const dedupeKey = `${testCase.project_id}:${developerName.toLowerCase()}`;
        if (seenDevelopers.has(dedupeKey)) continue;
        seenDevelopers.add(dedupeKey);

        const score = scoreField(developerName, q, true);
        pushMatch({
          id: `developer:${testCase.project_id}:${developerName}`,
          type: 'developer',
          title: developerName,
          subtitle: documentSubtitle(
            testCase.project_id,
            testCase.document_id,
            projectById,
            documentById
          ),
          matchedField: 'developer',
          score,
          projectId: testCase.project_id,
          documentId: testCase.document_id,
          testCaseId: testCase.id,
          developerName,
          isArchived: isArchivedContext(
            testCase.project_id,
            testCase.document_id,
            projectById,
            documentById
          ),
          displayText: developerName,
        });
      }
    }
  }

  if (shouldSearch('screenshot')) {
    for (const testCase of testCases) {
      const doc = documentById.get(testCase.document_id);
      const docName = doc?.name ?? 'Unknown document';

      for (const screenshot of testCase.screenshots) {
        const slot = slotLabel(screenshot.slot);
        const fields: Array<{ key: string; value: string; isTitle: boolean }> = [
          { key: 'test_case_no', value: testCase.test_case_no, isTitle: true },
          { key: 'test_case_name', value: testCase.name, isTitle: true },
          { key: 'document_name', value: docName, isTitle: true },
          { key: 'slot', value: slot, isTitle: false },
        ];

        for (const field of fields) {
          if (!field.value || !containsQuery(field.value, q)) continue;
          const score = scoreField(field.value, q, field.isTitle);
          pushMatch({
            id: screenshot.id,
            type: 'screenshot',
            title: `${testCase.test_case_no} — ${slot}`,
            subtitle: documentSubtitle(
              testCase.project_id,
              testCase.document_id,
              projectById,
              documentById
            ),
            matchedField: field.key,
            score,
            projectId: testCase.project_id,
            documentId: testCase.document_id,
            testCaseId: testCase.id,
            screenshotId: screenshot.id,
            isArchived: isArchivedContext(
              testCase.project_id,
              testCase.document_id,
              projectById,
              documentById
            ),
            displayText: field.value,
          });
        }
      }
    }
  }

  results.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return results.slice(0, limit);
}
