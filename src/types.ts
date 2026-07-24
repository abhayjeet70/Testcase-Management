export type TestCaseStatus = 'Fixed' | 'Not Fixed' | 'In Progress' | 'Blocked' | 'Not Tested';
export type ThemeMode = 'warm' | 'dark';
export type TableDensity = 'compact' | 'comfortable' | 'spacious';
export type DefaultExportFormat = 'Word' | 'CSV';
export type TemplatePriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type ScreenshotSlot = 'primary' | 'comparison_original' | 'comparison_updated';
export type RecentItemType = 'project' | 'document' | 'template';

export interface Project {
  id: string;
  project_name: string;
  description?: string;
  id_prefix?: string;
  created_at: string;
  updated_at: string;
  archived: boolean;
  archived_at?: string;
  favorite?: boolean;
  pinned?: boolean;
  pinned_at?: string;
}

export interface ProjectModule {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  module_code?: string;
  icon?: string;
  color?: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface TestCaseDocument {
  id: string;
  project_id: string;
  module_id?: string;
  name: string;
  description?: string;
  module_code?: string;
  project_link?: string;
  developer_assigned?: string;
  created_at: string;
  updated_at: string;
  archived?: boolean;
  archived_at?: string;
  favorite?: boolean;
  pinned?: boolean;
  pinned_at?: string;
}

export interface Tag {
  id: string;
  project_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Screenshot {
  id: string;
  test_case_id: string;
  slot?: ScreenshotSlot;
  image_url: string;
  original_image_url?: string;
  storage_path?: string;
  created_at: string;
  updated_at?: string;
}

export interface TestCase {
  id: string;
  project_id: string;
  document_id: string;
  test_case_no: string;
  name: string;
  test_objective: string;
  test_steps: string;
  issues: string;
  status: TestCaseStatus;
  display_order: number;
  tag_ids?: string[];
  created_at: string;
  updated_at: string;
  screenshots: Screenshot[];
  custom_values?: Record<string, string>;
}

export interface TestExecution {
  id: string;
  test_case_id: string;
  project_id: string;
  document_id: string;
  run_number: number;
  executed_at: string;
  tester_name: string;
  status: TestCaseStatus;
  remarks?: string;
  time_taken_minutes?: number;
}

export interface TemplateTestCaseItem {
  name: string;
  test_objective: string;
  test_steps: string;
  issues?: string;
  status?: TestCaseStatus;
  priority?: TemplatePriority;
}

export interface TestCaseTemplate {
  id: string;
  name: string;
  moduleName: string;
  defaultStatus: TestCaseStatus;
  priority: TemplatePriority;
  testCases: TemplateTestCaseItem[];
  isBuiltIn?: boolean;
  favorite?: boolean;
  pinned?: boolean;
  pinned_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateExportBundle {
  version: 1;
  exportedAt: string;
  templates: TestCaseTemplate[];
}

export interface CustomColumn {
  id: string;
  project_id: string;
  name: string;
  type: 'Text' | 'Textarea' | 'Rich Text' | 'Dropdown' | 'Checkbox' | 'Number' | 'Date' | 'Image';
  options?: string[];
}

export interface ActivityLog {
  id: string;
  project_id: string;
  test_case_id?: string;
  test_case_no?: string;
  action: string;
  timestamp: string;
}

export interface DownloadHistoryEntry {
  id: string;
  projectId: string;
  projectName: string;
  documentId?: string;
  documentName?: string;
  downloadedBy: string;
  downloadedAt: string;
  format: 'Word' | 'PDF' | 'CSV';
  caseCount: number;
  fileSize: string;
  generatedFileName: string;
  testCases?: TestCase[];
}

export interface RecycleItem {
  id: string;
  type: 'project' | 'document' | 'test_case' | 'screenshot';
  name: string;
  deletedAt: string;
  deletedBy: string;
  projectId?: string;
  documentId?: string;
  testCaseId?: string;
  payload: Record<string, unknown>;
}

export interface DocumentExport {
  id: string;
  project_id: string;
  file_name: string;
  file_type: 'Word' | 'PDF' | 'CSV' | 'Excel';
  created_at: string;
}

export interface RecentItem {
  type: RecentItemType;
  id: string;
  label: string;
  projectId?: string;
  projectName?: string;
  moduleName?: string;
  openedAt: string;
}

export interface AppSettings {
  theme: ThemeMode;
  compactMode: boolean;
  tableDensity: TableDensity;
  autoSaveEnabled: boolean;
  autoNumberingEnabled: boolean;
  defaultStatus: TestCaseStatus;
  defaultExportFormat: DefaultExportFormat;
  exportedByName: string;
  companyName?: string;
  companyLogoBase64?: string;
  defaultTesterName?: string;
  settingsVersion: number;
}

export interface HistoryEntry {
  id: string;
  documentId: string;
  type: string;
  timestamp: number;
  payload: Record<string, unknown>;
  inverse: Record<string, unknown>;
}

// --- NEW TYPES FOR BUG TRACKER & AUTH ---

export type UserRole = 'admin' | 'team_lead' | 'developer' | 'tester' | 'intern';
export type BugStatus = 'New' | 'Assigned' | 'In Progress' | 'Fixed' | 'Verification' | 'Closed' | 'Reopened';
export type BugSeverity = 'Critical' | 'High' | 'Medium' | 'Low';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
  isActive: boolean;
}

export interface Bug {
  id: string;
  title: string;
  description: string;
  severity: BugSeverity;
  status: BugStatus;
  assigneeId?: string;
  reporterId: string;
  projectId: string;
  moduleId?: string;
  stepsToReproduce?: string;
  expectedResult?: string;
  actualResult?: string;
  environment?: string;
  screenshots?: Screenshot[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolution?: string;
}

export interface Comment {
  id: string;
  text: string;
  authorId: string;
  entityType: 'bug' | 'testcase';
  entityId: string;
  createdAt: string;
  mentions?: string[];
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface TestPlan {
  id: string;
  projectId: string;
  name: string;
  assigneeIds: string[];
  dueDate?: string;
  testCaseIds: string[];
  status: 'Draft' | 'Active' | 'Completed';
}
