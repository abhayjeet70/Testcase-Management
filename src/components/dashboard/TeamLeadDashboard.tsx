import React, { useMemo } from 'react';
import { Project } from '../../types';
import { getBugsAll, getTestCases } from '../../utils/storage';
import { ShieldAlert, Users, FolderOpen, ArrowUpRight, Activity, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TeamLeadDashboardProps {
  projects: Project[];
  onSelectProject: (id: string) => void;
  onNavigateToTab: (tab: string) => void;
}

export default function TeamLeadDashboard({ projects, onSelectProject, onNavigateToTab }: TeamLeadDashboardProps) {
  const allBugs = getBugsAll();
  
  // Unassigned bugs
  const unassignedBugs = allBugs.filter(b => !b.assigneeId && b.status !== 'Fixed' && b.status !== 'Closed');
  
  // Critical bugs
  const criticalBugs = allBugs.filter(b => b.severity === 'Critical' && b.status !== 'Fixed' && b.status !== 'Closed');

  const totalTestCases = useMemo(() => {
    return projects.reduce((acc, p) => acc + getTestCases(p.id).length, 0);
  }, [projects]);

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#3B2A1D] tracking-tight">Team Lead Dashboard</h1>
          <p className="text-sm text-[#7A6A5A]">Triage bugs, oversee project health, and manage assignments.</p>
        </div>
        <button
          onClick={() => onNavigateToTab('BugTracker')}
          className="px-4 py-2 bg-[#8B5A2B] hover:bg-[#A66B37] text-white text-sm font-medium rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
        >
          Open Bug Tracker
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E7D6C4] rounded-2xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#7A6A5A]">Total Active Projects</span>
            <div className="p-1.5 rounded-xl bg-blue-50 text-blue-600"><FolderOpen className="w-4 h-4"/></div>
          </div>
          <div className="mt-4"><h3 className="text-2xl font-bold text-[#3B2A1D]">{projects.length}</h3></div>
        </div>
        
        <div className="bg-white border border-[#E7D6C4] rounded-2xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#7A6A5A]">Unassigned Bugs</span>
            <div className="p-1.5 rounded-xl bg-orange-50 text-orange-600"><Users className="w-4 h-4"/></div>
          </div>
          <div className="mt-4"><h3 className="text-2xl font-bold text-[#3B2A1D]">{unassignedBugs.length}</h3></div>
        </div>

        <div className="bg-white border border-[#E7D6C4] rounded-2xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#7A6A5A]">Critical Open Bugs</span>
            <div className="p-1.5 rounded-xl bg-red-50 text-red-600"><ShieldAlert className="w-4 h-4"/></div>
          </div>
          <div className="mt-4"><h3 className="text-2xl font-bold text-[#3B2A1D]">{criticalBugs.length}</h3></div>
        </div>

        <div className="bg-white border border-[#E7D6C4] rounded-2xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#7A6A5A]">Total Test Cases</span>
            <div className="p-1.5 rounded-xl bg-green-50 text-green-600"><Activity className="w-4 h-4"/></div>
          </div>
          <div className="mt-4"><h3 className="text-2xl font-bold text-[#3B2A1D]">{totalTestCases}</h3></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unassigned Bugs */}
        <div className="bg-white border border-[#E7D6C4] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 border-b border-[#E7D6C4] pb-3">
            <h2 className="text-sm font-bold text-[#3B2A1D] flex items-center gap-2">
              <Users className="w-4 h-4 text-orange-500" />
              Needs Assignment
            </h2>
            <span className="text-xs font-bold text-[#7A6A5A] bg-[#FFF8F2] px-2 py-1 rounded-md">{unassignedBugs.length} Bugs</span>
          </div>
          <div className="space-y-3 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
            {unassignedBugs.length > 0 ? (
              unassignedBugs.map(bug => (
                <div key={bug.id} className="flex flex-col p-3 border border-[#E7D6C4] rounded-xl hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-[#3B2A1D]">{bug.title}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      bug.severity === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>{bug.severity}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-[#7A6A5A]">
                    <span>Reported {formatDistanceToNow(new Date(bug.createdAt), { addSuffix: true })}</span>
                    <button 
                      onClick={() => onNavigateToTab('BugTracker')} 
                      className="text-[#8B5A2B] font-bold hover:underline"
                    >
                      Assign →
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-sm text-[#7A6A5A] py-8">
                All bugs are assigned! Great job team.
              </div>
            )}
          </div>
        </div>

        {/* Critical Issues */}
        <div className="bg-white border border-[#E7D6C4] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 border-b border-[#E7D6C4] pb-3">
            <h2 className="text-sm font-bold text-[#3B2A1D] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500" />
              Critical Issues
            </h2>
            <span className="text-xs font-bold text-[#7A6A5A] bg-[#FFF8F2] px-2 py-1 rounded-md">{criticalBugs.length} Bugs</span>
          </div>
          <div className="space-y-3 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
            {criticalBugs.length > 0 ? (
              criticalBugs.map(bug => (
                <div key={bug.id} className="flex flex-col p-3 border border-red-200 bg-red-50/30 rounded-xl hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-[#3B2A1D]">{bug.title}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700">
                      {bug.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-[#7A6A5A]">
                    <span>Reported {formatDistanceToNow(new Date(bug.createdAt), { addSuffix: true })}</span>
                    <span className="flex items-center gap-1 font-semibold text-red-600">
                      <AlertTriangle className="w-3 h-3" /> Urgent
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-sm text-[#7A6A5A] py-8">
                No critical issues at the moment.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
