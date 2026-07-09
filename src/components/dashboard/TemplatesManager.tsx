import React, { useState } from 'react';
import { FileStack, Plus, Copy, Download, Upload, Play } from 'lucide-react';
import { TestCaseTemplate } from '../../types';
import { getTemplates, saveTemplate, deleteTemplate, duplicateTemplate, getProjects, getDocuments } from '../../utils/storage';
import { applyTemplateToDocument, exportTemplatesJson } from '../../utils/templateServices';

interface Props {
  showToast: (msg: string, type: 'success' | 'info' | 'error') => void;
  onApplied?: () => void;
}

export default function TemplatesManager({ showToast, onApplied }: Props) {
  const [templates, setTemplates] = useState<TestCaseTemplate[]>(() => getTemplates());
  const [applyTpl, setApplyTpl] = useState<TestCaseTemplate | null>(null);
  const [projectId, setProjectId] = useState('');
  const [documentId, setDocumentId] = useState('');

  const refresh = () => setTemplates(getTemplates());
  const projects = getProjects().filter(p => !p.archived);

  const handleApply = () => {
    if (!applyTpl || !projectId || !documentId) return;
    const count = applyTemplateToDocument(applyTpl, projectId, documentId);
    showToast(`Applied ${count} test cases from "${applyTpl.name}"`, 'success');
    setApplyTpl(null);
    onApplied?.();
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5 animate-fade-in max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileStack className="w-6 h-6 text-[#8B5A2B]" />
          <h2 className="text-xl font-bold text-[#3B2A1D]">Test Case Templates</h2>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              const blob = new Blob([exportTemplatesJson(templates)], { type: 'application/json' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = 'templates.json';
              a.click();
            }}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-[#E7D6C4] rounded-lg hover:bg-[#FFF4E8]"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {templates.map(tpl => (
          <div key={tpl.id} className="bg-white border border-[#E7D6C4] rounded-xl p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-[#3B2A1D] text-sm">{tpl.name}</h3>
                <p className="text-xs text-[#7A6A5A]">{tpl.moduleName} · {tpl.testCases.length} cases</p>
              </div>
              {tpl.isBuiltIn && (
                <span className="text-[9px] bg-[#FFF4E8] text-[#8B5A2B] px-2 py-0.5 rounded font-bold">Built-in</span>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setApplyTpl(tpl); setProjectId(projects[0]?.id || ''); }}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#8B5A2B] text-white text-xs font-semibold rounded-lg"
              >
                <Play className="w-3 h-3" /> Apply
              </button>
              <button
                type="button"
                onClick={() => { duplicateTemplate(tpl.id); refresh(); }}
                className="p-1 border border-[#E7D6C4] rounded-lg"
                title="Duplicate"
              >
                <Copy className="w-3.5 h-3.5 text-[#7A6A5A]" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {applyTpl && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-[#E7D6C4] p-5 max-w-md w-full space-y-4">
            <h3 className="font-bold text-[#3B2A1D]">Apply &quot;{applyTpl.name}&quot;</h3>
            <select value={projectId} onChange={e => { setProjectId(e.target.value); setDocumentId(''); }} className="w-full border border-[#E7D6C4] rounded-lg px-3 py-2 text-sm">
              {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
            </select>
            <select value={documentId} onChange={e => setDocumentId(e.target.value)} className="w-full border border-[#E7D6C4] rounded-lg px-3 py-2 text-sm">
              <option value="">Select document…</option>
              {getDocuments(projectId).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setApplyTpl(null)} className="px-4 py-2 text-xs border rounded-lg">Cancel</button>
              <button type="button" onClick={handleApply} disabled={!documentId} className="px-4 py-2 text-xs bg-[#8B5A2B] text-white rounded-lg disabled:opacity-50">Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
