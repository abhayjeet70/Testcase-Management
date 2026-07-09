import { Project, TestCaseDocument, ThemeMode, RecentItem } from '../types';
import { getRecentItems } from './recentItems';
import { getAppSettings } from './appSettings';

export interface CommandContext {
  activeTab: string;
  selectedProjectId: string;
  selectedDocumentId: string;
  selectedTestCaseId: string | null;
  selectedIds: string[];
  projects: Project[];
  documents: TestCaseDocument[];
  actions: {
    createProject: () => void;
    createDocument: () => void;
    createModule: () => void;
    newTestCase: () => void;
    export: () => void;
    import: () => void;
    openDashboard: () => void;
    delete: () => void;
    rename: () => void;
    openWorkspaceSearch: () => void;
    setTheme: (theme: ThemeMode) => void;
    openRecentFile: (item: RecentItem) => void;
    openSettings: () => void;
    downloadBackup: () => void;
    archiveProject: (projectId: string) => void;
    restoreProject: (projectId: string) => void;
    toggleFavorite: () => void;
  };
}

export interface CommandPaletteItem {
  id: string;
  label: string;
  detail?: string;
  keywords: string[];
  category: string;
  shortcut?: string;
  disabled?: boolean;
  run: () => void;
}

function selectedProject(ctx: CommandContext): Project | undefined {
  return ctx.projects.find(p => p.id === ctx.selectedProjectId);
}

function hasSelection(ctx: CommandContext): boolean {
  return ctx.selectedIds.length > 0 || ctx.selectedTestCaseId !== null;
}

function buildRecentFileCommands(ctx: CommandContext): CommandPaletteItem[] {
  return getRecentItems().map(item => ({
    id: `recent.${item.type}.${item.id}`,
    label: item.label,
    detail: [item.projectName, item.moduleName].filter(Boolean).join(' · ') || undefined,
    keywords: ['recent', 'open', item.type, item.label, item.projectName ?? '', item.moduleName ?? ''],
    category: 'Recent',
    run: () => ctx.actions.openRecentFile(item),
  }));
}

