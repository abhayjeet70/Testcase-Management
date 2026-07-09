import React, { useState } from 'react';
import { 
  FileText, Upload, Copy, Download, Trash2, Plus, 
  ChevronRight, ArrowRight, Table, Sparkles, CheckCircle2, Edit3 
} from 'lucide-react';
import { TestCase } from '../../types';
import { generateId } from '../../utils/storage';
import { parseCsvContent, downloadDocxFile, downloadPdfFile } from '../../utils/documentServices';

interface CsvToWordConverterProps {
  showToast: (msg: string, type: 'success' | 'info' | 'error') => void;
}

export default function CsvToWordConverter({ showToast }: CsvToWordConverterProps) {
  const [csvText, setCsvText] = useState('');
  const [parsedCases, setParsedCases] = useState<TestCase[]>([]);
  const [documentTitle, setDocumentTitle] = useState('My Test Ledger Conversion');
  const [editingCell, setEditingCell] = useState<{ index: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  const handleScreenshotUpload = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setParsedCases(prev => {
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          screenshots: [{
            id: 'screenshot-' + generateId(),
            test_case_id: copy[idx].id,
            image_url: dataUrl,
            created_at: new Date().toISOString()
          }],
          updated_at: new Date().toISOString()
        };
        return copy;
      });
    };
    reader.readAsDataURL(file);
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
  };

  // Upload file parsing
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
    const sample = `Test Case No.,Name,Test Objective,Test Steps,Issues / Blockers,Status (Fixed or Not),Screenshot
TC-001,User Registration,Verify successful user register flow,"1. Navigate to register screen\r\n2. Enter valid credentials\r\n3. Click Submit",None,Fixed,https://example.com/login.png
TC-002,Forgotten Password Link,Verify correct trigger of forgot password email link,"1. Click Forgot Password\r\n2. Enter registered email address\r\n3. Check inbox for system reset token",Delay in dispatch,In Progress,screenshots/login.png
TC-003,Empty Field Lockout,Verify strict frontend validation on required blank fields,"1. Click Submit with blank inputs\r\n2. Verify red alert boxes display under inputs",None,Blocked,`;
    setCsvText(sample);
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

      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] rounded-2xl bg-white p-3 shadow-2xl">
            <img src={lightboxImage} alt="Screenshot enlarged" className="max-h-[85vh] max-w-full rounded-xl object-contain" />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute right-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-[#3B2A1D]"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* PREVIEW CONTAINER */}
      {parsedCases.length > 0 && (
        <div className="bg-white border border-[#E7D6C4] p-5 rounded-2xl shadow-xs space-y-4 animate-slide-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#F5EDE4]">
            <div>
              <h2 className="text-xs uppercase font-bold text-[#8B5A2B] tracking-wider">Auditable Preview Matrix ({parsedCases.length} Rows)</h2>
              <p className="text-[11px] text-[#7A6A5A] mt-0.5">Double click cells to edit and fix details before generating the final ledger report.</p>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={handleExportWord}
                className="px-4 py-2 bg-[#8B5A2B] hover:bg-[#A66B37] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Word (.docx)
              </button>
              <button
                onClick={handleExportPdf}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
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
                          className="cursor-text py-1 line-clamp-3 hover:bg-[#FFF4E8] rounded px-1"
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
                          className="cursor-text py-1 line-clamp-4 hover:bg-[#FFF4E8] rounded px-1 prose prose-xs"
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
                          className="cursor-text py-1 line-clamp-2 hover:bg-[#FFF4E8] rounded px-1 text-red-500 font-bold bg-red-50/20"
                        >
                          {tc.issues || <span className="italic text-gray-300">No issues</span>}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="p-3 text-[#3B2A1D] font-semibold">
                      {tc.status || 'Not Tested'}
                    </td>

                    {/* Screenshot */}
                    <td className="p-3">
                      {(() => {
                        const screenshotUrl = tc.screenshots?.[0]?.image_url;
                        const hasBrokenImage = !!(screenshotUrl && brokenImages[tc.id]);
                        if (!screenshotUrl || hasBrokenImage) {
                          return <div className="text-[11px] text-[#7A6A5A]">No Screenshot</div>;
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
                      {!tc.screenshots?.[0]?.image_url && !brokenImages[tc.id] && (
                        <div className="flex flex-col items-start gap-2">
                          <div className="h-20 w-20 rounded-lg border border-dashed border-[#E7D6C4] bg-[#FFF8F2] flex items-center justify-center text-[11px] text-[#7A6A5A]">
                            No Screenshot
                          </div>
                          <label className="text-[10px] font-semibold text-[#8B5A2B] cursor-pointer hover:underline">
                            Add
                            <input type="file" accept="image/*" className="hidden" onChange={e => handleScreenshotUpload(idx, e)} />
                          </label>
                        </div>
                      )}
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
