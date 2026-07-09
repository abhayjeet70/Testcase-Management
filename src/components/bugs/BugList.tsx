import React from 'react';
import { Bug, User, Project } from '../../types';
import { Edit3, Trash2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

interface BugListProps {
  bugs: Bug[];
  users: User[];
  projects: Project[];
  onEdit: (bug: Bug) => void;
  onDelete: (id: string) => void;
}

export default function BugList({ bugs, users, projects, onEdit, onDelete }: BugListProps) {
  const getAssigneeName = (id?: string) => users.find(u => u.id === id)?.name || 'Unassigned';
  const getReporterName = (id: string) => users.find(u => u.id === id)?.name || 'Unknown';
  const getProjectName = (id: string) => projects.find(p => p.id === id)?.project_name || 'Global';

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'New': return 'bg-blue-100 text-blue-700';
      case 'Assigned': return 'bg-indigo-100 text-indigo-700';
      case 'In Progress': return 'bg-amber-100 text-amber-700';
      case 'Verification': return 'bg-purple-100 text-purple-700';
      case 'Fixed':
      case 'Closed': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getSeverityColor = (sev: string) => {
    switch(sev) {
      case 'Critical': return 'bg-red-100 text-red-700 font-bold';
      case 'High': return 'bg-orange-100 text-orange-700';
      case 'Medium': return 'bg-yellow-100 text-yellow-700';
      case 'Low': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="h-full overflow-hidden bg-white border border-[#E7D6C4] rounded-2xl flex flex-col shadow-sm">
      <div className="overflow-x-auto flex-1 custom-scrollbar relative">
        <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
          <thead className="bg-[#FFF8F2] sticky top-0 z-10 border-b border-[#E7D6C4]">
            <tr>
              <th className="px-4 py-3 font-bold text-[#7A6A5A] text-xs uppercase tracking-wider w-[100px]">ID</th>
              <th className="px-4 py-3 font-bold text-[#7A6A5A] text-xs uppercase tracking-wider w-full">Title</th>
              <th className="px-4 py-3 font-bold text-[#7A6A5A] text-xs uppercase tracking-wider">Project</th>
              <th className="px-4 py-3 font-bold text-[#7A6A5A] text-xs uppercase tracking-wider">Severity</th>
              <th className="px-4 py-3 font-bold text-[#7A6A5A] text-xs uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 font-bold text-[#7A6A5A] text-xs uppercase tracking-wider">Assignee</th>
              <th className="px-4 py-3 font-bold text-[#7A6A5A] text-xs uppercase tracking-wider">Reporter</th>
              <th className="px-4 py-3 font-bold text-[#7A6A5A] text-xs uppercase tracking-wider">Reported On</th>
              <th className="px-4 py-3 font-bold text-[#7A6A5A] text-xs uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7D6C4]">
            {bugs.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-[#7A6A5A]">
                  No bugs found matching your criteria.
                </td>
              </tr>
            ) : (
              bugs.map((bug) => (
                <tr key={bug.id} className="hover:bg-[#FFF4E8]/50 transition-colors group">
                  <td className="px-4 py-3 font-medium text-[#7A6A5A]">
                    {bug.id.toUpperCase().split('-')[1]}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-[#3B2A1D] truncate max-w-[300px]">
                      {bug.title}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#7A6A5A] truncate max-w-[150px]">
                    {getProjectName(bug.projectId)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getSeverityColor(bug.severity)}`}>
                      {bug.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusColor(bug.status)}`}>
                      {bug.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#3B2A1D] font-medium">
                    {getAssigneeName(bug.assigneeId)}
                  </td>
                  <td className="px-4 py-3 text-[#7A6A5A]">
                    {getReporterName(bug.reporterId)}
                  </td>
                  <td className="px-4 py-3 text-[#7A6A5A] text-xs">
                    {format(new Date(bug.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => onEdit(bug)}
                        className="p-1.5 text-[#7A6A5A] hover:bg-[#8B5A2B]/10 hover:text-[#8B5A2B] rounded-lg transition-colors"
                        title="Edit Bug"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onDelete(bug.id)}
                        className="p-1.5 text-[#7A6A5A] hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                        title="Delete Bug"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
