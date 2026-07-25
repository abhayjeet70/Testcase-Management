import { Project, TestCase, TestCaseDocument, CustomColumn, ActivityLog, DocumentExport, TestCaseStatus, DownloadHistoryEntry, RecycleItem, ProjectModule, Tag, TestCaseTemplate, TestExecution, Bug } from '../types';
import { generateTestCaseNo, formatTestCaseId, getResolvedPrefix, getResolvedModuleCode, isDuplicateTestCaseId } from './testCaseIdGenerator';
import { DEFAULT_TEMPLATES } from '../data/defaultTemplates';
import { getDefaultStatus } from './appSettings';
import { upsertRecord, deleteRecord } from './supabaseSync';

// Storage keys
const PROJECTS_KEY = 'tc_projects';
const DOCUMENTS_KEY = 'tc_documents';
const TEST_CASES_KEY = 'tc_test_cases';
const CUSTOM_COLUMNS_KEY = 'tc_custom_columns';
const LOGS_KEY = 'tc_activity_logs';
const EXPORTS_KEY = 'tc_document_exports';
const DOWNLOAD_HISTORY_KEY = 'tc_download_history';
const RECYCLE_BIN_KEY = 'tc_recycle_bin';
const MODULES_KEY = 'tc_modules';
const TAGS_KEY = 'tc_tags';
const TEMPLATES_KEY = 'tc_templates';
const EXECUTIONS_KEY = 'tc_executions';
const BUGS_KEY = 'tc_bugs';

// Helper to generate IDs
export const generateId = () => Math.random().toString(36).substring(2, 9);

// Initial Seed Data
const DEFAULT_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    project_name: 'SocialNxt Scheduler',
    description: 'Enterprise social media scheduler and calendar integrations.',
    created_at: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    archived: false,
    favorite: true
  },
  {
    id: 'proj-2',
    project_name: 'AI Code Copilot',
    description: 'Autonomous assistant for writing, explaining, and refactoring source code.',
    created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    archived: false,
    favorite: false
  }
];

const DEFAULT_DOCUMENTS: TestCaseDocument[] = [
  {
    id: 'doc-1-1',
    project_id: 'proj-1',
    name: 'Google OAuth & Calendar Sync.docx',
    description: 'Covers core OAuth integrations and event updates.',
    created_at: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: 'doc-1-2',
    project_id: 'proj-1',
    name: 'Offline Post Queuer.docx',
    description: 'Covers service worker network caching and conflict resolution.',
    created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'doc-2-1',
    project_id: 'proj-2',
    name: 'Autonomous Workspace AI.docx',
    description: 'Covers LLM prompt context builders and folder indices.',
    created_at: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  }
];

const DEFAULT_TEST_CASES: TestCase[] = [
  {
    id: 'tc-1',
    project_id: 'proj-1',
    document_id: 'doc-1-1',
    test_case_no: 'TC-001',
    name: 'Google OAuth Feed Connection',
    test_objective: 'Ensure users can securely authenticate and authorize Google Calendar API permissions.',
    test_steps: '<ol><li>Navigate to the Settings > Integrations page.</li><li>Click the <strong>"Connect Google Calendar"</strong> button.</li><li>Enter valid test credentials in the Google Account Popup.</li><li>Approve requested scopes (Calendar Read/Write).</li><li>Verify the system redirects to Dashboard with a success notification.</li></ol>',
    issues: 'Token refresh flow occasionally fails if session is terminated abruptly on secondary devices.',
    status: 'Fixed',
    display_order: 1,
    created_at: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    screenshots: []
  },
  {
    id: 'tc-2',
    project_id: 'proj-1',
    document_id: 'doc-1-1',
    test_case_no: 'TC-002',
    name: 'Drag & Drop Calendar Event Rescheduling Sync',
    test_objective: 'Validate calendar drag operations update event timestamps, refresh UI grids, and trigger correct webhooks.',
    test_steps: '<ol><li>Navigate to the Calendar Scheduler Grid view.</li><li>Locate an active scheduled event card.</li><li>Drag and drop the card to a different date and time block.</li><li>Confirm the card snaps into alignment cleanly.</li><li>Verify a background PATCH api call is fired with the updated timestamp.</li></ol>',
    issues: 'Need to add bounce protection so rapid dragging doesn\'t trigger multiple parallel updates.',
    status: 'In Progress',
    display_order: 2,
    created_at: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    screenshots: []
  },
  {
    id: 'tc-3',
    project_id: 'proj-1',
    document_id: 'doc-1-2',
    test_case_no: 'TC-001',
    name: 'Offline Content Queuer and Synchronizer',
    test_objective: 'Validate network resilience when creating and scheduling posts with active offline states.',
    test_steps: '<ol><li>Toggle browser network mode to <strong>Offline</strong>.</li><li>Attempt to create a new content schedule block.</li><li>Observe the persistent "Offline - Queued Changes" banner.</li><li>Toggle browser network back to <strong>Online</strong>.</li><li>Verify automated synchronization fires and the draft publishes successfully.</li></ol>',
    issues: 'Conflict resolution is currently unhandled if duplicate edits are made from another device simultaneously.',
    status: 'Blocked',
    display_order: 1,
    created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    screenshots: []
  },
  {
    id: 'tc-4',
    project_id: 'proj-2',
    document_id: 'doc-2-1',
    test_case_no: 'TC-001',
    name: 'Contextual Code Explainer Prompting',
    test_objective: 'Verify LLM service can read source files, generate clear modular breakdowns, and handle code syntax highlighting.',
    test_steps: '<ol><li>Select a code block in the editor panel.</li><li>Click the "Explain Code" quick action.</li><li>Check if the overlay modal is rendering.</li><li>Verify the output markdown is clear, structured, and syntactically correct.</li></ol>',
    issues: '',
    status: 'Fixed',
    display_order: 1,
    created_at: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    screenshots: []
  },
  {
    id: 'tc-5',
    project_id: 'proj-2',
    document_id: 'doc-2-1',
    test_case_no: 'TC-002',
    name: 'Multi-file Autonomous Workspace Search',
    test_objective: 'Confirm semantic search operates across multiple directories without triggering rate limits.',
    test_steps: '<ol><li>Enter a broad codebase query (e.g. "auth service").</li><li>Verify search results are indexed by relevance score.</li><li>Confirm system highlights lines containing matching expressions.</li></ol>',
    issues: 'Memory leak detected when reading directories with more than 5,000 files.',
    status: 'Not Fixed',
    display_order: 2,
    created_at: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    screenshots: []
  }
];

