import React, { useState, useMemo } from 'react';
import { Plus, Search, Filter, Bug as BugIcon, LayoutList, LayoutGrid } from 'lucide-react';
import { Project, TestCase, TestCaseStatus } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import BugKanban from './BugKanban';

interface BugTrackerProps {
  projects: Project[];
  selectedProjectId: string;
  testCases?: TestCase[];
  onSaveTestCase?: (tc: TestCase) => void;
}

export default function BugTracker({ projects, selectedProjectId, testCases = [], onSaveTestCase }: BugTrackerProps) {
  const { users } = useAuth();
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');

  // We only show Test Cases in the Kanban board that are NOT simply "Passed" (unless we want to map Passed to Closed).
  // Actually, the plan says we map them all so we'll just pass them down.
  const filteredBugs = useMemo(() => {
    return testCases.filter(b => {
      const matchesSearch = b.test_case_no.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            b.test_objective.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [testCases, searchQuery]);

  const handleStatusChange = (id: string, newStatus: TestCaseStatus) => {
    if (!onSaveTestCase) return;
    const tc = testCases.find(t => t.id === id);
    if (tc) {
      onSaveTestCase({ ...tc, status: newStatus });
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-[#E7D6C4] overflow-hidden">
      
      {/* Header */}
      <div className="px-6 py-5 border-b border-[#E7D6C4] flex items-center justify-between bg-[#FFF4E8]/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center border border-red-200">
            <BugIcon className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#3B2A1D] leading-none">Bug Tracker (Kanban Sync)</h2>
            <p className="text-xs text-[#7A6A5A] font-semibold mt-1">Manage and resolve test case issues in a visual pipeline.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7A6A5A]" />
            <input
              type="text"
              placeholder="Search test cases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-[#E7D6C4] rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#8B5A2B]/20 w-64"
            />
          </div>

          <button
            onClick={() => {
              // Redirect to main test case view to add one? For now, we'll just disable the add button here
              // since it's synced with the spreadsheet.
              alert("To add a new bug/test case, switch to the Test Cases Spreadsheet tab.");
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#8B5A2B] hover:bg-[#A66B37] text-white text-sm font-bold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Test Case
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden bg-[#FFF8F2]/30 p-6">
        <BugKanban 
          testCases={filteredBugs} 
          users={users} 
          onStatusChange={handleStatusChange}
        />
      </div>

    </div>
  );
}
