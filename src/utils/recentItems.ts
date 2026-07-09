import { RecentItem, RecentItemType } from '../types';

const STORAGE_KEY = 'tc_recent_items';
const MAX_RECENT = 20;

export function recordRecentItem(item: Omit<RecentItem, 'openedAt'>): void {
  const list = getRecentItems();
  const filtered = list.filter(r => !(r.type === item.type && r.id === item.id));
  filtered.unshift({ ...item, openedAt: new Date().toISOString() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX_RECENT)));
}

export function getRecentItems(types?: RecentItemType[]): RecentItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: RecentItem[] = raw ? JSON.parse(raw) : [];
    if (!types?.length) return list;
    return list.filter(r => types.includes(r.type));
  } catch {
    return [];
  }
}

export function clearRecentItems(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getRecentDocuments(): RecentItem[] {
  return getRecentItems(['document']);
}

export function recordRecentFile(entry: {
  documentId: string;
  documentName: string;
  projectId: string;
  projectName: string;
  moduleName?: string;
}): void {
  recordRecentItem({
    type: 'document',
    id: entry.documentId,
    label: entry.documentName,
    projectId: entry.projectId,
    projectName: entry.projectName,
    moduleName: entry.moduleName,
  });
}
