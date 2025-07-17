import { GitDiff } from './GitService';
import { CommitType, ChangeAnalysis } from './CommitMessageGenerator';

export interface ChangeAnalysisService {
  analyzeChanges(diff: GitDiff): ChangeAnalysis;
  inferCommitType(files: string[], changes: { additions: number; deletions: number }[]): CommitType;
  detectScope(files: string[]): string | undefined;
  categorizeFilesByType(files: string[]): Record<string, string[]>;
  assessImpactLevel(additions: number, deletions: number, fileCount: number): "minor" | "moderate" | "major";
}

export interface FileTypePattern {
  pattern: RegExp;
  category: string;
  commitType: CommitType;
  weight: number;
}

export interface ScopePattern {
  pattern: RegExp;
  scope: string;
  priority: number;
}