export function getCommandPaletteItems(ctx: CommandContext): CommandPaletteItem[] {
  const project = selectedProject(ctx);
  const isProjectArchived = project?.archived === true;

  const items: CommandPaletteItem[] = [
    {
      id: 'file.createProject',
      label: 'Create Project',
      keywords: ['new', 'project', 'add'],
      category: 'File',
      run: () => ctx.actions.createProject(),
    },
    {
      id: 'file.createDocument',
      label: 'Create Document',
      keywords: ['new', 'document', 'file', 'add'],
      category: 'File',
      disabled: !ctx.selectedProjectId,
      run: () => ctx.actions.createDocument(),
    },
    {
      id: 'file.createModule',
      label: 'Create Module',
      keywords: ['new', 'module', 'add'],
      category: 'File',
      disabled: !ctx.selectedProjectId,
      run: () => ctx.actions.createModule(),
    },
    {
      id: 'file.newTestCase',
      label: 'New Test Case',
      keywords: ['new', 'test', 'case', 'row', 'add'],
      category: 'File',
      shortcut: 'Ctrl + N',
      disabled: !ctx.selectedDocumentId,
      run: () => ctx.actions.newTestCase(),
    },
    {
      id: 'file.export',
      label: 'Export',
      keywords: ['export', 'download', 'word', 'csv', 'docx'],
      category: 'File',
      shortcut: 'Ctrl + Shift + E',
      disabled: !ctx.selectedDocumentId,
      run: () => ctx.actions.export(),
    },
    {
      id: 'file.import',
      label: 'Import',
      keywords: ['import', 'upload', 'csv', 'docx', 'word'],
      category: 'File',
      run: () => ctx.actions.import(),
    },
    {
      id: 'view.openDashboard',
      label: 'Open Dashboard',
      keywords: ['dashboard', 'home', 'overview'],
      category: 'View',
      run: () => ctx.actions.openDashboard(),
    },
    {
      id: 'edit.delete',
      label: 'Delete',
      keywords: ['delete', 'remove', 'trash'],
      category: 'Edit',
      shortcut: 'Delete',
      disabled: !hasSelection(ctx),
      run: () => ctx.actions.delete(),
    },
    {
      id: 'edit.rename',
      label: 'Rename',
      keywords: ['rename', 'edit', 'name'],
      category: 'Edit',
      disabled: !hasSelection(ctx),
      run: () => ctx.actions.rename(),
    },
    {
      id: 'search.workspace',
      label: 'Search',
      detail: 'Search across workspace',
      keywords: ['search', 'find', 'workspace'],
      category: 'Search',
      shortcut: 'Ctrl + Shift + F',
      run: () => ctx.actions.openWorkspaceSearch(),
    },
    {
      id: 'preferences.theme.toggle',
      label: 'Toggle Theme',
      keywords: ['theme', 'toggle', 'dark', 'warm', 'appearance'],
      category: 'Preferences',
      run: () => {
        const current = getAppSettings().theme;
        ctx.actions.setTheme(current === 'dark' ? 'warm' : 'dark');
      },
    },
    {
      id: 'preferences.theme.warm',
      label: 'Use Warm Theme',
      keywords: ['theme', 'warm', 'light', 'appearance'],
      category: 'Preferences',
      run: () => ctx.actions.setTheme('warm'),
    },
    {
      id: 'preferences.theme.dark',
      label: 'Use Dark Theme',
      keywords: ['theme', 'dark', 'appearance'],
      category: 'Preferences',
      run: () => ctx.actions.setTheme('dark'),
    },
    {
      id: 'preferences.openSettings',
      label: 'Open Settings',
      keywords: ['settings', 'preferences', 'options', 'config'],
      category: 'Preferences',
      run: () => ctx.actions.openSettings(),
    },
    {
      id: 'file.downloadBackup',
      label: 'Download Backup',
      keywords: ['backup', 'download', 'export', 'workspace'],
      category: 'File',
      run: () => ctx.actions.downloadBackup(),
    },
    {
      id: 'file.archiveProject',
      label: 'Archive Project',
      keywords: ['archive', 'project', 'hide'],
      category: 'File',
      disabled: !ctx.selectedProjectId || isProjectArchived,
      run: () => ctx.actions.archiveProject(ctx.selectedProjectId),
    },
    {
      id: 'file.restoreProject',
      label: 'Restore Project',
      keywords: ['restore', 'unarchive', 'project'],
      category: 'File',
      disabled: !ctx.selectedProjectId || !isProjectArchived,
      run: () => ctx.actions.restoreProject(ctx.selectedProjectId),
    },
    {
      id: 'edit.toggleFavorite',
      label: 'Toggle Favorite',
      keywords: ['favorite', 'star', 'bookmark', 'pin'],
      category: 'Edit',
      disabled: !ctx.selectedProjectId && !ctx.selectedDocumentId,
      run: () => ctx.actions.toggleFavorite(),
    },
    ...buildRecentFileCommands(ctx),
  ];

  return items;
}

function commandSearchText(item: CommandPaletteItem): string {
  return [item.label, item.detail ?? '', item.category, ...item.keywords].join(' ');
}

export function fuzzySubsequenceMatch(text: string, query: string): boolean {
  const hay = text.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return true;

  let qi = 0;
  for (let i = 0; i < hay.length && qi < q.length; i++) {
    if (hay[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

function commandMatchScore(item: CommandPaletteItem, query: string): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;

  const label = item.label.toLowerCase();
  const hay = commandSearchText(item).toLowerCase();

  if (label.startsWith(q)) return 300;
  if (label.includes(q)) return 200;
  if (hay.includes(q)) return 150;

  let qi = 0;
  let consecutive = 0;
  let score = 0;

  for (let i = 0; i < hay.length && qi < q.length; i++) {
    if (hay[i] === q[qi]) {
      qi++;
      consecutive++;
      score += consecutive;
    } else {
      consecutive = 0;
    }
  }

  return qi === q.length ? 50 + score : 0;
}

export function filterCommands(items: CommandPaletteItem[], query: string): CommandPaletteItem[] {
  const q = query.trim();
  if (!q) return items;

  return items
    .filter(item => fuzzySubsequenceMatch(commandSearchText(item), q))
    .sort((a, b) => commandMatchScore(b, q) - commandMatchScore(a, q));
}