const DEFAULT_BUGS: Bug[] = [
  {
    id: 'bug-1',
    title: 'Login page flashes white in dark mode',
    description: 'When loading the login page, it momentarily flashes white before applying the dark theme.',
    severity: 'Medium',
    status: 'In Progress',
    reporterId: 'admin-alice', // We will update this later with actual UUIDs
    projectId: 'proj-1',
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Initialize Storage if empty
export const initializeStorage = () => {
  if (!localStorage.getItem(PROJECTS_KEY)) {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(DEFAULT_PROJECTS));
  }
  if (!localStorage.getItem(DOCUMENTS_KEY)) {
    localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(DEFAULT_DOCUMENTS));
  }
  if (!localStorage.getItem(TEST_CASES_KEY)) {
    localStorage.setItem(TEST_CASES_KEY, JSON.stringify(DEFAULT_TEST_CASES));
  }
  if (!localStorage.getItem(CUSTOM_COLUMNS_KEY)) {
    localStorage.setItem(CUSTOM_COLUMNS_KEY, JSON.stringify([]));
  }
  if (!localStorage.getItem(LOGS_KEY)) {
    const logs: ActivityLog[] = [
      {
        id: generateId(),
        project_id: 'proj-1',
        action: 'Project initialized',
        timestamp: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: generateId(),
        project_id: 'proj-1',
        test_case_id: 'tc-1',
        test_case_no: 'TC-001',
        action: 'Test case created',
        timestamp: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString()
      }
    ];
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  }
  if (!localStorage.getItem(EXPORTS_KEY)) {
    localStorage.setItem(EXPORTS_KEY, JSON.stringify([]));
  }
  if (!localStorage.getItem(DOWNLOAD_HISTORY_KEY)) {
    localStorage.setItem(DOWNLOAD_HISTORY_KEY, JSON.stringify([]));
  }
  if (!localStorage.getItem(RECYCLE_BIN_KEY)) {
    localStorage.setItem(RECYCLE_BIN_KEY, JSON.stringify([]));
  }
  if (!localStorage.getItem(BUGS_KEY)) {
    localStorage.setItem(BUGS_KEY, JSON.stringify(DEFAULT_BUGS));
  }

  // Self-migration for old test cases that don't have document_id
  try {
    const rawCases = localStorage.getItem(TEST_CASES_KEY);
    if (rawCases) {
      const parsedCases: any[] = JSON.parse(rawCases);
      let needsMigration = parsedCases.some(tc => !tc.document_id);
      if (needsMigration) {
        const docsRaw = localStorage.getItem(DOCUMENTS_KEY);
        let docs: TestCaseDocument[] = docsRaw ? JSON.parse(docsRaw) : [];
        const projsRaw = localStorage.getItem(PROJECTS_KEY);
        const projs: Project[] = projsRaw ? JSON.parse(projsRaw) : [];
        
        projs.forEach(p => {
          let hasDoc = docs.some(d => d.project_id === p.id);
          if (!hasDoc) {
            const newDoc: TestCaseDocument = {
              id: 'doc-' + generateId(),
              project_id: p.id,
              name: 'General Module.docx',
              description: 'Auto-migrated default test suite.',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            docs.push(newDoc);
          }
        });
        localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(docs));

        // Link cases to the first doc of their project
        parsedCases.forEach(tc => {
          if (!tc.document_id) {
            const doc = docs.find(d => d.project_id === tc.project_id);
            if (doc) {
              tc.document_id = doc.id;
            } else {
              // Create one on the fly
              const newDoc: TestCaseDocument = {
                id: 'doc-' + generateId(),
                project_id: tc.project_id || 'proj-1',
                name: 'General Module.docx',
                description: 'Auto-migrated default test suite.',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              docs.push(newDoc);
              tc.document_id = newDoc.id;
              tc.project_id = tc.project_id || 'proj-1';
            }
          }
        });
        localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(docs));
        localStorage.setItem(TEST_CASES_KEY, JSON.stringify(parsedCases));
      }
    }
  } catch (err) {
    console.error('Migration failed:', err);
  }

  migrateModules();
  seedTemplatesIfEmpty();
};

const migrateModules = () => {
  if (localStorage.getItem(MODULES_KEY)) return;
  const projects = JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]') as Project[];
  const docs = JSON.parse(localStorage.getItem(DOCUMENTS_KEY) || '[]') as TestCaseDocument[];
  const modules: ProjectModule[] = [];
  const updatedDocs = [...docs];

  projects.forEach((p, pIdx) => {
    const modId = 'mod-' + p.id + '-general';
    modules.push({
      id: modId,
      project_id: p.id,
      name: 'General',
      description: 'Default module',
      module_code: 'GENERAL',
      icon: 'folder',
      color: '#8B5A2B',
      display_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    updatedDocs.forEach((d, i) => {
      if (d.project_id === p.id && !d.module_id) {
        updatedDocs[i] = { ...d, module_id: modId };
      }
    });
  });

  localStorage.setItem(MODULES_KEY, JSON.stringify(modules));
  localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(updatedDocs));
};

const seedTemplatesIfEmpty = () => {
  if (!localStorage.getItem(TEMPLATES_KEY)) {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(DEFAULT_TEMPLATES));
  }
};

