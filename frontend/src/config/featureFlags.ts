// Feature flag types
export interface FeatureFlags {
  previewMode: boolean;
  advancedSettings: boolean;
  analyticsEnabled: boolean;
  autoSave: boolean;
  stepValidation: boolean;
}

// Feature group types
export interface WizardFlags {
  previewMode: boolean;
  stepValidation: boolean;
  autoSave: boolean;
}

export interface SettingsFlags {
  autoSave: boolean;
  advancedSettings: boolean;
}

export interface AnalyticsFlags {
  enabled: boolean;
  analyticsEnabled: boolean;
  trackErrors: boolean;
  trackPerformance: boolean;
}

// Default feature flags configuration
const defaultFlags: FeatureFlags = {
  previewMode: false, // Preview step is disabled by default
  advancedSettings: false, // Advanced settings are disabled by default
  analyticsEnabled: true, // Analytics are enabled by default
  autoSave: true, // Auto-save is enabled by default
  stepValidation: true, // Step validation is enabled by default
};

// Environment-specific overrides (Vite exposes only import.meta.env.VITE_*)
const envOverrides: Partial<FeatureFlags> = {
  previewMode: import.meta.env.VITE_ENABLE_PREVIEW_MODE === 'true',
  advancedSettings: import.meta.env.VITE_ENABLE_ADVANCED_SETTINGS === 'true',
  analyticsEnabled: import.meta.env.VITE_ENABLE_ANALYTICS !== 'false',
  autoSave: import.meta.env.VITE_ENABLE_AUTO_SAVE !== 'false',
  stepValidation: import.meta.env.VITE_ENABLE_STEP_VALIDATION !== 'false',
};

// Merge default flags with environment overrides
export const featureFlags: FeatureFlags = {
  ...defaultFlags,
  ...envOverrides,
};

// Feature flag hooks and utilities
export const isFeatureEnabled = (flag: keyof FeatureFlags): boolean => {
  return featureFlags[flag];
};

export const getFeatureFlags = (): FeatureFlags => {
  return { ...featureFlags };
};

// Feature flag groups
export const featureGroups = {
  // Group flags by feature area
  wizard: {
    previewMode: featureFlags.previewMode,
    stepValidation: featureFlags.stepValidation,
    autoSave: featureFlags.autoSave,
  } as WizardFlags,
  settings: {
    autoSave: featureFlags.autoSave,
    advancedSettings: featureFlags.advancedSettings,
  } as SettingsFlags,
  analytics: {
    enabled: featureFlags.analyticsEnabled,
    analyticsEnabled: featureFlags.analyticsEnabled,
    trackErrors: featureFlags.analyticsEnabled,
    trackPerformance: featureFlags.analyticsEnabled,
  } as AnalyticsFlags,
} as const;

// Type for feature group names
export type FeatureGroup = keyof typeof featureGroups;

// Get flags for a specific feature group
export const getFeatureGroup = <T extends FeatureGroup>(group: T): typeof featureGroups[T] => {
  return featureGroups[group];
};

// Development utilities (Vite: import.meta.env.DEV)
if (import.meta.env.DEV) {
  // Expose feature flags to window for development debugging
  (window as any).__FEATURE_FLAGS__ = featureFlags;
  console.log('Feature Flags:', featureFlags);
}

export default featureFlags; 