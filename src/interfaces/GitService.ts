export interface GitDiff {
  files: ChangedFile[];
  additions: number;
  deletions: number;
  summary: string;
}

export interface ChangedFile {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed";
  additions: number;
  deletions: number;
  diff: string;
}

export interface RepoStatus {
  isRepository: boolean;
  hasChanges: boolean;
  hasStagedChanges: boolean;
  currentBranch: string;
}

export interface ConflictInfo {
  hasConflicts: boolean;
  conflictedFiles: string[];
}

export interface GitService {
  getStagedChanges(): Promise<GitDiff>;
  getRepositoryStatus(): Promise<RepoStatus>;
  isValidRepository(): Promise<boolean>;
  getConflictStatus(): Promise<ConflictInfo>;
}