// --- PROJECTS ---
export const getProjects = (): Project[] => {
  initializeStorage();
  const data = localStorage.getItem(PROJECTS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveProject = (project: Partial<Project> & { project_name: string }): Project => {
  const projects = getProjects();
  let savedProject: Project;

  if (project.id) {
    projects.forEach((p, idx) => {
      if (p.id === project.id) {
        projects[idx] = {
          ...p,
          ...project,
          updated_at: new Date().toISOString()
        } as Project;
        savedProject = projects[idx];
      }
    });
    savedProject = projects.find(p => p.id === project.id)!;
  } else {
    const newProject: Project = {
      id: 'proj-' + generateId(),
      project_name: project.project_name,
      description: project.description || '',
      version: project.version || '',
      developer: project.developer || '',
      vercel_link: project.vercel_link || '',
      zip_file_name: project.zip_file_name || '',
      zip_file_data: project.zip_file_data || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      archived: false,
      favorite: false
    };
    projects.push(newProject);
    savedProject = newProject;
  }

  // Prevent QuotaExceededError by omitting large zip_file_data from localStorage
  const projectsForLocal = projects.map(p => {
    const { zip_file_data, ...rest } = p;
    return rest as Project;
  });

  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projectsForLocal));
  } catch (e) {
    console.error("Local storage quota exceeded, unable to save project locally:", e);
  }
  addActivityLog(savedProject.id, `Project "${savedProject.project_name}" ${project.id ? 'updated' : 'created'}`);
  
  upsertRecord('tc_projects', savedProject);
  
  return savedProject;
};

export const deleteProject = (id: string, deletedBy: string = 'Current User') => {
  const project = getProjects().find(p => p.id === id);
  if (!project) return;

  const projects = getProjects().filter(p => p.id !== id);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));

  const docs = getDocumentsAll().filter(d => d.project_id !== id);
  localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(docs));

  const testCases = getTestCasesAll().filter(tc => tc.project_id !== id);
  localStorage.setItem(TEST_CASES_KEY, JSON.stringify(testCases));

  const customCols = getCustomColumnsAll().filter(col => col.project_id !== id);
  localStorage.setItem(CUSTOM_COLUMNS_KEY, JSON.stringify(customCols));

  const recycle = getRecycleBin();
  recycle.push({
    id: 'recycle-' + generateId(),
    type: 'project',
    name: project.project_name,
    deletedAt: new Date().toISOString(),
    deletedBy,
    projectId: id,
    payload: { project }
  });
  localStorage.setItem(RECYCLE_BIN_KEY, JSON.stringify(recycle));
  addActivityLog(id, `Deleted project "${project.project_name}"`, undefined, undefined);

  deleteRecord('tc_projects', id);
};

export const duplicateProject = (id: string, newOwnerId?: string): Project => {
  const projects = getProjects();
  const source = projects.find(p => p.id === id);
  if (!source) throw new Error('Source project not found');

  const duplicated: Project = {
    ...source,
    id: 'proj-' + generateId(),
    project_name: `${source.project_name} (Copy)`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    favorite: false,
    owner_id: newOwnerId || source.owner_id
  };
  projects.push(duplicated);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));

  // Duplicate documents
  const sourceDocs = getDocuments(id);
  const allDocs = getDocumentsAll();
  const allCases = getTestCasesAll();
  
  const copiedDocs = sourceDocs.map(doc => {
    const newDocId = 'doc-' + generateId();
    
    // Copy test cases for this specific doc
    const docCases = getTestCases(doc.id);
    const copiedCases = docCases.map(tc => {
      const newTcId = 'tc-' + generateId();
      return {
        ...tc,
        id: newTcId,
        project_id: duplicated.id,
        document_id: newDocId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        screenshots: tc.screenshots.map(s => ({
          ...s,
          id: 'ss-' + generateId(),
          test_case_id: newTcId
        }))
      };
    });
    
    return {
      newDoc: {
        ...doc,
        id: newDocId,
        project_id: duplicated.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      copiedCases
    };
  });

  const newDocsToSave = copiedDocs.map(cd => cd.newDoc);
  const newCasesToSave = copiedDocs.flatMap(cd => cd.copiedCases);

  localStorage.setItem(DOCUMENTS_KEY, JSON.stringify([...allDocs, ...newDocsToSave]));
  localStorage.setItem(TEST_CASES_KEY, JSON.stringify([...allCases, ...newCasesToSave]));

  addActivityLog(duplicated.id, `Duplicated project from "${source.project_name}"`);
  
  upsertRecord('tc_projects', duplicated);
  newDocsToSave.forEach(d => upsertRecord('tc_documents', d));
  newCasesToSave.forEach(tc => upsertRecord('tc_test_cases', tc));

  return duplicated;
};

// --- DOCUMENTS ---
export const getDocumentsAll = (): TestCaseDocument[] => {
  initializeStorage();
  const data = localStorage.getItem(DOCUMENTS_KEY);
  return data ? JSON.parse(data) : [];
};

export const getDocuments = (projectId: string): TestCaseDocument[] => {
  return getDocumentsAll().filter(d => d.project_id === projectId);
};

