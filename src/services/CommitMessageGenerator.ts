import {
  CommitMessageGenerator,
  GenerationOptions,
  CommitMessage,
  ChangeAnalysis,
} from "../interfaces/CommitMessageGenerator";
import { GitDiff } from "../interfaces/GitService";
import { UserPreferences } from "../interfaces/Configuration";
import { GitService } from "../interfaces/GitService";
import { AIService, ChangeContext } from "../interfaces/AIService";
import { ChangeAnalysisService } from "../interfaces/ChangeAnalysis";
import {
  ErrorHandler,
  GitError,
  AIError,
  ValidationError,
} from "./ErrorHandler";
import { FallbackCommitGenerator } from "./FallbackCommitGenerator";

/**
 * Core commit message generator that combines all services
 */
export class CommitMessageGeneratorImpl implements CommitMessageGenerator {
  private gitService: GitService;
  private aiService: AIService;
  private changeAnalysisService: ChangeAnalysisService;
  private userPreferences: UserPreferences;
  private errorHandler: ErrorHandler;
  private fallbackGenerator: FallbackCommitGenerator;

  constructor(
    gitService: GitService,
    aiService: AIService,
    changeAnalysisService: ChangeAnalysisService,
    userPreferences: UserPreferences
  ) {
    this.gitService = gitService;
    this.aiService = aiService;
    this.changeAnalysisService = changeAnalysisService;
    this.userPreferences = userPreferences;
    this.errorHandler = ErrorHandler.getInstance();
    this.fallbackGenerator = new FallbackCommitGenerator(userPreferences);
  }

  /**
   * Generate a commit message based on all changes
   */
  async generateMessage(options: GenerationOptions): Promise<CommitMessage> {
    try {
      // Validate that we can generate a commit message
      await this.validateChanges();

      // Get all changes from git (staged + unstaged)
      const diff = await this.gitService.getAllChanges();

      // Try AI generation first, fall back to template-based if it fails
      return await this.generateWithFallback(diff, options);
    } catch (error) {
      // Handle different types of errors appropriately
      if (error instanceof GitError) {
        try {
          const errorResponse = await this.errorHandler.handleGitError(error);
          await this.errorHandler.showErrorToUser(errorResponse);
        } catch (handlerError) {
          // If error handler fails, log it but still throw the original error
          console.error("Error handler failed:", handlerError);
        }
        throw error;
      }

      throw error;
    }
  }

  /**
   * Validate that there are changes to analyze
   */
  async validateChanges(): Promise<boolean> {
    // Check if we're in a valid git repository
    const isValidRepo = await this.gitService.isValidRepository();
    if (!isValidRepo) {
      throw new GitError("Not in a valid git repository", "NOT_A_REPOSITORY");
    }

    // Check repository status
    const status = await this.gitService.getRepositoryStatus();
    if (!status.hasChanges) {
      throw new GitError(
        "No changes found for commit message generation",
        "NO_CHANGES"
      );
    }

    // Check for merge conflicts
    const conflictStatus = await this.gitService.getConflictStatus();
    if (conflictStatus.hasConflicts) {
      throw new GitError(
        `Cannot generate commit message while merge conflicts exist in: ${conflictStatus.conflictedFiles.join(
          ", "
        )}`,
        "MERGE_CONFLICTS"
      );
    }

    return true;
  }

  /**
   * Validate that there are staged changes to commit (backward compatibility)
   */
  async validateStagedChanges(): Promise<boolean> {
    // Check if we're in a valid git repository
    const isValidRepo = await this.gitService.isValidRepository();
    if (!isValidRepo) {
      throw new GitError("Not in a valid git repository", "NOT_A_REPOSITORY");
    }

    // Check repository status
    const status = await this.gitService.getRepositoryStatus();
    if (!status.hasStagedChanges) {
      throw new GitError(
        "No staged changes found for commit message generation",
        "NO_STAGED_CHANGES"
      );
    }

    // Check for merge conflicts
    const conflictStatus = await this.gitService.getConflictStatus();
    if (conflictStatus.hasConflicts) {
      throw new GitError(
        `Cannot generate commit message while merge conflicts exist in: ${conflictStatus.conflictedFiles.join(
          ", "
        )}`,
        "MERGE_CONFLICTS"
      );
    }

    return true;
  }

  /**
   * Analyze changes to determine commit type, scope, and impact
   */
  analyzeChanges(diff: GitDiff): ChangeAnalysis {
    return this.changeAnalysisService.analyzeChanges(diff);
  }

