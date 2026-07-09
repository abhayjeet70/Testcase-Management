import { getProjects, getDocumentsAll, getTestCasesAll, getCustomColumnsAll,
  getModulesAll, getTagsAll, getTemplates, getExecutionsAll,
  getDownloadHistory, getRecycleBin, initializeStorage,
} from './storage';
import { getAppSettings, DEFAULT_APP_SETTINGS, saveAppSettings } from './appSettings';
import { getRecentItems } from './recentItems';
import { AppSettings } from '../types';

export const BACKUP_VERSION = 1;

export interface WorkspaceBackup {
  version: number;
  exportedAt: string;
  app: 'testcase-management';
  settings: AppSettings;
  data: Record<string, unknown>;
}

const ALL_KEYS = [
  'tc_projects', 'tc_documents', 'tc_test_cases', 'tc_custom_columns',
  'tc_activity_logs', 'tc_modules', 'tc_tags', 'tc_templates', 'tc_executions',
  'tc_download_history', 'tc_recycle_bin', 'tc_recent_items', 'tc_app_settings',
];

export function buildWorkspaceBackup(): WorkspaceBackup {
  const data: Record<string, unknown> = {};
  ALL_KEYS.forEach(key => {
    const raw = localStorage.getItem(key);
    if (raw) {
      try { data[key] = JSON.parse(raw); } catch { data[key] = raw; }
    }
  });
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    app: 'testcase-management',
    settings: getAppSettings(),
    data: {
      projects: getProjects(),
      documents: getDocumentsAll(),
      modules: getModulesAll(),
      tags: getTagsAll(),
      testCases: getTestCasesAll(),
      customColumns: getCustomColumnsAll(),
      templates: getTemplates(),
      executions: getExecutionsAll(),
      activityLogs: JSON.parse(localStorage.getItem('tc_activity_logs') || '[]'),
      downloadHistory: getDownloadHistory(),
      recycleBin: getRecycleBin(),
      recentItems: getRecentItems(),
      raw: data,
    },
  };
}

export function downloadWorkspaceBackup(): void {
  const backup = buildWorkspaceBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `testcase-workspace-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseWorkspaceBackup(json: string): WorkspaceBackup {
  return JSON.parse(json) as WorkspaceBackup;
}

export function validateWorkspaceBackup(backup: WorkspaceBackup): string | null {
  if (backup.app !== 'testcase-management') return 'Invalid backup file';
  if (!backup.data) return 'Backup missing data';
  return null;
}

export function importWorkspaceBackup(backup: WorkspaceBackup, mode: 'replace' | 'merge' = 'replace'): void {
  const err = validateWorkspaceBackup(backup);
  if (err) throw new Error(err);

  if (mode === 'replace') {
    ALL_KEYS.forEach(key => localStorage.removeItem(key));
    const raw = backup.data.raw as Record<string, unknown> | undefined;
    if (raw) {
      Object.entries(raw).forEach(([key, val]) => {
        localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
      });
    } else {
      if (backup.data.projects) localStorage.setItem('tc_projects', JSON.stringify(backup.data.projects));
      if (backup.data.documents) localStorage.setItem('tc_documents', JSON.stringify(backup.data.documents));
      if (backup.data.testCases) localStorage.setItem('tc_test_cases', JSON.stringify(backup.data.testCases));
      if (backup.data.customColumns) localStorage.setItem('tc_custom_columns', JSON.stringify(backup.data.customColumns));
      if (backup.data.modules) localStorage.setItem('tc_modules', JSON.stringify(backup.data.modules));
      if (backup.data.tags) localStorage.setItem('tc_tags', JSON.stringify(backup.data.tags));
      if (backup.data.templates) localStorage.setItem('tc_templates', JSON.stringify(backup.data.templates));
      if (backup.data.executions) localStorage.setItem('tc_executions', JSON.stringify(backup.data.executions));
    }
    if (backup.settings) saveAppSettings(backup.settings);
    return;
  }

  // merge — upsert by id for arrays
  const mergeArray = <T extends { id: string }>(key: string, items: T[]) => {
    const existing: T[] = JSON.parse(localStorage.getItem(key) || '[]');
    const map = new Map(existing.map(i => [i.id, i]));
    items.forEach(i => map.set(i.id, i));
    localStorage.setItem(key, JSON.stringify([...map.values()]));
  };
  if (Array.isArray(backup.data.projects)) mergeArray('tc_projects', backup.data.projects as { id: string }[]);
  if (Array.isArray(backup.data.documents)) mergeArray('tc_documents', backup.data.documents as { id: string }[]);
  if (Array.isArray(backup.data.testCases)) mergeArray('tc_test_cases', backup.data.testCases as { id: string }[]);
  if (backup.settings) saveAppSettings({ ...getAppSettings(), ...backup.settings });
}

export function resetWorkspace(): void {
  ALL_KEYS.forEach(key => localStorage.removeItem(key));
  initializeStorage();
  saveAppSettings({ ...DEFAULT_APP_SETTINGS });
}
