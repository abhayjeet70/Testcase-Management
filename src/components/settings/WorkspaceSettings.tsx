import React, { useState, useRef } from 'react';
import { Settings, Download, Upload, RotateCcw, Keyboard } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import { TestCaseStatus, ThemeMode, TableDensity, DefaultExportFormat } from '../../types';
import { downloadWorkspaceBackup, importWorkspaceBackup, parseWorkspaceBackup, resetWorkspace } from '../../utils/workspaceBackup';
import { renumberDocumentTestCases } from '../../utils/storage';

interface WorkspaceSettingsProps {
  selectedProjectId?: string;
  selectedDocumentId?: string;
  onOpenShortcuts?: () => void;
  onDataReset?: () => void;
}

const STATUSES: TestCaseStatus[] = ['Not Tested', 'In Progress', 'Fixed', 'Not Fixed', 'Blocked'];

export default function WorkspaceSettings({
  selectedProjectId,
  selectedDocumentId,
  onOpenShortcuts,
  onDataReset,
}: WorkspaceSettingsProps) {
  const { settings, updateSettings } = useSettings();
  const { currentUser } = useAuth();
  const [resetConfirm, setResetConfirm] = useState('');
  const [restoreStatus, setRestoreStatus] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const backup = parseWorkspaceBackup(reader.result as string);
        importWorkspaceBackup(backup, 'replace');
        setRestoreStatus('Workspace restored successfully. Reloading…');
        setTimeout(() => { onDataReset?.(); window.location.reload(); }, 800);
      } catch (err) {
        setRestoreStatus(err instanceof Error ? err.message : 'Restore failed');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white border border-[#E7D6C4] rounded-xl p-5 space-y-4">
      <h3 className="text-xs font-bold text-[#8B5A2B] uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  );

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-[#3B2A1D] font-medium">{label}</span>
      {children}
    </div>
  );

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full transition-colors relative ${checked ? 'bg-[#8B5A2B]' : 'bg-[#E7D6C4]'}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'left-5' : 'left-0.5'}`} />
    </button>
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-3 mb-2">
        <Settings className="w-6 h-6 text-[#8B5A2B]" />
        <h2 className="text-xl font-bold text-[#3B2A1D]">Workspace Settings</h2>
      </div>

      <Section title="Appearance">
        <Row label="Theme">
          <div className="flex rounded-lg border border-[#E7D6C4] overflow-hidden text-xs font-semibold">
            {(['warm', 'dark'] as ThemeMode[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => updateSettings({ theme: t })}
                className={`px-4 py-1.5 capitalize ${settings.theme === t ? 'bg-[#8B5A2B] text-white' : 'bg-white text-[#7A6A5A]'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </Row>
        <Row label="Compact Mode">
          <Toggle checked={settings.compactMode} onChange={v => updateSettings({ compactMode: v })} />
        </Row>
        <Row label="Table Density">
          <select
            value={settings.tableDensity}
            onChange={e => updateSettings({ tableDensity: e.target.value as TableDensity })}
            className="text-sm border border-[#E7D6C4] rounded-lg px-3 py-1.5 bg-[#FFF8F2]"
          >
            <option value="compact">Compact</option>
            <option value="comfortable">Comfortable</option>
            <option value="spacious">Spacious</option>
          </select>
        </Row>
      </Section>

      <Section title="Editing & IDs">
        <Row label="Auto Save">
          <Toggle checked={settings.autoSaveEnabled} onChange={v => updateSettings({ autoSaveEnabled: v })} />
        </Row>
        <Row label="Auto Numbering">
          <Toggle checked={settings.autoNumberingEnabled} onChange={v => updateSettings({ autoNumberingEnabled: v })} />
        </Row>
        <Row label="Default Status">
          <select
            value={settings.defaultStatus}
            onChange={e => updateSettings({ defaultStatus: e.target.value as TestCaseStatus })}
            className="text-sm border border-[#E7D6C4] rounded-lg px-3 py-1.5 bg-[#FFF8F2]"
          >
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Row>
        {settings.autoNumberingEnabled && selectedDocumentId && (
          <button
            type="button"
            onClick={() => {
              if (confirm('Renumber all test cases in this document?')) {
                renumberDocumentTestCases(selectedDocumentId);
                onDataReset?.();
              }
            }}
            className="text-sm text-[#8B5A2B] font-semibold hover:underline"
          >
            Renumber Test Case IDs in current document
          </button>
        )}
      </Section>

      <Section title="Export Defaults">
        <Row label="Default Format">
          <select
            value={settings.defaultExportFormat}
            onChange={e => updateSettings({ defaultExportFormat: e.target.value as DefaultExportFormat })}
            className="text-sm border border-[#E7D6C4] rounded-lg px-3 py-1.5 bg-[#FFF8F2]"
          >
            <option value="Word">Word</option>
            <option value="CSV">CSV</option>
          </select>
        </Row>
        <div className="space-y-2">
          <label className="text-sm text-[#3B2A1D] font-medium">Exported By</label>
          <input
            value={settings.exportedByName}
            onChange={e => updateSettings({ exportedByName: e.target.value })}
            className="w-full text-sm border border-[#E7D6C4] rounded-lg px-3 py-2 bg-[#FFF8F2]"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-[#3B2A1D] font-medium">Company Name</label>
          <input
            value={settings.companyName || ''}
            onChange={e => updateSettings({ companyName: e.target.value })}
            className="w-full text-sm border border-[#E7D6C4] rounded-lg px-3 py-2 bg-[#FFF8F2]"
          />
        </div>
      </Section>

      <Section title="Keyboard Shortcuts">
        <button
          type="button"
          onClick={onOpenShortcuts}
          className="flex items-center gap-2 text-sm font-semibold text-[#8B5A2B] hover:underline"
        >
          <Keyboard className="w-4 h-4" /> View All Shortcuts
        </button>
      </Section>

      <Section title="Data Management">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => downloadWorkspaceBackup()}
            className="flex items-center gap-2 px-4 py-2 bg-[#8B5A2B] text-white text-sm font-semibold rounded-lg hover:bg-[#6D4420]"
          >
            <Download className="w-4 h-4" /> Download Backup
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 border border-[#E7D6C4] text-sm font-semibold text-[#3B2A1D] rounded-lg hover:bg-[#FFF4E8]"
          >
            <Upload className="w-4 h-4" /> Restore from Backup
          </button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleRestore} />
        </div>
        {restoreStatus && <p className="text-xs text-[#7A6A5A]">{restoreStatus}</p>}
        {currentUser?.role !== 'intern' && currentUser?.role !== 'tester' && (
          <div className="border border-red-200 bg-red-50 rounded-lg p-4 space-y-3 mt-2">
            <p className="text-sm font-semibold text-red-800 flex items-center gap-2">
              <RotateCcw className="w-4 h-4" /> Reset Workspace
            </p>
            <p className="text-xs text-red-700">Deletes all data and restores demo projects. Type RESET to confirm.</p>
            <input
              value={resetConfirm}
              onChange={e => setResetConfirm(e.target.value)}
              placeholder="Type RESET"
              className="w-full text-sm border border-red-200 rounded-lg px-3 py-2"
            />
            <button
              type="button"
              disabled={resetConfirm !== 'RESET'}
              onClick={() => {
                resetWorkspace();
                window.location.reload();
              }}
              className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg disabled:opacity-40"
            >
              Reset Workspace
            </button>
          </div>
        )}
      </Section>
    </div>
  );
}
