import React, { useState, useEffect } from 'react';
import { 
  Clock, Search, ArrowUpDown, Download, Trash2, Calendar, 
  FileText, ClipboardList, Sparkles, Filter, ChevronRight, RefreshCw, RefreshCwIcon
} from 'lucide-react';
import { Project, TestCase, DownloadHistoryEntry } from '../../types';
import { downloadDocxFile, downloadCsvFile } from '../../utils/documentServices';
import { deleteDownloadHistoryEntry, getDownloadHistory, saveDownloadHistoryEntry } from '../../utils/storage';

export interface DownloadHistoryItem extends DownloadHistoryEntry {}

interface DownloadHistoryProps {
  showToast: (msg: string, type: 'success' | 'info' | 'error') => void;
}

// Global utility to record download event
export function recordDownloadEvent(
  projectId: string,
  projectName: string,
  format: DownloadHistoryItem['format'],
  rowCount: number,
  testCases: TestCase[],
  exportedBy: string = 'QA Analyst',
  fileSize: string = 'N/A',
  generatedFileName: string = 'export'
) {
  try {
    const newItem: DownloadHistoryItem = {
      id: 'dl-' + Math.random().toString(36).substring(2, 9),
      projectId,
      projectName,
      downloadedBy: exportedBy,
      downloadedAt: new Date().toISOString(),
      format,
      caseCount: rowCount,
      fileSize,
      generatedFileName,
      testCases
    };
    saveDownloadHistoryEntry(newItem);
  } catch (err) {
    console.error('Failed to log download history event', err);
  }
}

