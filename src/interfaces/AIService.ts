import { GitDiff } from './GitService';
import { UserPreferences } from './Configuration';

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  isAvailable: boolean;
}

export interface ChangeContext {
  diff: GitDiff;
  preferences: UserPreferences;
  projectContext?: ProjectInfo;
}

export interface ProjectInfo {
  name: string;
  type: string;
  framework?: string;
  language: string;
}

export interface AIService {
  getCurrentModel(): Promise<AIModel>;
  generateCommitMessage(prompt: string, context: ChangeContext): Promise<string>;
  isAvailable(): Promise<boolean>;
}