import React, { useState } from 'react';
import { ActivityLog } from '../../types';
import { getActivityLogs, getProjects } from '../../utils/storage';
import { Clock, Filter, Search, CheckCircle, Bug, FileText, User as UserIcon } from 'lucide-react';

interface TeamActivityLogProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function TeamActivityLog({ showToast }: TeamActivityLogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'today', '7days', '30days'
  const [projectFilter, setProjectFilter] = useState('all'); // 'all' or project_id
  
  // Aggregate all logs from all projects
  const projects = getProjects();
  const allLogs = projects.flatMap(p => getActivityLogs(p.id))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const filteredLogs = allLogs.filter(log => {
    // Project filter
    if (projectFilter !== 'all' && log.project_id !== projectFilter) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const matchAction = log.action.toLowerCase().includes(searchQuery.toLowerCase());
      const matchTC = log.test_case_no && log.test_case_no.toLowerCase().includes(searchQuery.toLowerCase());
      const matchUser = log.user_name && log.user_name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchAction && !matchTC && !matchUser) return false;
    }

    // Time filter
    if (timeFilter !== 'all') {
      const logDate = new Date(log.timestamp).getTime();
      const now = new Date().getTime();
      const diffDays = (now - logDate) / (1000 * 3600 * 24);

      if (timeFilter === 'today' && diffDays > 1) return false;
      if (timeFilter === '7days' && diffDays > 7) return false;
      if (timeFilter === '30days' && diffDays > 30) return false;
    }

    return true;
  });

  const getLogIcon = (action: string) => {
    const lower = action.toLowerCase();
    if (lower.includes('fixed') || lower.includes('done')) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (lower.includes('bug') || lower.includes('issue')) return <Bug className="w-4 h-4 text-red-500" />;
    if (lower.includes('export') || lower.includes('download')) return <FileText className="w-4 h-4 text-blue-500" />;
    return <Clock className="w-4 h-4 text-[#8B5A2B]" />;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#E7D6C4] overflow-hidden flex flex-col h-[calc(100vh-120px)]">
      <div className="p-6 border-b border-[#E7D6C4] bg-[#FFF8F2]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#3B2A1D] flex items-center gap-2">
            <Clock className="w-6 h-6 text-[#8B5A2B]" />
            Team Activity / Logs
          </h2>
          <p className="text-sm text-[#7A6A5A] mt-1">Detailed history of team interactions, bug fixes, and assignments.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
          <div className="relative w-full sm:w-56">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7A6A5A]" />
            <input
              type="text"
              placeholder="Search logs or names..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-[#E7D6C4] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#8B5A2B]/20 w-full"
            />
          </div>
          
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 border border-[#E7D6C4] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#8B5A2B]/20 bg-white text-[#3B2A1D] cursor-pointer"
          >
            <option value="all">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.project_name}
              </option>
            ))}
          </select>
          
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 border border-[#E7D6C4] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#8B5A2B]/20 bg-white text-[#3B2A1D] cursor-pointer"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-[#FAFAFA]">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#7A6A5A] space-y-3">
            <Clock className="w-12 h-12 text-[#E7D6C4]" />
            <p className="font-semibold text-lg">No activity recorded yet</p>
            <p className="text-sm">Team actions like bug fixes and sheet completions will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLogs.map(log => {
              const project = projects.find(p => p.id === log.project_id);
              return (
                <div key={log.id} className="flex gap-4 p-4 bg-white border border-[#E7D6C4] rounded-xl shadow-xs hover:shadow-md transition-shadow">
                  <div className="mt-1 flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-[#FFF8F2] flex items-center justify-center border border-[#E7D6C4]/50">
                      {getLogIcon(log.action)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-[#3B2A1D] break-words">
                          {log.action}
                        </p>
                        {log.user_name && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <UserIcon className="w-3.5 h-3.5 text-[#7A6A5A]" />
                            <span className="text-xs font-semibold text-[#8B5A2B] bg-[#FFF4E8] px-2 py-0.5 rounded-md border border-[#E7D6C4]">
                              {log.user_name}
                              {log.user_role && <span className="opacity-70 ml-1 font-normal capitalize">({log.user_role})</span>}
                            </span>
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-[#7A6A5A] font-medium whitespace-nowrap bg-gray-50 px-2 py-1 rounded-md border border-gray-100 flex-shrink-0 self-start">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-2.5 flex items-center gap-3 text-xs text-[#7A6A5A]">
                      {project && (
                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md font-bold">
                          Project: {project.project_name}
                        </span>
                      )}
                      {log.test_case_no && (
                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md font-bold border border-gray-200">
                          {log.test_case_no}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