export default function DownloadHistory({ showToast }: DownloadHistoryProps) {
  const [history, setHistory] = useState<DownloadHistoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [formatFilter, setFormatFilter] = useState<string>('All');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  useEffect(() => {
    const loadHistory = () => {
      setHistory(getDownloadHistory());
    };
    loadHistory();
    window.addEventListener('storage', loadHistory);
    return () => window.removeEventListener('storage', loadHistory);
  }, []);

  const handleClearHistory = () => {
    if (confirm("Are you sure you want to clear your export history?")) {
      localStorage.removeItem('tc_download_history');
      setHistory([]);
      showToast("Download history cleared successfully.", "info");
    }
  };

  const handleDeleteItem = (id: string) => {
    deleteDownloadHistoryEntry(id);
    setHistory(getDownloadHistory());
    showToast("Audit entry deleted.", "info");
  };

  // Trigger Re-downloading from history
  const handleReDownload = async (item: DownloadHistoryItem) => {
    try {
      const cases: TestCase[] = item.testCases || [];
      const dummyProject: Project = {
        id: item.projectId,
        project_name: item.projectName,
        description: 'Historical export download',
        favorite: false,
        archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (item.format === 'Word') {
        await downloadDocxFile(dummyProject, cases, item.downloadedBy);
      } else {
        downloadCsvFile(dummyProject, cases);
      }
      
      showToast(`Re-downloaded "${item.projectName}" successfully!`, 'success');
    } catch (err) {
      showToast("Could not rebuild the historical document.", "error");
    }
  };

  // Filter and sort items
  const filteredItems = history
    .filter(item => {
      const matchesSearch = item.projectName.toLowerCase().includes(search.toLowerCase()) || 
                            item.downloadedBy.toLowerCase().includes(search.toLowerCase());
      const matchesFormat = formatFilter === 'All' || item.format === formatFilter;
      return matchesSearch && matchesFormat;
    })
    .sort((a, b) => {
      const dateA = new Date(a.downloadedAt).getTime();
      const dateB = new Date(b.downloadedAt).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-[#3B2A1D] tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#8B5A2B]" />
            QA Download & Export History Log
          </h1>
          <p className="text-xs text-[#7A6A5A] mt-0.5">
            Track and audit all document generation events. Retrieve, re-download, or preview historical snapshot states from local storage anytime.
          </p>
        </div>
        
        {history.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="px-3.5 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Log History
          </button>
        )}
      </div>

      {/* FILTER & SEARCH CONTROLS */}
      <div className="bg-white border border-[#E7D6C4] p-4 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#7A6A5A]/50 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search logs by Project Name or Exported By..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-[#E7D6C4] bg-white rounded-xl text-xs text-[#3B2A1D] placeholder-[#7A6A5A]/50 focus:outline-hidden focus:ring-1 focus:ring-[#8B5A2B] transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#7A6A5A] shrink-0">Filter Format:</span>
          <select
            value={formatFilter}
            onChange={e => setFormatFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-[#E7D6C4] rounded-xl text-xs bg-white text-[#3B2A1D] font-medium cursor-pointer"
          >
            <option value="All">All Formats</option>
            <option value="Word">Word</option>
            <option value="CSV">CSV</option>
            <option value="PDF">PDF</option>
          </select>
        </div>

        <button
          onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
          className="px-3 py-2 border border-[#E7D6C4] hover:bg-[#FFF4E8]/40 text-[#3B2A1D] text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-[#7A6A5A]" />
          Sort: {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
        </button>
      </div>

      {/* HISTORY TABLE GRID */}
      <div className="bg-white border border-[#E7D6C4] rounded-2xl overflow-hidden shadow-xs">
        {filteredItems.length > 0 ? (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse select-text">
              <thead>
                <tr className="bg-[#FFF4E8]/40 border-b border-[#E7D6C4] text-xs font-bold text-[#3B2A1D] h-11">
                  <th className="px-4 w-[220px]">Project</th>
                  <th className="px-4 w-[140px]">Format</th>
                  <th className="px-4 w-[90px]">Cases</th>
                  <th className="px-4 w-[150px]">Downloaded By</th>
                  <th className="px-4 w-[180px]">Date / Time</th>
                  <th className="px-4 text-center w-[160px]">Actions</th>
                </tr>
              </thead>
              <tbody className="text-xs text-[#3B2A1D] divide-y divide-[#E7D6C4]/40">
                {filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-[#FFF8F2]/30 transition-colors">
                    
                    {/* Project Name */}
                    <td className="px-4 py-3 font-bold text-[#3B2A1D]">
                      {item.projectName}
                    </td>

                    {/* Format Badge */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        item.format === 'Word' 
                          ? 'bg-blue-50 text-blue-700 border border-blue-100'
                          : item.format === 'CSV'
                          ? 'bg-green-50 text-green-700 border border-green-100'
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {item.format === 'Word' ? (
                          <FileText className="w-3 h-3" />
                        ) : item.format === 'CSV' ? (
                          <ClipboardList className="w-3 h-3" />
                        ) : (
                          <Sparkles className="w-3 h-3" />
                        )}
                        {item.format}
                      </span>
                    </td>

                    {/* Row Count */}
                    <td className="px-4 py-3 font-mono font-semibold text-[#7A6A5A]">
                      {item.caseCount} cases
                    </td>

                    {/* Exported By */}
                    <td className="px-4 py-3 font-medium text-[#3B2A1D]">
                      {item.downloadedBy}
                    </td>

                    {/* Timestamp */}
                    <td className="px-4 py-3 text-xs text-[#7A6A5A] font-medium flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#E7D6C4]" />
                      {new Date(item.downloadedAt).toLocaleString([], {
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleReDownload(item)}
                          className="px-3 py-1 bg-[#8B5A2B] hover:bg-[#A66B37] text-white text-[11px] font-bold rounded-lg flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                          title="Re-Build & Download Document"
                        >
                          <Download className="w-3 h-3" />
                          Re-Download
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete history item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center text-[#7A6A5A]/50 space-y-2">
            <Clock className="w-10 h-10 text-[#E7D6C4] mx-auto animate-pulse" />
            <p className="text-sm font-semibold">No export events recorded yet.</p>
            <p className="text-xs max-w-sm mx-auto text-[#7A6A5A]/70">Any CSV, Word DOCX exports, or AI generated suites downloaded will be logged here for quick retrieval.</p>
          </div>
        )}
      </div>

    </div>
  );
}
