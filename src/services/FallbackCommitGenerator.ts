import { GitDiff, ChangedFile } from "../interfaces/GitService";
import {
  CommitMessage,
  CommitType,
  GenerationOptions,
} from "../interfaces/CommitMessageGenerator";
import { UserPreferences } from "../interfaces/Configuration";

/**
 * Fallback commit message generator that works without AI
 * Uses template-based generation and file analysis
 */
export class FallbackCommitGenerator {
  private userPreferences: UserPreferences;

  constructor(userPreferences: UserPreferences) {
    this.userPreferences = userPreferences;
  }

  /**
   * Generate commit message using template-based approach
   */
  generateMessage(diff: GitDiff, options: GenerationOptions): CommitMessage {
    // Analyze changes to determine commit type and scope
    const analysis = this.analyzeChanges(diff);

    // Generate description based on file changes
    const description = this.generateDescription(diff, analysis);

    // Format as conventional commit if required
    const subject = this.formatSubject(
      analysis.type,
      analysis.scope,
      description,
      options
    );

    // Generate body if requested
    const body = this.userPreferences.includeBody
      ? this.generateBody(diff, analysis)
      : undefined;

    return {
      subject: this.truncateSubject(subject, options.maxLength),
      type: analysis.type,
      scope: analysis.scope,
      body,
      isConventional: this.userPreferences.commitStyle === "conventional",
    };
  }

  /**
   * Analyze changes to determine commit type and scope
   */
  private analyzeChanges(diff: GitDiff): { type: string; scope?: string } {
    const files = diff.files;

    // Determine commit type based on file patterns and changes
    let type = "chore"; // default
    let scope: string | undefined;

    // Priority order for commit types
    if (this.hasTestFiles(files)) {
      type = "test";
    } else if (this.hasDocumentationFiles(files)) {
      type = "docs";
    } else if (this.hasConfigFiles(files)) {
      type = "chore";
    } else if (this.hasNewFiles(files)) {
      type = "feat";
    } else if (this.hasBugFixPatterns(diff)) {
      type = "fix";
    } else if (this.hasStyleChanges(files)) {
      type = "style";
    } else if (this.hasRefactorPatterns(diff)) {
      type = "refactor";
    } else if (files.some((f) => f.status === "modified")) {
      type = "feat"; // Default for modifications
    }

    // Determine scope based on file paths
    scope = this.determineScope(files);

    return { type, scope };
  }

  /**
   * Check if changes include test files
   */
  private hasTestFiles(files: ChangedFile[]): boolean {
    return files.some(
      (file) =>
        file.path.includes("test") ||
        file.path.includes("spec") ||
        file.path.includes("__tests__") ||
        file.path.endsWith(".test.ts") ||
        file.path.endsWith(".test.js") ||
        file.path.endsWith(".spec.ts") ||
        file.path.endsWith(".spec.js")
    );
  }

  /**
   * Check if changes include documentation files
   */
  private hasDocumentationFiles(files: ChangedFile[]): boolean {
    return files.some(
      (file) =>
        file.path.endsWith(".md") ||
        file.path.includes("docs/") ||
        file.path.includes("documentation/") ||
        file.path.includes("README")
    );
  }

  /**
   * Check if changes include configuration files
   */
  private hasConfigFiles(files: ChangedFile[]): boolean {
    return files.some(
      (file) =>
        file.path.includes("package.json") ||
        file.path.includes("tsconfig.json") ||
        file.path.includes("webpack.config") ||
        file.path.includes(".config.") ||
        file.path.includes("settings.json") ||
        file.path.startsWith(".") ||
        file.path.includes("Dockerfile") ||
        file.path.includes("docker-compose")
    );
  }

  /**
   * Check if changes include new files
   */
  private hasNewFiles(files: ChangedFile[]): boolean {
    return files.some((file) => file.status === "added");
  }

  /**
   * Check for bug fix patterns in diff content
   */
  private hasBugFixPatterns(diff: GitDiff): boolean {
    const diffContent = diff.files
      .map((f) => f.diff)
      .join("\n")
      .toLowerCase();

    const bugFixKeywords = [
      "fix",
      "bug",
      "error",
      "issue",
      "problem",
      "crash",
      "exception",
      "null",
      "undefined",
      "validation",
      "check",
      "guard",
      "safety",
    ];

    return bugFixKeywords.some((keyword) => diffContent.includes(keyword));
  }

  /**
   * Check for style-only changes
   */
  private hasStyleChanges(files: ChangedFile[]): boolean {
    return files.some(
      (file) =>
        file.path.endsWith(".css") ||
        file.path.endsWith(".scss") ||
        file.path.endsWith(".sass") ||
        file.path.endsWith(".less") ||
        file.path.includes("styles/") ||
        file.path.includes("styling/")
    );
  }

  /**
   * Check for refactoring patterns
   */
  private hasRefactorPatterns(diff: GitDiff): boolean {
    const diffContent = diff.files
      .map((f) => f.diff)
      .join("\n")
      .toLowerCase();

    const refactorKeywords = [
      "refactor",
      "restructure",
      "reorganize",
      "cleanup",
      "simplify",
      "extract",
      "rename",
      "move",
      "split",
    ];

    return refactorKeywords.some((keyword) => diffContent.includes(keyword));
  }

