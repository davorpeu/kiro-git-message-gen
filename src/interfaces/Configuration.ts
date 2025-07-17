import { CommitType } from './CommitMessageGenerator';

export interface UserPreferences {
  commitStyle: "conventional" | "custom";
  includeBody: boolean;
  customTypes: CommitType[];
  templates: Record<string, string>;
  analysisSettings: AnalysisSettings;
}

export interface AnalysisSettings {
  enableFileTypeAnalysis: boolean;
  enableScopeInference: boolean;
  enableImpactAnalysis: boolean;
}

export interface ConfigurationManager {
  getUserPreferences(): Promise<UserPreferences>;
  updatePreferences(preferences: Partial<UserPreferences>): Promise<void>;
  getDefaultPreferences(): UserPreferences;
  validateConfiguration(config: any): boolean;
}