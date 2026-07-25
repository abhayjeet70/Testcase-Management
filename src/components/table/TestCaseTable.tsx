import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Copy, Trash2, ArrowUp, ArrowDown, Columns, 
  Search, Image as ImageIcon, ChevronDown, 
  Settings2, Eye, Download, Filter, Check, X, EyeOff, Clipboard,
  Sparkles, Bold, Italic, List, ImageOff, Upload, Clock
} from 'lucide-react';
import { TestCase, TestCaseStatus, CustomColumn, Screenshot, TestCaseDocument } from '../../types';
import { generateId, saveDocument, getProjects, saveProject, addActivityLog } from '../../utils/storage';
import { useAuth } from '../../contexts/AuthContext';
import { generateTestCaseNo } from '../../utils/testCaseIdGenerator';
import { getDefaultStatus } from '../../utils/appSettings';
import { isModKey } from '../../constants/keyboardShortcuts';
import { findSimilarTitles } from '../../utils/duplicateDetection';
import { supabase } from '../../lib/supabase';
import { uploadFileToSupabase } from '../../utils/uploadMedia';

interface TestCaseTableProps {
  testCases: TestCase[];
  customColumns: CustomColumn[];
  documents?: TestCaseDocument[];
  onSelectDocument?: (id: string) => void;
  onSaveTestCase: (tc: TestCase) => void;
  onDeleteTestCase: (id: string) => void;
  onDuplicateTestCase: (id: string) => void;
  onReorderTestCases: (list: TestCase[]) => void;
  onAddCustomColumn: (name: string, type: CustomColumn['type']) => void;
  onDeleteCustomColumn: (id: string) => void;
  selectedRowId: string | null;
  onSelectRow: (id: string | null) => void;
  projectId: string;
  documentId: string;
  highlightTerm?: string;
  onExportDocument?: () => void;
  registerAddRow?: (fn: () => void) => void;
}

