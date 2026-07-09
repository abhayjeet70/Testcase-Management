import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { Bug, User, Project, BugSeverity, BugStatus } from '../../types';

interface BugFormProps {
  bug?: Bug;
  projects: Project[];
  users: User[];
  currentUser: User | null;
  onClose: () => void;
  onSave: (bug: Partial<Bug>) => void;
}

export default function BugForm({ bug, projects, users, currentUser, onClose, onSave }: BugFormProps) {
  const [title, setTitle] = useState(bug?.title || '');
  const [description, setDescription] = useState(bug?.description || '');
  const [projectId, setProjectId] = useState(bug?.projectId || (projects[0]?.id || ''));
  const [severity, setSeverity] = useState<BugSeverity>(bug?.severity || 'Medium');
  const [status, setStatus] = useState<BugStatus>(bug?.status || 'New');
  const [assigneeId, setAssigneeId] = useState<string>(bug?.assigneeId || '');
  const [stepsToReproduce, setStepsToReproduce] = useState(bug?.stepsToReproduce || '');
  const [expectedResult, setExpectedResult] = useState(bug?.expectedResult || '');
  const [actualResult, setActualResult] = useState(bug?.actualResult || '');
  const [environment, setEnvironment] = useState(bug?.environment || '');

  const [error, setError] = useState('');

  // ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Bug title is required');
      return;
    }

    onSave({
      id: bug?.id,
      title: title.trim(),
      description: description.trim(),
      projectId,
      severity,
      status,
      assigneeId: assigneeId || undefined,
      stepsToReproduce: stepsToReproduce.trim(),
      expectedResult: expectedResult.trim(),
      actualResult: actualResult.trim(),
      environment: environment.trim(),
      reporterId: bug?.reporterId || currentUser?.id,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col border border-[#E7D6C4] animate-in fade-in zoom-in-95 duration-200"
        style={{ maxHeight: '90vh' }}
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E7D6C4] flex items-center justify-between bg-[#FFF8F2] rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-[#3B2A1D]">{bug ? 'Edit Bug' : 'Report New Bug'}</h2>
            <p className="text-xs text-[#7A6A5A] font-semibold">{bug ? `ID: ${bug.id.toUpperCase().split('-')[1]}` : 'Fill in the details to track this issue'}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[#8B5A2B]/10 text-[#7A6A5A] hover:text-[#8B5A2B] rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {error && (
            <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <form id="bug-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Title & Project Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#7A6A5A] uppercase tracking-wider mb-2">Bug Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E7D6C4] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#8B5A2B]/30 focus:border-[#8B5A2B]"
                  placeholder="e.g. App crashes on login"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#7A6A5A] uppercase tracking-wider mb-2">Project</label>
                <select
                  value={projectId}
                  onChange={e => setProjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E7D6C4] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#8B5A2B]/30 focus:border-[#8B5A2B] bg-white"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.project_name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-[#7A6A5A] uppercase tracking-wider mb-2">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-[#E7D6C4] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#8B5A2B]/30 focus:border-[#8B5A2B]"
                placeholder="Provide a general description of the issue..."
              />
            </div>

            {/* Classification Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#7A6A5A] uppercase tracking-wider mb-2">Severity</label>
                <select
                  value={severity}
                  onChange={e => setSeverity(e.target.value as BugSeverity)}
                  className="w-full px-3 py-2 border border-[#E7D6C4] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#8B5A2B]/30 focus:border-[#8B5A2B] bg-white"
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#7A6A5A] uppercase tracking-wider mb-2">Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as BugStatus)}
                  className="w-full px-3 py-2 border border-[#E7D6C4] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#8B5A2B]/30 focus:border-[#8B5A2B] bg-white"
                >
                  <option value="New">New</option>
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Verification">Verification</option>
                  <option value="Fixed">Fixed / Closed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#7A6A5A] uppercase tracking-wider mb-2">Assignee</label>
                <select
                  value={assigneeId}
                  onChange={e => setAssigneeId(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E7D6C4] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#8B5A2B]/30 focus:border-[#8B5A2B] bg-white"
                >
                  <option value="">-- Unassigned --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role.replace('_', ' ')})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t border-[#E7D6C4] pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left col */}
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-[#7A6A5A] uppercase tracking-wider mb-2">Steps to Reproduce</label>
                  <textarea
                    value={stepsToReproduce}
                    onChange={e => setStepsToReproduce(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-[#E7D6C4] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#8B5A2B]/30 focus:border-[#8B5A2B] font-mono text-[13px]"
                    placeholder="1. Go to...\n2. Click on...\n3. Observe..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#7A6A5A] uppercase tracking-wider mb-2">Environment</label>
                  <input
                    type="text"
                    value={environment}
                    onChange={e => setEnvironment(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E7D6C4] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#8B5A2B]/30 focus:border-[#8B5A2B]"
                    placeholder="e.g. Chrome 120 on Windows 11"
                  />
                </div>
              </div>
              {/* Right col */}
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-[#7A6A5A] uppercase tracking-wider mb-2">Expected Result</label>
                  <textarea
                    value={expectedResult}
                    onChange={e => setExpectedResult(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-[#E7D6C4] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#8B5A2B]/30 focus:border-[#8B5A2B]"
                    placeholder="What should have happened?"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#7A6A5A] uppercase tracking-wider mb-2">Actual Result</label>
                  <textarea
                    value={actualResult}
                    onChange={e => setActualResult(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-[#E7D6C4] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#8B5A2B]/30 focus:border-[#8B5A2B]"
                    placeholder="What actually happened?"
                  />
                </div>
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E7D6C4] bg-[#FFF8F2] rounded-b-2xl flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[#E7D6C4] text-[#7A6A5A] text-sm font-bold rounded-xl hover:bg-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="bug-form"
            className="flex items-center gap-2 px-5 py-2 bg-[#8B5A2B] hover:bg-[#A66B37] text-white text-sm font-bold rounded-xl shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            {bug ? 'Save Changes' : 'Report Bug'}
          </button>
        </div>

      </div>
    </div>
  );
}
