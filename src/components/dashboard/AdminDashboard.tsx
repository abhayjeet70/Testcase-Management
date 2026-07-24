import React from 'react';
import { motion } from 'motion/react';
import { 
  CheckCircle, XCircle, AlertTriangle, HelpCircle, 
  Layers, FileText, ClipboardList, Activity, ArrowUpRight, Clock,
  Users, UserPlus, Shield
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { TestCase, Project, ActivityLog } from '../../types';
import { getTestCases, getActivityLogs, getDocuments } from '../../utils/storage';
import { useAuth } from '../../contexts/AuthContext';
interface DashboardProps {
  projects: Project[];
  testCases: TestCase[];
  activityLogs: ActivityLog[];
  onSelectProject: (id: string) => void;
  onNavigateToTab: (tab: string) => void;
}

export default function AdminDashboard({ 
  projects, 
  testCases: activeTestCases, // local active test cases
  activityLogs: activeLogs,
  onSelectProject,
  onNavigateToTab 
}: DashboardProps) {
  
  const { users } = useAuth();
  const [toastMsg, setToastMsg] = React.useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [recentDownloads, setRecentDownloads] = React.useState<any[]>([]);

  const showInternalToast = (text: string, type: 'success' | 'error') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('testcase_download_history');
      if (raw) {
        setRecentDownloads(JSON.parse(raw).slice(0, 5));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Query ALL test cases and ALL logs for fully accurate global dashboard metrics
  const allTestCases = projects.flatMap(p => {
    const docs = getDocuments(p.id);
    return docs.flatMap(d => getTestCases(d.id));
  });
  const allLogs = projects.flatMap(p => getActivityLogs(p.id)).sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Calculate global counts
  const totalCases = allTestCases.length;
  const fixedCount = allTestCases.filter(tc => tc.status === 'Fixed').length;
  const notFixedCount = allTestCases.filter(tc => tc.status === 'Not Fixed').length;
  const inProgressCount = allTestCases.filter(tc => tc.status === 'In Progress').length;
  const blockedCount = allTestCases.filter(tc => tc.status === 'Blocked').length;
  const notTestedCount = allTestCases.filter(tc => tc.status === 'Not Tested').length;

  const completionPercent = totalCases > 0 ? Math.round((fixedCount / totalCases) * 100) : 0;

  // Pie chart data
  const statusData = [
    { name: 'Fixed', value: fixedCount, color: '#34C759' },
    { name: 'Not Fixed', value: notFixedCount, color: '#FF4D4F' },
    { name: 'In Progress', value: inProgressCount, color: '#F5A623' },
    { name: 'Blocked', value: blockedCount, color: '#7C4DFF' },
    { name: 'Not Tested', value: notTestedCount, color: '#A0A0A0' }
  ].filter(item => item.value > 0);

  const emptyPieData = [{ name: 'No Test Cases', value: 1, color: '#E7D6C4' }];

  // Bar chart data (Test Cases per project)
  const projectBreakdown = projects.map(proj => {
    const docs = getDocuments(proj.id);
    const count = docs.reduce((sum, doc) => sum + getTestCases(doc.id).length, 0);
    const docCount = docs.length;
    const projName = proj.project_name || 'Untitled';
    return {
      name: projName.length > 15 ? projName.substring(0, 15) + '...' : projName,
      'Test Cases': count,
      'Document Files': docCount,
      id: proj.id
    };
  });

  const stats = [
    {
      id: 'stat-total',
      title: 'Total Test Cases',
      value: totalCases,
      icon: ClipboardList,
      color: 'bg-[#8B5A2B]/10 text-[#8B5A2B]',
      border: 'border-[#8B5A2B]/20',
      description: `${projects.length} Active Projects`
    },
    {
      id: 'stat-fixed',
      title: 'Fixed',
      value: fixedCount,
      icon: CheckCircle,
      color: 'bg-[#34C759]/10 text-[#34C759]',
      border: 'border-[#34C759]/20',
      description: `${completionPercent}% Completion Rate`
    },
    {
      id: 'stat-notfixed',
      title: 'Not Fixed',
      value: notFixedCount,
      icon: XCircle,
      color: 'bg-[#FF4D4F]/10 text-[#FF4D4F]',
      border: 'border-[#FF4D4F]/20',
      description: `${totalCases > 0 ? Math.round((notFixedCount / totalCases) * 100) : 0}% Fail Rate`
    },
    {
      id: 'stat-inprogress',
      title: 'In Progress',
      value: inProgressCount,
      icon: AlertTriangle,
      color: 'bg-[#F5A623]/10 text-[#F5A623]',
      border: 'border-[#F5A623]/20',
      description: 'Active testing cycles'
    },
    {
      id: 'stat-blocked',
      title: 'Blocked',
      value: blockedCount,
      icon: HelpCircle,
      color: 'bg-[#7C4DFF]/10 text-[#7C4DFF]',
      border: 'border-[#7C4DFF]/20',
      description: 'Requires attention'
    },
    {
      id: 'stat-nottested',
      title: 'Not Tested',
      value: notTestedCount,
      icon: Layers,
      color: 'bg-[#A0A0A0]/10 text-[#A0A0A0]',
      border: 'border-[#A0A0A0]/20',
      description: 'Pending execution'
    }
  ];

  // Group activity logs by Day (Today, Yesterday, Older)
  const getGroupedActivityLogs = () => {
    const today: ActivityLog[] = [];
    const yesterday: ActivityLog[] = [];
    const older: ActivityLog[] = [];

    const now = new Date();
    const todayStr = now.toDateString();

    const yest = new Date();
    yest.setDate(now.getDate() - 1);
    const yesterdayStr = yest.toDateString();

    allLogs.forEach(log => {
      const logDate = new Date(log.timestamp);
      const logDateStr = logDate.toDateString();
      if (logDateStr === todayStr) {
        today.push(log);
      } else if (logDateStr === yesterdayStr) {
        yesterday.push(log);
      } else {
        older.push(log);
      }
    });

    return { today, yesterday, older };
  };

  const { today: todayLogs, yesterday: yesterdayLogs, older: olderLogs } = getGroupedActivityLogs();

  const formatTimeOnly = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatDateOnly = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  };

  // Compile dynamic Document structure from active projects list
  const recentDocuments = projects.map(proj => {
    const projCases = getTestCases(proj.id);
    const docName = `${(proj.project_name || 'Untitled').replace(/\s+/g, '_')}_Defect.docx`;

    let latestTime = proj.updated_at;
    projCases.forEach(tc => {
      if (tc.updated_at > latestTime) {
        latestTime = tc.updated_at;
      }
    });

    // Check status based on fixed cases
    const totalCount = projCases.length;
    const fixed = projCases.filter(c => c.status === 'Fixed').length;
    const blocked = projCases.filter(c => c.status === 'Blocked').length;
    
    let docStatus: 'Completed' | 'Active' | 'Under Review' = 'Active';
    if (totalCount > 0 && fixed === totalCount) {
      docStatus = 'Completed';
    } else if (blocked > 0) {
      docStatus = 'Under Review';
    }

    return {
      id: proj.id,
      projectName: proj.project_name || 'Untitled',
      documentName: docName,
      createdDate: formatDateOnly(proj.created_at),
      lastModified: formatDateOnly(latestTime),
      totalCases: totalCount,
      status: docStatus
    };
  });

  return (
    <div id="dashboard-tab-content" className="space-y-8 animate-fade-in font-sans">
      {/* INTERNAL TOAST */}
      {toastMsg && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 animate-fade-in ${
          toastMsg.type === 'success' ? 'bg-[#34C759] text-white' : 'bg-[#FF4D4F] text-white'
        }`}>
          {toastMsg.type === 'success' ? '✓' : '✕'} {toastMsg.text}
        </div>
      )}


      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 id="dashboard-title" className="text-2xl font-bold text-[#3B2A1D] tracking-tight">QA Command Dashboard</h1>
          <p className="text-sm text-[#7A6A5A]">Real-time analytics, suite integrity, and activity timelines.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onNavigateToTab('Projects')}
            className="px-4 py-2 bg-[#8B5A2B] hover:bg-[#A66B37] text-white text-sm font-medium rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          >
            Manage Test Suite
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* STATISTICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.id}
            id={stat.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ y: -4, boxShadow: '0 10px 25px -5px rgba(139,90,43,0.08)' }}
            className={`bg-white border ${stat.border} rounded-2xl p-4 flex flex-col justify-between shadow-xs transition-all`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-[#7A6A5A] truncate">{stat.title}</span>
              <div className={`p-1.5 rounded-xl ${stat.color} shrink-0`}>
                <stat.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-bold text-[#3B2A1D] tracking-tight">{stat.value}</h3>
              <p className="text-[11px] text-[#7A6A5A] mt-0.5 truncate">{stat.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* CHARTS CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PIE CHART - STATUS DISTRIBUTION */}
        <div className="bg-white border border-[#E7D6C4] rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h-[340px]">
          <div>
            <h2 className="text-sm font-semibold text-[#3B2A1D] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#8B5A2B]" />
              Status Distribution
            </h2>
            <p className="text-xs text-[#7A6A5A] mt-0.5">Overall status of all test cases in database</p>
          </div>
          <div className="h-48 relative mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData.length > 0 ? statusData : emptyPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {(statusData.length > 0 ? statusData : emptyPieData).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#FFFFFF', 
                    borderRadius: '12px', 
                    border: '1px solid #E7D6C4',
                    fontFamily: 'Inter',
                    fontSize: '12px',
                    color: '#3B2A1D'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center metric */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-[#3B2A1D]">{completionPercent}%</span>
              <span className="text-[10px] text-[#7A6A5A] font-medium uppercase tracking-wider">Fixed</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-center mt-2">
            {statusData.map((item, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px] text-[#7A6A5A] font-medium">{item.name}</span>
                </div>
                <span className="text-xs font-bold text-[#3B2A1D]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* BAR CHART - PROJECT BREAKDOWN */}
        <div className="bg-white border border-[#E7D6C4] rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h-[340px] lg:col-span-2">
          <div>
            <h2 className="text-sm font-semibold text-[#3B2A1D] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#34C759]" />
              TestSuite Coverage by Project
            </h2>
            <p className="text-xs text-[#7A6A5A] mt-0.5">Total count of active test cases defined within each project</p>
          </div>
          <div className="h-56 mt-4">
            {projects.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5EDE4" />
                  <XAxis dataKey="name" stroke="#7A6A5A" fontSize={10} tickLine={false} />
                  <YAxis stroke="#7A6A5A" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: '#FFFFFF', 
                      borderRadius: '12px', 
                      border: '1px solid #E7D6C4',
                      fontFamily: 'Inter',
                      fontSize: '12px',
                      color: '#3B2A1D'
                    }} 
                  />
                  <Bar dataKey="Test Cases" fill="#8B5A2B" radius={[4, 4, 0, 0]} barSize={16} />
                  <Bar dataKey="Document Files" fill="#CD853F" radius={[4, 4, 0, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-[#7A6A5A] text-sm">
                No project data available. Create a project to see coverage metrics.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RECENT DOCUMENTS & RECENT ACTIVITY DUAL COLUMNS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* RECENT TEST CASE DOCUMENTS & DOWNLOADS STACK */}
        <div className="xl:col-span-2 space-y-6">
          {/* RECENT TEST CASE DOCUMENTS */}
          <div className="bg-white border border-[#E7D6C4] rounded-2xl p-5 shadow-xs">
            <div>
              <div className="flex items-center justify-between border-b border-[#F5EDE4] pb-3 mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-[#3B2A1D] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#8B5A2B]" />
                    Recent Test Case Documents
                  </h2>
                  <p className="text-xs text-[#7A6A5A] mt-0.5">Active test suites in document ledger</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E7D6C4] text-[#7A6A5A] font-semibold h-8">
                      <th className="py-2">Project Name</th>
                      <th className="py-2">Document Name</th>
                      <th className="py-2">Created</th>
                      <th className="py-2">Last Modified</th>
                      <th className="py-2 text-center">Total Cases</th>
                      <th className="py-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5EDE4] text-[#3B2A1D]">
                    {recentDocuments.map((doc) => (
                      <tr 
                        key={doc.id}
                        onClick={() => {
                          onSelectProject(doc.id);
                          onNavigateToTab('Projects');
                        }}
                        className="hover:bg-[#FFF8F2]/60 cursor-pointer transition-colors group h-10 font-medium"
                      >
                        <td className="py-2 font-bold group-hover:text-[#8B5A2B]">{doc.projectName}</td>
                        <td className="py-2 text-[#7A6A5A] font-mono">{doc.documentName}</td>
                        <td className="py-2 text-[#7A6A5A]">{doc.createdDate}</td>
                        <td className="py-2">{doc.lastModified}</td>
                        <td className="py-2 text-center font-bold text-[#8B5A2B]">{doc.totalCases}</td>
                        <td className="py-2 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            doc.status === 'Completed' ? 'bg-[#34C759]/10 text-[#34C759]' :
                            doc.status === 'Under Review' ? 'bg-[#FF4D4F]/10 text-[#FF4D4F]' : 'bg-[#FFF4E8] text-[#8B5A2B]'
                          }`}>
                            {doc.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* RECENT DOWNLOADS CARD */}
          <div className="bg-white border border-[#E7D6C4] rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#F5EDE4] pb-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-[#3B2A1D] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#8B5A2B]" />
                  Recent Downloads & Exports
                </h2>
                <p className="text-xs text-[#7A6A5A] mt-0.5">Quick access to your 5 most recent downloads</p>
              </div>
              <button
                onClick={() => onNavigateToTab('DownloadHistory')}
                className="text-[11px] font-bold text-[#8B5A2B] hover:underline cursor-pointer"
              >
                View Log History →
              </button>
            </div>

            {recentDownloads.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E7D6C4] text-[#7A6A5A] font-semibold h-8">
                      <th className="py-2">Project Name</th>
                      <th className="py-2">Format</th>
                      <th className="py-2">Exported By</th>
                      <th className="py-2">Rows</th>
                      <th className="py-2 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5EDE4] text-[#3B2A1D]">
                    {recentDownloads.map((dl) => (
                      <tr key={dl.id} className="h-10 font-medium">
                        <td className="py-2 font-bold text-[#3B2A1D]">{dl.projectName}</td>
                        <td className="py-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            dl.format === 'Word (.docx)' 
                              ? 'bg-blue-50 text-blue-700 border border-blue-100'
                              : dl.format === 'CSV Spreadsheet'
                              ? 'bg-green-50 text-green-700 border border-green-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            {dl.format}
                          </span>
                        </td>
                        <td className="py-2 text-[#7A6A5A]">{dl.exportedBy}</td>
                        <td className="py-2 font-mono text-[#7A6A5A]">{dl.rowCount} rows</td>
                        <td className="py-2 text-right text-[#7A6A5A]">
                          {new Date(dl.downloadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-[#7A6A5A]/50 text-xs">
                No recent downloads or exports found. Export a test suite to view logs.
              </div>
            )}
          </div>
        </div>

        {/* RECENT ACTIVITY TIMELINE */}
        <div className="bg-white border border-[#E7D6C4] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#F5EDE4] pb-3 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[#3B2A1D] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#8B5A2B]" />
                Recent Activity
              </h2>
              <p className="text-xs text-[#7A6A5A] mt-0.5">Chronological audit trails grouped by day</p>
            </div>
          </div>

          <div className="max-h-[350px] overflow-y-auto space-y-4 pr-1">
            {allLogs.length > 0 ? (
              <div className="space-y-4">
                {/* TODAY SECTION */}
                {todayLogs.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#8B5A2B] bg-[#FFF4E8] px-2 py-0.5 rounded-md inline-block">Today</h3>
                    <div className="space-y-2 pl-1 border-l-2 border-[#E7D6C4]/40">
                      {todayLogs.map(log => {
                        const matchedProj = projects.find(p => p.id === log.project_id);
                        return (
                          <div key={log.id} className="text-xs flex justify-between items-start gap-2 py-1 hover:bg-gray-50/50 rounded px-1">
                            <div className="flex-1 min-w-0">
                              <span className="font-bold text-[#3B2A1D] mr-1 truncate inline-block max-w-[100px] align-bottom" title={matchedProj?.project_name}>
                                {matchedProj ? matchedProj.project_name : 'SocialNxt'}
                              </span>
                              <span className="text-[#7A6A5A]">{log.action}</span>
                              {log.test_case_no && (
                                <span className="ml-1 bg-[#FFF4E8] text-[#8B5A2B] px-1 py-0.5 rounded font-mono text-[9px] font-bold">
                                  {log.test_case_no}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#7A6A5A] shrink-0 font-medium">
                              {formatTimeOnly(log.timestamp)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* YESTERDAY SECTION */}
                {yesterdayLogs.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#7A6A5A] bg-gray-100 px-2 py-0.5 rounded-md inline-block">Yesterday</h3>
                    <div className="space-y-2 pl-1 border-l-2 border-gray-200">
                      {yesterdayLogs.map(log => {
                        const matchedProj = projects.find(p => p.id === log.project_id);
                        return (
                          <div key={log.id} className="text-xs flex justify-between items-start gap-2 py-1 hover:bg-gray-50/50 rounded px-1">
                            <div className="flex-1 min-w-0">
                              <span className="font-bold text-[#3B2A1D] mr-1 truncate inline-block max-w-[100px] align-bottom" title={matchedProj?.project_name}>
                                {matchedProj ? matchedProj.project_name : 'SocialNxt'}
                              </span>
                              <span className="text-[#7A6A5A]">{log.action}</span>
                              {log.test_case_no && (
                                <span className="ml-1 bg-gray-100 text-[#7A6A5A] px-1 py-0.5 rounded font-mono text-[9px] font-bold">
                                  {log.test_case_no}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#7A6A5A] shrink-0 font-medium">
                              {formatTimeOnly(log.timestamp)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* OLDER SECTION */}
                {olderLogs.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#7A6A5A]/70 bg-gray-50 px-2 py-0.5 rounded-md inline-block">Older</h3>
                    <div className="space-y-2 pl-1 border-l-2 border-gray-100">
                      {olderLogs.slice(0, 10).map(log => {
                        const matchedProj = projects.find(p => p.id === log.project_id);
                        return (
                          <div key={log.id} className="text-xs flex justify-between items-start gap-2 py-1 hover:bg-gray-50/50 rounded px-1">
                            <div className="flex-1 min-w-0">
                              <span className="font-bold text-[#3B2A1D] mr-1 truncate inline-block max-w-[100px] align-bottom" title={matchedProj?.project_name}>
                                {matchedProj ? matchedProj.project_name : 'SocialNxt'}
                              </span>
                              <span className="text-[#7A6A5A]">{log.action}</span>
                              {log.test_case_no && (
                                <span className="ml-1 bg-gray-50 text-[#7A6A5A] px-1 py-0.5 rounded font-mono text-[9px]">
                                  {log.test_case_no}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#7A6A5A] shrink-0">
                              {formatDateOnly(log.timestamp)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-[#7A6A5A] text-sm">
                No recent changes logged. Start managing test cases to populate logs!
              </div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}
