import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Folder, ClipboardList, Database, Laptop, Sparkles, 
  Settings, HelpCircle, FileText, ChevronDown, Check, 
  Upload, Download, AlertCircle, X, CheckSquare, Activity,
  DatabaseZap, Clock, Undo, Search, Command, User as UserIcon, Menu, Plus
} from 'lucide-react';
import mammoth from 'mammoth';

import ProjectList from './components/projects/ProjectList';
import Dashboard from './components/dashboard/Dashboard';
import TestCaseTable from './components/table/TestCaseTable';
import AITestCaseGenerator from './components/dashboard/AITestCaseGenerator';
import CsvToWordConverter from './components/dashboard/CsvToWordConverter';
import DownloadHistory, { recordDownloadEvent } from './components/dashboard/DownloadHistory';
import RecycleBin from './components/dashboard/RecycleBin';
import TemplatesManager from './components/dashboard/TemplatesManager';
import WorkspaceSettings from './components/settings/WorkspaceSettings';
import WorkspaceSearchDialog from './components/search/WorkspaceSearchDialog';
import CommandPalette from './components/command/CommandPalette';
import KeyboardShortcutsDialog from './components/help/KeyboardShortcutsDialog';
import BugTracker from './components/bugs/BugTracker';
import TeamManagementModule from './components/team/TeamManagementModule';
import { Project, TestCase, CustomColumn, ActivityLog, TestCaseStatus, RecentItem } from './types';
import { 
  initializeStorage, getProjects, saveProject, deleteProject, 
  duplicateProject, getDocuments, saveDocument, getTestCases, saveTestCase, deleteTestCase, 
  duplicateTestCase, reorderTestCases, getCustomColumns, 
  saveCustomColumn, deleteCustomColumn, getActivityLogs, addActivityLog,
  generateId, getDocumentsAll, archiveProject, restoreProject, deleteDocument,
} from './utils/storage';
import { hydrateFromSupabase } from './utils/supabaseSync';
import { supabase } from './lib/supabase';

import { 
  parseCsvContent, downloadCsvFile, downloadDocxFile, downloadPdfFile 
} from './utils/documentServices';
import { useSettings } from './contexts/SettingsContext';
import { recordRecentItem, recordRecentFile, getRecentItems } from './utils/recentItems';
import { WorkspaceSearchResult } from './utils/workspaceSearch';
import { CommandContext } from './utils/commandPalette';
import { downloadWorkspaceBackup } from './utils/workspaceBackup';
import { isModKey } from './constants/keyboardShortcuts';

import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './auth/LoginPage';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';

