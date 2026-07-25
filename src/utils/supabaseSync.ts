import { supabase } from '../lib/supabase';
import { 
  Project, TestCaseDocument, TestCase, CustomColumn, 
  ActivityLog, ProjectModule, Bug 
} from '../types';

// The local storage keys we will hydrate
const PROJECTS_KEY = 'tc_projects';
const DOCUMENTS_KEY = 'tc_documents';
const TEST_CASES_KEY = 'tc_test_cases';
const CUSTOM_COLUMNS_KEY = 'tc_custom_columns';
const LOGS_KEY = 'tc_activity_logs';
const MODULES_KEY = 'tc_modules';
const BUGS_KEY = 'tc_bugs';

/**
 * Helper to write directly to localStorage
 */
const writeLocal = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving ${key} to localStorage`, e);
  }
};

/**
 * Hydrates all local storage caches from the Supabase database.
 * Call this exactly once during App initialization when the user is authenticated.
 */
export const hydrateFromSupabase = async (): Promise<boolean> => {
  try {
    // We run these in parallel to make startup fast
    const [
      { data: projects },
      { data: modules },
      { data: documents },
      { data: testCases },
      { data: customColumns },
      { data: activityLogs },
      { data: bugs }
    ] = await Promise.all([
      supabase.from('tc_projects').select('*'),
      supabase.from('tc_modules').select('*'),
      supabase.from('tc_documents').select('*'),
      supabase.from('tc_test_cases').select('*'),
      supabase.from('tc_custom_columns').select('*'),
      supabase.from('tc_activity_logs').select('*'),
      supabase.from('tc_bugs').select('*')
    ]);

    // If Supabase is completely empty but we have local projects, push local data UP to Supabase
    // This is a one-time migration for existing users
    if (projects && projects.length === 0) {
      const localProjects = localStorage.getItem(PROJECTS_KEY);
      if (localProjects && JSON.parse(localProjects).length > 0) {
        console.log("Supabase is empty. Migrating local data to cloud...");
        const lProjects = JSON.parse(localProjects);
        const lModules = JSON.parse(localStorage.getItem(MODULES_KEY) || '[]');
        const lDocs = JSON.parse(localStorage.getItem(DOCUMENTS_KEY) || '[]');
        const lCases = JSON.parse(localStorage.getItem(TEST_CASES_KEY) || '[]');
        const lCols = JSON.parse(localStorage.getItem(CUSTOM_COLUMNS_KEY) || '[]');
        const lLogs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
        const lBugs = JSON.parse(localStorage.getItem(BUGS_KEY) || '[]');

        for (const p of lProjects) await upsertRecord('tc_projects', p);
        for (const m of lModules) await upsertRecord('tc_modules', m);
        for (const d of lDocs) await upsertRecord('tc_documents', d);
        for (const tc of lCases) await upsertRecord('tc_test_cases', tc);
        for (const c of lCols) await upsertRecord('tc_custom_columns', c);
        for (const l of lLogs) await upsertRecord('tc_activity_logs', l);
        for (const b of lBugs) await upsertRecord('tc_bugs', b); // upsertRecord already maps camelCase

        return true;
      }
    }

    if (projects) {
      const projectsForLocal = projects.map((p: any) => {
        const { zip_file_data, ...rest } = p;
        return rest;
      });
      writeLocal(PROJECTS_KEY, projectsForLocal);
    }
    if (modules) writeLocal(MODULES_KEY, modules);
    if (documents) {
      // Merge local custom fields since they don't exist in Supabase schema
      const localDocsStr = localStorage.getItem(DOCUMENTS_KEY);
      if (localDocsStr) {
        try {
          const localDocs = JSON.parse(localDocsStr);
          const mergedDocs = documents.map((d: any) => {
            const lDoc = localDocs.find((ld: any) => ld.id === d.id);
            if (lDoc) {
              return {
                ...d,
                project_link: lDoc.project_link,
                developer_assigned: lDoc.developer_assigned
              };
            }
            return d;
          });
          writeLocal(DOCUMENTS_KEY, mergedDocs);
        } catch(e) {
          writeLocal(DOCUMENTS_KEY, documents);
        }
      } else {
        writeLocal(DOCUMENTS_KEY, documents);
      }
    }
    if (testCases) writeLocal(TEST_CASES_KEY, testCases);
    if (customColumns) writeLocal(CUSTOM_COLUMNS_KEY, customColumns);
    if (activityLogs) writeLocal(LOGS_KEY, activityLogs);
    
    if (bugs) {
      // Map snake_case from DB to camelCase for local storage
      const mappedBugs = bugs.map((b: any) => ({
        id: b.id,
        title: b.title,
        description: b.description,
        severity: b.severity,
        status: b.status,
        assigneeId: b.assignee_id,
        reporterId: b.reporter_id,
        projectId: b.project_id,
        moduleId: b.module_id,
        stepsToReproduce: b.steps_to_reproduce,
        expectedResult: b.expected_result,
        actualResult: b.actual_result,
        environment: b.environment,
        createdAt: b.created_at,
        updatedAt: b.updated_at
      }));
      writeLocal(BUGS_KEY, mappedBugs);
    }

    return true;
  } catch (error) {
    console.error('Failed to hydrate local storage from Supabase:', error);
    return false;
  }
};

/**
 * Generic Upsert: Sends a record to Supabase in the background
 */
export const upsertRecord = async (table: string, data: any) => {
  try {
    let payload = { ...data };

    // Map camelCase to snake_case for bugs
    if (table === 'tc_bugs') {
      payload = {
        id: data.id,
        title: data.title,
        description: data.description,
        severity: data.severity,
        status: data.status,
        assignee_id: data.assigneeId,
        reporter_id: data.reporterId,
        project_id: data.projectId,
        module_id: data.moduleId,
        steps_to_reproduce: data.stepsToReproduce,
        expected_result: data.expectedResult,
        actual_result: data.actualResult,
        environment: data.environment,
        created_at: data.createdAt,
        updated_at: data.updatedAt
      };
    }

    // Fire and forget
    const { error } = await supabase.from(table).upsert(payload, { onConflict: 'id' });
    if (error) {
      console.error(`Background Sync Error upserting to ${table}:`, error.message);
      // Show exact error to the user to debug silent failures
      window.alert(`Supabase Sync Error (${table}): ${error.message}\nDetails: ${error.details || ''}\nHint: ${error.hint || ''}`);
    }
  } catch (error: any) {
    console.error(`Background Sync Exception in ${table}:`, error);
    window.alert(`Supabase Exception (${table}): ${error.message || 'Unknown error'}`);
  }
};

/**
 * Generic Delete: Deletes a record from Supabase in the background
 */
export const deleteRecord = async (table: string, id: string) => {
  try {
    // Fire and forget
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      console.error(`Background Sync Error deleting from ${table}:`, error.message);
    }
  } catch (error) {
    console.error(`Background Sync Exception deleting from ${table}:`, error);
  }
};