  /**
   * Build context for AI generation
   */
  private buildChangeContext(
    diff: GitDiff,
    analysis: ChangeAnalysis
  ): ChangeContext {
    return {
      diff,
      preferences: this.userPreferences,
      projectContext: {
        name: this.extractProjectName(),
        type: this.detectProjectType(diff.files.map((f) => f.path)),
        language: this.detectPrimaryLanguage(diff.files.map((f) => f.path)),
        framework: this.detectFramework(diff.files.map((f) => f.path)),
      },
    };
  }

  /**
   * Generate commit message with AI and fallback support
   */
  private async generateWithFallback(
    diff: GitDiff,
    options: GenerationOptions
  ): Promise<CommitMessage> {
    try {
      // Try AI generation first
      return await this.generateWithAI(diff, options);
    } catch (error) {
      // Handle AI errors and fall back to template-based generation
      if (error instanceof AIError) {
        const errorResponse = await this.errorHandler.handleAIError(error);

        // Show warning to user but continue with fallback
        if (errorResponse.logLevel === "error") {
          await this.errorHandler.showErrorToUser(errorResponse);
        }

        // Use fallback generation
        return this.generateWithTemplate(diff, options);
      }

      throw error;
    }
  }

  /**
   * Generate commit message using AI service
   */
  private async generateWithAI(
    diff: GitDiff,
    options: GenerationOptions
  ): Promise<CommitMessage> {
    // Analyze the changes to understand what was modified
    const analysis = this.analyzeChanges(diff);

    // Build context for AI generation
    const context = this.buildChangeContext(diff, analysis);

    // Build a comprehensive prompt for the AI
    const prompt = this.buildAIPrompt(context, options, analysis);

    // Generate the message using AI
    const generatedMessage = await this.aiService.generateCommitMessage(
      prompt,
      context
    );

    // Format and validate the final message
    const commitMessage = this.formatCommitMessage(
      generatedMessage,
      analysis,
      options
    );

    // Validate the generated message
    this.validateCommitMessage(commitMessage, options);

    return commitMessage;
  }

  /**
   * Generate commit message using template-based fallback
   */
  private generateWithTemplate(
    diff: GitDiff,
    options: GenerationOptions
  ): CommitMessage {
    try {
      const commitMessage = this.fallbackGenerator.generateMessage(
        diff,
        options
      );

      // Validate the generated message
      this.validateCommitMessage(commitMessage, options);

      return commitMessage;
    } catch (error) {
      // If even fallback fails, create a basic message
      return this.createBasicCommitMessage(diff, options);
    }
  }

  /**
   * Create a basic commit message as last resort
   */
  private createBasicCommitMessage(
    diff: GitDiff,
    options: GenerationOptions
  ): CommitMessage {
    const fileCount = diff.files.length;
    const description =
      fileCount === 1
        ? `update ${diff.files[0].path.split("/").pop()}`
        : `update ${fileCount} files`;

    const subject =
      this.userPreferences.commitStyle === "conventional"
        ? `chore: ${description}`
        : description;

    return {
      subject: this.truncateMessage(subject, options.maxLength),
      type: "chore",
      isConventional: this.userPreferences.commitStyle === "conventional",
    };
  }

  /**
   * Build AI prompt for commit message generation
   */
  private buildAIPrompt(
    context: ChangeContext,
    options: GenerationOptions,
    analysis: ChangeAnalysis
  ): string {
    let prompt = "Generate a git commit message for the following changes:\n\n";

    // Add change summary
    prompt += `Change Analysis:\n`;
    prompt += `- Suggested type: ${analysis.commitType}\n`;
    prompt += `- Suggested scope: ${analysis.scope || "none"}\n`;
    prompt += `- Impact level: ${analysis.impactLevel}\n`;
    prompt += `- File types: ${analysis.fileTypes.join(", ")}\n`;
    prompt += `- Description: ${analysis.description}\n\n`;

    // Add specific requirements based on options
    if (this.userPreferences.commitStyle === "conventional") {
      prompt += "Requirements:\n";
      prompt += "- Use conventional commit format: type(scope): description\n";

      if (options.commitType) {
        prompt += `- Use commit type: ${options.commitType}\n`;
      } else {
        prompt += `- Suggested commit type: ${analysis.commitType}\n`;
        prompt += `- Available types: ${this.userPreferences.customTypes.join(
          ", "
        )}\n`;
      }

      if (options.includeScope && analysis.scope) {
        prompt += `- Include scope: ${analysis.scope}\n`;
      }
    }

    // Add length constraints
    prompt += `- Keep subject line under ${options.maxLength} characters\n`;
    prompt += '- Use imperative mood (e.g., "add", "fix", "update")\n';
    prompt += "- Be specific and descriptive\n";
    prompt += "- Focus on what and why, not how\n\n";

    // Add custom template if provided
    if (options.customTemplate) {
      prompt += `Custom template to follow: ${options.customTemplate}\n\n`;
    }

    return prompt;
  }

