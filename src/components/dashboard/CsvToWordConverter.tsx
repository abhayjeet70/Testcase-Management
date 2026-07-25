import React, { useState } from 'react';
import { 
  FileText, Upload, Copy, Download, Trash2, Plus, 
  ChevronRight, ArrowRight, Table, Sparkles, CheckCircle2, Edit3 
} from 'lucide-react';
import { TestCase, Project, TestCaseDocument } from '../../types';
import { generateId, saveDocument, saveTestCase, getDocuments } from '../../utils/storage';
import { parseCsvContent, downloadDocxFile, downloadPdfFile } from '../../utils/documentServices';
import { uploadFileToSupabase } from '../../utils/uploadMedia';

interface CsvToWordConverterProps {
  showToast: (msg: string, type: 'success' | 'info' | 'error') => void;
  selectedProjectId: string;
  projects: Project[];
  onSelectProject: (projectId: string) => void;
  onSavedToSpreadsheet?: (documentId: string) => void;
}

export default function CsvToWordConverter({ showToast, selectedProjectId, projects, onSelectProject, onSavedToSpreadsheet }: CsvToWordConverterProps) {
  const [csvText, setCsvText] = useState(() => sessionStorage.getItem('csv_csvText') || '');
  const [parsedCases, setParsedCases] = useState<TestCase[]>(() => {
    const saved = sessionStorage.getItem('csv_parsedCases');
    return saved ? JSON.parse(saved) : [];
  });
  const [documentTitle, setDocumentTitle] = useState(() => sessionStorage.getItem('csv_documentTitle') || 'My Test Ledger Conversion');

  React.useEffect(() => {
    sessionStorage.setItem('csv_csvText', csvText);
    sessionStorage.setItem('csv_parsedCases', JSON.stringify(parsedCases));
    sessionStorage.setItem('csv_documentTitle', documentTitle);
  }, [csvText, parsedCases, documentTitle]);
  const [editingCell, setEditingCell] = useState<{ index: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  
  // Project selection modal state
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const requireProject = (action: () => void) => {
    if (!selectedProjectId) {
      setPendingAction(() => action);
      setShowProjectModal(true);
    } else {
      action();
    }
  };

  const handleScreenshotUpload = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Optimistic UI updates
    setBrokenImages(prev => {
      const next = { ...prev };
      delete next[parsedCases[idx].id];
      return next;
    });

    try {
      showToast("Uploading image...", "info");
      const publicUrl = await uploadFileToSupabase(file, 'screenshots');
      
      setParsedCases(prev => {
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          screenshots: [{
            id: 'screenshot-' + generateId(),
            test_case_id: copy[idx].id,
            image_url: publicUrl,
            created_at: new Date().toISOString()
          }],
          updated_at: new Date().toISOString()
        };
        return copy;
      });
      showToast("Image uploaded successfully!", "success");
    } catch (error: any) {
      console.error("Failed to upload to Supabase", error);
      showToast("Failed to upload image. Please try again.", "error");
    }
    
    // Clear the input so the same file can be uploaded again if needed
    e.target.value = '';
  };

  const handleRemoveScreenshot = (idx: number) => {
    setParsedCases(prev => {
      const copy = [...prev];
      copy[idx] = {
        ...copy[idx],
        screenshots: [],
        updated_at: new Date().toISOString()
      };
      return copy;
    });
  };

  // Handle parsing CSV text
  const handleConvertText = () => {
    requireProject(() => {
      if (!csvText.trim()) {
        showToast("Please paste CSV content or upload a CSV file first.", "error");
        return;
      }

      try {
        const parsed = parseCsvContent(csvText);
        const testCases: TestCase[] = parsed.map((tc, idx) => ({
          id: 'tc-csv-' + generateId() + '-' + idx,
        project_id: 'conv-temp',
        document_id: '',
        test_case_no: tc.test_case_no || `TC-${String(idx + 1).padStart(3, '0')}`,
        name: tc.name || `Test Case #${idx + 1}`,
        test_objective: tc.test_objective || '',
        test_steps: tc.test_steps || '<ol><li>Execute process</li></ol>',
        issues: tc.issues || '',
        status: tc.status || 'Not Tested',
        display_order: idx + 1,
        screenshots: tc.screenshots || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

        setParsedCases(testCases);
        showToast(`Successfully parsed ${testCases.length} test cases!`, 'success');
      } catch (err: any) {
        showToast(err.message || "Failed to parse CSV. Please check formatting headers.", "error");
      }
    });
  };

  // Upload file parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    requireProject(async () => {
      try {
        const text = await file.text();
        setCsvText(text);
        const parsed = parseCsvContent(text);
        const testCases: TestCase[] = parsed.map((tc, idx) => ({
          id: 'tc-csv-' + generateId() + '-' + idx,
        project_id: 'conv-temp',
        document_id: '',
        test_case_no: tc.test_case_no || `TC-${String(idx + 1).padStart(3, '0')}`,
        name: tc.name || `Test Case #${idx + 1}`,
        test_objective: tc.test_objective || '',
        test_steps: tc.test_steps || '<ol><li>Execute process</li></ol>',
        issues: tc.issues || '',
        status: tc.status || 'Not Tested',
        display_order: idx + 1,
        screenshots: tc.screenshots || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

        setParsedCases(testCases);
        showToast(`Successfully uploaded and parsed "${file.name}" (${testCases.length} rows)`, 'success');
      } catch (err: any) {
        showToast(err.message || "Failed to parse uploaded CSV.", "error");
      }
    });
    
    // Clear input
    e.target.value = '';
  };

  // Inline editing inside preview table
  const startEditing = (idx: number, field: string, val: string) => {
    setEditingCell({ index: idx, field });
    setEditValue(val);
  };

  const saveEdit = (idx: number, field: string) => {
    if (!editingCell) return;
    setParsedCases(prev => {
      const copy = [...prev];
      copy[idx] = {
        ...copy[idx],
        [field]: editValue,
        updated_at: new Date().toISOString()
      };
      return copy;
    });
    setEditingCell(null);
  };

  const handleDeleteRow = (idx: number) => {
    setParsedCases(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddRow = () => {
    const nextNo = `TC-${String(parsedCases.length + 1).padStart(3, '0')}`;
    const newRow: TestCase = {
      id: 'tc-csv-' + generateId(),
      project_id: 'conv-temp',
      document_id: '',
      test_case_no: nextNo,
      name: 'New TestCase',
      test_objective: 'Verification objective.',
      test_steps: '<ol><li>Action.</li></ol>',
      issues: '',
      status: 'Not Tested',
      display_order: parsedCases.length + 1,
      screenshots: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setParsedCases(prev => [...prev, newRow]);
  };

  // Generate Word DOCX Report using existing service
  const handleExportWord = async () => {
    if (parsedCases.length === 0) return;
    try {
      const dummyProject = {
        id: 'conv-temp',
        project_name: documentTitle,
        description: 'CSV Converter Output',
        favorite: false,
        archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      await downloadDocxFile(dummyProject, parsedCases, "QA CSV Converter");
      showToast("Beautiful Landscape DOCX Ledger downloaded!", "success");
    } catch {
      showToast("Export failed. Please check row cells.", "error");
    }
  };

  const handleExportPdf = async () => {
    if (parsedCases.length === 0) return;
    try {
      const dummyProject = {
        id: 'conv-temp',
        project_name: documentTitle,
        description: 'CSV Converter Output',
        favorite: false,
        archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      await downloadPdfFile(parsedCases, dummyProject, { companyName: "QA CSV Converter" });
      showToast("Landscape PDF Ledger downloaded!", "success");
    } catch {
      showToast("Export failed. Please check row cells.", "error");
    }
  };

  // Sample CSV format helper
  const loadSampleCsv = () => {
    requireProject(() => {
      const sample = `Test Case No.,Name,Test Objective,Test Steps,Issues / Blockers,Status (Fixed or Not),Screenshot
TC-001,User Registration,Verify successful user register flow,"1. Navigate to register screen\r\n2. Enter valid credentials\r\n3. Click Submit",None,Fixed,https://example.com/login.png
TC-002,Forgotten Password Link,Verify correct trigger of forgot password email link,"1. Click Forgot Password\r\n2. Enter registered email address\r\n3. Check inbox for system reset token",Delay in dispatch,In Progress,screenshots/login.png
TC-003,Empty Field Lockout,Verify strict frontend validation on required blank fields,"1. Click Submit with blank inputs\r\n2. Verify red alert boxes display under inputs",None,Blocked,`;
      setCsvText(sample);
    });
  };

  const handleSaveToSpreadsheet = () => {
    if (!selectedProjectId) {
      showToast("Please select a project first.", "error");
      return;
    }
    if (parsedCases.length === 0) {
      showToast("No test cases to save.", "error");
      return;
    }

    try {
      // FORCE CLEANUP OF LOCAL STORAGE BEFORE SAVING TO PREVENT QUOTA EXCEEDED
      try {
        const tcRaw = localStorage.getItem('tc_test_cases');
        if (tcRaw) {
          let tcArray = JSON.parse(tcRaw);
          let cleaned = false;
          tcArray = tcArray.map((tc: any) => {
            if (tc.screenshots && Array.isArray(tc.screenshots)) {
              const hasBase64 = tc.screenshots.some((s: any) => s.image_url && s.image_url.startsWith('data:image'));
              if (hasBase64) {
                cleaned = true;
                return { ...tc, screenshots: tc.screenshots.filter((s: any) => !s.image_url || !s.image_url.startsWith('data:image')) };
              }
            }
            return tc;
          });
          if (cleaned) localStorage.setItem('tc_test_cases', JSON.stringify(tcArray));
        }
        const projRaw = localStorage.getItem('tc_projects');
        if (projRaw) {
          let projArray = JSON.parse(projRaw);
          let cleaned = false;
          projArray = projArray.map((p: any) => {
            if (p.zip_file_data && p.zip_file_data.startsWith('data:')) {
              cleaned = true;
              return { ...p, zip_file_data: undefined, zip_file_name: undefined };
            }
            return p;
          });
          if (cleaned) localStorage.setItem('tc_projects', JSON.stringify(projArray));
        }
      } catch(e) {
        console.error('Cleanup failed', e);
      }

      // Scrub base64 out of parsedCases that are about to be saved
      const safeParsedCases = parsedCases.map(tc => {
        if (tc.screenshots && tc.screenshots.length > 0) {
          return {
            ...tc,
            screenshots: tc.screenshots.filter(s => !s.image_url || !s.image_url.startsWith('data:image'))
          };
        }
        return tc;
      });

      // 1. Get existing documents for the active project
      const existingDocs = getDocuments(selectedProjectId);
      
      // 2. Filter documents that match the base title to determine version
      const baseName = documentTitle.trim() || 'Imported CSV Ledger';
      const regex = new RegExp(`^${escapeRegExp(baseName)} V(\\d+)\\.docx$`, 'i');
      
      let maxVersion = 0;
      existingDocs.forEach(doc => {
        const match = doc.name.match(regex);
        if (match) {
          const version = parseInt(match[1], 10);
          if (version > maxVersion) maxVersion = version;
        }
      });
      
      const newVersion = maxVersion + 1;
      const newDocName = `${baseName} V${newVersion}.docx`;
      
      // 3. Create and save the new document
      const newDocDraft = {
        project_id: selectedProjectId,
        name: newDocName,
        description: 'Auto-saved from CSV Converter',
      };
      
      const savedDoc = saveDocument(newDocDraft);
      
      // 4. Save all test cases linked to this document
      safeParsedCases.forEach((tc, idx) => {
        const savedTc: Partial<TestCase> & { project_id: string; document_id: string } = {
          ...tc,
          id: 'tc-' + generateId() + '-' + idx, // generate new fresh ID for storage
          project_id: selectedProjectId,
          document_id: savedDoc.id,
        };
        saveTestCase(savedTc as TestCase);
      });
      
      showToast(`Successfully saved ${parsedCases.length} test cases to ${newDocName}!`, "success");
      if (onSavedToSpreadsheet) {
        onSavedToSpreadsheet(savedDoc.id);
      }
    } catch (e: any) {
      showToast(e.message || "Failed to save to spreadsheet", "error");
    }
  };

  // Helper function to escape regex characters
  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'); // $& means the whole matched string
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div>
        <h1 className="text-xl font-extrabold text-[#3B2A1D] tracking-tight flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#8B5A2B]" />
          Instant CSV-to-Word Ledger Converter
        </h1>
        <p className="text-xs text-[#7A6A5A] mt-0.5">
          Drop a standard comma-separated test matrix or paste raw sheet rows, audit them inline, and generate high-fidelity Landscape Word Reports (.docx) on-the-fly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* INPUT BOX */}
        <div className="lg:col-span-2 bg-white border border-[#E7D6C4] p-5 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase font-bold text-[#8B5A2B] tracking-wider">Source CSV Dataset</h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={loadSampleCsv}
                className="text-[10px] font-bold text-[#8B5A2B] bg-[#FFF4E8] hover:bg-[#FFF4E8]/80 px-2.5 py-1 rounded-lg transition-all"
              >
                Load Demo CSV Template
              </button>
              <label className="text-[10px] font-bold text-[#7A6A5A] border border-[#E7D6C4] px-2.5 py-1 rounded-lg hover:bg-gray-50 cursor-pointer flex items-center gap-1 transition-colors">
                <Upload className="w-3.5 h-3.5" />
                Upload .csv File
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </label>
            </div>
          </div>

          <textarea
            value={csvText}
            onChange={e => setCsvText(e.target.value)}
            placeholder={`Test Case No.,Name,Test Objective,Test Steps,Issues / Blockers,Status\nTC-001,User Login,Verify correct sign-in,1. Go to Login\\n2. Enter credentials,None,Fixed`}
            className="w-full h-44 p-3.5 border border-[#E7D6C4] rounded-xl text-xs bg-[#FFF8F2]/30 text-[#3B2A1D] focus:ring-1 focus:ring-[#8B5A2B] focus:outline-hidden font-mono leading-relaxed"
          />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-[#F5EDE4]">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-[#7A6A5A] shrink-0">Ledger Document Title:</span>
              <input
                type="text"
                value={documentTitle}
                onChange={e => setDocumentTitle(e.target.value)}
                className="flex-1 sm:w-60 px-2.5 py-1.5 border border-[#E7D6C4] rounded-xl text-xs bg-white text-[#3B2A1D] font-bold focus:ring-1 focus:ring-[#8B5A2B]"
              />
            </div>

            <button
              onClick={handleConvertText}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#8B5A2B] hover:bg-[#A66B37] text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Table className="w-4 h-4" />
              Convert & View Preview Table
            </button>
          </div>
        </div>

        {/* SIDEBAR INSTRUCTION COMPACT */}
        <div className="bg-white border border-[#E7D6C4] p-5 rounded-2xl shadow-xs space-y-4 h-fit">
          <h3 className="text-xs font-bold text-[#8B5A2B] uppercase tracking-wider">CSV Spec Standards</h3>
          <div className="space-y-3 text-[11px] text-[#7A6A5A] leading-relaxed">
            <p>Your CSV should contain the following headers (case-insensitive) for perfect auto-column mapping:</p>
            <ul className="list-disc pl-4 space-y-1 font-semibold text-[#3B2A1D]">
              <li>Test Case No. / ID</li>
              <li>Name / Title</li>
              <li>Test Objective / Objective</li>
              <li>Test Steps / Steps / Procedure</li>
              <li>Issues / Blockers</li>
              <li>Status / Result</li>
              <li>Screenshot / Image / Attachment / Screenshot URL / Image URL</li>
            </ul>
            <p>Multiple lines inside cells are supported if wrapped in standard quotes <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-[10px]">"steps here"</code>.</p>
          </div>
        </div>
      </div>

      {/* LIGHTBOX FOR SCREENSHOT */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <img 
            src={lightboxImage} 
            alt="Fullscreen preview" 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}

      {/* PROJECT SELECTION MODAL */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 bg-[#3B2A1D]/20 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
            <h2 className="text-lg font-bold text-[#3B2A1D] mb-4">Select Target Project</h2>
            <p className="text-xs text-[#7A6A5A] mb-4">
              Before generating test cases, please select the project where you want to associate this activity.
            </p>

            <div className="space-y-2 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {projects.length === 0 ? (
                <div className="text-center py-4 text-xs font-semibold text-[#8B5A2B] bg-[#FFF4E8] rounded-xl">
                  No projects available. Please create one in the sidebar first.
                </div>
              ) : (
                projects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelectProject(p.id);
                      setShowProjectModal(false);
                      if (pendingAction) {
                        setTimeout(() => pendingAction(), 100);
                        setPendingAction(null);
                      }
                    }}
                    className="w-full text-left px-4 py-3 rounded-xl border border-[#E7D6C4] hover:bg-[#FFF4E8] hover:border-[#8B5A2B]/40 transition-colors flex justify-between items-center group"
                  >
                    <span className="font-bold text-[#3B2A1D] text-sm">{p.project_name}</span>
                    <ArrowRight className="w-4 h-4 text-[#8B5A2B] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowProjectModal(false);
                  setPendingAction(null);
                }}
                className="px-4 py-2 text-xs font-bold text-[#7A6A5A] bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
        {parsedCases.length > 0 && (
          <div className="lg:col-span-3 bg-white border border-[#E7D6C4] p-5 rounded-2xl shadow-xs space-y-4">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E7D6C4] pb-4">
              <div>
                <h2 className="text-sm font-bold text-[#3B2A1D] uppercase tracking-wider flex items-center gap-2">
                  <Table className="w-4 h-4 text-[#8B5A2B]" />
                  Auditable Preview Matrix ({parsedCases.length} rows)
                </h2>
                <p className="text-[11px] text-[#7A6A5A] mt-0.5">Double click cells to edit and fix details before generating the final ledger report.</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleSaveToSpreadsheet}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFF4E8] text-[#8B5A2B] font-bold text-xs rounded-xl border border-[#E7D6C4]/60 hover:bg-[#FCECDA] transition-all shadow-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Save to Spreadsheet
                </button>
                <button
                  onClick={handleExportWord}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8B5A2B] text-white font-bold text-xs rounded-xl hover:bg-[#6A4420] transition-all shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Word (.docx)
                </button>
                <button
                  onClick={handleExportPdf}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white font-bold text-xs rounded-xl hover:bg-red-700 transition-all shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  PDF (.pdf)
                </button>
              </div>
            </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse table-fixed text-xs">
              <thead>
                <tr className="bg-[#FFF4E8]/40 border-b border-[#E7D6C4] text-[11px] font-bold text-[#3B2A1D] h-10">
                  <th className="w-[100px] px-3 text-left">No.</th>
                  <th className="w-[200px] px-3 text-left">Name</th>
                  <th className="w-[260px] px-3 text-left">Objective</th>
                  <th className="w-[300px] px-3 text-left">Steps</th>
                  <th className="w-[180px] px-3 text-left">Issues / Blockers</th>
                  <th className="w-[120px] px-3 text-left">Status</th>
                  <th className="w-[120px] px-3 text-left">Screenshot</th>
                  <th className="w-20 text-center px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7D6C4]/50">
                {parsedCases.map((tc, idx) => (
                  <tr key={tc.id} className="hover:bg-gray-50/50">
                    
                    {/* TC No. */}
                    <td className="p-3 font-mono font-bold text-[#8B5A2B]">
                      {editingCell?.index === idx && editingCell?.field === 'test_case_no' ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => saveEdit(idx, 'test_case_no')}
                          className="w-full p-1 border border-[#8B5A2B] rounded text-xs bg-white"
                          autoFocus
                        />
                      ) : (
                        <div 
                          onDoubleClick={() => startEditing(idx, 'test_case_no', tc.test_case_no)}
                          className="cursor-text py-1 truncate hover:bg-[#FFF4E8] rounded px-1"
                        >
                          {tc.test_case_no}
                        </div>
                      )}
                    </td>

                    {/* Name */}
                    <td className="p-3 font-semibold text-[#3B2A1D]">
                      {editingCell?.index === idx && editingCell?.field === 'name' ? (
                        <textarea
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => saveEdit(idx, 'name')}
                          className="w-full p-1 border border-[#8B5A2B] rounded text-xs bg-white min-h-[50px]"
                          autoFocus
                        />
                      ) : (
                        <div 
                          onDoubleClick={() => startEditing(idx, 'name', tc.name)}
                          className="cursor-text py-1 hover:bg-[#FFF4E8] rounded px-1"
                        >
                          {tc.name}
                        </div>
                      )}
                    </td>

                    {/* Objective */}
                    <td className="p-3 text-[#7A6A5A]">
                      {editingCell?.index === idx && editingCell?.field === 'test_objective' ? (
                        <textarea
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => saveEdit(idx, 'test_objective')}
                          className="w-full p-1 border border-[#8B5A2B] rounded text-xs bg-white min-h-[70px]"
                          autoFocus
                        />
                      ) : (
                        <div 
                          onDoubleClick={() => startEditing(idx, 'test_objective', tc.test_objective)}
                          className="cursor-text py-1 hover:bg-[#FFF4E8] rounded px-1 whitespace-pre-wrap"
                        >
                          {tc.test_objective || <span className="italic text-gray-300">Add info...</span>}
                        </div>
                      )}
                    </td>

                    {/* Steps */}
                    <td className="p-3 text-[#7A6A5A]">
                      {editingCell?.index === idx && editingCell?.field === 'test_steps' ? (
                        <textarea
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => saveEdit(idx, 'test_steps')}
                          className="w-full p-1 border border-[#8B5A2B] rounded text-xs bg-white font-mono min-h-[90px]"
                          autoFocus
                        />
                      ) : (
                        <div 
                          onDoubleClick={() => startEditing(idx, 'test_steps', tc.test_steps)}
                          className="cursor-text py-1 hover:bg-[#FFF4E8] rounded px-1 prose prose-xs whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{ __html: tc.test_steps }}
                        />
                      )}
                    </td>

                    {/* Issues */}
                    <td className="p-3">
                      {editingCell?.index === idx && editingCell?.field === 'issues' ? (
                        <textarea
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => saveEdit(idx, 'issues')}
                          className="w-full p-1 border border-[#8B5A2B] rounded text-xs bg-white min-h-[50px]"
                          autoFocus
                        />
                      ) : (
                        <div 
                          onDoubleClick={() => startEditing(idx, 'issues', tc.issues)}
                          className="cursor-text py-1 hover:bg-[#FFF4E8] rounded px-1 text-red-500 font-bold bg-red-50/20 whitespace-pre-wrap"
                        >
                          {tc.issues || <span className="italic text-gray-300">No issues</span>}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="p-3">
                      <select
                        value={tc.status || 'Not Tested'}
                        onChange={(e) => {
                          const updated = [...parsedCases];
                          updated[idx].status = e.target.value as any;
                          setParsedCases(updated);
                        }}
                        className={`text-xs font-bold border-none bg-transparent cursor-pointer focus:outline-none focus:ring-0 ${
                          tc.status === 'Fixed' ? 'text-green-600' : 
                          tc.status === 'Not Fixed' ? 'text-red-600' :
                          tc.status === 'In Progress' ? 'text-blue-600' :
                          tc.status === 'Blocked' ? 'text-orange-600' :
                          'text-[#7A6A5A]'
                        }`}
                      >
                        <option value="Not Tested" className="text-[#7A6A5A]">Not Tested</option>
                        <option value="Fixed" className="text-green-600">Fixed</option>
                        <option value="Not Fixed" className="text-red-600">Not Fixed</option>
                        <option value="In Progress" className="text-blue-600">In Progress</option>
                        <option value="Blocked" className="text-orange-600">Blocked</option>
                      </select>
                    </td>

                    {/* Screenshot */}
                    <td className="p-3">
                      {(() => {
                        const screenshotUrl = tc.screenshots?.[0]?.image_url;
                        const hasBrokenImage = !!(screenshotUrl && brokenImages[tc.id]);
                        
                        if (!screenshotUrl || hasBrokenImage) {
                          return (
                            <div className="flex flex-col items-start gap-1">
                              <span className={`text-[10px] ${hasBrokenImage ? 'text-red-400 font-semibold' : 'text-[#7A6A5A]'}`}>
                                {hasBrokenImage ? 'Invalid Link' : 'No Screenshot'}
                              </span>
                              <label className="text-[9px] font-semibold text-[#8B5A2B] cursor-pointer hover:underline border border-[#E7D6C4] border-dashed bg-[#FFF4E8] hover:border-[#8B5A2B] px-2 py-1 rounded-md transition-colors hover:bg-[#FCECDA]">
                                Upload Image
                                <input type="file" accept="image/*" className="hidden" onChange={e => handleScreenshotUpload(idx, e)} />
                              </label>
                            </div>
                          );
                        }

                        return (
                          <div className="flex flex-col items-start gap-2">
                            <img
                              src={screenshotUrl}
                              alt="Screenshot preview"
                              className="h-20 w-20 object-cover rounded-lg border border-[#E7D6C4] cursor-zoom-in bg-[#FFF8F2]"
                              onClick={() => setLightboxImage(screenshotUrl)}
                              onError={() => setBrokenImages(prev => ({ ...prev, [tc.id]: true }))}
                            />
                            <div className="flex gap-2">
                              <label className="text-[10px] font-semibold text-[#8B5A2B] cursor-pointer hover:underline">
                                Replace
                                <input type="file" accept="image/*" className="hidden" onChange={e => handleScreenshotUpload(idx, e)} />
                              </label>
                              <button
                                onClick={() => handleRemoveScreenshot(idx)}
                                className="text-[10px] font-semibold text-red-500 hover:underline"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Action */}
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleDeleteRow(idx)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete this row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={handleAddRow}
              className="px-3.5 py-1.5 border border-[#E7D6C4] hover:bg-gray-50 text-xs font-bold text-[#3B2A1D] rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#8B5A2B]" />
              Add Blank Row
            </button>
            <button
              onClick={handleExportWord}
              className="px-5 py-2.5 bg-[#8B5A2B] hover:bg-[#A66B37] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Build & Download Word Ledger Report
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