function MainApp() {
  const { currentUser, logout } = useAuth();
  const { settings, updateSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<string>('Dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  // Selected single testcase id
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string | null>(null);

  // Mobile sidebar state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Dropdown states in header
  const [showImportDropdown, setShowImportDropdown] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  
  // File inputs for imports
  const docxInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Connection mode state (Graceful fallback)
  const [supabaseConnected, setSupabaseConnected] = useState(false);

  // Save auto-save status feedback
  const [appNotification, setAppNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Undo delete row states
  const [lastDeletedCase, setLastDeletedCase] = useState<TestCase | null>(null);
  const [showUndoToast, setShowUndoToast] = useState(false);

  // Export metadata modal states
  const [showExportModal, setShowExportModal] = useState(false);
  const [showWorkspaceSearch, setShowWorkspaceSearch] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [highlightTerm, setHighlightTerm] = useState('');
  const [openAddProjectForm, setOpenAddProjectForm] = useState(false);
  const tableAddRowRef = useRef<(() => void) | null>(null);
  
  // Navbar project dropdown state
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [newNavProjectName, setNewNavProjectName] = useState('');
  const [projectDropdownPos, setProjectDropdownPos] = useState({ top: 0, left: 0 });
  const projectBtnRef = useRef<HTMLButtonElement>(null);

  // Unified Columns Import Mapping states
  const [mappingConfig, setMappingConfig] = useState<{
    fileName: string;
    fileType: 'docx' | 'csv';
    headers: string[];
    rows: string[][];
  } | null>(null);

  const [selectedMapping, setSelectedMapping] = useState<{
    tcNo: string;
    name: string;
    objective: string;
    steps: string;
    issues: string;
    status: string;
  }>({
    tcNo: '',
    name: '',
    objective: '',
    steps: '',
    issues: '',
    status: ''
  });

  // Import Destination configuration states
  const [importDestinationMode, setImportDestinationMode] = useState<'create' | 'existing'>('create');
  const [importProjectMode, setImportProjectMode] = useState<'create' | 'existing'>('existing');
  const [importNewFileName, setImportNewFileName] = useState('');
  const [importNewFileDesc, setImportNewFileDesc] = useState('');
  const [importExistingFileId, setImportExistingFileId] = useState('');
  const [importSelectedProjectId, setImportSelectedProjectId] = useState('');
  const [importNewProjectName, setImportNewProjectName] = useState('');
  const [importNewProjectDesc, setImportNewProjectDesc] = useState('');
  const [importSummary, setImportSummary] = useState<{projectName:string; documentName:string; importedCount:number; imageCount:number} | null>(null);

  // Initial mount: load data
  useEffect(() => {
    initializeStorage();
    
    // Check if user is logged into Supabase
    const checkSupabase = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const isConnected = !!session?.user;
      setSupabaseConnected(isConnected);
      
      if (isConnected) {
        // Hydrate local cache from Supabase
        await hydrateFromSupabase();
      }
      refreshData();
    };
    checkSupabase();
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isModKey(e)) return;
      const key = e.key.toLowerCase();
      if (key === 'p' && e.shiftKey) {
        e.preventDefault();
        setShowCommandPalette(v => !v);
        setShowWorkspaceSearch(false);
      }
      if (key === 'f' && e.shiftKey) {
        e.preventDefault();
        setShowWorkspaceSearch(v => !v);
        setShowCommandPalette(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSelectProject = useCallback((id: string) => {
    setSelectedProjectId(id);
    const p = getProjects().find(pr => pr.id === id);
    if (p) {
      recordRecentItem({ type: 'project', id, label: p.project_name });
    }
  }, []);

  const handleSelectDocument = useCallback((id: string) => {
    setSelectedDocumentId(id);
    const doc = getDocumentsAll().find(d => d.id === id);
    const proj = getProjects().find(p => p.id === doc?.project_id);
    if (doc && proj) {
      recordRecentFile({
        documentId: id,
        documentName: doc.name,
        projectId: proj.id,
        projectName: proj.project_name,
      });
    }
  }, []);

  const handleWorkspaceNavigate = useCallback((result: WorkspaceSearchResult) => {
    setHighlightTerm(result.title);
    if (result.projectId) handleSelectProject(result.projectId);
    if (result.documentId) handleSelectDocument(result.documentId);
    if (result.testCaseId) setSelectedTestCaseId(result.testCaseId);
    setActiveTab('Projects');
  }, [handleSelectProject, handleSelectDocument]);

  const refreshData = (targetProjId?: string, targetDocId?: string) => {
    // Filter out corrupted projects (those without a project_name)
    const loadedProjects = getProjects().filter(p => p.project_name?.trim());
    setProjects(loadedProjects);

    // Pick active project
    let activeProjId = targetProjId || selectedProjectId;
    const isValidProject = loadedProjects.some(p => p.id === activeProjId);
    if (!isValidProject && loadedProjects.length > 0) {
      activeProjId = loadedProjects[0].id;
    } else if (loadedProjects.length === 0) {
      activeProjId = '';
    }
    setSelectedProjectId(activeProjId);

    if (activeProjId) {
      const docs = getDocuments(activeProjId);
      let activeDocId = targetDocId || selectedDocumentId;
      
      const hasValidDoc = docs.some(d => d.id === activeDocId);
      if (!hasValidDoc && docs.length > 0) {
        activeDocId = docs[0].id;
      } else if (docs.length === 0) {
        activeDocId = '';
      }
      setSelectedDocumentId(activeDocId);

      if (activeDocId) {
        setTestCases(getTestCases(activeDocId));
      } else {
        setTestCases([]);
      }
      setCustomColumns(getCustomColumns(activeProjId));
      setActivityLogs(getActivityLogs(activeProjId));
    }
  };

  // Re-load test cases whenever project or document changes
  useEffect(() => {
    if (selectedProjectId) {
      const docs = getDocuments(selectedProjectId);
      let activeDocId = selectedDocumentId;
      const hasValidDoc = docs.some(d => d.id === activeDocId);
      if (!hasValidDoc) {
        activeDocId = docs.length > 0 ? docs[0].id : '';
        setSelectedDocumentId(activeDocId);
      }

      if (activeDocId) {
        setTestCases(getTestCases(activeDocId));
      } else {
        setTestCases([]);
      }
      setCustomColumns(getCustomColumns(selectedProjectId));
      setActivityLogs(getActivityLogs(selectedProjectId));
      setSelectedTestCaseId(null); 
    }
  }, [selectedProjectId, selectedDocumentId]);

  // Project managers
  const handleAddProject = (name: string, desc?: string) => {
    const newProj = saveProject({ project_name: name, description: desc });
    refreshData(newProj.id);
    showToast(`Project "${name}" created successfully.`, 'success');
  };

  const handleDeleteProject = (id: string) => {
    deleteProject(id);
    const loaded = getProjects();
    const nextProjId = loaded.length > 0 ? loaded[0].id : '';
    refreshData(nextProjId);
    showToast('Project suite deleted.', 'info');
  };

  const handleDuplicateProject = (id: string) => {
    const duplicated = duplicateProject(id);
    refreshData(duplicated.id);
    showToast(`Duplicated project suite "${duplicated.project_name}"!`, 'success');
  };

  const handleRenameProject = (id: string, newName: string) => {
    saveProject({ id, project_name: newName });
    refreshData(id);
    showToast('Project renamed successfully.', 'success');
  };

  const handleToggleFavorite = (id: string) => {
    const proj = projects.find(p => p.id === id);
    if (proj) {
      saveProject({ id, project_name: proj.project_name, favorite: !proj.favorite });
      refreshData(id);
    }
  };

  // TestCase operations
  const handleSaveTestCase = (updatedTestCase: TestCase) => {
    try {
      saveTestCase(updatedTestCase);
      setTestCases(getTestCases(selectedDocumentId));
      setActivityLogs(getActivityLogs(selectedProjectId));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save test case', 'error');
    }
  };

  const handleDeleteTestCase = (id: string) => {
    const tcObj = testCases.find(tc => tc.id === id);
    if (tcObj) {
      setLastDeletedCase(tcObj);
      setShowUndoToast(true);
    }
    deleteTestCase(id);
    setTestCases(getTestCases(selectedDocumentId));
    setActivityLogs(getActivityLogs(selectedProjectId));
    if (selectedTestCaseId === id) setSelectedTestCaseId(null);
    showToast('Test case deleted.', 'info');
  };

  const handleUndoDelete = () => {
    if (lastDeletedCase) {
      saveTestCase(lastDeletedCase);
      setTestCases(getTestCases(selectedDocumentId));
      setActivityLogs(getActivityLogs(selectedProjectId));
      setLastDeletedCase(null);
      setShowUndoToast(false);
      showToast(`Restored test case ${lastDeletedCase.test_case_no}!`, 'success');
    }
  };

  const handleDuplicateTestCase = (id: string) => {
    const duplicated = duplicateTestCase(id);
    setTestCases(getTestCases(selectedDocumentId));
    setActivityLogs(getActivityLogs(selectedProjectId));
    setSelectedTestCaseId(duplicated.id);
    showToast(`Duplicated into ${duplicated.test_case_no}`, 'success');
  };

  const handleReorderTestCases = (reordered: TestCase[]) => {
    reorderTestCases(selectedDocumentId, reordered);
    setTestCases(reordered);
  };

  // Custom columns additions
  const handleAddCustomColumn = (name: string, type: CustomColumn['type']) => {
    saveCustomColumn({ project_id: selectedProjectId, name, type });
    setCustomColumns(getCustomColumns(selectedProjectId));
    showToast(`Custom column "${name}" added.`, 'success');
  };

  const handleDeleteCustomColumn = (id: string) => {
    deleteCustomColumn(id, selectedProjectId);
    setCustomColumns(getCustomColumns(selectedProjectId));
    setTestCases(getTestCases(selectedDocumentId));
    showToast('Custom column removed.', 'info');
  };

  const commandContext: CommandContext = useMemo(() => ({
    activeTab,
    selectedProjectId,
    selectedDocumentId,
    selectedTestCaseId,
    selectedIds: selectedTestCaseId ? [selectedTestCaseId] : [],
    projects,
    documents: getDocumentsAll(),
    actions: {
      createProject: () => { setOpenAddProjectForm(true); setActiveTab('Projects'); },
      createDocument: () => setActiveTab('Projects'),
      createModule: () => setActiveTab('Projects'),
      newTestCase: () => tableAddRowRef.current?.(),
      export: () => setShowExportModal(true),
      import: () => csvInputRef.current?.click(),
      openDashboard: () => setActiveTab('Dashboard'),
      delete: () => {
        if (selectedTestCaseId) handleDeleteTestCase(selectedTestCaseId);
        else if (selectedDocumentId && confirm('Delete document?')) {
          deleteDocument(selectedDocumentId);
          refreshData(selectedProjectId);
        }
      },
      rename: () => {
        const proj = projects.find(p => p.id === selectedProjectId);
        if (proj) {
          const val = prompt('Rename project:', proj.project_name);
          if (val?.trim()) handleRenameProject(selectedProjectId, val.trim());
        }
      },
      openWorkspaceSearch: () => { setShowCommandPalette(false); setShowWorkspaceSearch(true); },
      setTheme: (t) => updateSettings({ theme: t }),
      openRecentFile: (item: RecentItem) => {
        if (item.projectId) handleSelectProject(item.projectId);
        if (item.type === 'document') handleSelectDocument(item.id);
        setActiveTab('Projects');
      },
      openSettings: () => setActiveTab('Settings'),
      downloadBackup: () => downloadWorkspaceBackup(),
      archiveProject: (id) => { archiveProject(id); refreshData(); },
      restoreProject: (id) => { restoreProject(id); refreshData(); },
      toggleFavorite: () => handleToggleFavorite(selectedProjectId),
    },
  }), [activeTab, selectedProjectId, selectedDocumentId, selectedTestCaseId, projects, updateSettings, handleSelectProject, handleSelectDocument]);

  // Unified Mapping Trigger Helper
  const triggerMappingPopup = (fileName: string, fileType: 'docx' | 'csv', headers: string[], rows: string[][]) => {
    const findFuzzyMatch = (keywords: string[]) => {
      const found = headers.find(h => {
        const lower = h.toLowerCase();
        return keywords.some(kw => lower.includes(kw));
      });
      return found || '';
    };

    setSelectedMapping({
      tcNo: findFuzzyMatch(['no', 'id', 'tc', 'case no']),
      name: findFuzzyMatch(['name', 'title', 'case title', 'header']),
      objective: findFuzzyMatch(['objective', 'goal', 'purpose', 'intent']),
      steps: findFuzzyMatch(['step', 'procedure', 'exec', 'action']),
      issues: findFuzzyMatch(['issue', 'bug', 'block', 'defect']),
      status: findFuzzyMatch(['status', 'result', 'state'])
    });

    const docs = getDocuments(selectedProjectId);
    if (docs.length > 0) {
      setImportDestinationMode('existing');
      setImportExistingFileId(docs[0].id);
    } else {
      setImportDestinationMode('create');
      setImportExistingFileId('');
    }

    setImportProjectMode('existing');
    setImportSelectedProjectId(selectedProjectId || projects[0]?.id || '');
    const cleanBase = fileName.replace(/\.[^/.]+$/, "");
    setImportNewProjectName(cleanBase);
    setImportNewProjectDesc('Imported from ' + fileName);
    setImportNewFileName(cleanBase + '.docx');
    setImportNewFileDesc('Imported from ' + fileName);

    setMappingConfig({
      fileName,
      fileType,
      headers,
      rows
    });
  };

  // Extract DOCX headers and rows for column mapping
  const handleWordImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showToast('Extracting Word table rows...', 'info');
      const arrayBuffer = await file.arrayBuffer();
      const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const tables = doc.querySelectorAll('table');
      if (tables.length === 0) {
        throw new Error('No test case table detected in the Word document.');
      }
      
      const table = tables[0];
      const trs = Array.from(table.querySelectorAll('tr'));
      if (trs.length === 0) {
        throw new Error('Word table has no rows.');
      }
      
      const detectedHeaders = Array.from(trs[0].querySelectorAll('td, th')).map(cell => cell.textContent?.trim() || '');
      const rowsData = trs.slice(1).map(tr => 
        Array.from(tr.querySelectorAll('td')).map(cell => cell.innerHTML || '')
      );

      triggerMappingPopup(file.name, 'docx', detectedHeaders, rowsData);
    } catch (err: any) {
      showToast(err.message || 'Failed to analyze Word file.', 'error');
    } finally {
      if (docxInputRef.current) docxInputRef.current.value = '';
      setShowImportDropdown(false);
    }
  };

  // Extract CSV headers and rows for column mapping
  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showToast('Extracting CSV headers...', 'info');
      const text = await file.text();
      
      const rows: string[][] = [];
      let currentRow: string[] = [];
      let insideQuote = false;
      let token = '';

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
          if (insideQuote && nextChar === '"') {
            token += '"';
            i++;
          } else {
            insideQuote = !insideQuote;
          }
        } else if (char === ',' && !insideQuote) {
          currentRow.push(token.trim());
          token = '';
        } else if ((char === '\r' || char === '\n') && !insideQuote) {
          if (char === '\r' && nextChar === '\n') i++;
          currentRow.push(token.trim());
          rows.push(currentRow);
          currentRow = [];
          token = '';
        } else {
          token += char;
        }
      }
      if (token || currentRow.length > 0) {
        currentRow.push(token.trim());
        rows.push(currentRow);
      }

      if (rows.length === 0) {
        throw new Error('CSV file is empty.');
      }

      const detectedHeaders = rows[0];
      const rowsData = rows.slice(1);

      triggerMappingPopup(file.name, 'csv', detectedHeaders, rowsData);
    } catch (err: any) {
      showToast(err.message || 'Failed to analyze CSV file.', 'error');
    } finally {
      if (csvInputRef.current) csvInputRef.current.value = '';
      setShowImportDropdown(false);
    }
  };

  const handleConfirmImport = () => {
    if (!mappingConfig) return;

    let targetProjectId = importSelectedProjectId || selectedProjectId;
    if (importProjectMode === 'create') {
      if (!importNewProjectName.trim()) {
        showToast('Please enter a project name for the new project.', 'error');
        return;
      }
      const createdProject = saveProject({ project_name: importNewProjectName.trim(), description: importNewProjectDesc });
      targetProjectId = createdProject.id;
      setSelectedProjectId(targetProjectId);
    }

    let targetDocId = '';
    if (importDestinationMode === 'create') {
      if (!importNewFileName.trim()) {
        showToast('Please enter a name for the new Test Case File.', 'error');
        return;
      }
      const newDoc = saveDocument({
        project_id: targetProjectId,
        name: importNewFileName.trim(),
        description: importNewFileDesc
      });
      targetDocId = newDoc.id;
    } else {
      if (!importExistingFileId) {
        showToast('Please select an existing Test Case File to import into.', 'error');
        return;
      }
      targetDocId = importExistingFileId;
    }

    const { headers, rows, fileType } = mappingConfig;

    const tcNoIdx = headers.indexOf(selectedMapping.tcNo);
    const nameIdx = headers.indexOf(selectedMapping.name);
    const objIdx = headers.indexOf(selectedMapping.objective);
    const stepsIdx = headers.indexOf(selectedMapping.steps);
    const issuesIdx = headers.indexOf(selectedMapping.issues);
    const statusIdx = headers.indexOf(selectedMapping.status);

    const importedCases: TestCase[] = [];

    rows.forEach((row, idx) => {
      if (row.length === 0) return;

      const tcNo = tcNoIdx !== -1 && row[tcNoIdx] ? row[tcNoIdx].replace(/<[^>]+>/g, '').trim() : `TC-${String(testCases.length + importedCases.length + 1).padStart(3, '0')}`;
      const name = nameIdx !== -1 && row[nameIdx] ? row[nameIdx].replace(/<[^>]+>/g, '').trim() : `TestCase Item #${testCases.length + importedCases.length + 1}`;
      const objective = objIdx !== -1 && row[objIdx] ? row[objIdx].replace(/<[^>]+>/g, '').trim() : '';
      
      let steps = '';
      if (stepsIdx !== -1 && row[stepsIdx]) {
        if (fileType === 'docx') {
          steps = row[stepsIdx]; // Keep rich text HTML formatting!
        } else {
          steps = `<ol><li>${row[stepsIdx].replace(/\n/g, '</li><li>')}</li></ol>`;
        }
      } else {
        steps = '<ol><li>Execute action module.</li></ol>';
      }

      const issues = issuesIdx !== -1 && row[issuesIdx] ? row[issuesIdx].replace(/<[^>]+>/g, '').trim() : '';
      
      let rawStatus = statusIdx !== -1 && row[statusIdx] ? row[statusIdx].replace(/<[^>]+>/g, '').trim() : 'Not Fixed';
      let status: TestCaseStatus = 'Not Fixed';
      if (rawStatus.match(/fix/i)) status = 'Fixed';
      else if (rawStatus.match(/progress/i)) status = 'In Progress';
      else if (rawStatus.match(/block/i)) status = 'Blocked';
      else if (rawStatus.match(/fail|not.*fix/i)) status = 'Not Fixed';

      const newCase: TestCase = {
        id: generateId(),
        project_id: targetProjectId,
        document_id: targetDocId,
        test_case_no: tcNo,
        name,
        test_objective: objective,
        test_steps: steps,
        issues,
        status,
        display_order: testCases.length + importedCases.length + 1,
        screenshots: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      saveTestCase(newCase);
      importedCases.push(newCase);
    });

    addActivityLog(targetProjectId, `Imported ${importedCases.length} testcases into file`);
    refreshData(targetProjectId, targetDocId);
    setMappingConfig(null);
    setImportSummary({
      projectName: projects.find(p => p.id === targetProjectId)?.project_name || 'Imported Project',
      documentName: getDocuments(targetProjectId).find(d => d.id === targetDocId)?.name || importNewFileName.trim() || 'Imported Document',
      importedCount: importedCases.length,
      imageCount: 0
    });
    showToast(`Successfully mapped and imported ${importedCases.length} test cases!`, 'success');
  };

  // Word & CSV exports
  const handleWordExport = async () => {
    if (!selectedDocumentId) {
      showToast('No active document to export. Please select or create a file.', 'error');
      return;
    }
    const currentProj = projects.find(p => p.id === selectedProjectId);
    if (!currentProj) return;

    try {
      showToast('Compiling executive docx landscape ledger...', 'info');
      await downloadDocxFile(currentProj, testCases, settings.exportedByName, activeDocumentName);

      const fileSize = `${Math.max(1, Math.round((testCases.length * 0.18 + (testCases.reduce((sum, tc) => sum + (tc.screenshots?.length || 0), 0) * 0.12)) * 100) / 100)} MB`;
      recordDownloadEvent(selectedProjectId, `${currentProj.project_name} - ${activeDocumentName}`, 'Word', testCases.length, testCases, settings.exportedByName, fileSize, `${activeDocumentName || currentProj.project_name}.docx`);
      
      addActivityLog(selectedProjectId, `Exported file "${activeDocumentName}" as executive report (.docx)`);
      setActivityLogs(getActivityLogs(selectedProjectId));
      showToast('Report generated successfully!', 'success');
    } catch (err) {
      showToast('Failed to build word file package.', 'error');
    } finally {
      setShowExportDropdown(false);
      setShowExportModal(false);
    }
  };
  const handlePdfExport = async () => {
    if (!selectedDocumentId) {
      showToast('No active document to export. Please select or create a file.', 'error');
      return;
    }
    const currentProj = projects.find(p => p.id === selectedProjectId);
    if (!currentProj) return;

    try {
      showToast('Compiling PDF report...', 'info');
      await downloadPdfFile(testCases, currentProj, { companyName: settings.exportedByName });

      const fileSize = `${Math.max(1, Math.round((testCases.length * 0.1) * 100) / 100)} MB`;
      recordDownloadEvent(selectedProjectId, `${currentProj.project_name} - ${activeDocumentName}`, 'PDF', testCases.length, testCases, settings.exportedByName, fileSize, `${activeDocumentName || currentProj.project_name}.pdf`);
      
      addActivityLog(selectedProjectId, `Exported file "${activeDocumentName}" as PDF (.pdf)`);
      setActivityLogs(getActivityLogs(selectedProjectId));
      showToast('PDF generated successfully!', 'success');
    } catch (err) {
      showToast('Failed to build PDF file.', 'error');
    } finally {
      setShowExportDropdown(false);
      setShowExportModal(false);
    }
  };

  const handleCsvExport = () => {
    if (!selectedDocumentId) {
      showToast('No active document to export. Please select or create a file.', 'error');
      return;
    }
    const currentProj = projects.find(p => p.id === selectedProjectId);
    if (!currentProj) return;

    downloadCsvFile(currentProj, testCases);

    const fileSize = `${Math.max(1, Math.round((testCases.length * 0.03 + (testCases.reduce((sum, tc) => sum + (tc.screenshots?.length || 0), 0) * 0.01)) * 100) / 100)} KB`;
    recordDownloadEvent(selectedProjectId, `${currentProj.project_name} - ${activeDocumentName}`, 'CSV', testCases.length, testCases, 'QA Analyst', fileSize, `${activeDocumentName || currentProj.project_name}.csv`);
    
    showToast('CSV downloaded.', 'success');
    setShowExportDropdown(false);
  };

  // Toast feedback helper
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setAppNotification({ message, type });
    setTimeout(() => {
      setAppNotification(null);
    }, 4000);
  };

  const handleImportGenerated = (newCases: TestCase[]) => {
    newCases.forEach(tc => {
      // Ensure the generated case has correct project and document ids
      saveTestCase({
        ...tc,
        project_id: selectedProjectId,
        document_id: selectedDocumentId
      });
    });
    setTestCases(getTestCases(selectedDocumentId));
    setActivityLogs(getActivityLogs(selectedProjectId));
    showToast(`Successfully imported ${newCases.length} test cases!`, 'success');
    setActiveTab('Projects');
  };

  const activeProjectName = projects.find(p => p.id === selectedProjectId)?.project_name || 'Select Suite';
  const activeDocumentName = getDocuments(selectedProjectId).find(d => d.id === selectedDocumentId)?.name || '';
  const wordSizeEstimate = `${Math.max(1, Math.round((testCases.length * 0.18 + (testCases.reduce((sum, tc) => sum + (tc.screenshots?.length || 0), 0) * 0.12)) * 100) / 100)} MB`;
  const csvSizeEstimate = `${Math.max(1, Math.round((testCases.length * 0.03 + (testCases.reduce((sum, tc) => sum + (tc.screenshots?.length || 0), 0) * 0.01)) * 100) / 100)} KB`;

  return (
    <div id="tc-root-shell" className="flex h-screen bg-[#FFF8F2] overflow-hidden text-[#3B2A1D] antialiased">
      
      {/* TOAST NOTIFICATION STACK */}
      {appNotification && (
        <div className="fixed top-5 right-5 z-[100] bg-white border border-[#E7D6C4] px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 animate-slide-in">
          <div className={`p-1.5 rounded-xl ${
            appNotification.type === 'success' ? 'bg-[#34C759]/10 text-[#34C759]' :
            appNotification.type === 'error' ? 'bg-[#FF4D4F]/10 text-[#FF4D4F]' : 'bg-[#FFF4E8] text-[#8B5A2B]'
          }`}>
            {appNotification.type === 'success' ? <CheckSquare className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          </div>
          <div>
            <p className="text-xs font-bold text-[#3B2A1D]">{appNotification.message}</p>
          </div>
          <button onClick={() => setAppNotification(null)} className="ml-2 text-[#7A6A5A] hover:text-[#3B2A1D] cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* UNDO ROW DELETE FLOATING TOAST */}
      {showUndoToast && lastDeletedCase && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-[#3B2A1D] text-[#FFF8F2] px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-4 animate-fade-in border border-[#E7D6C4]/30">
          <Clock className="w-4 h-4 text-[#FFF4E8] shrink-0" />
          <div className="text-xs">
            Deleted testcase <span className="font-bold text-[#FFF4E8]">{lastDeletedCase.test_case_no}</span>. Keep editing or undo?
          </div>
          <button 
            onClick={handleUndoDelete}
            className="flex items-center gap-1 bg-[#FFF4E8] text-[#3B2A1D] hover:bg-white px-3 py-1.5 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all cursor-pointer shadow-sm"
          >
            <Undo className="w-3 h-3" />
            Undo Delete
          </button>
          <button onClick={() => setShowUndoToast(false)} className="text-[#FFF4E8]/60 hover:text-white p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* LEFT SIDEBAR SECTION */}
      <ProjectList
        projects={projects}
        selectedProjectId={selectedProjectId}
        selectedDocumentId={selectedDocumentId}
        onSelectProject={handleSelectProject}
        onSelectDocument={handleSelectDocument}
        onAddProject={handleAddProject}
        onDeleteProject={handleDeleteProject}
        onDuplicateProject={handleDuplicateProject}
        onRenameProject={handleRenameProject}
        onToggleFavorite={handleToggleFavorite}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        openAddProjectForm={openAddProjectForm}
        onAddProjectFormConsumed={() => setOpenAddProjectForm(false)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* CENTER WORKSPACE: OCCUPIES 100% WIDTH NOW */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        
        {/* HEADER SECTION */}
        <header className="bg-white border-b border-[#E7D6C4] px-4 md:px-6 py-3 flex items-center justify-between shrink-0 sticky top-0 z-20 shadow-[0_4px_20px_rgba(139,90,43,0.03)] overflow-x-auto no-scrollbar">
          
          {/* LEFT HEADER: Suite dropdown selector */}
          <div className="flex items-center gap-3 shrink-0">
            <button 
              className="md:hidden p-1.5 text-[#3B2A1D] hover:bg-[#FFF8F2] rounded-lg transition-colors cursor-pointer"
              onClick={() => setIsMobileSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <Folder className="w-5 h-5 text-[#8B5A2B] hidden md:block" />
            <div className="relative">
              {/* Custom Project Dropdown Button */}
              <button
                ref={projectBtnRef}
                onClick={() => {
                  if (!showProjectDropdown && projectBtnRef.current) {
                    const rect = projectBtnRef.current.getBoundingClientRect();
                    setProjectDropdownPos({ top: rect.bottom + 6, left: rect.left });
                  }
                  setShowProjectDropdown(v => !v);
                }}
                className="flex items-center gap-2 pl-3 pr-8 py-1.5 border border-[#E7D6C4] rounded-xl text-xs font-bold text-[#3B2A1D] bg-white hover:bg-[#FFF8F2]/50 cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-[#8B5A2B] transition-all min-w-[180px] text-left"
              >
                <span className="truncate flex-1">{activeProjectName !== 'Select Suite' ? activeProjectName : (projects.length === 0 ? 'No Projects — Click to Create' : 'Select Project')}</span>
              </button>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A6A5A] pointer-events-none" />

              {/* Click-outside overlay — must be BEFORE dropdown so dropdown is on top */}
              {showProjectDropdown && (
                <div className="fixed inset-0 z-[55]" onClick={() => setShowProjectDropdown(false)} />
              )}

              {showProjectDropdown && (
                <div
                  className="fixed bg-white border border-[#E7D6C4] rounded-xl shadow-2xl z-[60] w-64 overflow-hidden animate-fade-in"
                  style={{ top: projectDropdownPos.top, left: projectDropdownPos.left }}
                >
                  <div className="max-h-64 overflow-y-auto">
                    {projects.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-[#7A6A5A] italic">No projects yet. Create one below!</div>
                    ) : (
                      <>
                        {(() => {
                          const recentProjectIds = getRecentItems(['project']).map(r => r.id);
                          const recentProjects = recentProjectIds.map(id => projects.find(p => p.id === id)).filter(Boolean) as typeof projects;
                          const hasRecent = recentProjects.length > 0;
                          
                          return (
                            <>
                              {hasRecent && (
                                <div className="mb-2">
                                  <div className="px-4 py-1.5 text-[10px] font-bold text-[#7A6A5A] uppercase tracking-wider bg-[#FFF8F2]/50">Recent Projects</div>
                                  {recentProjects.slice(0, 3).map(p => (
                                    <button
                                      key={`recent-${p.id}`}
                                      onClick={() => { handleSelectProject(p.id); setShowProjectDropdown(false); }}
                                      className={`w-full text-left px-4 py-2 text-xs font-semibold transition-colors flex items-center gap-2 ${
                                        selectedProjectId === p.id ? 'bg-[#FFF4E8] text-[#8B5A2B]' : 'text-[#3B2A1D] hover:bg-[#FFF8F2]'
                                      }`}
                                    >
                                      <Clock className="w-3 h-3 shrink-0 opacity-50" />
                                      <span className="truncate">{p.project_name}</span>
                                      {selectedProjectId === p.id && <Check className="w-3.5 h-3.5 ml-auto text-[#8B5A2B] shrink-0" />}
                                    </button>
                                  ))}
                                </div>
                              )}
                              
                              <div>
                                <div className="px-4 py-1.5 text-[10px] font-bold text-[#7A6A5A] uppercase tracking-wider bg-[#FFF8F2]/50">All Projects</div>
                                {projects.map(p => (
                                  <button
                                    key={p.id}
                                    onClick={() => { handleSelectProject(p.id); setShowProjectDropdown(false); }}
                                    className={`w-full text-left px-4 py-2 text-xs font-semibold transition-colors flex items-center gap-2 ${
                                      selectedProjectId === p.id ? 'bg-[#FFF4E8] text-[#8B5A2B]' : 'text-[#3B2A1D] hover:bg-[#FFF8F2]'
                                    }`}
                                  >
                                    <Folder className="w-3.5 h-3.5 shrink-0 opacity-60" />
                                    <span className="truncate">{p.project_name}</span>
                                    {selectedProjectId === p.id && <Check className="w-3.5 h-3.5 ml-auto text-[#8B5A2B] shrink-0" />}
                                  </button>
                                ))}
                              </div>
                            </>
                          );
                        })()}
                      </>
                    )}
                  </div>
                  <div className="border-t border-[#E7D6C4] p-2">
                    <button
                      onClick={() => { setShowProjectDropdown(false); setShowCreateProjectModal(true); }}
                      className="w-full flex items-center gap-2 px-3 py-2 bg-[#8B5A2B] hover:bg-[#A66B37] text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Create New Project
                    </button>
                  </div>
                </div>
              )}
            </div>

            <span className={`hidden md:flex text-[10px] font-semibold px-2.5 py-1 rounded-full items-center gap-1 border ${
              supabaseConnected 
                ? 'bg-[#34C759]/10 text-[#34C759] border-[#34C759]/20' 
                : 'bg-[#FFF4E8] text-[#8B5A2B] border-[#E7D6C4]/60'
            }`}>
              {supabaseConnected ? <DatabaseZap className="w-3 h-3" /> : <Database className="w-3 h-3" />}
              {supabaseConnected ? 'Supabase Sync Connected' : 'Local Sandbox Storage'}
            </span>
          </div>

          {/* RIGHT HEADER ACTIONS (Import & Export drop downs) */}
          <div className="flex items-center gap-1.5 md:gap-3 shrink-0 ml-4">
            <button
              type="button"
              onClick={() => { setShowWorkspaceSearch(true); setShowCommandPalette(false); }}
              className="hidden sm:block p-2 border border-[#E7D6C4] rounded-xl hover:bg-[#FFF4E8] text-[#7A6A5A]"
              title="Workspace Search (Ctrl+Shift+F)"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => { setShowCommandPalette(true); setShowWorkspaceSearch(false); }}
              className="hidden sm:block p-2 border border-[#E7D6C4] rounded-xl hover:bg-[#FFF4E8] text-[#7A6A5A]"
              title="Command Palette (Ctrl+Shift+P)"
            >
              <Command className="w-4 h-4" />
            </button>
            <div className="relative">
              <button
                onClick={() => {
                  setShowImportDropdown(!showImportDropdown);
                  setShowExportDropdown(false);
                }}
                className="px-2 md:px-3.5 py-2 border border-[#E7D6C4] hover:bg-[#FFF4E8]/40 text-[#3B2A1D] text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 md:gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4 md:w-3.5 md:h-3.5 text-[#7A6A5A]" />
                <span className="hidden md:inline">Import Suite</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#7A6A5A] hidden sm:block" />
              </button>

              {showImportDropdown && (
                <div className="absolute right-0 mt-2 bg-white border border-[#E7D6C4] rounded-xl py-1.5 w-48 shadow-lg z-30 animate-fade-in">
                  <button
                    onClick={() => docxInputRef.current?.click()}
                    className="w-full px-4 py-2 hover:bg-[#FFF4E8] text-left text-xs font-semibold text-[#3B2A1D] flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#8B5A2B]" />
                    Import Word (.docx)
                  </button>
                  <button
                    onClick={() => csvInputRef.current?.click()}
                    className="w-full px-4 py-2 hover:bg-[#FFF4E8] text-left text-xs font-semibold text-[#3B2A1D] flex items-center gap-2 cursor-pointer"
                  >
                    <ClipboardList className="w-3.5 h-3.5 text-[#7A6A5A]" />
                    Import CSV Matrix
                  </button>
                </div>
              )}
            </div>

            {/* EXPORT DIALOG TOGGLE */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowExportDropdown(!showExportDropdown);
                  setShowImportDropdown(false);
                }}
                className="px-2 md:px-4 py-2 bg-[#8B5A2B] hover:bg-[#A66B37] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 md:gap-2 shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4 md:w-3.5 md:h-3.5" />
                <span className="hidden md:inline">Export Ledger</span>
                <ChevronDown className="w-3.5 h-3.5 hidden sm:block" />
              </button>

              {showExportDropdown && (
                <div className="absolute right-0 mt-2 bg-white border border-[#E7D6C4] rounded-xl py-1.5 w-48 shadow-lg z-30 animate-fade-in">
                  <button
                    onClick={() => {
                      setShowExportModal(true);
                      setShowExportDropdown(false);
                    }}
                    className="w-full px-4 py-2 hover:bg-[#FFF4E8] text-left text-xs font-semibold text-[#3B2A1D] flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#8B5A2B]" />
                    Word Report (.docx)
                  </button>
                  <button
                    onClick={handlePdfExport}
                    className="w-full px-4 py-2 hover:bg-[#FFF4E8] text-left text-xs font-semibold text-[#3B2A1D] flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-red-500" />
                    PDF Report (.pdf)
                  </button>
                  <button
                    onClick={handleCsvExport}
                    className="w-full px-4 py-2 hover:bg-[#FFF4E8] text-left text-xs font-semibold text-[#3B2A1D] flex items-center gap-2 cursor-pointer"
                  >
                    <ClipboardList className="w-3.5 h-3.5 text-[#7A6A5A]" />
                    CSV Spreadsheet
                  </button>
                </div>
              )}
            </div>

            {/* HIDDEN IMPORT INPUT ELEMENTS */}
            <input
              type="file"
              ref={docxInputRef}
              onChange={handleWordImport}
              accept=".docx"
              className="hidden"
            />
            <input
              type="file"
              ref={csvInputRef}
              onChange={handleCsvImport}
              accept=".csv"
              className="hidden"
            />
            
            {/* USER PROFILE & LOGOUT */}
            {currentUser && (
              <div className="relative ml-2 md:ml-4 pl-2 md:pl-4 border-l border-[#E7D6C4]">
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center gap-2 md:gap-3 hover:bg-[#FFF8F2] p-1 md:p-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <div className="hidden md:flex flex-col items-end">
                    <span className="text-sm font-bold text-[#3B2A1D] leading-none">{currentUser.name}</span>
                    <span className="text-[10px] font-semibold text-[#8B5A2B] uppercase tracking-wider mt-1">{currentUser.role.replace('_', ' ')}</span>
                  </div>
                  <div className="p-1.5 md:p-2 border border-[#E7D6C4] rounded-xl text-[#7A6A5A] bg-white">
                    <UserIcon className="w-4 h-4 md:w-4 md:h-4" />
                  </div>
                </button>
                
                {isProfileMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsProfileMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-[#E7D6C4] py-2 z-50 animate-fade-in origin-top-right">
                      <div className="px-4 py-2 border-b border-[#F5EDE4] mb-2">
                        <p className="text-xs text-[#7A6A5A]">Signed in as</p>
                        <p className="text-sm font-bold text-[#3B2A1D] truncate">{currentUser.email}</p>
                      </div>
                      
                      <button
                        onClick={() => {
                          setActiveTab('Dashboard');
                          setIsProfileMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm font-semibold text-[#3B2A1D] hover:bg-[#FFF8F2] flex items-center gap-2"
                      >
                        <Activity className="w-4 h-4 text-[#8B5A2B]" />
                        Dashboard
                      </button>
                      
                      <button
                        onClick={() => {
                          setActiveTab('Settings');
                          setIsProfileMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm font-semibold text-[#3B2A1D] hover:bg-[#FFF8F2] flex items-center gap-2"
                      >
                        <Settings className="w-4 h-4 text-[#8B5A2B]" />
                        Settings
                      </button>
                      
                      <div className="h-px bg-[#F5EDE4] my-2" />
                      
                      <button
                        onClick={() => {
                          logout();
                          setIsProfileMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </header>

        {/* WORKSPACE CENTRAL STAGE */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'Dashboard' ? (
            <Dashboard
              projects={projects}
              testCases={testCases}
              activityLogs={activityLogs}
              onSelectProject={setSelectedProjectId}
              onNavigateToTab={setActiveTab}
            />
          ) : activeTab === 'AIGenerator' ? (
            <AITestCaseGenerator
              projects={projects}
              selectedProjectId={selectedProjectId}
              onImportGenerated={handleImportGenerated}
              showToast={showToast}
            />
          ) : activeTab === 'CSVConverter' ? (
            <CsvToWordConverter 
              showToast={showToast} 
              selectedProjectId={selectedProjectId}
              projects={projects}
              onSelectProject={handleSelectProject}
              onSavedToSpreadsheet={(docId) => {
                refreshData(selectedProjectId, docId);
                setActiveTab('Test Cases Spreadsheet');
              }}
            />
          ) : activeTab === 'DownloadHistory' ? (
            <DownloadHistory
              showToast={showToast}
            />
          ) : activeTab === 'RecycleBin' ? (
            <RecycleBin
              showToast={showToast}
            />
          ) : activeTab === 'Templates' ? (
            <TemplatesManager showToast={showToast} onApplied={() => refreshData()} />
          ) : activeTab === 'Settings' ? (
            <WorkspaceSettings
              selectedProjectId={selectedProjectId}
              selectedDocumentId={selectedDocumentId}
              onOpenShortcuts={() => setShowShortcuts(true)}
              onDataReset={() => refreshData()}
            />
          ) : activeTab === 'TeamManagement' && currentUser?.role === 'admin' ? (
            <TeamManagementModule />
          ) : activeTab === 'BugTracker' ? (
            <BugTracker 
              projects={projects}
              selectedProjectId={selectedProjectId}
              testCases={testCases}
              onSaveTestCase={handleSaveTestCase}
            />
          ) : (
            /* DATABASE SPREADSHEET DATAGRID WORKSPACE */
            <div className="space-y-4">
              <div>
                <h1 className="text-xl font-extrabold text-[#3B2A1D] tracking-tight">
                  {activeProjectName}
                  {activeDocumentName && <span className="font-normal text-[#7A6A5A]"> — {activeDocumentName}</span>}
                </h1>
                <p className="text-xs text-[#7A6A5A] mt-0.5">
                  {activeDocumentName 
                    ? "Double click any cell to edit details inline. Reorder rows with action controllers."
                    : "Please select or create a Test Case File in the sidebar to start managing test cases."}
                </p>
              </div>

              <TestCaseTable
                testCases={testCases}
                customColumns={customColumns}
                projectId={selectedProjectId}
                documentId={selectedDocumentId}
                documents={getDocuments(selectedProjectId)}
                onSelectDocument={setSelectedDocumentId}
                onSaveTestCase={handleSaveTestCase}
                onDeleteTestCase={handleDeleteTestCase}
                onDuplicateTestCase={handleDuplicateTestCase}
                onReorderTestCases={handleReorderTestCases}
                onAddCustomColumn={handleAddCustomColumn}
                onDeleteCustomColumn={handleDeleteCustomColumn}
                selectedRowId={selectedTestCaseId}
                onSelectRow={setSelectedTestCaseId}
                highlightTerm={highlightTerm}
                onExportDocument={() => setShowExportModal(true)}
                registerAddRow={(fn) => { tableAddRowRef.current = fn; }}
              />
            </div>
          )}
        </main>
      </div>

      {/* CREATE PROJECT MODAL */}
      {showCreateProjectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 animate-fade-in" onClick={() => setShowCreateProjectModal(false)}>
          <div className="bg-white border border-[#E7D6C4] rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-[#3B2A1D] mb-1">Create New Project</h3>
            <p className="text-xs text-[#7A6A5A] mb-4">Enter a name for your new project suite.</p>
            <input
              id="newNavProjectName"
              name="newNavProjectName"
              type="text"
              autoFocus
              value={newNavProjectName}
              onChange={e => setNewNavProjectName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newNavProjectName.trim()) {
                  handleAddProject(newNavProjectName.trim());
                  setNewNavProjectName('');
                  setShowCreateProjectModal(false);
                }
                if (e.key === 'Escape') setShowCreateProjectModal(false);
              }}
              placeholder="e.g. My QA Suite"
              className="w-full px-3.5 py-2.5 border border-[#E7D6C4] rounded-xl text-sm bg-[#FFF8F2]/30 text-[#3B2A1D] focus:ring-2 focus:ring-[#8B5A2B] focus:outline-none mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowCreateProjectModal(false); setNewNavProjectName(''); }}
                className="px-4 py-2 border border-[#E7D6C4] text-[#7A6A5A] text-xs font-semibold rounded-xl hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newNavProjectName.trim()) {
                    handleAddProject(newNavProjectName.trim());
                    setNewNavProjectName('');
                    setShowCreateProjectModal(false);
                  }
                }}
                disabled={!newNavProjectName.trim()}
                className="px-4 py-2 bg-[#8B5A2B] hover:bg-[#A66B37] text-white text-xs font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DYNAMIC WORD EXPORT CONFIGURATION MODAL */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white border border-[#E7D6C4] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[#FFF4E8] text-[#8B5A2B] rounded-xl shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#3B2A1D]">Configure Word Report Export</h3>
                <p className="text-xs text-[#7A6A5A] mt-1 leading-relaxed">
                  Input your professional metadata details below to generate the executive landscapely repeat header audit document.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-[#7A6A5A] tracking-wider">Exported By (Signee Name)</label>
              <input
                type="text"
                value={settings.exportedByName}
                onChange={e => updateSettings({ exportedByName: e.target.value })}
                placeholder="e.g. Lead QA Engineer / Signee Name"
                className="w-full px-3.5 py-2 border border-[#E7D6C4] rounded-xl text-xs bg-[#FFF8F2]/30 text-[#3B2A1D] focus:ring-1 focus:ring-[#8B5A2B] focus:outline-hidden"
              />
              <div className="rounded-xl border border-[#E7D6C4] bg-[#FFF8F2]/40 p-3 text-[11px] text-[#3B2A1D] space-y-1">
                <div className="flex justify-between"><span className="text-[#7A6A5A]">Project</span><span className="font-semibold">{activeProjectName}</span></div>
                <div className="flex justify-between"><span className="text-[#7A6A5A]">Document</span><span className="font-semibold">{activeDocumentName || 'Untitled File'}</span></div>
                <div className="flex justify-between"><span className="text-[#7A6A5A]">Test Cases</span><span className="font-semibold">{testCases.length}</span></div>
                <div className="flex justify-between"><span className="text-[#7A6A5A]">Estimated Size</span><span className="font-semibold">Word ~{wordSizeEstimate} • CSV ~{csvSizeEstimate}</span></div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 border border-[#E7D6C4] text-[#7A6A5A] text-xs font-semibold rounded-xl hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleWordExport}
                disabled={!settings.exportedByName.trim()}
                className="px-4 py-2 bg-[#8B5A2B] hover:bg-[#A66B37] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT SUMMARY MODAL */}
      {importSummary && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white border border-[#E7D6C4] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[#FFF4E8] text-[#8B5A2B] rounded-xl">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#3B2A1D]">Import Successful</h3>
                <p className="text-xs text-[#7A6A5A] mt-1">{importSummary.projectName} • {importSummary.documentName}</p>
              </div>
            </div>
            <div className="rounded-xl border border-[#E7D6C4] bg-[#FFF8F2]/40 p-3 text-[11px] text-[#3B2A1D] space-y-1">
              <div className="flex justify-between"><span className="text-[#7A6A5A]">Project</span><span className="font-semibold">{importSummary.projectName}</span></div>
              <div className="flex justify-between"><span className="text-[#7A6A5A]">Document</span><span className="font-semibold">{importSummary.documentName}</span></div>
              <div className="flex justify-between"><span className="text-[#7A6A5A]">Imported</span><span className="font-semibold">{importSummary.importedCount} Test Cases</span></div>
              <div className="flex justify-between"><span className="text-[#7A6A5A]">Images</span><span className="font-semibold">{importSummary.imageCount}</span></div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setImportSummary(null)} className="px-4 py-2 bg-[#8B5A2B] hover:bg-[#A66B37] text-white text-xs font-bold rounded-xl">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* UNIFIED COLUMNS ALIGNMENT IMPORT MAPPING MODAL */}
      {mappingConfig && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white border border-[#E7D6C4] rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 pb-2 border-b border-[#F5EDE4]">
              <div className="p-2 bg-[#FFF4E8] text-[#8B5A2B] rounded-xl shrink-0 animate-pulse">
                <Settings className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-[#3B2A1D] truncate">Import Column Mapping Configuration</h3>
                <p className="text-xs text-[#7A6A5A] mt-0.5 leading-tight">
                  Map headers detected in <span className="font-mono bg-[#FFF4E8] px-1 py-0.5 rounded text-[#8B5A2B]">{mappingConfig.fileName}</span> to your TestCase columns.
                </p>
              </div>
              <button 
                onClick={() => setMappingConfig(null)} 
                className="p-1 rounded-full hover:bg-red-50 text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* DESTINATION SELECTION CODES */}
            <div className="bg-[#FFF4E8]/40 border border-[#E7D6C4]/60 p-4 rounded-xl space-y-3 text-xs">
              <span className="font-bold text-[#8B5A2B] block">Where do you want to save this?</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setImportProjectMode('create')}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-bold text-xs border transition-all ${importProjectMode === 'create' ? 'bg-[#8B5A2B] border-[#8B5A2B] text-white' : 'bg-white border-[#E7D6C4] text-[#7A6A5A] hover:bg-[#FFF8F2]'}`}
                >
                  Create New Project
                </button>
                <button
                  type="button"
                  onClick={() => setImportProjectMode('existing')}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-bold text-xs border transition-all ${importProjectMode === 'existing' ? 'bg-[#8B5A2B] border-[#8B5A2B] text-white' : 'bg-white border-[#E7D6C4] text-[#7A6A5A] hover:bg-[#FFF8F2]'}`}
                >
                  Existing Project
                </button>
              </div>

              {importProjectMode === 'create' ? (
                <div className="space-y-2 pt-1 animate-fade-in">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-[#7A6A5A] tracking-wider block mb-0.5">Project Name</label>
                    <input type="text" value={importNewProjectName} onChange={e => setImportNewProjectName(e.target.value)} className="w-full px-3 py-1.5 border border-[#E7D6C4] rounded-lg text-xs bg-white text-[#3B2A1D] focus:ring-1 focus:ring-[#8B5A2B] focus:outline-hidden" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-[#7A6A5A] tracking-wider block mb-0.5">Description (Optional)</label>
                    <input type="text" value={importNewProjectDesc} onChange={e => setImportNewProjectDesc(e.target.value)} className="w-full px-3 py-1.5 border border-[#E7D6C4] rounded-lg text-xs bg-white text-[#3B2A1D] focus:ring-1 focus:ring-[#8B5A2B] focus:outline-hidden" />
                  </div>
                </div>
              ) : (
                <div className="space-y-2 pt-1 animate-fade-in">
                  <label className="text-[10px] uppercase font-bold text-[#7A6A5A] tracking-wider block mb-0.5">Select Project</label>
                  <select value={importSelectedProjectId} onChange={e => { setImportSelectedProjectId(e.target.value); setImportExistingFileId(''); }} className="w-full px-3 py-1.5 border border-[#E7D6C4] rounded-lg text-xs bg-white text-[#3B2A1D] focus:ring-1 focus:ring-[#8B5A2B] focus:outline-hidden cursor-pointer">
                    {projects.filter(p => p.project_name?.trim()).map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
                  </select>
                </div>
              )}

              <span className="font-bold text-[#8B5A2B] block">Import Destination File</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setImportDestinationMode('create')}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-bold text-xs border transition-all ${
                    importDestinationMode === 'create'
                      ? 'bg-[#8B5A2B] border-[#8B5A2B] text-white'
                      : 'bg-white border-[#E7D6C4] text-[#7A6A5A] hover:bg-[#FFF8F2]'
                  }`}
                >
                  Create New File
                </button>
                <button
                  type="button"
                  disabled={getDocuments(selectedProjectId).length === 0}
                  onClick={() => setImportDestinationMode('existing')}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-bold text-xs border transition-all disabled:opacity-50 ${
                    importDestinationMode === 'existing'
                      ? 'bg-[#8B5A2B] border-[#8B5A2B] text-white'
                      : 'bg-white border-[#E7D6C4] text-[#7A6A5A] hover:bg-[#FFF8F2]'
                  }`}
                >
                  Import Into Existing File
                </button>
              </div>

              {importDestinationMode === 'create' ? (
                <div className="space-y-2 pt-1 animate-fade-in">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-[#7A6A5A] tracking-wider block mb-0.5">New File Name (.docx)</label>
                    <input
                      type="text"
                      value={importNewFileName}
                      onChange={e => setImportNewFileName(e.target.value)}
                      placeholder="e.g. Authentication_Suite.docx"
                      className="w-full px-3 py-1.5 border border-[#E7D6C4] rounded-lg text-xs bg-white text-[#3B2A1D] focus:ring-1 focus:ring-[#8B5A2B] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-[#7A6A5A] tracking-wider block mb-0.5">Description (optional)</label>
                    <input
                      type="text"
                      value={importNewFileDesc}
                      onChange={e => setImportNewFileDesc(e.target.value)}
                      placeholder="e.g. Suite imported from specification spreadsheets"
                      className="w-full px-3 py-1.5 border border-[#E7D6C4] rounded-lg text-xs bg-white text-[#3B2A1D] focus:ring-1 focus:ring-[#8B5A2B] focus:outline-hidden"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1 pt-1 animate-fade-in">
                  <label className="text-[10px] uppercase font-bold text-[#7A6A5A] tracking-wider block mb-0.5">Select Target Test Case File</label>
                  <select
                    value={importExistingFileId}
                    onChange={e => setImportExistingFileId(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#E7D6C4] rounded-lg text-xs bg-white text-[#3B2A1D] focus:ring-1 focus:ring-[#8B5A2B] focus:outline-hidden cursor-pointer"
                  >
                    {getDocuments(importSelectedProjectId || selectedProjectId).map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
              {[
                { id: 'tcNo', label: 'Test Case No.', placeholder: 'Select mapping column' },
                { id: 'name', label: 'Test Case Name', placeholder: 'Select mapping column' },
                { id: 'objective', label: 'Test Objective', placeholder: 'Select mapping column' },
                { id: 'steps', label: 'Test Steps / Execution', placeholder: 'Select mapping column' },
                { id: 'issues', label: 'Issues / Blockers', placeholder: 'Select mapping column' },
                { id: 'status', label: 'Status Badge', placeholder: 'Select mapping column' },
              ].map(field => (
                <div key={field.id} className="grid grid-cols-2 items-center gap-4 text-xs">
                  <span className="font-semibold text-[#3B2A1D]">{field.label}</span>
                  <select
                    value={selectedMapping[field.id as keyof typeof selectedMapping]}
                    onChange={e => setSelectedMapping(prev => ({ ...prev, [field.id]: e.target.value }))}
                    className="w-full px-2.5 py-1.5 border border-[#E7D6C4] rounded-xl bg-[#FFF8F2]/20 font-medium text-[#3B2A1D] text-xs cursor-pointer"
                  >
                    <option value="">-- Skip Column / Generate Default --</option>
                    {mappingConfig.headers.map(hdr => (
                      <option key={hdr} value={hdr}>{hdr || '(Empty Header Row)'}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#F5EDE4]">
              <button
                onClick={() => setMappingConfig(null)}
                className="px-4 py-2 border border-[#E7D6C4] text-[#7A6A5A] text-xs font-semibold rounded-xl hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                className="px-4 py-2 bg-[#8B5A2B] hover:bg-[#A66B37] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Confirm and Import Matrix
              </button>
            </div>
          </div>
        </div>
      )}
      <WorkspaceSearchDialog open={showWorkspaceSearch} onClose={() => setShowWorkspaceSearch(false)} onNavigate={handleWorkspaceNavigate} />
      <CommandPalette open={showCommandPalette} onClose={() => setShowCommandPalette(false)} context={commandContext} />
      <KeyboardShortcutsDialog open={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/*" element={<MainApp />} />
      </Route>
    </Routes>
  );
}
