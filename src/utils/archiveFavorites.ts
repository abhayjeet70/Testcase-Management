import { Project, TestCaseDocument, TestCaseTemplate } from '../types';
import {
  getProjects, getDocumentsAll, getTestCasesAll, getTemplates,
  archiveProject, restoreProject, archiveDocument, restoreDocument,
  saveProject, saveDocument, saveTemplate,
} from './storage';

export function isProjectCompleted(projectId: string): boolean {
  const cases = getTestCasesAll().filter(tc => tc.project_id === projectId);
  if (cases.length === 0) return false;
  return cases.every(tc => tc.status === 'Fixed');
}

export function getCompletedProjectIds(): string[] {
  return getProjects().filter(p => !p.archived && isProjectCompleted(p.id)).map(p => p.id);
}

export function archiveCompletedProjects(): number {
  const ids = getCompletedProjectIds();
  ids.forEach(id => archiveProject(id));
  return ids.length;
}

export { archiveProject, restoreProject, archiveDocument, restoreDocument };

export function toggleProjectFavorite(projectId: string): boolean {
  const p = getProjects().find(pr => pr.id === projectId);
  if (!p) return false;
  const next = !p.favorite;
  saveProject({ id: projectId, project_name: p.project_name, favorite: next });
  return next;
}

export function toggleDocumentFavorite(documentId: string): boolean {
  const doc = getDocumentsAll().find(d => d.id === documentId);
  if (!doc) return false;
  const next = !doc.favorite;
  saveDocument({ ...doc, favorite: next });
  return next;
}

export function toggleTemplateFavorite(templateId: string): boolean {
  const tpl = getTemplates().find(t => t.id === templateId);
  if (!tpl) return false;
  const next = !tpl.favorite;
  saveTemplate({ ...tpl, favorite: next });
  return next;
}

export function toggleProjectPinned(projectId: string): boolean {
  const p = getProjects().find(pr => pr.id === projectId);
  if (!p) return false;
  const next = !p.pinned;
  saveProject({
    id: projectId,
    project_name: p.project_name,
    pinned: next,
    pinned_at: next ? new Date().toISOString() : undefined,
  } as Partial<Project> & { project_name: string });
  return next;
}

export function toggleDocumentPinned(documentId: string): boolean {
  const doc = getDocumentsAll().find(d => d.id === documentId);
  if (!doc) return false;
  const next = !doc.pinned;
  saveDocument({
    ...doc,
    pinned: next,
    pinned_at: next ? new Date().toISOString() : undefined,
  });
  return next;
}

export function getArchivedProjects(): Project[] {
  return getProjects().filter(p => p.archived);
}

export function getArchivedDocuments(projectId?: string): TestCaseDocument[] {
  return getDocumentsAll().filter(d => d.archived && (!projectId || d.project_id === projectId));
}

export function getPinnedProjects(): Project[] {
  return getProjects()
    .filter(p => p.pinned && !p.archived)
    .sort((a, b) => (a.pinned_at || '').localeCompare(b.pinned_at || ''));
}

export function getFavoriteProjects(): Project[] {
  return getProjects().filter(p => p.favorite && !p.archived && !p.pinned);
}

export function getFavoriteDocuments(projectId?: string): TestCaseDocument[] {
  return getDocumentsAll().filter(
    d => d.favorite && !d.archived && (!projectId || d.project_id === projectId)
  );
}

export function getFavoriteTemplates(): TestCaseTemplate[] {
  return getTemplates().filter(t => t.favorite && !t.pinned);
}

export function getPinnedTemplates(): TestCaseTemplate[] {
  return getTemplates()
    .filter(t => t.pinned)
    .sort((a, b) => (a.pinned_at || '').localeCompare(b.pinned_at || ''));
}