export const saveDocument = (doc: Partial<TestCaseDocument> & { project_id: string; name: string }): TestCaseDocument => {
  const docs = getDocumentsAll();
  let savedDoc: TestCaseDocument;

  const sanitizedName = doc.name.endsWith('.docx') ? doc.name : doc.name + '.docx';

  if (doc.id) {
    const idx = docs.findIndex(d => d.id === doc.id);
    if (idx !== -1) {
      docs[idx] = {
        ...docs[idx],
        ...doc,
        name: sanitizedName,
        updated_at: new Date().toISOString()
      } as TestCaseDocument;
      savedDoc = docs[idx];
    } else {
      throw new Error('Document not found');
    }
  } else {
    savedDoc = {
      id: 'doc-' + generateId(),
      project_id: doc.project_id,
      name: sanitizedName,
      description: doc.description || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    docs.push(savedDoc);
  }

  localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(docs));
  addActivityLog(savedDoc.project_id, `Created/Updated Test Case File "${savedDoc.name}"`);
  
  upsertRecord('tc_documents', savedDoc);

  // Sync document metadata (developer, link) and highest version up to the parent project
  const projects = getProjects();
  const parentProject = projects.find(p => p.id === savedDoc.project_id);
  if (parentProject) {
    let updated = false;
    
    if (savedDoc.developer_assigned && savedDoc.developer_assigned !== parentProject.developer) {
      parentProject.developer = savedDoc.developer_assigned;
      updated = true;
    }
    
    if (savedDoc.project_link && savedDoc.project_link !== parentProject.vercel_link) {
      parentProject.vercel_link = savedDoc.project_link;
      updated = true;
    }
    
    const projectDocs = docs.filter(d => d.project_id === parentProject.id);
    let maxVersion = 0;
    projectDocs.forEach(d => {
      const match = d.name.match(/V(\d+)/i);
      if (match) {
        const v = parseInt(match[1], 10);
        if (v > maxVersion) maxVersion = v;
      }
    });
    
    const highestVersionStr = maxVersion > 0 ? `v${maxVersion}` : parentProject.version;
    if (highestVersionStr && highestVersionStr !== parentProject.version) {
      parentProject.version = highestVersionStr;
      updated = true;
    }
    
    if (updated) {
      saveProject(parentProject as any);
    }
  }

  return savedDoc;
};

export const deleteDocument = (id: string, deletedBy: string = 'Current User'): void => {
  const doc = getDocumentsAll().find(d => d.id === id);
  if (!doc) return;

  const docs = getDocumentsAll().filter(d => d.id !== id);
  localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(docs));

  const cases = getTestCasesAll().filter(tc => tc.document_id !== id);
  localStorage.setItem(TEST_CASES_KEY, JSON.stringify(cases));

  const recycle = getRecycleBin();
  recycle.push({
    id: 'recycle-' + generateId(),
    type: 'document',
    name: doc.name,
    deletedAt: new Date().toISOString(),
    deletedBy,
    projectId: doc.project_id,
    documentId: id,
    payload: { document: doc }
  });
  localStorage.setItem(RECYCLE_BIN_KEY, JSON.stringify(recycle));
  addActivityLog(doc.project_id, `Moved document "${doc.name}" to recycle bin`);

  deleteRecord('tc_documents', id);
};

export const duplicateDocument = (id: string): TestCaseDocument => {
  const docs = getDocumentsAll();
  const source = docs.find(d => d.id === id);
  if (!source) throw new Error('Source document not found');

  const nameBase = source.name.endsWith('.docx') ? source.name.slice(0, -5) : source.name;
  const duplicated: TestCaseDocument = {
    ...source,
    id: 'doc-' + generateId(),
    name: `${nameBase} (Copy).docx`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  docs.push(duplicated);
  localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(docs));

  // Copy test cases in document
  const sourceCases = getTestCases(id);
  const allCases = getTestCasesAll();
  const copiedCases = sourceCases.map(tc => {
    const newTcId = 'tc-' + generateId();
    return {
      ...tc,
      id: newTcId,
      document_id: duplicated.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      screenshots: tc.screenshots.map(s => ({
        ...s,
        id: 'ss-' + generateId(),
        test_case_id: newTcId
      }))
    };
  });

  localStorage.setItem(TEST_CASES_KEY, JSON.stringify([...allCases, ...copiedCases]));
  addActivityLog(duplicated.project_id, `Duplicated document "${source.name}" to "${duplicated.name}"`);
  
  upsertRecord('tc_documents', duplicated);
  copiedCases.forEach(tc => upsertRecord('tc_test_cases', tc));
  
  return duplicated;
};

// --- TEST CASES ---
export const getTestCasesAll = (): TestCase[] => {
  initializeStorage();
  const data = localStorage.getItem(TEST_CASES_KEY);
  return data ? JSON.parse(data) : [];
};

export const getTestCases = (documentId: string): TestCase[] => {
  return getTestCasesAll()
    .filter(tc => tc.document_id === documentId)
    .sort((a, b) => a.display_order - b.display_order);
};

export const getTestCasesByProject = (projectId: string): TestCase[] => {
  return getTestCasesAll()
    .filter(tc => tc.project_id === projectId)
    .sort((a, b) => a.display_order - b.display_order);
};

