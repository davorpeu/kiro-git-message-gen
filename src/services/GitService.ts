import * as vscode from "vscode";
import { simpleGit, SimpleGit, DiffResult, StatusResult } from "simple-git";
import {
  GitService,
  GitDiff,
  ChangedFile,
  RepoStatus,
  ConflictInfo,
} from "../interfaces/GitService";

/**
 * Implementation of GitService for handling git operations
 * Provides methods to detect repository status, staged changes, and conflicts
 */
export class GitServiceImpl implements GitService {
  private git: SimpleGit;
  private workspaceRoot: string;

  constructor(workspaceRoot?: string) {
    this.workspaceRoot = workspaceRoot || this.getWorkspaceRoot();
    this.git = simpleGit(this.workspaceRoot);
  }

  /**
   * Get the current workspace root directory
   */
  private getWorkspaceRoot(): string {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      throw new Error("No workspace folder is open");
    }
    return workspaceFolders[0].uri.fsPath;
  }

  /**
   * Check if the current directory is a valid git repository
   */
  async isValidRepository(): Promise<boolean> {
    try {
      await this.git.status();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get comprehensive repository status information
   */
  async getRepositoryStatus(): Promise<RepoStatus> {
    try {
      const isRepo = await this.isValidRepository();
      if (!isRepo) {
        return {
          isRepository: false,
          hasChanges: false,
          hasStagedChanges: false,
          currentBranch: "",
        };
      }

      const status: StatusResult = await this.git.status();
      const currentBranch = status.current || "HEAD";

      const hasChanges = status.files.length > 0;
      const hasStagedChanges = status.staged.length > 0;

      return {
        isRepository: true,
        hasChanges,
        hasStagedChanges,
        currentBranch,
      };
    } catch (error) {
      throw new Error(
        `Failed to get repository status: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Get all changes (staged + unstaged) with detailed diff information
   */
  async getAllChanges(): Promise<GitDiff> {
    try {
      const isRepo = await this.isValidRepository();
      if (!isRepo) {
        throw new Error("Not a git repository");
      }

      const status: StatusResult = await this.git.status();
      if (status.files.length === 0) {
        return {
          files: [],
          additions: 0,
          deletions: 0,
          summary: "No changes",
        };
      }

      // Get diff for all changes (staged + unstaged)
      const diffResult: string = await this.git.diff(["HEAD", "--numstat"]);

      const files: ChangedFile[] = [];
      let totalAdditions = 0;
      let totalDeletions = 0;

      // Parse numstat output to get file statistics
      const numstatLines = diffResult
        .split("\n")
        .filter((line: string) => line.trim());

      for (const changedFile of status.files) {
        const filePath =
          typeof changedFile === "string" ? changedFile : changedFile.path;
        const numstatLine = numstatLines.find((line: string) =>
          line.endsWith(filePath)
        );
        let additions = 0;
        let deletions = 0;

        if (numstatLine) {
          const parts = numstatLine.split("\t");
          additions = parseInt(parts[0]) || 0;
          deletions = parseInt(parts[1]) || 0;
        }

        // Get individual file diff
        const fileDiff = await this.getFileDiffAll(filePath);

        const changedFileObj: ChangedFile = {
          path: filePath,
          status: this.getFileStatusAll(filePath, status),
          additions,
          deletions,
          diff: fileDiff,
        };

        files.push(changedFileObj);
        totalAdditions += additions;
        totalDeletions += deletions;
      }

      return {
        files,
        additions: totalAdditions,
        deletions: totalDeletions,
        summary: this.generateSummary(files, totalAdditions, totalDeletions),
      };
    } catch (error) {
      throw new Error(
        `Failed to get all changes: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Get staged changes with detailed diff information
   */
  async getStagedChanges(): Promise<GitDiff> {
    try {
      const isRepo = await this.isValidRepository();
      if (!isRepo) {
        throw new Error("Not a git repository");
      }

      const status: StatusResult = await this.git.status();
      if (status.staged.length === 0) {
        return {
          files: [],
          additions: 0,
          deletions: 0,
          summary: "No staged changes",
        };
      }

      // Get diff for staged changes
      const diffResult: string = await this.git.diff(["--cached", "--numstat"]);
      const diffText = await this.git.diff(["--cached"]);

      const files: ChangedFile[] = [];
      let totalAdditions = 0;
      let totalDeletions = 0;

      // Parse numstat output to get file statistics
      const numstatLines = diffResult
        .split("\n")
        .filter((line: string) => line.trim());

      for (const stagedFile of status.staged) {
        const numstatLine = numstatLines.find((line: string) =>
          line.endsWith(stagedFile)
        );
        let additions = 0;
        let deletions = 0;

        if (numstatLine) {
          const parts = numstatLine.split("\t");
          additions = parseInt(parts[0]) || 0;
          deletions = parseInt(parts[1]) || 0;
        }

        // Get individual file diff
        const fileDiff = await this.getFileDiff(stagedFile);

        const changedFile: ChangedFile = {
          path: stagedFile,
          status: this.getFileStatus(stagedFile, status),
          additions,
          deletions,
          diff: fileDiff,
        };

        files.push(changedFile);
        totalAdditions += additions;
        totalDeletions += deletions;
      }

      return {
        files,
        additions: totalAdditions,
        deletions: totalDeletions,
        summary: this.generateSummary(files, totalAdditions, totalDeletions),
      };
    } catch (error) {
      throw new Error(
        `Failed to get staged changes: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Get diff for a specific file (all changes)
   */
  private async getFileDiffAll(filePath: string): Promise<string> {
    try {
      return await this.git.diff(["HEAD", filePath]);
    } catch (error) {
      return `Error getting diff for ${filePath}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
    }
  }

  /**
   * Get diff for a specific file (staged only)
   */
  private async getFileDiff(filePath: string): Promise<string> {
    try {
      return await this.git.diff(["--cached", filePath]);
    } catch (error) {
      return `Error getting diff for ${filePath}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
    }
  }

  /**
   * Determine the status of a file based on git status (all changes)
   */
  private getFileStatusAll(
    filePath: string,
    status: StatusResult
  ): "added" | "modified" | "deleted" | "renamed" {
    // Check different status arrays (includes both staged and unstaged)
    if (
      status.created.includes(filePath) ||
      status.not_added.includes(filePath)
    ) {
      return "added";
    }
    if (status.deleted.includes(filePath)) {
      return "deleted";
    }
    if (status.renamed.some((rename) => rename.to === filePath)) {
      return "renamed";
    }
    // Default to modified for any other changes
    return "modified";
  }

  /**
   * Determine the status of a file based on git status (staged only)
   */
  private getFileStatus(
    filePath: string,
    status: StatusResult
  ): "added" | "modified" | "deleted" | "renamed" {
    // Check different status arrays
    if (status.created.includes(filePath)) {
      return "added";
    }
    if (status.deleted.includes(filePath)) {
      return "deleted";
    }
    if (status.renamed.some((rename) => rename.to === filePath)) {
      return "renamed";
    }
    // Default to modified for staged files
    return "modified";
  }

  /**
   * Generate a summary of changes
   */
  private generateSummary(
    files: ChangedFile[],
    additions: number,
    deletions: number
  ): string {
    const fileCount = files.length;
    if (fileCount === 0) {
      return "No changes";
    }

    const fileText = fileCount === 1 ? "file" : "files";
    const changeText = [];

    if (additions > 0) {
      changeText.push(`${additions} addition${additions === 1 ? "" : "s"}`);
    }
    if (deletions > 0) {
      changeText.push(`${deletions} deletion${deletions === 1 ? "" : "s"}`);
    }

    const changeDescription =
      changeText.length > 0 ? ` (${changeText.join(", ")})` : "";
    return `${fileCount} ${fileText} changed${changeDescription}`;
  }

  /**
   * Check for merge conflicts in the repository
   */
  async getConflictStatus(): Promise<ConflictInfo> {
    try {
      const isRepo = await this.isValidRepository();
      if (!isRepo) {
        return {
          hasConflicts: false,
          conflictedFiles: [],
        };
      }

      const status: StatusResult = await this.git.status();
      const conflictedFiles = status.conflicted || [];

      return {
        hasConflicts: conflictedFiles.length > 0,
        conflictedFiles,
      };
    } catch (error) {
      throw new Error(
        `Failed to get conflict status: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
