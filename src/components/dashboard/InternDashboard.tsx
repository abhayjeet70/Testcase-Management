import React from 'react';
import { Project } from '../../types';
import { getActivityLogs } from '../../utils/storage';
import { BookOpen, Activity, GraduationCap, Video } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface InternDashboardProps {
  projects: Project[];
  onSelectProject: (id: string) => void;
  onNavigateToTab: (tab: string) => void;
}

export default function InternDashboard({ projects, onNavigateToTab }: InternDashboardProps) {
  const allLogs = projects.flatMap(p => getActivityLogs(p.id)).sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  ).slice(0, 20); // Just show the most recent 20 global actions

  return (
    <div className="space-y-6 animate-fade-in font-sans max-w-5xl mx-auto">
      <div className="text-center py-6 bg-[#FFF8F2] rounded-3xl border border-[#E7D6C4]">
        <div className="w-16 h-16 bg-[#8B5A2B] text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-[#3B2A1D] tracking-tight">Welcome to the Team!</h1>
        <p className="text-sm text-[#7A6A5A] mt-2 max-w-md mx-auto">
          Your workspace is currently set to read-only learning mode. Explore the recent activities of the team and review our testing protocols.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Learning Resources */}
        <div className="bg-white border border-[#E7D6C4] rounded-2xl p-5 shadow-xs">
          <h2 className="text-sm font-bold text-[#3B2A1D] flex items-center gap-2 mb-4 border-b border-[#E7D6C4] pb-3">
            <BookOpen className="w-4 h-4 text-[#8B5A2B]" />
            Getting Started Guides
          </h2>
          <div className="space-y-4">
            <div className="p-3 border border-[#E7D6C4] rounded-xl hover:bg-[#FFF8F2] transition-colors cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><BookOpen className="w-4 h-4" /></div>
                <div>
                  <h4 className="text-sm font-bold text-[#3B2A1D] group-hover:text-[#8B5A2B]">How to write a good Test Case</h4>
                  <p className="text-xs text-[#7A6A5A]">Learn our standard format for objectives and steps.</p>
                </div>
              </div>
            </div>
            
            <div className="p-3 border border-[#E7D6C4] rounded-xl hover:bg-[#FFF8F2] transition-colors cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 text-red-600 rounded-lg"><Video className="w-4 h-4" /></div>
                <div>
                  <h4 className="text-sm font-bold text-[#3B2A1D] group-hover:text-[#8B5A2B]">Bug Reporting 101</h4>
                  <p className="text-xs text-[#7A6A5A]">What makes a bug report actionable for developers?</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigateToTab('Templates')}
              className="w-full py-2 bg-white border border-[#E7D6C4] text-[#8B5A2B] text-sm font-bold rounded-xl hover:bg-[#FFF8F2] transition-colors mt-2"
            >
              Browse Test Templates →
            </button>
          </div>
        </div>

        {/* Global Activity Feed */}
        <div className="bg-white border border-[#E7D6C4] rounded-2xl p-5 shadow-xs">
          <h2 className="text-sm font-bold text-[#3B2A1D] flex items-center gap-2 mb-4 border-b border-[#E7D6C4] pb-3">
            <Activity className="w-4 h-4 text-green-500" />
            Live Team Activity
          </h2>
          <div className="space-y-3 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
            {allLogs.length > 0 ? (
              allLogs.map(log => {
                const matchedProj = projects.find(p => p.id === log.project_id);
                return (
                  <div key={log.id} className="text-xs flex flex-col py-2 border-b border-[#F5EDE4] last:border-0">
                    <span className="text-[#7A6A5A] mb-1">
                      {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-[#3B2A1D] mr-1">
                        {matchedProj ? matchedProj.project_name : 'Global'}
                      </span>
                      <span className="text-[#3B2A1D]">{log.action}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-sm text-[#7A6A5A] py-8">
                No recent activity to show.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
