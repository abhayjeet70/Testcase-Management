import { AppSettings, TestCaseStatus } from '../types';

const APP_SETTINGS_KEY = 'tc_app_settings';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: 'warm',
  compactMode: false,
  tableDensity: 'comfortable',
  autoSaveEnabled: true,
  autoNumberingEnabled: false,
  defaultStatus: 'Not Tested',
  defaultExportFormat: 'Word',
  exportedByName: 'Lead QA Engineer',
  settingsVersion: 1,
};

export function getAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(APP_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_APP_SETTINGS };
    return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
}

export function saveAppSettings(partial: Partial<AppSettings>): AppSettings {
  const merged = { ...getAppSettings(), ...partial };
  localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(merged));
  applySettingsToDom(merged);
  return merged;
}

export function applySettingsToDom(settings: AppSettings = getAppSettings()): void {
  const root = document.documentElement;
  root.dataset.theme = settings.theme;
  root.dataset.compact = settings.compactMode ? 'true' : 'false';
  root.dataset.tableDensity = settings.tableDensity;
}

export function getDefaultStatus(): TestCaseStatus {
  return getAppSettings().defaultStatus;
}
