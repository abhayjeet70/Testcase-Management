import React, { useMemo } from 'react';
import { Project } from '../../types';
import { getBugsAll, getTestCases } from '../../utils/storage';
import { Bug as BugIcon, CheckCircle, FileText, ArrowUpRight, Plus, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';

interface TesterDashboardProps {
  projects: Project[];
  onSelectProject: (id: string) => void;
  onNavigateToTab: (tab: string) => void;
}

export default function TesterDashboard({ projects, onSelectProject, onNavigateToTab }: TesterDashboardProps) {
  const { currentUser } = useAuth();
  const allBugs = getBugsAll();
  
  // Bugs reported by this tester
  const myReportedBugs = allBugs.filter(b => b.reporterId === currentUser?.id);
  
  const totalBugsReported = myReportedBugs.length;
  const fixedBugs = myReportedBugs.filter(b => b.status === 'Fixed' || b.status === 'Closed');
  const activeBugs = myReportedBugs.filter(b => b.status !== 'Fixed' && b.status !== 'Closed');

  const totalTestCases = useMemo(() => {
    return projects.reduce((acc, p) => acc + getTestCases(p.id).length, 0);
  }, [projects]);

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#3B2A1D] tracking-tight">Tester Dashboard</h1>
          <p className="text-sm text-[#7A6A5A]">Track your reported issues and execution progress.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onNavigateToTab('BugTracker')}
            className="px-4 py-2 bg-white border border-[#E7D6C4] hover:bg-[#FFF8F2] text-[#3B2A1D] text-sm font-medium rounded-xl transition-all shadow-xs flex items-center gap-2"
          >
            Bug Tracker
          </button>
          <button
            onClick={() => onNavigateToTab('Projects')}
            className="px-4 py-2 bg-[#8B5A2B] hover:bg-[#A66B37] text-white text-sm font-medium rounded-xl transition-all shadow-xs flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Execute Test Run
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E7D6C4] rounded-2xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#7A6A5A]">Reported by Me</span>
            <div className="p-1.5 rounded-xl bg-orange-50 text-orange-600"><BugIcon className="w-4 h-4"/></div>
          </div>
          <div className="mt-4"><h3 className="text-2xl font-bold text-[#3B2A1D]">{totalBugsReported}</h3></div>
        </div>
        
        <div className="bg-white border border-[#E7D6C4] rounded-2xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#7A6A5A]">Resolved Issues</span>
            <div className="p-1.5 rounded-xl bg-green-50 text-green-600"><CheckCircle className="w-4 h-4"/></div>
          </div>
          <div className="mt-4"><h3 className="text-2xl font-bold text-[#3B2A1D]">{fixedBugs.length}</h3></div>
        </div>

        <div className="bg-white border border-[#E7D6C4] rounded-2xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#7A6A5A]">Global Test Cases</span>
            <div className="p-1.5 rounded-xl bg-blue-50 text-blue-600"><FileText className="w-4 h-4"/></div>
          </div>
          <div className="mt-4"><h3 className="text-2xl font-bold text-[#3B2A1D]">{totalTestCases}</h3></div>
        </div>
      </div>

      <div className="bg-white border border-[#E7D6C4] rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4 border-b border-[#E7D6C4] pb-3">
          <h2 className="text-sm font-bold text-[#3B2A1D] flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#8B5A2B]" />
            Status of Issues I Reported
          </h2>
          <span className="text-xs font-bold text-[#7A6A5A] bg-[#FFF8F2] px-2 py-1 rounded-md">{activeBugs.length} Pending</span>
        </div>
        <div className="space-y-3 overflow-y-auto max-h-[400px] custom-scrollbar pr-2">
          {myReportedBugs.length > 0 ? (
            myReportedBugs
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .map(bug => (
              <div key={bug.id} className="flex flex-col p-4 border border-[#E7D6C4] rounded-xl hover:bg-[#FFF8F2]/50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-[#3B2A1D] text-sm">{bug.title}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    bug.status === 'Fixed' || bug.status === 'Closed' ? 'bg-green-100 text-green-700' :
                    bug.status === 'In Progress' ? 'bg-amber-100 text-amber-700' :
                    bug.status === 'Verification' ? 'bg-purple-100 text-purple-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {bug.status}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-[#7A6A5A] mt-2">
                  <span>Reported {formatDistanceToNow(new Date(bug.createdAt), { addSuffix: true })}</span>
                  <span className="font-medium text-[#3B2A1D]">
                    {bug.assigneeId ? 'Assigned' : 'Unassigned'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-sm text-[#7A6A5A] py-12 flex flex-col items-center justify-center">
              <BugIcon className="w-12 h-12 text-[#E7D6C4] mb-3" />
              You haven't reported any bugs yet. Run some tests and log any defects you find!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
