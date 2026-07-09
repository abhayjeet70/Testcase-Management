import React, { useMemo } from 'react';
import { TestCase, User, TestCaseStatus } from '../../types';
import { MessageSquare, Paperclip, Clock, AlertCircle, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface BugKanbanProps {
  testCases: TestCase[];
  users: User[];
  onStatusChange: (id: string, newStatus: TestCaseStatus) => void;
}

// Columns Map to array of matching Test Case Statuses
const COLUMNS: { id: string; label: string; color: string; border: string; statuses: TestCaseStatus[]; dropStatus: TestCaseStatus }[] = [
  { id: 'New', label: 'New', color: 'bg-blue-50 text-blue-700', border: 'border-blue-200', statuses: ['Not Tested', 'Not Fixed'], dropStatus: 'Not Tested' },
  { id: 'Assigned', label: 'Assigned', color: 'bg-indigo-50 text-indigo-700', border: 'border-indigo-200', statuses: ['Failed', 'Blocked'], dropStatus: 'Failed' },
  { id: 'In Progress', label: 'In Progress', color: 'bg-amber-50 text-amber-700', border: 'border-amber-400', statuses: ['In Progress'], dropStatus: 'In Progress' },
  { id: 'Fixed', label: 'Fixed', color: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-200', statuses: ['Fixed'], dropStatus: 'Fixed' },
  { id: 'Verified', label: 'Verified', color: 'bg-purple-50 text-purple-700', border: 'border-purple-200', statuses: ['Re-test'], dropStatus: 'Re-test' },
  { id: 'Closed', label: 'Closed', color: 'bg-slate-50 text-slate-700', border: 'border-slate-200', statuses: ['Passed'], dropStatus: 'Passed' }
];

const getSLA = (tc: TestCase) => {
  const created = new Date(tc.created_at || Date.now()).getTime();
  const now = Date.now();
  let limitHrs = 24; // Default for test case if no severity is tracked
  
  // Try to parse severity from issues if possible, or just default to 24h
  if (tc.issues?.toLowerCase().includes('critical')) limitHrs = 2;
  else if (tc.issues?.toLowerCase().includes('high')) limitHrs = 6;
  
  const limitMs = limitHrs * 60 * 60 * 1000;
  const elapsed = now - created;
  const remaining = limitMs - elapsed;
  const isBreached = remaining < 0;
  
  const hrs = Math.floor(Math.abs(remaining) / (60 * 60 * 1000));
  const mins = Math.floor((Math.abs(remaining) % (60 * 60 * 1000)) / (60 * 1000));
  
  return {
    remainingHrs: hrs,
    remainingMins: mins,
    isBreached,
    text: `${hrs}h ${mins}m`
  };
};

export default function BugKanban({ testCases, users, onStatusChange }: BugKanbanProps) {
  
  const handleDragStart = (e: React.DragEvent, tcId: string) => {
    e.dataTransfer.setData('tcId', tcId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropStatus: TestCaseStatus) => {
    e.preventDefault();
    const tcId = e.dataTransfer.getData('tcId');
    if (tcId) {
      onStatusChange(tcId, dropStatus);
    }
  };

  // We might not have a direct assignee on TestCase right now, so we'll mock it if not present,
  // or use an assignee field if we added one later.
  const getAssignee = () => users[0]; // fallback since testcase doesn't have assigneeId by default yet

  // Calculate total active SLA breaches
  const breachedBugs = useMemo(() => {
    return testCases.filter(b => {
      if (b.status === 'Fixed' || b.status === 'Passed' || b.status === 'Re-test') return false;
      return getSLA(b).isBreached;
    });
  }, [testCases]);

  return (
    <div className="h-full flex flex-col gap-4 relative">
      <div className="flex-1 flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
        {COLUMNS.map(col => {
          const columnBugs = testCases.filter(b => col.statuses.includes(b.status));

          return (
            <div 
              key={col.id} 
              className={`flex-shrink-0 w-[280px] flex flex-col bg-white border ${col.id === 'In Progress' ? 'border-amber-300 shadow-sm' : 'border-[#E7D6C4]'} rounded-2xl overflow-hidden`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.dropStatus)}
            >
              <div className={`px-4 py-3 border-b ${col.border} flex items-center justify-between ${col.color}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {col.label}
                  </span>
                </div>
                <span className="text-xs font-bold bg-white/50 px-2 py-0.5 rounded-full">
                  {columnBugs.length}
                </span>
              </div>

              <div className="flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar bg-[#FAFAFA]/50">
                {columnBugs.map(tc => {
                  const assignee = getAssignee();
                  const sla = getSLA(tc);
                  const showSla = tc.status === 'In Progress' || tc.status === 'Not Tested' || tc.status === 'Failed' || tc.status === 'Blocked';

                  return (
                    <div
                      key={tc.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, tc.id)}
                      className="bg-white border border-[#E7D6C4] rounded-xl p-3 shadow-xs hover:shadow-md hover:border-[#8B5A2B]/50 transition-all cursor-grab active:cursor-grabbing group flex flex-col touch-none"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-[10px] font-bold text-[#7A6A5A] bg-[#FFF8F2] px-1.5 py-0.5 rounded border border-[#E7D6C4]/50">
                          {tc.test_case_no}
                        </span>
                        {tc.issues && (
                          <AlertCircle className="w-3.5 h-3.5 text-red-500" title={tc.issues} />
                        )}
                      </div>
                      
                      <h4 className="text-sm font-bold text-[#3B2A1D] leading-tight mb-3 group-hover:text-[#8B5A2B] transition-colors line-clamp-3">
                        {tc.name}
                      </h4>

                      {/* Assignee & Meta */}
                      <div className="flex items-center gap-2 mt-auto text-xs text-[#7A6A5A]">
                        {assignee ? (
                          <div className="flex items-center gap-1.5 bg-[#FFF8F2] px-1.5 py-0.5 rounded-md border border-[#E7D6C4]/50">
                            <div className="w-4 h-4 rounded-full bg-[#8B5A2B] text-white flex items-center justify-center text-[8px] font-bold">
                              {assignee.name.charAt(0)}
                            </div>
                            <span className="font-medium text-[10px]">{assignee.name.split(' ')[0]}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] italic">Unassigned</span>
                        )}
                      </div>

                      {/* SLA Timer specifically for active bugs */}
                      {showSla && (
                        <div className={`mt-3 pt-2 border-t border-[#E7D6C4]/50 flex items-center justify-between`}>
                          <div className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            sla.isBreached 
                              ? 'bg-red-50 text-red-600 border border-red-100' 
                              : 'bg-amber-50 text-amber-600 border border-amber-100'
                          }`}>
                            <Clock className="w-3 h-3" />
                            {sla.isBreached ? '-' : ''}{sla.text}
                          </div>
                        </div>
                      )}

                      {/* Mobile Status Selector (Fallback for touch devices where DND is disabled) */}
                      <div className="mt-3 md:hidden">
                        <select
                          value={col.dropStatus}
                          onChange={(e) => onStatusChange(tc.id, e.target.value as TestCaseStatus)}
                          className="w-full text-[10px] font-bold border border-[#E7D6C4] rounded-lg px-2 py-1.5 bg-[#FFF8F2] text-[#3B2A1D] focus:outline-none focus:ring-1 focus:ring-[#8B5A2B]"
                        >
                          {COLUMNS.map(c => (
                            <option key={c.id} value={c.dropStatus}>Move to: {c.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* SLA Breach Escalation Footer */}
      {breachedBugs.length > 0 && (
        <div className="bg-[#FFF4E8] border border-[#E7D6C4] rounded-xl p-3 flex items-center justify-between shadow-sm animate-fade-in shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-red-600 leading-tight">SLA Breach in {breachedBugs.length} Bug{breachedBugs.length !== 1 ? 's' : ''}</p>
              <p className="text-xs text-[#7A6A5A] font-medium">These issues have exceeded their resolution time limits.</p>
            </div>
          </div>
          <button className="px-4 py-2 bg-white hover:bg-gray-50 border border-[#E7D6C4] text-[#3B2A1D] text-xs font-bold rounded-xl transition-colors shadow-xs">
            View Escalations
          </button>
        </div>
      )}
    </div>
  );
}
