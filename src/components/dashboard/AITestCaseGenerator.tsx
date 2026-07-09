import React, { useState } from 'react';
import {
  Sparkles, CheckCircle2, Loader2, ArrowRight, FileText, ClipboardList
} from 'lucide-react';
import { TestCase, Project } from '../../types';
import { generateId, getDocuments } from '../../utils/storage';
import { downloadDocxFile, downloadCsvFile } from '../../utils/documentServices';
import TestCaseTable from '../table/TestCaseTable';

interface AITestCaseGeneratorProps {
  projects: Project[];
  selectedProjectId: string;
  onImportGenerated: (testCases: TestCase[]) => void;
  showToast: (msg: string, type: 'success' | 'info' | 'error') => void;
}

const LOADING_PHASES = [
  "Analyzing requirements architecture...",
  "Structuring functional target objectives...",
  "Drafting positive happy-path execution flows...",
  "Simulating negative edge cases and error bounds...",
  "Synthesizing blockers, risks, and failure modes...",
  "Applying Inter and JetBrains Mono styles to grid...",
  "Assembling final suite ledger..."
];

export default function AITestCaseGenerator({
  projects,
  selectedProjectId,
  onImportGenerated,
  showToast
}: AITestCaseGeneratorProps) {
  const [requirements, setRequirements] = useState('');
  const [context, setContext] = useState('');
  const [targetProjectId, setTargetProjectId] = useState(selectedProjectId || (projects[0]?.id || ''));
  const [targetDocumentId, setTargetDocumentId] = useState(() => {
    const projId = selectedProjectId || (projects[0]?.id || '');
    const docs = getDocuments(projId);
    return docs[0]?.id || '';
  });
  
  const [loading, setLoading] = useState(false);
  const [loadingPhaseIndex, setLoadingPhaseIndex] = useState(0);
  const [generatedCases, setGeneratedCases] = useState<TestCase[]>([]);
  const [selectedGeneratedRowId, setSelectedGeneratedRowId] = useState<string | null>(null);

  // Auto-fill template options
  const TEMPLATES = [
    {
      title: "Google OAuth Connection",
      desc: "Users click 'Connect Google Calendar', authenticate via Google, grant Calendar Read/Write scopes, and are redirected back with a success banner. Handle offline states and invalid credentials."
    },
    {
      title: "File Drag & Drop Upload",
      desc: "An attachment section supporting drag-and-drop of PNG/JPG files up to 10MB. Shows progress bar, thumbnail preview, and delete button. Fails gracefully for unsupported formats."
    },
    {
      title: "SaaS Billing Checkout",
      desc: "Stripe checkout session integration. User chooses monthly/yearly premium plan, enters payment details, confirms billing address. Handles coupon code application, SCA authentication, and failure retries."
    }
  ];

  // Load template
  const applyTemplate = (desc: string) => {
    setRequirements(desc);
  };

  // Upload txt/csv file to populate requirements
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setRequirements(text);
      showToast(`Loaded specs from "${file.name}"`, 'success');
    } catch {
      showToast("Failed to read text file specs.", "error");
    }
  };

  // Run generation
  const handleGenerate = async () => {
    if (!requirements.trim()) {
      showToast("Please enter requirements or description first.", "error");
      return;
    }

    setLoading(true);
    setLoadingPhaseIndex(0);
    setGeneratedCases([]);
    setSelectedGeneratedRowId(null);

    const phaseInterval = setInterval(() => {
      setLoadingPhaseIndex(prev => (prev + 1) % LOADING_PHASES.length);
    }, 2500);

    try {
      const response = await fetch("/api/gemini/generate-testcases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requirements,
          contextInfo: context
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to contact generator API.");
      }

      const data = await response.json();
      const rawCases = Array.isArray(data?.testCases) ? data.testCases : [];
      if (!rawCases.length) {
        throw new Error("Invalid format returned by generator API.");
      }

      const mapped: TestCase[] = rawCases.map((tc: any, idx: number) => {
        const stepsSource = Array.isArray(tc.steps)
          ? tc.steps
          : typeof tc.test_steps === 'string' && tc.test_steps.trim()
            ? [tc.test_steps]
            : [];

        const stepsHtml = stepsSource.length > 0
          ? `<ol>${stepsSource.map(step => `<li>${String(step).replace(/<[^>]+>/g, '')}</li>`).join('')}</ol>`
          : '<ol><li>Enter steps.</li></ol>';

        return {
          id: 'tc-ai-' + generateId() + '-' + idx,
          project_id: targetProjectId,
          document_id: targetDocumentId,
          test_case_no: tc.testCaseNo || tc.test_case_no || `TC-${String(idx + 1).padStart(3, '0')}`,
          name: tc.name || `Generated Verification ${idx + 1}`,
          test_objective: tc.objective || tc.test_objective || '',
          test_steps: stepsHtml,
          issues: tc.issues || 'None',
          status: (tc.status as TestCase['status']) || 'Not Tested',
          display_order: idx + 1,
          screenshots: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      });

      setGeneratedCases(mapped);
      setSelectedGeneratedRowId(mapped[0]?.id || null);
      showToast(`Successfully generated ${mapped.length} test cases!`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to generate test cases. Please verify your GEMINI_API_KEY in Secrets.", "error");
    } finally {
      clearInterval(phaseInterval);
      setLoading(false);
    }
  };

  const handleSaveGeneratedCase = (updated: TestCase) => {
    setGeneratedCases(prev => prev.map(tc => tc.id === updated.id ? updated : tc));
  };

  const handleDeleteGeneratedCase = (id: string) => {
    setGeneratedCases(prev => prev.filter(tc => tc.id !== id));
    setSelectedGeneratedRowId(current => current === id ? null : current);
  };

  const handleDuplicateGeneratedCase = (id: string) => {
    const original = generatedCases.find(tc => tc.id === id);
    if (!original) return;

    const duplicate: TestCase = {
      ...original,
      id: 'tc-ai-' + generateId(),
      test_case_no: `TC-${String(generatedCases.length + 1).padStart(3, '0')}`,
      display_order: generatedCases.length + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setGeneratedCases(prev => [...prev, duplicate]);
    setSelectedGeneratedRowId(duplicate.id);
  };

  const handleReorderGeneratedCases = (reordered: TestCase[]) => {
    setGeneratedCases(reordered);
  };

  // Save/Import to actual project suite
  const handleImportToProject = () => {
    if (generatedCases.length === 0) return;
    const proj = projects.find(p => p.id === targetProjectId);
    if (!proj) return;

    if (!targetDocumentId) {
      showToast("Please select or create a Test Case File in the selected project to import into.", "error");
      return;
    }

    // re-assign the target project and document ID
    const finalized = generatedCases.map(tc => ({
      ...tc,
      id: 'tc-' + generateId(), // give it a permanent clean ID
      project_id: targetProjectId,
      document_id: targetDocumentId
    }));

    onImportGenerated(finalized);
    setGeneratedCases([]);
    setRequirements('');
    setContext('');
  };

  const handleLocalDocxExport = async () => {
    const proj = projects.find(p => p.id === targetProjectId);
    if (!proj) return;
    await downloadDocxFile({ ...proj, project_name: "AI Generated - " + proj.project_name }, generatedCases, "Gemini AI Architect");
    showToast("Downloaded Word report successfully.", "success");
  };

  const handleLocalCsvExport = () => {
    const proj = projects.find(p => p.id === targetProjectId);
    if (!proj) return;
    downloadCsvFile({ ...proj, project_name: "AI Generated - " + proj.project_name }, generatedCases);
    showToast("Downloaded CSV successfully.", "success");
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div>
        <h1 className="text-xl font-extrabold text-[#3B2A1D] tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#8B5A2B] animate-pulse" />
          Autonomous AI Test Case Generator
        </h1>
        <p className="text-xs text-[#7A6A5A] mt-0.5">
          Leverage the power of Gemini 3.5 Flash to automatically transform PRDs, requirements specs, and user flows into perfect landscape QA matrices.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* INPUT SPECS COLUMN (2 cols wide on desktop) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-[#E7D6C4] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs uppercase font-bold text-[#8B5A2B] tracking-wider">Requirements Specifications</h2>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-[#7A6A5A] border border-[#E7D6C4] px-2.5 py-1 rounded-lg hover:bg-gray-50 cursor-pointer flex items-center gap-1.5 transition-colors">
                  <FileText className="w-3.5 h-3.5" />
                  Load PRD / Specs File
                  <input 
                    type="file" 
                    accept=".txt,.csv,.json" 
                    onChange={handleFileUpload} 
                    className="hidden" 
                  />
                </label>
              </div>
            </div>

            {/* TEXTAREA FOR REQUIREMENTS */}
            <div className="space-y-1">
              <textarea
                value={requirements}
                onChange={e => setRequirements(e.target.value)}
                placeholder="Paste your software requirements, user stories, ticket descriptions, or plain text specification outline here... e.g., 'A login screen with 2FA email codes...'"
                className="w-full h-44 p-3.5 border border-[#E7D6C4] rounded-xl text-xs bg-[#FFF8F2]/30 text-[#3B2A1D] focus:ring-1 focus:ring-[#8B5A2B] focus:outline-hidden leading-relaxed resize-none"
              />
              <div className="flex items-center justify-between text-[10px] text-[#7A6A5A]">
                <span>Provide thorough text for optimal comprehensive coverage.</span>
                <span>{requirements.length} characters</span>
              </div>
            </div>

            {/* OPTIONAL CONTEXT */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-[#7A6A5A] tracking-wider">Additional Context or Directives (Optional)</label>
              <input
                type="text"
                value={context}
                onChange={e => setContext(e.target.value)}
                placeholder="e.g., 'Focus heavily on API status code matching, write tests as standard gherkin syntax, include 20% edge cases'"
                className="w-full px-3.5 py-2.5 border border-[#E7D6C4] rounded-xl text-xs bg-white text-[#3B2A1D] focus:ring-1 focus:ring-[#8B5A2B] focus:outline-hidden"
              />
            </div>

            {/* TARGET SELECTION AND TRIGGER */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4 pt-2 border-t border-[#F5EDE4]">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#7A6A5A]">Target Project:</span>
                  <select
                    value={targetProjectId}
                    onChange={e => {
                      const newProjId = e.target.value;
                      setTargetProjectId(newProjId);
                      const docs = getDocuments(newProjId);
                      setTargetDocumentId(docs[0]?.id || '');
                    }}
                    className="px-2.5 py-1.5 border border-[#E7D6C4] rounded-xl text-xs bg-white font-bold text-[#3B2A1D] cursor-pointer"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.project_name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#7A6A5A]">Target Document:</span>
                  <select
                    value={targetDocumentId}
                    onChange={e => setTargetDocumentId(e.target.value)}
                    className="px-2.5 py-1.5 border border-[#E7D6C4] rounded-xl text-xs bg-white font-bold text-[#3B2A1D] cursor-pointer min-w-[150px]"
                  >
                    {getDocuments(targetProjectId).map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                    {getDocuments(targetProjectId).length === 0 && (
                      <option value="">(No files - create one first)</option>
                    )}
                  </select>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#8B5A2B] hover:bg-[#A66B37] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Test Cases...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Test Suite
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* SIDEBAR QUICK TEMPLATES */}
        <div className="bg-white border border-[#E7D6C4] rounded-2xl p-5 shadow-xs h-fit space-y-4">
          <div>
            <h2 className="text-xs uppercase font-bold text-[#8B5A2B] tracking-wider">Quick Spec Templates</h2>
            <p className="text-[11px] text-[#7A6A5A] mt-0.5 leading-tight">Click to automatically populate sample specifications to try out the autonomous AI QA engine.</p>
          </div>

          <div className="space-y-2.5">
            {TEMPLATES.map((tmpl, idx) => (
              <div 
                key={idx}
                onClick={() => applyTemplate(tmpl.desc)}
                className="p-3 border border-[#E7D6C4] hover:border-[#8B5A2B] hover:bg-[#FFF8F2]/30 rounded-xl cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#3B2A1D] group-hover:text-[#8B5A2B]">{tmpl.title}</h3>
                  <ArrowRight className="w-3.5 h-3.5 text-[#7A6A5A] group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="text-[10px] text-[#7A6A5A] mt-1 line-clamp-2 leading-relaxed">{tmpl.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* LOADER SPLASH SCREEN WITH ANIMATING LOADING PHASES */}
      {loading && (
        <div className="bg-white border border-[#E7D6C4] rounded-2xl p-12 text-center shadow-xs flex flex-col items-center justify-center space-y-4 animate-fade-in">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-[#FFF4E8] border-t-[#8B5A2B] animate-spin" />
            <Sparkles className="w-5 h-5 text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-[#3B2A1D] animate-pulse">Running Deep QA Analysis</h3>
            <p className="text-xs text-[#7A6A5A] font-mono font-medium max-w-md mx-auto h-4">
              {LOADING_PHASES[loadingPhaseIndex]}
            </p>
          </div>
        </div>
      )}

      {generatedCases.length > 0 && !loading && (
        <div className="bg-white border border-[#E7D6C4] rounded-2xl shadow-xs overflow-hidden p-5 animate-slide-in space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#F5EDE4]">
            <div>
              <h2 className="text-xs uppercase font-bold text-[#8B5A2B] tracking-wider">AI Generated Test Suite Preview ({generatedCases.length} Cases)</h2>
              <p className="text-[11px] text-[#7A6A5A] mt-0.5">The generated suite now opens in the same editable spreadsheet experience as the CSV converter.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleLocalDocxExport}
                className="px-3 py-1.5 border border-[#E7D6C4] hover:bg-[#FFF4E8]/50 text-[#3B2A1D] text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-[#8B5A2B]" />
                Export Word (.docx)
              </button>
              <button
                onClick={handleLocalCsvExport}
                className="px-3 py-1.5 border border-[#E7D6C4] hover:bg-[#FFF4E8]/50 text-[#3B2A1D] text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ClipboardList className="w-3.5 h-3.5 text-green-600" />
                Export CSV Matrix
              </button>
              <button
                onClick={handleImportToProject}
                className="px-4 py-2 bg-[#8B5A2B] hover:bg-[#A66B37] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Import Suite into Suite Projects
              </button>
            </div>
          </div>

          <TestCaseTable
            testCases={generatedCases}
            customColumns={[]}
            onSaveTestCase={handleSaveGeneratedCase}
            onDeleteTestCase={handleDeleteGeneratedCase}
            onDuplicateTestCase={handleDuplicateGeneratedCase}
            onReorderTestCases={handleReorderGeneratedCases}
            onAddCustomColumn={() => {}}
            onDeleteCustomColumn={() => {}}
            selectedRowId={selectedGeneratedRowId}
            onSelectRow={setSelectedGeneratedRowId}
            projectId={targetProjectId}
            documentId={targetDocumentId}
          />
        </div>
      )}

    </div>
  );
}
