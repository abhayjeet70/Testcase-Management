import React, { useState } from 'react';
import { Pin, Star, Clock, Archive, RotateCcw } from 'lucide-react';
import {
  getPinnedProjects, getFavoriteProjects, getFavoriteDocuments,
  getArchivedProjects, restoreProject,
} from '../../utils/archiveFavorites';
import { getRecentItems } from '../../utils/recentItems';

interface Props {
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  onSelectDocument: (id: string) => void;
  onSelectTab: (tab: string) => void;
}

function SidebarItem({ label, sub, onClick }: { label: string; sub?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-[#FFF8F2] truncate"
    >
      <span className="font-semibold text-[#3B2A1D] block truncate">{label}</span>
      {sub && <span className="text-[10px] text-[#7A6A5A] truncate block">{sub}</span>}
    </button>
  );
}

export default function ArchiveFavoritesPanel({
  onSelectProject,
  onSelectDocument,
  onSelectTab,
}: Props) {
  const [showArchived, setShowArchived] = useState(false);
  const pinned = getPinnedProjects();
  const favorites = getFavoriteProjects();
  const favDocs = getFavoriteDocuments();
  const recent = getRecentItems().slice(0, 5);
  const archived = getArchivedProjects();

  const Section = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => {
    if (!children || (Array.isArray(children) && children.length === 0)) return null;
    return (
      <div className="mb-3">
        <div className="flex items-center gap-1.5 px-2 mb-1">
          <Icon className="w-3 h-3 text-[#8B5A2B]" />
          <span className="text-[9px] font-bold text-[#7A6A5A] uppercase tracking-wider">{title}</span>
        </div>
        <div className="space-y-0.5">{children}</div>
      </div>
    );
  };

  return (
    <div className="px-2 pb-2 border-b border-[#E7D6C4]/60 mb-2">
      <Section title="Pinned" icon={Pin}>
        {pinned.map(p => (
          <div key={p.id}><SidebarItem label={p.project_name} onClick={() => { onSelectProject(p.id); onSelectTab('Projects'); }} /></div>
        ))}
      </Section>
      <Section title="Favorites" icon={Star}>
        {favorites.map(p => (
          <div key={p.id}><SidebarItem label={p.project_name} onClick={() => { onSelectProject(p.id); onSelectTab('Projects'); }} /></div>
        ))}
        {favDocs.map(d => (
          <div key={d.id}>
            <SidebarItem
              label={d.name}
              sub={d.project_id}
              onClick={() => { onSelectProject(d.project_id); onSelectDocument(d.id); onSelectTab('Projects'); }}
            />
          </div>
        ))}
      </Section>
      <Section title="Recent" icon={Clock}>
        {recent.map(r => (
          <div key={r.type + r.id}>
            <SidebarItem
              label={r.label}
              sub={r.projectName}
              onClick={() => {
                if (r.projectId) onSelectProject(r.projectId);
                if (r.type === 'document') onSelectDocument(r.id);
                onSelectTab('Projects');
              }}
            />
          </div>
        ))}
      </Section>
      {archived.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-1.5 px-2 mb-1 text-[9px] font-bold text-[#7A6A5A] uppercase tracking-wider"
          >
            <Archive className="w-3 h-3" /> Archived ({archived.length})
          </button>
          {showArchived && archived.map(p => (
            <div key={p.id} className="flex items-center gap-1 px-2">
              <SidebarItem label={p.project_name} onClick={() => { onSelectProject(p.id); onSelectTab('Projects'); }} />
              <button
                type="button"
                title="Restore"
                onClick={() => restoreProject(p.id)}
                className="p-1 text-[#8B5A2B] hover:bg-[#FFF4E8] rounded"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