export const saveTestCase = (testCase: Partial<TestCase> & { project_id: string; document_id: string }): TestCase => {
  const allCases = getTestCasesAll();
  let savedCase: TestCase;

  if (testCase.id) {
    const idx = allCases.findIndex(tc => tc.id === testCase.id);
    if (idx !== -1) {
      if (testCase.test_case_no && testCase.test_case_no !== allCases[idx].test_case_no) {
        if (isDuplicateTestCaseId(testCase.test_case_no, testCase.document_id, testCase.id)) {
          throw new Error(`Duplicate test case ID: ${testCase.test_case_no}`);
        }
      }
      const prevStatus = allCases[idx].status;
      allCases[idx] = {
        ...allCases[idx],
        ...testCase,
        updated_at: new Date().toISOString()
      } as TestCase;
      savedCase = allCases[idx];

      // Activity logging
      const changedFields: string[] = [];
      const oldTc = allCases[idx];
      
      if (testCase.status !== undefined && oldTc.status !== testCase.status) changedFields.push(`status to "${testCase.status}"`);
      if (testCase.issues !== undefined && oldTc.issues !== testCase.issues) changedFields.push(`issues`);
      if (testCase.test_objective !== undefined && oldTc.test_objective !== testCase.test_objective) changedFields.push(`objective`);
      if (testCase.test_steps !== undefined && oldTc.test_steps !== testCase.test_steps) changedFields.push(`steps`);
      if (testCase.name !== undefined && oldTc.name !== testCase.name) changedFields.push(`name to "${testCase.name}"`);
      if (testCase.screenshots !== undefined && JSON.stringify(oldTc.screenshots) !== JSON.stringify(testCase.screenshots)) changedFields.push(`screenshots`);
      if (testCase.display_order !== undefined && oldTc.display_order !== testCase.display_order) changedFields.push(`display order`);

      if (changedFields.length > 0) {
        addActivityLog(
          savedCase.project_id,
          `Updated test case: changed ${changedFields.join(', ')}`,
          savedCase.id,
          savedCase.test_case_no
        );
      }
    } else {
      // Upsert: Item has an ID but is not in localStorage yet (e.g. from newly generated case or imports)
      const docCases = allCases.filter(tc => tc.document_id === testCase.document_id);
      const maxOrder = docCases.reduce((max, c) => Math.max(max, c.display_order), 0);

      // Auto-generate TestCase Number if blank
      let nextNo = testCase.test_case_no;
      if (!nextNo) {
        nextNo = generateTestCaseNo(testCase.project_id, testCase.document_id, testCase.id);
      }
      if (testCase.test_case_no && isDuplicateTestCaseId(testCase.test_case_no, testCase.document_id, testCase.id)) {
        throw new Error(`Duplicate test case ID: ${testCase.test_case_no}`);
      }

      const newCase: TestCase = {
        id: testCase.id,
        project_id: testCase.project_id,
        document_id: testCase.document_id,
        test_case_no: nextNo,
        name: testCase.name || '',
        test_objective: testCase.test_objective || '',
        test_steps: testCase.test_steps || '<ol><li></li></ol>',
        issues: testCase.issues || '',
        status: testCase.status || getDefaultStatus(),
        display_order: testCase.display_order !== undefined ? testCase.display_order : maxOrder + 1,
        screenshots: testCase.screenshots || [],
        custom_values: testCase.custom_values || {},
        created_at: testCase.created_at || new Date().toISOString(),
        updated_at: testCase.updated_at || new Date().toISOString()
      };
      allCases.push(newCase);
      savedCase = newCase;
      
      addActivityLog(savedCase.project_id, 'Created test case', savedCase.id, savedCase.test_case_no);
    }
  } else {
    // Determine high display order
    const docCases = allCases.filter(tc => tc.document_id === testCase.document_id);
    const maxOrder = docCases.reduce((max, c) => Math.max(max, c.display_order), 0);

    // Auto-generate TestCase Number if blank
    let nextNo = testCase.test_case_no;
    if (!nextNo) {
      nextNo = generateTestCaseNo(testCase.project_id, testCase.document_id);
    }

    const newCase: TestCase = {
      id: 'tc-' + generateId(),
      project_id: testCase.project_id,
      document_id: testCase.document_id,
      test_case_no: nextNo,
      name: testCase.name || '',
      test_objective: testCase.test_objective || '',
      test_steps: testCase.test_steps || '<ol><li></li></ol>',
      issues: testCase.issues || '',
      status: testCase.status || getDefaultStatus(),
      display_order: maxOrder + 1,
      screenshots: testCase.screenshots || [],
      custom_values: testCase.custom_values || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    allCases.push(newCase);
    savedCase = newCase;
    
    addActivityLog(savedCase.project_id, 'Created test case', savedCase.id, savedCase.test_case_no);
  }

  localStorage.setItem(TEST_CASES_KEY, JSON.stringify(allCases));
  
  upsertRecord('tc_test_cases', savedCase);
  
  return savedCase;
};

export const deleteTestCase = (id: string, deletedBy: string = 'Current User') => {
  const allCases = getTestCasesAll();
  const tc = allCases.find(c => c.id === id);
  if (tc) {
    const updated = allCases.filter(c => c.id !== id);
    localStorage.setItem(TEST_CASES_KEY, JSON.stringify(updated));

    const recycle = getRecycleBin();
    recycle.push({
      id: 'recycle-' + generateId(),
      type: 'test_case',
      name: tc.test_case_no,
      deletedAt: new Date().toISOString(),
      deletedBy,
      projectId: tc.project_id,
      documentId: tc.document_id,
      testCaseId: id,
      payload: { testCase: tc }
    });
    localStorage.setItem(RECYCLE_BIN_KEY, JSON.stringify(recycle));

    addActivityLog(tc.project_id, `Deleted testcase`, id, tc.test_case_no);

    deleteRecord('tc_test_cases', id);
  }
};

export const duplicateTestCase = (id: string): TestCase => {
  const allCases = getTestCasesAll();
  const tc = allCases.find(c => c.id === id);
  if (!tc) throw new Error('Source testcase not found');

  // Auto-generate TC Number inside this document
  const nextNo = generateTestCaseNo(tc.project_id, tc.document_id, tc.id);

  const duplicated: TestCase = {
    ...tc,
    id: 'tc-' + generateId(),
    test_case_no: nextNo,
    name: tc.name ? `${tc.name} (Copy)` : '',
    display_order: tc.display_order + 0.1, // sorting helper, we re-normalize orders next
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    screenshots: tc.screenshots.map(s => ({
      ...s,
      id: 'ss-' + generateId(),
      test_case_id: 'tc-' + generateId() // patched next
    }))
  };

  duplicated.screenshots.forEach(s => {
    s.test_case_id = duplicated.id;
  });

  allCases.push(duplicated);
  localStorage.setItem(TEST_CASES_KEY, JSON.stringify(allCases));
  
  // Re-normalize orders
  normalizeOrders(tc.document_id);
  addActivityLog(tc.project_id, `Duplicated testcase from ${tc.test_case_no}`, duplicated.id, duplicated.test_case_no);

  upsertRecord('tc_test_cases', duplicated);

  return getTestCasesAll().find(c => c.id === duplicated.id)!;
};

const normalizeOrders = (documentId: string) => {
  const allCases = getTestCasesAll();
  const docCases = allCases
    .filter(c => c.document_id === documentId)
    .sort((a, b) => a.display_order - b.display_order);

  docCases.forEach((c, idx) => {
    c.display_order = idx + 1;
  });

  // Re-integrate
  const otherCases = allCases.filter(c => c.document_id !== documentId);
  localStorage.setItem(TEST_CASES_KEY, JSON.stringify([...otherCases, ...docCases]));
};

export const reorderTestCases = (documentId: string, reorderedList: TestCase[]) => {
  const allCases = getTestCasesAll();
  const otherCases = allCases.filter(c => c.document_id !== documentId);

  reorderedList.forEach((c, idx) => {
    c.display_order = idx + 1;
  });

  localStorage.setItem(TEST_CASES_KEY, JSON.stringify([...otherCases, ...reorderedList]));
  // Find project id from one of the cases
  const projId = reorderedList[0]?.project_id || 'proj-1';
  addActivityLog(projId, 'Reordered testcase checklist rows');
};

// --- CUSTOM COLUMNS ---
export const getCustomColumnsAll = (): CustomColumn[] => {
  initializeStorage();
  const data = localStorage.getItem(CUSTOM_COLUMNS_KEY);
  return data ? JSON.parse(data) : [];
};

export const getCustomColumns = (projectId: string): CustomColumn[] => {
  return getCustomColumnsAll().filter(col => col.project_id === projectId);
};

export const saveCustomColumn = (col: Partial<CustomColumn> & { project_id: string; name: string; type: CustomColumn['type'] }): CustomColumn => {
  const cols = getCustomColumnsAll();
  let savedCol: CustomColumn;

  if (col.id) {
    const idx = cols.findIndex(c => c.id === col.id);
    if (idx !== -1) {
      cols[idx] = { ...cols[idx], ...col } as CustomColumn;
      savedCol = cols[idx];
    } else {
      throw new Error('Custom column not found');
    }
  } else {
    const newCol: CustomColumn = {
      id: 'col-' + generateId(),
      project_id: col.project_id,
      name: col.name,
      type: col.type,
      options: col.options || []
    };
    cols.push(newCol);
    savedCol = newCol;
  }

  localStorage.setItem(CUSTOM_COLUMNS_KEY, JSON.stringify(cols));
  addActivityLog(savedCol.project_id, `Custom column "${savedCol.name}" added/modified`);
  
  upsertRecord('tc_custom_columns', savedCol);
  
  return savedCol;
};

export const deleteCustomColumn = (id: string, projectId: string) => {
  const cols = getCustomColumnsAll().filter(c => c.id !== id);
  localStorage.setItem(CUSTOM_COLUMNS_KEY, JSON.stringify(cols));

  // Clean values from test cases
  const allCases = getTestCasesAll();
  allCases.forEach(tc => {
    if (tc.project_id === projectId && tc.custom_values) {
      delete tc.custom_values[id];
    }
  });
  localStorage.setItem(TEST_CASES_KEY, JSON.stringify(allCases));
  addActivityLog(projectId, `Deleted custom column`);

  deleteRecord('tc_custom_columns', id);
};

// --- ACTIVITY LOGS ---
export const getActivityLogs = (projectId: string): ActivityLog[] => {
  initializeStorage();
  const data = localStorage.getItem(LOGS_KEY);
  const logs: ActivityLog[] = data ? JSON.parse(data) : [];
  return logs
    .filter(l => l.project_id === projectId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const addActivityLog = (projectId: string, action: string, testCaseId?: string, testCaseNo?: string) => {
  initializeStorage();
  const data = localStorage.getItem(LOGS_KEY);
  const logs: ActivityLog[] = data ? JSON.parse(data) : [];

  const currentUserData = localStorage.getItem('tc_current_user');
  const currentUser = currentUserData ? JSON.parse(currentUserData) : null;

  const newLog: ActivityLog = {
    id: generateId(),
    project_id: projectId,
    test_case_id: testCaseId,
    test_case_no: testCaseNo,
    action,
    timestamp: new Date().toISOString(),
    user_name: currentUser?.name || 'System',
    user_role: currentUser?.role || 'admin'
  };

  logs.push(newLog);
  // Cap at 100 logs per project to keep storage lightweight
  const filtered = logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  localStorage.setItem(LOGS_KEY, JSON.stringify(filtered.slice(0, 500)));
  
  upsertRecord('tc_activity_logs', newLog);
};

// --- DOCUMENT EXPORTS ---
export const getExports = (projectId: string): DocumentExport[] => {
  initializeStorage();
  const data = localStorage.getItem(EXPORTS_KEY);
  const exports: DocumentExport[] = data ? JSON.parse(data) : [];
  return exports.filter(e => e.project_id === projectId);
};

export const addExport = (projectId: string, fileName: string, fileType: DocumentExport['file_type']) => {
  initializeStorage();
  const data = localStorage.getItem(EXPORTS_KEY);
  const exports: DocumentExport[] = data ? JSON.parse(data) : [];

  const newExport: DocumentExport = {
    id: generateId(),
    project_id: projectId,
    file_name: fileName,
    file_type: fileType,
    created_at: new Date().toISOString()
  };

  exports.push(newExport);
  localStorage.setItem(EXPORTS_KEY, JSON.stringify(exports));
  addActivityLog(projectId, `Exported document: ${fileName} (${fileType})`);
};

export const getDownloadHistory = (): DownloadHistoryEntry[] => {
  initializeStorage();
  const data = localStorage.getItem(DOWNLOAD_HISTORY_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveDownloadHistoryEntry = (entry: DownloadHistoryEntry) => {
  initializeStorage();
  const history = getDownloadHistory();
  history.unshift(entry);
  localStorage.setItem(DOWNLOAD_HISTORY_KEY, JSON.stringify(history.slice(0, 200)));
};

export const deleteDownloadHistoryEntry = (id: string) => {
  const history = getDownloadHistory().filter(item => item.id !== id);
  localStorage.setItem(DOWNLOAD_HISTORY_KEY, JSON.stringify(history));
};

export const getRecycleBin = (): RecycleItem[] => {
  initializeStorage();
  const data = localStorage.getItem(RECYCLE_BIN_KEY);
  return data ? JSON.parse(data) : [];
};

export const addRecycleItem = (item: RecycleItem) => {
  const recycle = getRecycleBin();
  recycle.push(item);
  localStorage.setItem(RECYCLE_BIN_KEY, JSON.stringify(recycle));
};

export const restoreRecycleItem = (item: RecycleItem) => {
  const recycle = getRecycleBin().filter(entry => entry.id !== item.id);
  localStorage.setItem(RECYCLE_BIN_KEY, JSON.stringify(recycle));

  if (item.type === 'project' && item.payload?.project) {
    const proj = item.payload.project as Project;
    const projects = getProjects();
    if (!projects.some(p => p.id === proj.id)) {
      projects.push(proj);
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    }
  }

  if (item.type === 'document' && item.payload?.document) {
    const doc = item.payload.document as TestCaseDocument;
    const docs = getDocumentsAll();
    if (!docs.some(d => d.id === doc.id)) {
      docs.push(doc);
      localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(docs));
    }
  }

  if (item.type === 'test_case' && item.payload?.testCase) {
    const tc = item.payload.testCase as TestCase;
    const cases = getTestCasesAll();
    if (!cases.some(c => c.id === tc.id)) {
      cases.push(tc);
      localStorage.setItem(TEST_CASES_KEY, JSON.stringify(cases));
    }
  }
};

export const permanentlyDeleteRecycleItem = (item: RecycleItem) => {
  const recycle = getRecycleBin().filter(entry => entry.id !== item.id);
  localStorage.setItem(RECYCLE_BIN_KEY, JSON.stringify(recycle));
};

// --- MODULES ---
export const getModulesAll = (): ProjectModule[] => {
  initializeStorage();
  const data = localStorage.getItem(MODULES_KEY);
  return data ? JSON.parse(data) : [];
};

export const getModules = (projectId: string): ProjectModule[] => {
  return getModulesAll()
    .filter(m => m.project_id === projectId)
    .sort((a, b) => a.display_order - b.display_order);
};

export const saveModule = (mod: Partial<ProjectModule> & { project_id: string; name: string }): ProjectModule => {
  const modules = getModulesAll();
  let saved: ProjectModule;
  if (mod.id) {
    const idx = modules.findIndex(m => m.id === mod.id);
    if (idx === -1) throw new Error('Module not found');
    modules[idx] = { ...modules[idx], ...mod, updated_at: new Date().toISOString() } as ProjectModule;
    saved = modules[idx];
  } else {
    const projectMods = modules.filter(m => m.project_id === mod.project_id);
    saved = {
      id: 'mod-' + generateId(),
      project_id: mod.project_id,
      name: mod.name,
      description: mod.description || '',
      module_code: mod.module_code,
      icon: mod.icon || 'folder',
      color: mod.color || '#8B5A2B',
      display_order: projectMods.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    modules.push(saved);
  }
  localStorage.setItem(MODULES_KEY, JSON.stringify(modules));
  addActivityLog(saved.project_id, `Module "${saved.name}" saved`);
  
  upsertRecord('tc_modules', saved);
  
  return saved;
};

export const deleteModule = (id: string): void => {
  const modules = getModulesAll();
  const mod = modules.find(m => m.id === id);
  if (!mod) return;
  const general = getModules(mod.project_id).find(m => m.name === 'General' && m.id !== id);
  const fallbackId = general?.id || getModules(mod.project_id).find(m => m.id !== id)?.id;
  const docs = getDocumentsAll().map(d => {
    if (d.module_id === id) return { ...d, module_id: fallbackId };
    return d;
  });
  localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(docs));
  localStorage.setItem(MODULES_KEY, JSON.stringify(modules.filter(m => m.id !== id)));
  addActivityLog(mod.project_id, `Deleted module "${mod.name}"`);

  deleteRecord('tc_modules', id);
};

// --- TAGS ---
const DEFAULT_TAG_COLORS = ['#8B5A2B', '#E67E22', '#27AE60', '#2980B9', '#8E44AD', '#C0392B', '#16A085'];

export const getTagsAll = (): Tag[] => {
  initializeStorage();
  const data = localStorage.getItem(TAGS_KEY);
  return data ? JSON.parse(data) : [];
};

export const getTags = (projectId: string): Tag[] => {
  return getTagsAll().filter(t => t.project_id === projectId);
};

export const seedDefaultTags = (projectId: string): void => {
  const names = ['Regression', 'Smoke', 'Critical', 'UI', 'API', 'Security', 'Performance'];
  const existing = getTags(projectId);
  if (existing.length > 0) return;
  const tags = getTagsAll();
  names.forEach((name, i) => {
    tags.push({
      id: 'tag-' + generateId(),
      project_id: projectId,
      name,
      color: DEFAULT_TAG_COLORS[i % DEFAULT_TAG_COLORS.length],
      created_at: new Date().toISOString(),
    });
  });
  localStorage.setItem(TAGS_KEY, JSON.stringify(tags));
};

export const saveTag = (tag: Partial<Tag> & { project_id: string; name: string }): Tag => {
  const tags = getTagsAll();
  let saved: Tag;
  if (tag.id) {
    const idx = tags.findIndex(t => t.id === tag.id);
    if (idx === -1) throw new Error('Tag not found');
    tags[idx] = { ...tags[idx], ...tag } as Tag;
    saved = tags[idx];
  } else {
    saved = {
      id: 'tag-' + generateId(),
      project_id: tag.project_id,
      name: tag.name,
      color: tag.color || DEFAULT_TAG_COLORS[0],
      created_at: new Date().toISOString(),
    };
    tags.push(saved);
  }
  localStorage.setItem(TAGS_KEY, JSON.stringify(tags));
  return saved;
};

export const deleteTag = (id: string): void => {
  localStorage.setItem(TAGS_KEY, JSON.stringify(getTagsAll().filter(t => t.id !== id)));
  const cases = getTestCasesAll().map(tc => ({
    ...tc,
    tag_ids: (tc.tag_ids || []).filter(tid => tid !== id),
  }));
  localStorage.setItem(TEST_CASES_KEY, JSON.stringify(cases));
};

// --- TEMPLATES ---
export const getTemplates = (): TestCaseTemplate[] => {
  initializeStorage();
  const data = localStorage.getItem(TEMPLATES_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveTemplate = (tpl: Partial<TestCaseTemplate> & { name: string }): TestCaseTemplate => {
  const templates = getTemplates();
  let saved: TestCaseTemplate;
  if (tpl.id) {
    const idx = templates.findIndex(t => t.id === tpl.id);
    if (idx === -1) throw new Error('Template not found');
    templates[idx] = { ...templates[idx], ...tpl, updated_at: new Date().toISOString() } as TestCaseTemplate;
    saved = templates[idx];
  } else {
    saved = {
      id: 'tpl-' + generateId(),
      name: tpl.name,
      moduleName: tpl.moduleName || 'GENERAL',
      defaultStatus: tpl.defaultStatus || getDefaultStatus(),
      priority: tpl.priority || 'Medium',
      testCases: tpl.testCases || [],
      isBuiltIn: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    templates.push(saved);
  }
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  return saved;
};

export const deleteTemplate = (id: string): void => {
  const tpl = getTemplates().find(t => t.id === id);
  if (tpl?.isBuiltIn) throw new Error('Cannot delete built-in template');
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(getTemplates().filter(t => t.id !== id)));
};

export const duplicateTemplate = (id: string): TestCaseTemplate => {
  const source = getTemplates().find(t => t.id === id);
  if (!source) throw new Error('Template not found');
  return saveTemplate({
    ...source,
    id: undefined,
    name: `${source.name} (Copy)`,
    isBuiltIn: false,
    testCases: source.testCases.map(tc => ({ ...tc })),
  });
};

// --- EXECUTIONS ---
export const getExecutionsAll = (): TestExecution[] => {
  initializeStorage();
  const data = localStorage.getItem(EXECUTIONS_KEY);
  return data ? JSON.parse(data) : [];
};

export const getExecutions = (testCaseId: string): TestExecution[] => {
  return getExecutionsAll()
    .filter(e => e.test_case_id === testCaseId)
    .sort((a, b) => b.run_number - a.run_number);
};

export const addExecution = (
  exec: Omit<TestExecution, 'id' | 'run_number'> & { updateCurrentStatus?: boolean }
): TestExecution => {
  const all = getExecutionsAll();
  const existing = all.filter(e => e.test_case_id === exec.test_case_id);
  const run_number = existing.length > 0 ? Math.max(...existing.map(e => e.run_number)) + 1 : 1;
  const saved: TestExecution = {
    ...exec,
    id: 'exec-' + generateId(),
    run_number,
  };
  all.push(saved);
  localStorage.setItem(EXECUTIONS_KEY, JSON.stringify(all));
  if (exec.updateCurrentStatus) {
    const cases = getTestCasesAll();
    const idx = cases.findIndex(c => c.id === exec.test_case_id);
    if (idx !== -1) {
      cases[idx] = { ...cases[idx], status: exec.status, updated_at: new Date().toISOString() };
      localStorage.setItem(TEST_CASES_KEY, JSON.stringify(cases));
    }
  }
  addActivityLog(exec.project_id, `Logged execution run #${run_number}`, exec.test_case_id);
  return saved;
};

// --- RENUMBER ---
export const renumberDocumentTestCases = (documentId: string): void => {
  const cases = getTestCases(documentId);
  if (cases.length === 0) return;
  const projectId = cases[0].project_id;
  const project = getProjects().find(p => p.id === projectId);
  const document = getDocumentsAll().find(d => d.id === documentId);
  if (!project || !document) return;
  const prefix = getResolvedPrefix(project);
  const mod = document.module_id ? getModules(projectId).find(m => m.id === document.module_id) : undefined;
  const moduleCode = getResolvedModuleCode(document, mod);
  cases.forEach((tc, idx) => {
    saveTestCase({ ...tc, test_case_no: formatTestCaseId(prefix, moduleCode, idx + 1) });
  });
};

// --- ARCHIVE ---
export const archiveProject = (id: string): void => {
  const p = getProjects().find(pr => pr.id === id);
  if (!p) return;
  saveProject({ id, project_name: p.project_name, archived: true, archived_at: new Date().toISOString() } as Partial<Project> & { project_name: string });
};

export const restoreProject = (id: string): void => {
  const p = getProjects().find(pr => pr.id === id);
  if (!p) return;
  saveProject({ id, project_name: p.project_name, archived: false, archived_at: undefined } as Partial<Project> & { project_name: string });
};

export const archiveDocument = (id: string): void => {
  const doc = getDocumentsAll().find(d => d.id === id);
  if (!doc) return;
  saveDocument({ ...doc, archived: true, archived_at: new Date().toISOString() });
};

export const restoreDocument = (id: string): void => {
  const doc = getDocumentsAll().find(d => d.id === id);
  if (!doc) return;
  saveDocument({ ...doc, archived: false, archived_at: undefined });
};

// --- BUGS ---
export const getBugsAll = (): Bug[] => {
  try {
    const raw = localStorage.getItem(BUGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveBug = (bug: Bug): void => {
  const bugs = getBugsAll();
  const index = bugs.findIndex(b => b.id === bug.id);
  
  if (index !== -1) {
    bugs[index] = { ...bug, updatedAt: new Date().toISOString() };
  } else {
    bugs.push({ ...bug, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
  
  localStorage.setItem(BUGS_KEY, JSON.stringify(bugs));
  
  const savedBug = bugs.find(b => b.id === bug.id);
  if (savedBug) {
    upsertRecord('tc_bugs', savedBug);
  }
};

export const deleteBug = (id: string): void => {
  const bugs = getBugsAll();
  const updatedBugs = bugs.filter(b => b.id !== id);
  localStorage.setItem(BUGS_KEY, JSON.stringify(updatedBugs));
  
  deleteRecord('tc_bugs', id);
};