  /**
   * Determine scope based on file paths
   */
  private determineScope(files: ChangedFile[]): string | undefined {
    // Extract directory names from file paths
    const directories = files
      .map((file) => {
        const parts = file.path.split("/");
        // Skip root-level files and get the first meaningful directory
        if (parts.length > 1) {
          return parts[0] === "src" && parts.length > 2 ? parts[1] : parts[0];
        }
        return null;
      })
      .filter(Boolean) as string[];

    if (directories.length === 0) {
      return undefined;
    }

    // Find the most common directory
    const dirCounts = directories.reduce((acc, dir) => {
      acc[dir] = (acc[dir] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostCommonDir = Object.entries(dirCounts).sort(
      ([, a], [, b]) => b - a
    )[0][0];

    // Clean up scope name
    return this.cleanScopeName(mostCommonDir);
  }

  /**
   * Clean up scope name for better readability
   */
  private cleanScopeName(scope: string): string {
    // Remove common prefixes/suffixes and make lowercase
    return scope
      .replace(/^(src|lib|app|components?)$/i, "")
      .replace(/s$/, "") // Remove plural
      .toLowerCase()
      .trim();
  }

  /**
   * Generate description based on file changes
   */
  private generateDescription(
    diff: GitDiff,
    analysis: { type: string; scope?: string }
  ): string {
    const files = diff.files;

    if (files.length === 1) {
      return this.generateSingleFileDescription(files[0], analysis.type);
    } else {
      return this.generateMultiFileDescription(files, analysis.type);
    }
  }

  /**
   * Generate description for single file change
   */
  private generateSingleFileDescription(
    file: ChangedFile,
    type: string
  ): string {
    const fileName = file.path.split("/").pop() || file.path;
    const baseName = fileName.replace(
      /\.(ts|js|tsx|jsx|py|java|cpp|c|cs|php|rb|go|rs)$/,
      ""
    );

    switch (file.status) {
      case "added":
        return `add ${baseName}`;
      case "deleted":
        return `remove ${baseName}`;
      case "renamed":
        return `rename ${baseName}`;
      case "modified":
        switch (type) {
          case "fix":
            return `fix ${baseName} issues`;
          case "feat":
            return `update ${baseName}`;
          case "refactor":
            return `refactor ${baseName}`;
          case "style":
            return `style ${baseName}`;
          case "test":
            return `add tests for ${baseName}`;
          case "docs":
            return `update ${baseName} documentation`;
          default:
            return `update ${baseName}`;
        }
      default:
        return `modify ${baseName}`;
    }
  }

  /**
   * Generate description for multiple file changes
   */
  private generateMultiFileDescription(
    files: ChangedFile[],
    type: string
  ): string {
    const addedCount = files.filter((f) => f.status === "added").length;
    const modifiedCount = files.filter((f) => f.status === "modified").length;
    const deletedCount = files.filter((f) => f.status === "deleted").length;

    // Determine primary action
    if (addedCount > modifiedCount && addedCount > deletedCount) {
      switch (type) {
        case "feat":
          return `add new features`;
        case "test":
          return `add test coverage`;
        case "docs":
          return `add documentation`;
        default:
          return `add ${addedCount} new files`;
      }
    } else if (deletedCount > 0 && deletedCount >= modifiedCount) {
      return `remove unused files`;
    } else {
      switch (type) {
        case "fix":
          return `fix multiple issues`;
        case "refactor":
          return `refactor codebase`;
        case "style":
          return `update styling`;
        case "test":
          return `improve test coverage`;
        case "docs":
          return `update documentation`;
        case "chore":
          return `update configuration`;
        default:
          return `update multiple components`;
      }
    }
  }

  /**
   * Format subject line according to conventional commits
   */
  private formatSubject(
    type: string,
    scope: string | undefined,
    description: string,
    options: GenerationOptions
  ): string {
    if (options.customTemplate) {
      return this.applyCustomTemplate(
        options.customTemplate,
        type,
        scope,
        description
      );
    }

    if (this.userPreferences.commitStyle === "conventional") {
      const scopeStr = scope && options.includeScope ? `(${scope})` : "";
      return `${type}${scopeStr}: ${description}`;
    }

    return description;
  }

  /**
   * Apply custom template to generate commit message
   */
  private applyCustomTemplate(
    template: string,
    type: string,
    scope: string | undefined,
    description: string
  ): string {
    return template
      .replace("{type}", type)
      .replace("{scope}", scope || "")
      .replace("{description}", description)
      .replace("{Type}", type.charAt(0).toUpperCase() + type.slice(1))
      .replace(
        "{Description}",
        description.charAt(0).toUpperCase() + description.slice(1)
      );
  }

  /**
   * Generate commit body if requested
   */
  private generateBody(
    diff: GitDiff,
    analysis: { type: string; scope?: string }
  ): string | undefined {
    const bodyParts: string[] = [];

    // Add file summary
    if (diff.files.length > 3) {
      bodyParts.push(`Modified ${diff.files.length} files`);
    } else {
      const fileList = diff.files
        .map((f) => `- ${f.path} (${f.status})`)
        .join("\n");
      bodyParts.push(`Files changed:\n${fileList}`);
    }

    // Add change statistics
    if (diff.additions > 0 || diff.deletions > 0) {
      bodyParts.push(`Changes: +${diff.additions} -${diff.deletions}`);
    }

    return bodyParts.length > 0 ? bodyParts.join("\n\n") : undefined;
  }

  /**
   * Truncate subject line to fit within length limits
   */
  private truncateSubject(subject: string, maxLength: number): string {
    if (subject.length <= maxLength) {
      return subject;
    }

    // Try to truncate at word boundary
    const truncated = subject.substring(0, maxLength - 3);
    const lastSpace = truncated.lastIndexOf(" ");

    if (lastSpace > maxLength * 0.7) {
      return truncated.substring(0, lastSpace) + "...";
    } else {
      return truncated + "...";
    }
  }

  /**
   * Update user preferences
   */
  updatePreferences(preferences: UserPreferences): void {
    this.userPreferences = preferences;
  }
}
