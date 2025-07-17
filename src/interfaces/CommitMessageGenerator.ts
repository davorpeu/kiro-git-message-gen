export enum CommitType {
  FEAT = "feat",
  FIX = "fix",
  DOCS = "docs",
  STYLE = "style",
  REFACTOR = "refactor",
  TEST = "test",
  CHORE = "chore",
}

export interface GenerationOptions {
  includeScope: boolean;
  commitType?: string;
  customTemplate?: string;
  maxLength: number;
}

export interface CommitMessage {
  subject: string;
  body?: string;
  type: string;
  scope?: string;
  isConventional: boolean;
}

export interface CommitAnalysis {
  suggestedType: CommitType;
  suggestedScope?: string;
  changeDescription: string;
  impactLevel: "minor" | "moderate" | "major";
  affectedAreas: string[];
  confidence: number;
}

export interface ChangeAnalysis {
  commitType: CommitType;
  scope?: string;
  description: string;
  impactLevel: "minor" | "moderate" | "major";
  fileTypes: string[];
}

export interface CommitMessageGenerator {
  generateMessage(options: GenerationOptions): Promise<CommitMessage>;
  validateStagedChanges(): Promise<boolean>;
  analyzeChanges(diff: import('./GitService').GitDiff): ChangeAnalysis;
}