  /**
   * Format the generated message into a structured CommitMessage
   */
  private formatCommitMessage(
    generatedMessage: string,
    analysis: ChangeAnalysis,
    options: GenerationOptions
  ): CommitMessage {
    const message = generatedMessage.trim();

    // Parse conventional commit format if applicable
    const conventionalMatch = message.match(/^(\w+)(?:\(([^)]+)\))?: (.+)$/);

    if (
      conventionalMatch &&
      this.userPreferences.commitStyle === "conventional"
    ) {
      const [, type, scope, description] = conventionalMatch;

      return {
        subject: message,
        type,
        scope: scope || undefined,
        body: this.userPreferences.includeBody
          ? this.generateBody(analysis)
          : undefined,
        isConventional: true,
      };
    }

    // Fallback to non-conventional format
    return {
      subject: message,
      type: analysis.commitType,
      scope: analysis.scope,
      body: this.userPreferences.includeBody
        ? this.generateBody(analysis)
        : undefined,
      isConventional: false,
    };
  }

  /**
   * Generate commit message body if requested
   */
  private generateBody(analysis: ChangeAnalysis): string | undefined {
    if (!this.userPreferences.includeBody) {
      return undefined;
    }

    const bodyParts: string[] = [];

    // Add impact information
    if (analysis.impactLevel !== "minor") {
      bodyParts.push(`Impact: ${analysis.impactLevel}`);
    }

    // Add file type information
    if (analysis.fileTypes.length > 1) {
      bodyParts.push(`Affects: ${analysis.fileTypes.join(", ")} files`);
    }

    return bodyParts.length > 0 ? bodyParts.join("\n") : undefined;
  }

  /**
   * Validate the generated commit message
   */
  private validateCommitMessage(
    message: CommitMessage,
    options: GenerationOptions
  ): void {
    // Check that subject is not empty
    if (!message.subject.trim()) {
      throw new ValidationError(
        "Commit subject line cannot be empty",
        "EMPTY_MESSAGE"
      );
    }

    // Check subject line length and truncate if needed
    if (message.subject.length > options.maxLength) {
      // Intelligently truncate the message
      const originalLength = message.subject.length;
      message.subject = this.truncateMessage(
        message.subject,
        options.maxLength
      );

      // Show warning about truncation
      const truncationError = new ValidationError(
        `Commit message was truncated from ${originalLength} to ${message.subject.length} characters`,
        "MESSAGE_TOO_LONG",
        "warning"
      );

      // Handle the warning asynchronously
      this.errorHandler
        .handleValidationError(truncationError)
        .then((response) => {
          if (response.logLevel === "warn") {
            this.errorHandler.showErrorToUser(response);
          }
        });
    }

    // Validate conventional commit format if required
    if (this.userPreferences.commitStyle === "conventional") {
      this.validateConventionalFormat(message);
      // Mark as conventional after validation/correction
      message.isConventional = true;

      // Check length again after format correction and truncate if needed
      if (message.subject.length > options.maxLength) {
        message.subject = this.truncateMessage(
          message.subject,
          options.maxLength
        );
      }
    }
  }

  /**
   * Intelligently truncate a commit message to fit within length limits
   */
  private truncateMessage(message: string, maxLength: number): string {
    if (message.length <= maxLength) {
      return message;
    }

    // Try to truncate at word boundaries
    const truncated = message.substring(0, maxLength - 3);
    const lastSpace = truncated.lastIndexOf(" ");

    if (lastSpace > maxLength * 0.7) {
      // If we can truncate at a word boundary without losing too much
      return truncated.substring(0, lastSpace) + "...";
    } else {
      // Otherwise, hard truncate
      return truncated + "...";
    }
  }

  /**
   * Validate conventional commit format
   */
  private validateConventionalFormat(message: CommitMessage): void {
    // Check that type is valid
    const validTypes = this.userPreferences.customTypes.map((t) =>
      t.toString()
    );
    if (!validTypes.includes(message.type)) {
      // Try to fix the type if possible
      const fixedType = this.fixCommitType(message.type, validTypes);
      if (fixedType) {
        message.type = fixedType;
        message.subject = message.subject.replace(
          new RegExp(`^${message.type}`),
          fixedType
        );
      } else {
        throw new ValidationError(
          `Invalid commit type "${
            message.type
          }". Valid types: ${validTypes.join(", ")}`,
          "INVALID_COMMIT_FORMAT"
        );
      }
    }

    // Check conventional format pattern
    const conventionalPattern = /^(\w+)(?:\([^)]+\))?: .+$/;
    if (!conventionalPattern.test(message.subject)) {
      // Try to fix the format
      const fixedSubject = this.fixConventionalFormat(message);
      if (fixedSubject) {
        message.subject = fixedSubject;
      } else {
        throw new ValidationError(
          "Commit message does not follow conventional format: type(scope): description",
          "INVALID_COMMIT_FORMAT"
        );
      }
    }
  }

  /**
   * Try to fix invalid commit type
   */
  private fixCommitType(
    invalidType: string,
    validTypes: string[]
  ): string | null {
    const typeMap: Record<string, string> = {
      feature: "feat",
      bugfix: "fix",
      documentation: "docs",
      styling: "style",
      refactoring: "refactor",
      testing: "test",
      maintenance: "chore",
      build: "chore",
      ci: "chore",
    };

    return typeMap[invalidType.toLowerCase()] || null;
  }

  /**
   * Try to fix conventional commit format
   */
  private fixConventionalFormat(message: CommitMessage): string | null {
    // If it doesn't have the conventional format, try to add it
    if (!message.subject.includes(":")) {
      const scope = message.scope ? `(${message.scope})` : "";
      return `${message.type}${scope}: ${message.subject}`;
    }

    return null;
  }

  /**
   * Extract project name from current directory or git config
   */
  private extractProjectName(): string {
    // In a real implementation, this would extract from package.json, git config, or directory name
    // For now, return a placeholder
    return "project";
  }

  /**
   * Detect project type based on file patterns
   */
  private detectProjectType(filePaths: string[]): string {
    if (filePaths.some((path) => path.includes("package.json")))
      return "nodejs";
    if (filePaths.some((path) => path.includes("pom.xml"))) return "java";
    if (
      filePaths.some(
        (path) => path.includes("requirements.txt") || path.includes("setup.py")
      )
    )
      return "python";
    if (filePaths.some((path) => path.includes("Cargo.toml"))) return "rust";
    if (filePaths.some((path) => path.includes("go.mod"))) return "go";
    return "generic";
  }

  /**
   * Detect primary programming language
   */
  private detectPrimaryLanguage(filePaths: string[]): string {
    const extensions = filePaths.map((path) => {
      const ext = path.split(".").pop()?.toLowerCase();
      return ext || "";
    });

    const languageMap: Record<string, string> = {
      ts: "typescript",
      js: "javascript",
      tsx: "typescript",
      jsx: "javascript",
      py: "python",
      java: "java",
      rs: "rust",
      go: "go",
      cpp: "cpp",
      c: "c",
      cs: "csharp",
      php: "php",
      rb: "ruby",
    };

    // Count occurrences of each language
    const counts: Record<string, number> = {};
    extensions.forEach((ext) => {
      const lang = languageMap[ext];
      if (lang) {
        counts[lang] = (counts[lang] || 0) + 1;
      }
    });

    // Return the most common language
    const mostCommon = Object.entries(counts).sort(([, a], [, b]) => b - a)[0];
    return mostCommon ? mostCommon[0] : "unknown";
  }

  /**
   * Detect framework based on file patterns
   */
  private detectFramework(filePaths: string[]): string | undefined {
    if (filePaths.some((path) => path.includes("angular.json")))
      return "angular";
    if (filePaths.some((path) => path.includes("next.config"))) return "nextjs";
    if (filePaths.some((path) => path.includes("nuxt.config"))) return "nuxtjs";
    if (filePaths.some((path) => path.includes("vue.config"))) return "vue";
    if (filePaths.some((path) => path.includes("svelte.config")))
      return "svelte";
    if (filePaths.some((path) => path.includes("gatsby-config")))
      return "gatsby";
    return undefined;
  }

  /**
   * Update user preferences
   */
  updatePreferences(preferences: UserPreferences): void {
    this.userPreferences = preferences;
    this.fallbackGenerator.updatePreferences(preferences);
  }

  /**
   * Get current user preferences
   */
  getPreferences(): UserPreferences {
    return this.userPreferences;
  }
}