export default function TestCaseTable({
  testCases,
  customColumns,
  onSaveTestCase,
  onDeleteTestCase,
  onDuplicateTestCase,
  onReorderTestCases,
  onAddCustomColumn,
  onDeleteCustomColumn,
  selectedRowId,
  onSelectRow,
  projectId,
  documentId,
  documents,
  onSelectDocument,
  highlightTerm = '',
  onExportDocument,
  registerAddRow,
}: TestCaseTableProps) {
  const { currentUser } = useAuth();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [screenshotFilter, setScreenshotFilter] = useState<string>('All'); // All, Has, HasNo

  // Document metadata state
  const currentDoc = documents?.find(d => d.id === documentId);
  const [docProjectLink, setDocProjectLink] = useState('');
  const [docDeveloperAssigned, setDocDeveloperAssigned] = useState('');
  const [docZipFileName, setDocZipFileName] = useState('');
  const [docZipFileData, setDocZipFileData] = useState('');
  
  // Local completion state to force re-render
  const [isCompletedState, setIsCompletedState] = useState(false);
  const [completedByState, setCompletedByState] = useState('');
  const [completedAtState, setCompletedAtState] = useState('');

  useEffect(() => {
    if (currentDoc) {
      const projects = getProjects();
      const parentProj = projects.find(p => p.id === projectId);
      
      setDocProjectLink(currentDoc.project_link || parentProj?.vercel_link || '');
      setDocDeveloperAssigned(currentDoc.developer_assigned || parentProj?.developer || '');
      setDocZipFileName(parentProj?.zip_file_name || '');
      setDocZipFileData(parentProj?.zip_file_data || '');
      
      setIsCompletedState(!!currentDoc.is_completed);
      setCompletedByState(currentDoc.completed_by || '');
      setCompletedAtState(currentDoc.completed_at || '');
    }
  }, [currentDoc, projectId]);

  const downloadDataUrl = async (dataUrl: string, fileName: string) => {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error(err);
      alert("Failed to download ZIP file.");
    }
  };

  const handleDownloadZip = async () => {
    if (!projectId || !docZipFileName) return;

    let dataUrl = docZipFileData;
    if (!dataUrl) {
      const { data, error } = await supabase
        .from('tc_projects')
        .select('zip_file_data')
        .eq('id', projectId)
        .single();
      
      if (data?.zip_file_data) {
        dataUrl = data.zip_file_data;
        setDocZipFileData(dataUrl);
      } else {
        alert("No ZIP file data found in the database.");
        return;
      }
    }
    
    await downloadDataUrl(dataUrl, docZipFileName);
  };

  const handleUploadZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setDocZipFileName(file.name);
      
      try {
        setSaveStatus('Saving...');
        const publicUrl = await uploadFileToSupabase(file, 'project_files');
        
        setDocZipFileData(publicUrl);
        
        // instantly save to project
        const projects = getProjects();
        const parentProj = projects.find(p => p.id === projectId);
        if (parentProj) {
          parentProj.zip_file_name = file.name;
          parentProj.zip_file_data = publicUrl;
          saveProject(parentProj);
        }
        setSaveStatus('Saved');
      } catch (error) {
        console.error("ZIP upload failed", error);
        setSaveStatus('Error');
        alert("Failed to upload ZIP file. Ensure you are connected and the file is valid.");
      }
    }
  };

  const handleUpdateDocMetadata = () => {
    if (currentDoc) {
      saveDocument({
        ...currentDoc,
        project_link: docProjectLink,
        developer_assigned: docDeveloperAssigned
      });
    }
  };

  // Excel-like floating context menu state
  const [contextMenu, setContextMenu] = useState<{ rowId: string; x: number; y: number } | null>(null);

  // Bulk Actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{ rowId: string; colName: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  // Column Resizing Widths
  const [colWidths, setColWidths] = useState<Record<string, number>>({
    'tc-no': 100,
    'name': 220,
    'objective': 260,
    'steps': 280,
    'issues': 180,
    'status': 130,
    'screenshot': 120
  });

  // Resizing event state
  const [resizingCol, setResizingCol] = useState<string | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  // Pagination State
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Lightbox view state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [lightboxDrag, setLightboxDrag] = useState({ dragging: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0 });
  const [lightboxOffset, setLightboxOffset] = useState({ x: 0, y: 0 });
  const lightboxImgRef = React.useRef<HTMLImageElement>(null);
  
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  const openLightbox = (url: string) => {
    setLightboxImage(url);
    setLightboxZoom(1);
    setLightboxOffset({ x: 0, y: 0 });
    setLightboxDrag({ dragging: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0 });
  };

  const closeLightbox = () => {
    setLightboxImage(null);
    setLightboxZoom(1);
    setLightboxOffset({ x: 0, y: 0 });
  };

  const handleLightboxWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setLightboxZoom(z => Math.min(5, Math.max(0.5, z - e.deltaY * 0.001)));
  };

  const handleLightboxMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setLightboxDrag(d => ({ ...d, dragging: true, startX: e.clientX - d.offsetX, startY: e.clientY - d.offsetY }));
  };

  const handleLightboxMouseMove = (e: React.MouseEvent) => {
    if (!lightboxDrag.dragging) return;
    const newX = e.clientX - lightboxDrag.startX;
    const newY = e.clientY - lightboxDrag.startY;
    setLightboxOffset({ x: newX, y: newY });
    setLightboxDrag(d => ({ ...d, offsetX: newX, offsetY: newY }));
  };

  const handleLightboxMouseUp = () => {
    setLightboxDrag(d => ({ ...d, dragging: false }));
  };

  // Close lightbox on Escape key
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeLightbox(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Custom confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Saving Notification State
  const [saveStatus, setSaveStatus] = useState<'Saved' | 'Saving...' | 'Offline' | 'Retrying...' | 'Error' | null>('Saved');
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const handleAddRow = () => {
    if (!projectId || !documentId) {
      alert('Please select a project and document file from the sidebar to add rows.');
      return;
    }
    const nextNo = generateTestCaseNo(projectId, documentId);
    const newId = 'tc-' + generateId();
    const maxOrder = testCases.length > 0 ? Math.max(...testCases.map(t => t.display_order || 0)) : 0;
    const newCase: TestCase = {
      id: newId,
      project_id: projectId,
      document_id: documentId,
      test_case_no: nextNo,
      name: '',
      test_objective: '',
      test_steps: '<ol><li></li></ol>',
      issues: '',
      status: getDefaultStatus(),
      display_order: maxOrder + 1,
      screenshots: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    onSaveTestCase(newCase);
    onSelectRow(newId);
    setSaveStatus('Saved');
    const lastPage = Math.ceil((testCases.length + 1) / pageSize);
    setCurrentPage(lastPage || 1);
    setTimeout(() => startEditing(newId, 'name', ''), 120);
  };

  useEffect(() => {
    registerAddRow?.(handleAddRow);
  }, [registerAddRow, projectId, documentId, testCases.length, pageSize]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isModKey(e)) return;
      if (e.key.toLowerCase() === 'f' && !e.shiftKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
      if (e.key.toLowerCase() === 'n') { e.preventDefault(); handleAddRow(); }
      if (e.key.toLowerCase() === 'd' && selectedRowId) { e.preventDefault(); onDuplicateTestCase(selectedRowId); }
      if (e.key.toLowerCase() === 'e' && e.shiftKey) { e.preventDefault(); onExportDocument?.(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedRowId, projectId, documentId]);

  // Local state for search & filtering
  const adjustTextareaHeight = (element: HTMLTextAreaElement | null) => {
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  };

  // Helper for Google Sheets-like cell navigation
  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement | HTMLDivElement>,
    rowId: string,
    colName: string
  ) => {
    const columnsInOrder = ['test_case_no', 'name', 'test_objective', 'test_steps', 'issues'];
    
    if (e.key === 'Tab') {
      e.preventDefault();
      
      // Save current value
      handleCellSave(rowId, colName, editValue);
      
      const colIndex = columnsInOrder.indexOf(colName);
      if (e.shiftKey) {
        // Shift + Tab: Move left
        if (colIndex > 0) {
          const prevCol = columnsInOrder[colIndex - 1];
          const prevVal = testCases.find(tc => tc.id === rowId)?.[prevCol as keyof TestCase] || '';
          startEditing(rowId, prevCol, String(prevVal));
        } else {
          const rowIndex = testCases.findIndex(tc => tc.id === rowId);
          if (rowIndex > 0) {
            const prevRow = testCases[rowIndex - 1];
            const prevCol = columnsInOrder[columnsInOrder.length - 1];
            const prevVal = prevRow[prevCol as keyof TestCase] || '';
            startEditing(prevRow.id, prevCol, String(prevVal));
          } else {
            setEditingCell(null);
          }
        }
      } else {
        // Tab: Move right
        if (colIndex < columnsInOrder.length - 1) {
          const nextCol = columnsInOrder[colIndex + 1];
          const nextVal = testCases.find(tc => tc.id === rowId)?.[nextCol as keyof TestCase] || '';
          startEditing(rowId, nextCol, String(nextVal));
        } else {
          const rowIndex = testCases.findIndex(tc => tc.id === rowId);
          if (rowIndex < testCases.length - 1) {
            const nextRow = testCases[rowIndex + 1];
            const nextCol = columnsInOrder[0];
            const nextVal = nextRow[nextCol as keyof TestCase] || '';
            startEditing(nextRow.id, nextCol, String(nextVal));
          } else {
            setEditingCell(null);
          }
        }
      }
    } else if (e.key === 'Enter') {
      if (!e.shiftKey) {
        if (colName !== 'test_steps') {
          e.preventDefault();
          handleCellSave(rowId, colName, editValue);
          setEditingCell(null);
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingCell(null);
    }
  };

  // Custom column dialog
  const [showAddCol, setShowAddCol] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState<CustomColumn['type']>('Text');

  // Steps editing ref
  const stepsEditorRef = useRef<HTMLDivElement | null>(null);

  // Trigger auto-save debounce
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Re-sync selected items if rows change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [testCases.length]);

  // Close context menu on any click
  useEffect(() => {
    const handleCloseMenu = () => {
      setContextMenu(null);
    };
    window.addEventListener('click', handleCloseMenu);
    return () => window.removeEventListener('click', handleCloseMenu);
  }, []);

  // Click outside to auto-save steps editor
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (editingCell && editingCell.colName === 'test_steps') {
        const container = document.getElementById(`steps-editor-container-${editingCell.rowId}`);
        if (container && !container.contains(e.target as Node)) {
          if (stepsEditorRef.current) {
            handleCellSave(editingCell.rowId, 'test_steps', stepsEditorRef.current.innerHTML);
          }
          setEditingCell(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editingCell]);

  // Expand height of active editing textarea automatically
  useEffect(() => {
    if (editingCell) {
      setTimeout(() => {
        const ta = document.querySelector('textarea[autoFocus]') as HTMLTextAreaElement;
        if (ta) {
          adjustTextareaHeight(ta);
        }
      }, 50);
    }
  }, [editingCell]);

  // Resizing mouse move handlers
  const startResize = (e: React.MouseEvent, colId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingCol(colId);
    setStartX(e.clientX);
    setStartWidth(colWidths[colId] || 150);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingCol) return;
      const diffX = e.clientX - startX;
      const newWidth = Math.max(80, Math.min(600, startWidth + diffX));
      setColWidths(prev => ({
        ...prev,
        [resizingCol]: newWidth
      }));
    };

    const handleMouseUp = () => {
      setResizingCol(null);
    };

    if (resizingCol) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingCol, startX, startWidth]);

  const handleCellSave = (rowId: string, colName: string, value: any) => {
    const original = testCases.find(tc => tc.id === rowId);
    if (!original) return;

    setSaveStatus('Saving...');
    
    let updated: TestCase;
    if (colName.startsWith('custom-')) {
      const colId = colName.replace('custom-', '');
      updated = {
        ...original,
        custom_values: {
          ...(original.custom_values || {}),
          [colId]: String(value)
        }
      };
    } else {
      updated = {
        ...original,
        [colName]: value
      } as TestCase;
      
      if (colName === 'status' && value === 'Fixed') {
        updated.resolved_by = currentUser?.name || 'Unknown';
        updated.resolved_at = new Date().toISOString();
      }
    }

    onSaveTestCase(updated);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      setSaveStatus('Saved');
    }, 500);
  };

  const startEditing = (rowId: string, colName: string, currentVal: string) => {
    setEditingCell({ rowId, colName });
    setEditValue(currentVal);
    onSelectRow(rowId);
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowId: string, colName: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCellSave(rowId, colName, editValue);
      setEditingCell(null);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  // Keyboard navigation & cell editing jump support
  const handleTableKeyDown = (e: React.KeyboardEvent) => {
    if (editingCell) return; // Ignore when actively editing
    
    const currentIndex = testCases.findIndex(tc => tc.id === selectedRowId);
    if (currentIndex === -1) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = Math.min(testCases.length - 1, currentIndex + 1);
      onSelectRow(testCases[nextIdx].id);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIdx = Math.max(0, currentIndex - 1);
      onSelectRow(testCases[prevIdx].id);
    } else if (e.key === 'Tab') {
      // Tab to select and jump through row cells nicely
      // If we press Enter on selected row, start editing 'name'
    } else if (e.key === 'Enter') {
      // Enter starts editing Name by default
      const currentCase = testCases[currentIndex];
      startEditing(currentCase.id, 'name', currentCase.name);
    } else if (e.key === 'Delete') {
      const currentCase = testCases[currentIndex];
      triggerConfirmDelete(currentCase.id, currentCase.test_case_no);
    }
  };

  const triggerConfirmDelete = (id: string, tcNo: string) => {
    setConfirmDialog({
      title: 'Delete Test Case',
      message: `Are you sure you want to delete test case ${tcNo}? This action can be undone from the popup notification toast.`,
      onConfirm: () => {
        onDeleteTestCase(id);
        onSelectRow(null);
        setConfirmDialog(null);
      }
    });
  };

  // Bulk Actions execution
  const executeBulkDelete = () => {
    setConfirmDialog({
      title: 'Bulk Delete',
      message: `Are you sure you want to permanently delete ${selectedIds.size} selected testcases?`,
      onConfirm: () => {
        selectedIds.forEach(id => onDeleteTestCase(id));
        setSelectedIds(new Set());
        setConfirmDialog(null);
      }
    });
  };

  const executeBulkStatus = (status: TestCaseStatus) => {
    selectedIds.forEach(id => {
      const original = testCases.find(tc => tc.id === id);
      if (original) {
        onSaveTestCase({ ...original, status });
      }
    });
    setSelectedIds(new Set());
    setSaveStatus('Saved');
  };

  // Search & Filtering logic
  const filteredCases = testCases.filter(tc => {
    const matchesSearch = 
      tc.test_case_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tc.test_objective.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tc.test_steps.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tc.issues.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || tc.status === statusFilter;

    const hasScreenshot = tc.screenshots && tc.screenshots.length > 0;
    const matchesScreenshot = 
      screenshotFilter === 'All' || 
      (screenshotFilter === 'Has' && hasScreenshot) ||
      (screenshotFilter === 'HasNo' && !hasScreenshot);

    return matchesSearch && matchesStatus && matchesScreenshot;
  });

  // Calculate Paginated List
  const totalPages = Math.ceil(filteredCases.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedCases = filteredCases.slice(startIndex, startIndex + pageSize);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCases.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCases.map(tc => tc.id)));
    }
  };

  const toggleSelectId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Row Movement
  const moveRow = (index: number, direction: 'up' | 'down') => {
    const absoluteIndex = startIndex + index;
    const newAbsoluteIndex = direction === 'up' ? absoluteIndex - 1 : absoluteIndex + 1;
    if (newAbsoluteIndex < 0 || newAbsoluteIndex >= filteredCases.length) return;

    const copy = [...filteredCases];
    const temp = copy[absoluteIndex];
    copy[absoluteIndex] = copy[newAbsoluteIndex];
    copy[newAbsoluteIndex] = temp;

    onReorderTestCases(copy);
    onSelectRow(temp.id);
  };

  // Status Style Maps
  const STATUS_THEMES: Record<TestCaseStatus, { bg: string; text: string; dot: string }> = {
    'Fixed': { bg: 'bg-[#34C759]/10', text: 'text-[#34C759]', dot: 'bg-[#34C759]' },
    'Not Fixed': { bg: 'bg-[#FF4D4F]/10', text: 'text-[#FF4D4F]', dot: 'bg-[#FF4D4F]' },
    'In Progress': { bg: 'bg-[#F5A623]/10', text: 'text-[#F5A623]', dot: 'bg-[#F5A623]' },
    'Blocked': { bg: 'bg-[#7C4DFF]/10', text: 'text-[#7C4DFF]', dot: 'bg-[#7C4DFF]' },
    'Not Tested': { bg: 'bg-[#A0A0A0]/10', text: 'text-[#A0A0A0]', dot: 'bg-[#A0A0A0]' }
  };

  // Native ContentEditable Exec commands helper
  const execFormat = (cmd: string) => {
    document.execCommand(cmd, false);
  };

  // Paste Screenshot Handler
  const handlePasteScreenshot = async (e: React.ClipboardEvent, tcId: string) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (const item of Array.from(items)) {
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            setBrokenImages(prev => {
              const next = { ...prev };
              delete next[tcId];
              return next;
            });
            
            try {
              setSaveStatus('Saving...');
              const publicUrl = await uploadFileToSupabase(file, 'screenshots');
              
              const newScreenshot: Screenshot = {
                id: generateId(),
                test_case_id: tcId,
                image_url: publicUrl,
                created_at: new Date().toISOString()
              };
              
              const original = testCases.find(tc => tc.id === tcId);
              if (original) {
                const updated = {
                  ...original,
                  screenshots: [...(original.screenshots || []), newScreenshot]
                };
                onSaveTestCase(updated);
                setSaveStatus('Saved');
              }
            } catch (error) {
              console.error("Failed to upload screenshot", error);
              setSaveStatus('Error');
              alert("Failed to upload screenshot to cloud storage.");
            }
          }
        }
      }
    }
  };

  // Drag and drop screenshot helper
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropScreenshot = async (e: React.DragEvent, tcId: string) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      setBrokenImages(prev => {
        const next = { ...prev };
        delete next[tcId];
        return next;
      });
      const file = files[0];
      
      try {
        setSaveStatus('Saving...');
        const publicUrl = await uploadFileToSupabase(file, 'screenshots');
        
        const newScreenshot: Screenshot = {
          id: generateId(),
          test_case_id: tcId,
          image_url: publicUrl,
          created_at: new Date().toISOString()
        };
        const original = testCases.find(tc => tc.id === tcId);
        if (original) {
          const updated = {
            ...original,
            screenshots: [...(original.screenshots || []), newScreenshot]
          };
          onSaveTestCase(updated);
          setSaveStatus('Saved');
        }
      } catch (error) {
        console.error("Failed to upload dropped screenshot", error);
        setSaveStatus('Error');
        alert("Failed to upload screenshot to cloud storage.");
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, tcId: string) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setBrokenImages(prev => {
        const next = { ...prev };
        delete next[tcId];
        return next;
      });
      const file = files[0];
      
      try {
        setSaveStatus('Saving...');
        const publicUrl = await uploadFileToSupabase(file, 'screenshots');
        
        const newScreenshot: Screenshot = {
          id: generateId(),
          test_case_id: tcId,
          image_url: publicUrl,
          created_at: new Date().toISOString()
        };
        const original = testCases.find(tc => tc.id === tcId);
        if (original) {
          const updated = {
            ...original,
            screenshots: [...(original.screenshots || []), newScreenshot]
          };
          onSaveTestCase(updated);
          setSaveStatus('Saved');
        }
      } catch (error) {
        console.error("Failed to upload selected screenshot", error);
        setSaveStatus('Error');
        alert("Failed to upload screenshot to cloud storage.");
      }
    }
  };

  const deleteScreenshot = (tcId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBrokenImages(prev => {
      const next = { ...prev };
      delete next[tcId];
      return next;
    });
    const original = testCases.find(tc => tc.id === tcId);
    if (original) {
      const updated = {
        ...original,
        screenshots: []
      };
      onSaveTestCase(updated);
      setSaveStatus('Saved');
    }
  };

  return (
    <div id="table-datagrid-container" className="space-y-4 select-none" onKeyDown={handleTableKeyDown} tabIndex={0} style={{ outline: 'none' }}>
      {duplicateWarning && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold px-4 py-2 rounded-xl">
          ⚠ Duplicate title: {duplicateWarning}
        </div>
      )}
      {/* TOOLBAR */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:flex-wrap justify-between gap-4 bg-white p-4 border border-[#E7D6C4] rounded-2xl shadow-xs">
        
        {/* SEARCH AND FILTERS */}
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          {documents && documents.length > 0 && onSelectDocument && (
            <div className="flex flex-wrap items-center gap-3 mr-2">
              {(() => {
                const currentDoc = documents.find(d => d.id === documentId);
                const docName = currentDoc?.name || '';
                const versionMatch = docName.match(/(.*?) V(\d+)\.docx$/i);
                
                let currentVersion = '';
                let versionDocs: typeof documents = [];

                if (versionMatch) {
                  const baseName = versionMatch[1];
                  currentVersion = versionMatch[2];
                  // Find all versions of this base document
                  versionDocs = documents
                    .filter(d => d.name.startsWith(baseName))
                    .sort((a, b) => {
                      const m1 = a.name.match(/V(\d+)\.docx$/i);
                      const m2 = b.name.match(/V(\d+)\.docx$/i);
                      return (m1 ? parseInt(m1[1]) : 0) - (m2 ? parseInt(m2[1]) : 0);
                    });
                }
                  
                return (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-xs flex items-center gap-2">
                      <span className="text-[#7A6A5A] font-medium whitespace-nowrap">Project Link: </span>
                      <input 
                        type="text" 
                        value={docProjectLink}
                        onChange={(e) => setDocProjectLink(e.target.value)}
                        onBlur={handleUpdateDocMetadata}
                        placeholder="e.g. Jira/Notion link..."
                        className="border border-[#E7D6C4] bg-white rounded px-2 py-0.5 focus:ring-1 focus:ring-[#8B5A2B] outline-none text-[#3B2A1D] w-36"
                      />
                    </div>
                    <div className="text-xs flex items-center gap-2">
                      <span className="text-[#7A6A5A] font-medium whitespace-nowrap">Developer: </span>
                      <input 
                        type="text" 
                        value={docDeveloperAssigned}
                        onChange={(e) => setDocDeveloperAssigned(e.target.value)}
                        onBlur={handleUpdateDocMetadata}
                        placeholder="Assign to..."
                        className="border border-[#E7D6C4] bg-white rounded px-2 py-0.5 focus:ring-1 focus:ring-[#8B5A2B] outline-none text-[#3B2A1D] w-28"
                      />
                    </div>
                    
                    {currentDoc?.updated_at && (
                      <div className="text-[10px] bg-gray-50 border border-gray-200 text-gray-500 px-2 py-0.5 rounded-md font-bold flex items-center gap-1" title="Last Updated">
                        <Clock className="w-3 h-3" />
                        {new Date(currentDoc.updated_at).toLocaleString(undefined, { 
                          month: 'short', day: 'numeric', 
                          hour: 'numeric', minute: '2-digit' 
                        })}
                      </div>
                    )}
                    
                    {versionMatch && (
                      <>
                        <div className="text-xs ml-2">
                          <span className="text-[#7A6A5A] font-medium">Version No: </span>
                          <span className="font-bold text-[#8B5A2B] bg-[#FFF4E8] px-1.5 py-0.5 rounded">V{currentVersion}</span>
                        </div>
                        <select
                          value={documentId}
                          onChange={(e) => onSelectDocument(e.target.value)}
                          className="text-xs border border-[#E7D6C4] bg-white rounded-lg px-2 py-1 focus:ring-1 focus:ring-[#8B5A2B] outline-none cursor-pointer"
                          title="Sort / switch version wise"
                        >
                          <option value="" disabled>Select Version</option>
                          {versionDocs.map(doc => {
                            const vMatch = doc.name.match(/V(\d+)\.docx$/i);
                            const v = vMatch ? `V${vMatch[1]}` : doc.name;
                            return (
                              <option key={doc.id} value={doc.id}>
                                {v}
                              </option>
                            );
                          })}
                        </select>
                      </>
                    )}

                    <div className="flex items-center gap-1.5 border border-[#E7D6C4] bg-[#FFF4E8]/50 rounded-lg px-2 py-1 ml-2">
                      <label className="text-[10px] font-bold text-[#8B5A2B] cursor-pointer flex items-center gap-1 hover:underline group">
                        <Upload className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
                        <span className="truncate max-w-[120px]">{docZipFileName || 'Upload ZIP'}</span>
                        <input type="file" accept=".zip,.rar,.7z" className="hidden" onChange={handleUploadZip} />
                      </label>
                      {docZipFileName && (
                        <>
                          <div className="w-[1px] h-3 bg-[#E7D6C4] mx-0.5"></div>
                          <button onClick={handleDownloadZip} className="text-[#8B5A2B] hover:text-[#A66B37] p-0.5 rounded hover:bg-[#F5EDE4] transition-colors" title="Download ZIP">
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                    
                    {/* Mark Sheet as Done / Completion Status */}
                    <div className="ml-2 flex items-center">
                      {isCompletedState ? (
                        <div className="text-[10px] bg-green-50 border border-green-200 text-green-700 px-2 py-1 rounded-lg font-bold flex items-center gap-1.5 shadow-sm">
                          <Check className="w-3.5 h-3.5" />
                          <span>Done by {completedByState || 'Unknown'}</span>
                          <span className="opacity-70 ml-1">
                            {completedAtState ? new Date(completedAtState).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : ''}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            if (window.confirm('Mark this entire sheet as Done? All incomplete test cases will be marked as Fixed.')) {
                              const now = new Date().toISOString();
                              const resolverName = currentUser?.name || 'Unknown';
                              
                              // Update all cases to Fixed
                              testCases.forEach(tc => {
                                if (tc.status !== 'Fixed') {
                                  onSaveTestCase({
                                    ...tc,
                                    status: 'Fixed',
                                    resolved_by: resolverName,
                                    resolved_at: now
                                  });
                                }
                              });
                              
                              // Update the document
                              if (currentDoc) {
                                saveDocument({
                                  ...currentDoc,
                                  is_completed: true,
                                  completed_by: resolverName,
                                  completed_at: now
                                });
                                addActivityLog(currentDoc.project_id, `Sheet "${currentDoc.name}" marked as DONE`);
                                
                                // Update local state so it turns green immediately
                                setIsCompletedState(true);
                                setCompletedByState(resolverName);
                                setCompletedAtState(now);
                              }
                            }
                          }}
                          className="text-[10px] bg-white border border-[#E7D6C4] text-[#8B5A2B] hover:bg-green-50 hover:text-green-700 hover:border-green-200 px-2 py-1 rounded-lg font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Mark Sheet as Done
                        </button>
                      )}
                    </div>

                  </div>
                );
              })()}
            </div>
          )}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-[#7A6A5A] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search test cases by ID, name, objectives, steps..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-[#E7D6C4] rounded-xl text-[#3B2A1D] placeholder-[#7A6A5A]/60 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#8B5A2B] bg-[#FFF8F2]/30 transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#7A6A5A] hover:text-[#3B2A1D]"
              >
                Clear
              </button>
            )}
          </div>

          {/* STATUS FILTER */}
          <div className="flex items-center gap-1.5 border border-[#E7D6C4] rounded-xl px-2.5 py-1.5 bg-white text-xs text-[#3B2A1D]">
            <Filter className="w-3.5 h-3.5 text-[#7A6A5A]" />
            <span className="font-semibold text-[#7A6A5A] border-r border-[#E7D6C4] pr-1.5 mr-1">Status:</span>
            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent focus:outline-hidden font-medium text-[#3B2A1D] cursor-pointer"
            >
              <option value="All">All statuses</option>
              <option value="Fixed">Fixed</option>
              <option value="Not Fixed">Not Fixed</option>
              <option value="In Progress">In Progress</option>
              <option value="Blocked">Blocked</option>
              <option value="Not Tested">Not Tested</option>
            </select>
          </div>

          {/* SCREENSHOT FILTER */}
          <div className="flex items-center gap-1.5 border border-[#E7D6C4] rounded-xl px-2.5 py-1.5 bg-white text-xs text-[#3B2A1D]">
            <ImageIcon className="w-3.5 h-3.5 text-[#7A6A5A]" />
            <span className="font-semibold text-[#7A6A5A] border-r border-[#E7D6C4] pr-1.5 mr-1">Media:</span>
            <select
              value={screenshotFilter}
              onChange={e => {
                setScreenshotFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent focus:outline-hidden font-medium text-[#3B2A1D] cursor-pointer"
            >
              <option value="All">All cases</option>
              <option value="Has">Has screenshot</option>
              <option value="HasNo">No screenshot</option>
            </select>
          </div>
        </div>

        {/* OPERATIONS AND NOTIFICATIONS */}
        <div className="flex items-center justify-end gap-3 flex-wrap">
          {saveStatus && (
            <span className={`text-[10px] font-bold px-2.5 py-1.5 rounded-full border flex items-center gap-1.5 ${
              saveStatus === 'Saving...' 
                ? 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse' 
                : saveStatus === 'Saved' 
                ? 'bg-green-50 text-green-700 border-green-100' 
                : saveStatus === 'Offline' 
                ? 'bg-gray-100 text-gray-600 border-gray-200' 
                : 'bg-red-50 text-red-700 border-red-100'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                saveStatus === 'Saving...' ? 'bg-amber-500 animate-spin' :
                saveStatus === 'Saved' ? 'bg-green-500' :
                saveStatus === 'Offline' ? 'bg-gray-400' : 'bg-red-500'
              }`} />
              {saveStatus === 'Saving...' ? 'Saving changes...' :
               saveStatus === 'Saved' ? 'Saved to storage' :
               saveStatus === 'Offline' ? 'Offline mode active' : 'Retrying sync...'}
            </span>
          )}

          <button
            onClick={handleAddRow}
            className="px-3.5 py-1.5 bg-[#8B5A2B] hover:bg-[#A66B37] text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Row
          </button>

          <button
            onClick={() => setShowAddCol(!showAddCol)}
            className="px-3.5 py-1.5 border border-[#E7D6C4] hover:bg-[#FFF4E8]/50 text-[#3B2A1D] text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Columns className="w-3.5 h-3.5 text-[#7A6A5A]" />
            Add Column
          </button>
        </div>
      </div>

      {/* BULK ACTIONS OVERLAY BAR */}
      {selectedIds.size > 0 && (
        <div className="bg-[#FFF4E8] border border-[#E7D6C4] p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#8B5A2B] text-white text-[10px] font-bold flex items-center justify-center">
              {selectedIds.size}
            </span>
            <span className="text-xs font-semibold text-[#3B2A1D]">Bulk operations active</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-[#7A6A5A] mr-1">Mark Status:</span>
            <div className="flex gap-1">
              {(['Fixed', 'Not Fixed', 'In Progress', 'Blocked', 'Not Tested'] as TestCaseStatus[]).map(status => (
                <button
                  key={status}
                  onClick={() => executeBulkStatus(status)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${STATUS_THEMES[status].bg} ${STATUS_THEMES[status].text}`}
                >
                  {status}
                </button>
              ))}
            </div>

            <span className="h-4 w-[1px] bg-[#E7D6C4] mx-2" />

            <button
              onClick={executeBulkDelete}
              className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* ADD CUSTOM COLUMN DIALOG POPUP */}
      {showAddCol && (
        <div className="bg-[#FFF8F2] border border-[#E7D6C4] p-4 rounded-2xl space-y-3 max-w-md animate-fade-in shadow-md">
          <h3 className="text-xs font-bold text-[#3B2A1D] flex items-center gap-1.5">
            <Settings2 className="w-3.5 h-3.5 text-[#8B5A2B]" />
            Configure New Custom Workspace Column
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Column Name (e.g., Environment, Priority)"
              value={newColName}
              onChange={e => setNewColName(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-[#E7D6C4] rounded-xl text-xs bg-white text-[#3B2A1D] focus:ring-1 focus:ring-[#8B5A2B] focus:outline-hidden"
            />
            <select
              value={newColType}
              onChange={e => setNewColType(e.target.value as CustomColumn['type'])}
              className="px-2.5 py-1.5 border border-[#E7D6C4] rounded-xl text-xs bg-white text-[#3B2A1D]"
            >
              <option value="Text">Single Text</option>
              <option value="Dropdown">Dropdown Menu</option>
              <option value="Checkbox">Checkbox Toggle</option>
              <option value="Number">Decimal / Int</option>
              <option value="Date">Date Stamp</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowAddCol(false)}
              className="px-3 py-1 text-xs font-semibold text-[#7A6A5A] hover:text-[#3B2A1D]"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (newColName.trim()) {
                  onAddCustomColumn(newColName, newColType);
                  setNewColName('');
                  setShowAddCol(false);
                }
              }}
              className="px-3 py-1 bg-[#8B5A2B] hover:bg-[#A66B37] text-white text-xs font-bold rounded-lg cursor-pointer"
            >
              Add Column
            </button>
          </div>
        </div>
      )}

      {/* DATAGRID CONTAINER */}
      <div className="bg-white border border-[#E7D6C4] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse table-fixed select-text">
            {/* TABLE HEADER */}
            <thead>
              <tr className="bg-[#FFF4E8]/60 border-b border-[#E7D6C4] text-xs font-bold text-[#3B2A1D] h-11">
                {/* Checkbox Column */}
                <th className="w-11 px-3 text-center border-r border-[#E7D6C4]/60">
                  <input
                    type="checkbox"
                    checked={filteredCases.length > 0 && selectedIds.size === filteredCases.length}
                    onChange={toggleSelectAll}
                    className="rounded border-[#E7D6C4] text-[#8B5A2B] focus:ring-[#8B5A2B] w-4 h-4 cursor-pointer"
                  />
                </th>

                {/* Default Resizable Columns */}
                {[
                  { id: 'tc-no', label: 'Test Case No.' },
                  { id: 'name', label: 'Name' },
                  { id: 'objective', label: 'Test Objective' },
                  { id: 'steps', label: 'Test Steps' },
                  { id: 'issues', label: 'Issues / Blockers' },
                  { id: 'status', label: 'Status' },
                  { id: 'screenshot', label: 'Screenshot / Paste' }
                ].map(col => (
                  <th 
                    key={col.id} 
                    className="px-3 border-r border-[#E7D6C4]/60 relative select-none" 
                    style={{ width: colWidths[col.id] }}
                  >
                    <span className="truncate block pr-3">{col.label}</span>
                    {/* Drag handle for resizing */}
                    <div 
                      onMouseDown={e => startResize(e, col.id)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[#8B5A2B]/40 active:bg-[#8B5A2B] transition-colors"
                      title="Drag to resize column"
                    />
                  </th>
                ))}

                {/* Custom User Columns */}
                {customColumns.map(col => (
                  <th key={col.id} className="px-3 border-r border-[#E7D6C4]/60 w-[150px] relative group/header select-none">
                    <div className="flex items-center justify-between">
                      <span className="truncate">{col.name}</span>
                      <button
                        onClick={() => {
                          setConfirmDialog({
                            title: 'Delete Custom Column',
                            message: `Are you sure you want to completely delete custom column "${col.name}"? This will drop all row values for this column.`,
                            onConfirm: () => {
                              onDeleteCustomColumn(col.id);
                              setConfirmDialog(null);
                            }
                          });
                        }}
                        className="hidden group-hover/header:inline text-red-500 hover:text-red-700 ml-1 cursor-pointer"
                        title="Delete custom column"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </th>
                ))}

                {/* Action Column */}
                <th className="w-28 px-3 text-center">Actions</th>
              </tr>
            </thead>

            {/* TABLE BODY */}
            <tbody className="text-xs text-[#3B2A1D] divide-y divide-[#E7D6C4]/50">
              {paginatedCases.length > 0 ? (
                paginatedCases.map((tc, index) => {
                  const isSelected = selectedRowId === tc.id;
                  const isChecked = selectedIds.has(tc.id);

                  return (
                    <tr
                      key={tc.id}
                      onClick={() => onSelectRow(tc.id)}
                      onPaste={(e) => handlePasteScreenshot(e, tc.id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        onSelectRow(tc.id);
                        setContextMenu({
                          rowId: tc.id,
                          x: e.clientX,
                          y: e.clientY
                        });
                      }}
                      className={`hover:bg-[#FFF8F2]/60 transition-all cursor-pointer group ${
                        isSelected ? 'bg-[#FFF4E8]/40 border-l-2 border-l-[#8B5A2B]' : ''
                      }`}
                    >
                      {/* Checkbox column */}
                      <td className="px-3 text-center border-r border-[#E7D6C4]/30" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => toggleSelectId(tc.id, e as any)}
                          className="rounded border-[#E7D6C4] text-[#8B5A2B] focus:ring-[#8B5A2B] w-3.5 h-3.5 cursor-pointer"
                        />
                      </td>

                      {/* Test Case No (Editable Inline) */}
                      <td className="p-2 border-r border-[#E7D6C4]/30 font-mono font-bold text-[#8B5A2B] relative">
                        {editingCell?.rowId === tc.id && editingCell?.colName === 'test_case_no' ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onBlur={() => {
                              handleCellSave(tc.id, 'test_case_no', editValue);
                              setEditingCell(null);
                            }}
                            onKeyDown={e => handleCellKeyDown(e, tc.id, 'test_case_no')}
                            className="w-full px-1.5 py-1 border border-[#8B5A2B] rounded-lg focus:outline-hidden text-xs bg-white font-mono"
                            autoFocus
                          />
                        ) : (
                          <div 
                            onDoubleClick={() => startEditing(tc.id, 'test_case_no', tc.test_case_no)}
                            className="px-1.5 py-1.5 truncate hover:bg-[#FFF4E8] rounded-md cursor-text"
                          >
                            {tc.test_case_no}
                          </div>
                        )}
                      </td>

                      {/* Name (Editable Inline) */}
                      <td className="p-2 border-r border-[#E7D6C4]/30 font-semibold text-[#3B2A1D]">
                        {editingCell?.rowId === tc.id && editingCell?.colName === 'name' ? (
                          <textarea
                            value={editValue}
                            onChange={e => {
                              setEditValue(e.target.value);
                              const dupes = findSimilarTitles(e.target.value, testCases, tc.id);
                              setDuplicateWarning(dupes.length > 0 ? dupes[0].name : null);
                            }}
                            onBlur={() => {
                              handleCellSave(tc.id, 'name', editValue);
                              setEditingCell(null);
                              setDuplicateWarning(null);
                            }}
                            onKeyDown={e => handleCellKeyDown(e, tc.id, 'name')}
                            ref={adjustTextareaHeight}
                            onInput={e => adjustTextareaHeight(e.currentTarget)}
                            className="w-full px-1.5 py-1 border border-[#8B5A2B] rounded-lg focus:outline-hidden text-xs bg-white resize-none overflow-hidden"
                            autoFocus
                          />
                        ) : (
                          <div 
                            onDoubleClick={() => startEditing(tc.id, 'name', tc.name)}
                            className="px-1.5 py-1.5 hover:bg-[#FFF4E8] rounded-md cursor-text whitespace-pre-wrap break-words"
                          >
                            {tc.name || <span className="italic text-[#E7D6C4]">Enter name...</span>}
                          </div>
                        )}
                      </td>

                      {/* Objective (Editable Expandable Textarea Inline) */}
                      <td className="p-2 border-r border-[#E7D6C4]/30">
                        {editingCell?.rowId === tc.id && editingCell?.colName === 'test_objective' ? (
                          <textarea
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onBlur={() => {
                              handleCellSave(tc.id, 'test_objective', editValue);
                              setEditingCell(null);
                            }}
                            onKeyDown={e => handleCellKeyDown(e, tc.id, 'test_objective')}
                            ref={adjustTextareaHeight}
                            onInput={e => adjustTextareaHeight(e.currentTarget)}
                            className="w-full p-2 border border-[#8B5A2B] rounded-lg focus:outline-hidden text-xs bg-white resize-none overflow-hidden"
                            autoFocus
                          />
                        ) : (
                          <div 
                            onDoubleClick={() => startEditing(tc.id, 'test_objective', tc.test_objective)}
                            className="px-1.5 py-1.5 text-xs text-[#7A6A5A] hover:bg-[#FFF4E8] rounded-md cursor-text leading-relaxed font-medium whitespace-pre-wrap break-words"
                          >
                            {tc.test_objective || <span className="italic text-[#E7D6C4]">Double click to add...</span>}
                          </div>
                        )}
                      </td>

                      {/* Steps (Inline ContentEditable Rich Text Editor) */}
                      <td className="p-2 border-r border-[#E7D6C4]/30 relative" onClick={e => e.stopPropagation()}>
                        {editingCell?.rowId === tc.id && editingCell?.colName === 'test_steps' ? (
                          <div id={`steps-editor-container-${tc.id}`} className="relative min-h-[90px] border border-[#8B5A2B] rounded-lg bg-white p-2" onKeyDown={e => handleCellKeyDown(e, tc.id, 'test_steps')}>
                            {/* Rich Editor mini Floating Toolbar */}
                            <div className="flex items-center gap-1.5 bg-white border border-[#E7D6C4] p-1 rounded-md mb-1 shadow-xs">
                              <button 
                                type="button" 
                                onMouseDown={e => { e.preventDefault(); execFormat('bold'); }}
                                className="p-1 hover:bg-[#FFF4E8] text-[#8B5A2B] rounded"
                                title="Bold"
                              >
                                <Bold className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                type="button" 
                                onMouseDown={e => { e.preventDefault(); execFormat('italic'); }}
                                className="p-1 hover:bg-[#FFF4E8] text-[#8B5A2B] rounded"
                                title="Italic"
                              >
                                <Italic className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                type="button" 
                                onMouseDown={e => { e.preventDefault(); execFormat('insertUnorderedList'); }}
                                className="p-1 hover:bg-[#FFF4E8] text-[#8B5A2B] rounded"
                                title="Bullet List"
                              >
                                <List className="w-3.5 h-3.5" />
                              </button>
                              <div className="ml-auto flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (stepsEditorRef.current) {
                                      handleCellSave(tc.id, 'test_steps', stepsEditorRef.current.innerHTML);
                                    }
                                    setEditingCell(null);
                                  }}
                                  className="px-1.5 py-0.5 bg-[#8B5A2B] hover:bg-[#A66B37] text-white text-[9px] font-bold rounded"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingCell(null)}
                                  className="px-1.5 py-0.5 border border-[#E7D6C4] text-[#7A6A5A] text-[9px] font-bold rounded"
                                >
                                  Close
                                </button>
                              </div>
                            </div>

                            {/* Editing viewport */}
                            <div
                              ref={stepsEditorRef}
                              contentEditable
                              suppressContentEditableWarning
                              dangerouslySetInnerHTML={{ __html: tc.test_steps }}
                              className="outline-none min-h-[60px] text-xs font-sans prose prose-xs leading-relaxed max-h-80 overflow-y-auto"
                            />
                          </div>
                        ) : (
                          <div 
                            onDoubleClick={() => startEditing(tc.id, 'test_steps', tc.test_steps)}
                            className="px-1.5 py-1.5 text-xs text-[#7A6A5A] hover:bg-[#FFF4E8] rounded-md cursor-text leading-relaxed font-sans prose prose-xs"
                            dangerouslySetInnerHTML={{ __html: tc.test_steps || '<span class="italic text-[#E7D6C4]">Double click to add...</span>' }}
                          />
                        )}
                      </td>

                      {/* Issues / Blockers (Editable Textarea Inline) */}
                      <td className="p-2 border-r border-[#E7D6C4]/30">
                        {editingCell?.rowId === tc.id && editingCell?.colName === 'issues' ? (
                          <textarea
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onBlur={() => {
                              handleCellSave(tc.id, 'issues', editValue);
                              setEditingCell(null);
                            }}
                            onKeyDown={e => handleCellKeyDown(e, tc.id, 'issues')}
                            ref={adjustTextareaHeight}
                            onInput={e => adjustTextareaHeight(e.currentTarget)}
                            className="w-full p-2 border border-[#8B5A2B] rounded-lg focus:outline-hidden text-xs bg-white resize-none overflow-hidden"
                            autoFocus
                          />
                        ) : (
                          <div 
                            onDoubleClick={() => startEditing(tc.id, 'issues', tc.issues)}
                            className={`px-1.5 py-1.5 text-xs hover:bg-[#FFF4E8] rounded-md cursor-text leading-relaxed whitespace-pre-wrap break-words ${
                              tc.issues ? 'text-[#FF4D4F] font-bold bg-red-50/50 p-1 rounded border border-red-100' : 'text-[#7A6A5A] font-medium'
                            }`}
                          >
                            {tc.issues || <span className="italic text-[#E7D6C4]">Add issues...</span>}
                          </div>
                        )}
                      </td>

                      {/* Status select options badge */}
                      <td className="p-2 border-r border-[#E7D6C4]/30 text-center" onClick={e => e.stopPropagation()}>
                        <div className="relative inline-block w-full">
                          <select
                            value={tc.status}
                            onChange={e => handleCellSave(tc.id, 'status', e.target.value as TestCaseStatus)}
                            className={`w-full appearance-none px-2.5 py-1 pr-6 rounded-lg text-[11px] font-bold text-center cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-[#8B5A2B] ${
                              STATUS_THEMES[tc.status]?.bg || 'bg-gray-100'
                            } ${STATUS_THEMES[tc.status]?.text || 'text-gray-700'}`}
                          >
                            <option value="Fixed">Fixed</option>
                            <option value="Not Fixed">Not Fixed</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Blocked">Blocked</option>
                            <option value="Not Tested">Not Tested</option>
                          </select>
                          <ChevronDown className={`w-3.5 h-3.5 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none ${STATUS_THEMES[tc.status]?.text}`} />
                        </div>
                      </td>

                      {/* Interactive Drag/Drop/Paste/Upload Screenshot Thumbnail */}
                      <td 
                        className="p-2 border-r border-[#E7D6C4]/30 text-center relative group/cell"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropScreenshot(e, tc.id)}
                        onClick={e => e.stopPropagation()}
                      >
                        {tc.screenshots && tc.screenshots.length > 0 && !brokenImages[tc.id] ? (
                          <div className="relative inline-block group/thumb">
                            <img
                              src={tc.screenshots[0].image_url}
                              alt="thumbnail"
                              onError={() => setBrokenImages(prev => ({ ...prev, [tc.id]: true }))}
                              onClick={() => setLightboxImage(tc.screenshots[0].image_url)}
                              className="w-14 h-10 object-cover rounded-lg border border-[#E7D6C4] mx-auto shadow-2xs group-hover/thumb:scale-105 transition-transform cursor-zoom-in bg-[#FFF8F2]"
                            />
                            {/* Floating controls */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 rounded-lg flex items-center justify-center gap-1 transition-opacity">
                              <button 
                                onClick={() => setLightboxImage(tc.screenshots[0].image_url)}
                                className="p-0.5 hover:bg-white/20 rounded text-white" 
                                title="Zoom View"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <a 
                                href={tc.screenshots[0].image_url} 
                                download={`screenshot_${tc.test_case_no}.png`}
                                className="p-0.5 hover:bg-white/20 rounded text-white" 
                                title="Download"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                              <button 
                                onClick={(e) => deleteScreenshot(tc.id, e)}
                                className="p-0.5 hover:bg-white/20 rounded text-red-400" 
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <span className="absolute -top-1.5 -right-1.5 bg-[#8B5A2B] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                              {tc.screenshots.length}
                            </span>
                          </div>
                        ) : (
                          <div className="relative border border-dashed border-[#E7D6C4] hover:border-[#8B5A2B] rounded-lg p-1 transition-colors group/no-img">
                            <input 
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileSelect(e, tc.id)}
                              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                              title="Upload or Drag-and-drop Image here"
                            />
                            <div className="py-1 text-[9px] text-[#7A6A5A]/70 font-semibold flex flex-col items-center justify-center gap-0.5">
                              {brokenImages[tc.id] ? (
                                <ImageOff className="w-4 h-4 text-red-400/50 group-hover/no-img:text-red-400" />
                              ) : (
                                <ImageIcon className="w-4 h-4 text-[#7A6A5A]/50 group-hover/no-img:text-[#8B5A2B]" />
                              )}
                              <span className={brokenImages[tc.id] ? "text-red-400" : ""}>
                                {brokenImages[tc.id] ? "Invalid Link" : "Upload"}
                              </span>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Custom Columns Cells */}
                      {customColumns.map(col => {
                        const val = tc.custom_values?.[col.id] || '';
                        return (
                          <td key={col.id} className="p-2 border-r border-[#E7D6C4]/30" onClick={e => e.stopPropagation()}>
                            {editingCell?.rowId === tc.id && editingCell?.colName === `custom-${col.id}` ? (
                              <input
                                type={col.type === 'Number' ? 'number' : 'text'}
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onBlur={() => {
                                  handleCellSave(tc.id, `custom-${col.id}`, editValue);
                                  setEditingCell(null);
                                }}
                                onKeyDown={e => handleKeyDown(e, tc.id, `custom-${col.id}`)}
                                className="w-full px-1.5 py-1 border border-[#8B5A2B] rounded focus:outline-hidden text-xs bg-white"
                                autoFocus
                              />
                            ) : (
                              <div 
                                onDoubleClick={() => startEditing(tc.id, `custom-${col.id}`, val)}
                                className="px-1.5 py-1.5 truncate hover:bg-[#FFF4E8] rounded cursor-text text-[#3B2A1D]"
                              >
                                {val || <span className="italic text-gray-300">Add info...</span>}
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* Row actions (move, duplicate, delete) */}
                      <td className="p-2 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => moveRow(index, 'up')}
                            disabled={index === 0 && currentPage === 1}
                            className="p-1 text-[#7A6A5A] hover:text-[#3B2A1D] hover:bg-[#FFF4E8] rounded-md disabled:opacity-30 disabled:pointer-events-none"
                            title="Move Row Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => moveRow(index, 'down')}
                            disabled={startIndex + index === filteredCases.length - 1}
                            className="p-1 text-[#7A6A5A] hover:text-[#3B2A1D] hover:bg-[#FFF4E8] rounded-md disabled:opacity-30 disabled:pointer-events-none"
                            title="Move Row Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDuplicateTestCase(tc.id)}
                            className="p-1 text-[#8B5A2B] hover:text-[#A66B37] hover:bg-[#FFF4E8] rounded-md"
                            title="Duplicate Row"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => triggerConfirmDelete(tc.id, tc.test_case_no)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md"
                            title="Delete Row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9 + customColumns.length} className="py-16 text-center text-[#7A6A5A] space-y-2">
                    <EyeOff className="w-8 h-8 text-[#E7D6C4] mx-auto" />
                    <p className="text-sm font-medium">No matching test cases found.</p>
                    <p className="text-xs text-[#7A6A5A]/70">Try clearing active search criteria or filters, or add a new row above!</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* FOOTER PAGINATION & COUNT INFO */}
        <div className="bg-[#FFF4E8]/40 border-t border-[#E7D6C4] px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-[#7A6A5A]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#3B2A1D]">{filteredCases.length}</span> of{' '}
            <span className="font-semibold text-[#3B2A1D]">{testCases.length}</span> rows showing
          </div>

          <div className="flex items-center gap-4 ml-auto">
            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-[#E7D6C4] rounded-lg px-2 py-1 bg-white focus:outline-hidden font-medium"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 border border-[#E7D6C4] rounded-lg bg-white disabled:opacity-40 disabled:pointer-events-none hover:bg-gray-50 font-bold"
              >
                Prev
              </button>
              <span className="px-3">
                Page <span className="font-bold text-[#8B5A2B]">{currentPage}</span> of <span className="font-bold text-[#3B2A1D]">{totalPages || 1}</span>
              </span>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-2.5 py-1 border border-[#E7D6C4] rounded-lg bg-white disabled:opacity-40 disabled:pointer-events-none hover:bg-gray-50 font-bold"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FULLSCREEN LIGHTBOX */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col"
          style={{ backgroundColor: 'rgba(0,0,0,0.95)' }}
          onWheel={handleLightboxWheel}
          onMouseMove={handleLightboxMouseMove}
          onMouseUp={handleLightboxMouseUp}
          onMouseLeave={handleLightboxMouseUp}
        >
          {/* Top toolbar */}
          <div className="flex items-center justify-between px-5 py-3 bg-black/60 z-10 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-white/80 text-sm font-medium flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#CD853F]" />
                Screenshot Preview
              </span>
              <span className="text-white/40 text-xs">Scroll to zoom · Drag to pan · Esc to close</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Zoom controls */}
              <button
                onClick={() => setLightboxZoom(z => Math.max(0.25, z - 0.25))}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-lg font-bold transition-colors"
              >−</button>
              <span className="text-white text-xs font-mono w-12 text-center">{Math.round(lightboxZoom * 100)}%</span>
              <button
                onClick={() => setLightboxZoom(z => Math.min(5, z + 0.25))}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-lg font-bold transition-colors"
              >+</button>
              <button
                onClick={() => { setLightboxZoom(1); setLightboxOffset({ x: 0, y: 0 }); }}
                className="px-3 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors ml-1"
              >Reset</button>
              {/* Download */}
              <a
                href={lightboxImage}
                download="screenshot_hd.png"
                className="px-3 h-8 rounded-lg bg-[#8B5A2B] hover:bg-[#A66B37] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors ml-2"
              >
                <Download className="w-3.5 h-3.5" />
                Download HD
              </a>
              {/* Close */}
              <button
                onClick={closeLightbox}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-red-500/80 text-white flex items-center justify-center transition-colors ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Image canvas */}
          <div
            className="flex-1 overflow-hidden flex items-center justify-center"
            style={{ cursor: lightboxDrag.dragging ? 'grabbing' : 'grab' }}
            onClick={(e) => { if (e.target === e.currentTarget) closeLightbox(); }}
            onMouseDown={handleLightboxMouseDown}
          >
            <img
              ref={lightboxImgRef}
              src={lightboxImage}
              alt="Full screen view"
              draggable={false}
              style={{
                transform: `translate(${lightboxOffset.x}px, ${lightboxOffset.y}px) scale(${lightboxZoom})`,
                transformOrigin: 'center center',
                transition: lightboxDrag.dragging ? 'none' : 'transform 0.1s ease',
                maxWidth: '95vw',
                maxHeight: '90vh',
                objectFit: 'contain',
                userSelect: 'none',
                imageRendering: 'high-quality',
              }}
            />
          </div>

          {/* Bottom zoom hint */}
          <div className="flex items-center justify-center py-2 bg-black/40 shrink-0">
            <div className="flex gap-3">
              {[0.5, 1, 1.5, 2, 3].map(z => (
                <button
                  key={z}
                  onClick={() => { setLightboxZoom(z); setLightboxOffset({ x: 0, y: 0 }); }}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${
                    Math.abs(lightboxZoom - z) < 0.05 ? 'bg-[#8B5A2B] text-white' : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                  }`}
                >{z * 100}%</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PREMIUM CUSTOM CONFIRMATION DIALOG MODAL */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white border border-[#E7D6C4] rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-50 rounded-xl shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#3B2A1D]">{confirmDialog.title}</h3>
                <p className="text-xs text-[#7A6A5A] mt-1 leading-relaxed">{confirmDialog.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 border border-[#E7D6C4] text-[#7A6A5A] text-xs font-semibold rounded-xl hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXCEL-LIKE FLOATING CONTEXT MENU */}
      {contextMenu && (
        <div 
          className="fixed bg-white border border-[#E7D6C4] rounded-xl shadow-lg py-1 z-50 text-xs text-[#3B2A1D] min-w-[170px] animate-fade-in"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          <button 
            onClick={() => {
              const idx = testCases.findIndex(tc => tc.id === contextMenu.rowId);
              if (idx !== -1) {
                // Insert Above
                const nextNo = `TC-${String(testCases.length + 1).padStart(3, '0')}`;
                const newId = generateId();
                const newCase: TestCase = {
                  id: newId,
                  project_id: projectId,
                  document_id: documentId,
                  test_case_no: nextNo,
                  name: '',
                  test_objective: '',
                  test_steps: '<ol><li></li></ol>',
                  issues: '',
                  status: 'Not Tested',
                  display_order: 0,
                  screenshots: [],
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                };
                const copy = [...testCases];
                copy.splice(idx, 0, newCase);
                
                onSaveTestCase(newCase);
                onReorderTestCases(copy);
                onSelectRow(newId);
                setTimeout(() => {
                  startEditing(newId, 'name', '');
                }, 100);
              }
              setContextMenu(null);
            }}
            className="w-full text-left px-3.5 py-2 hover:bg-[#FFF4E8] flex items-center gap-2 font-semibold cursor-pointer text-[#3B2A1D]"
          >
            <Plus className="w-3.5 h-3.5 text-[#8B5A2B]" />
            Insert Row Above
          </button>
          <button 
            onClick={() => {
              const idx = testCases.findIndex(tc => tc.id === contextMenu.rowId);
              if (idx !== -1) {
                // Insert Below
                const nextNo = `TC-${String(testCases.length + 1).padStart(3, '0')}`;
                const newId = generateId();
                const newCase: TestCase = {
                  id: newId,
                  project_id: projectId,
                  document_id: documentId,
                  test_case_no: nextNo,
                  name: '',
                  test_objective: '',
                  test_steps: '<ol><li></li></ol>',
                  issues: '',
                  status: 'Not Tested',
                  display_order: 0,
                  screenshots: [],
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                };
                const copy = [...testCases];
                copy.splice(idx + 1, 0, newCase);
                
                onSaveTestCase(newCase);
                onReorderTestCases(copy);
                onSelectRow(newId);
                setTimeout(() => {
                  startEditing(newId, 'name', '');
                }, 100);
              }
              setContextMenu(null);
            }}
            className="w-full text-left px-3.5 py-2 hover:bg-[#FFF4E8] flex items-center gap-2 font-semibold cursor-pointer text-[#3B2A1D]"
          >
            <Plus className="w-3.5 h-3.5 text-[#8B5A2B]" />
            Insert Row Below
          </button>
          <div className="border-t border-[#E7D6C4]/40 my-1" />
          <button 
            onClick={() => {
              onDuplicateTestCase(contextMenu.rowId);
              setContextMenu(null);
            }}
            className="w-full text-left px-3.5 py-2 hover:bg-[#FFF4E8] flex items-center gap-2 font-semibold cursor-pointer text-[#3B2A1D]"
          >
            <Copy className="w-3.5 h-3.5 text-[#8B5A2B]" />
            Duplicate Row
          </button>
          <button 
            onClick={() => {
              const tc = testCases.find(c => c.id === contextMenu.rowId);
              if (tc) {
                setConfirmDialog({
                  title: 'Delete Row',
                  message: `Are you sure you want to delete testcase ${tc.test_case_no}?`,
                  onConfirm: () => {
                    onDeleteTestCase(contextMenu.rowId);
                    setConfirmDialog(null);
                  }
                });
              }
              setContextMenu(null);
            }}
            className="w-full text-left px-3.5 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 font-bold cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
            Delete Row
          </button>
        </div>
      )}
    </div>
  );
}
