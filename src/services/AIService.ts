import * as vscode from "vscode";
import { AIService, AIModel, ChangeContext } from "../interfaces/AIService";
import { GitDiff } from "../interfaces/GitService";
import { CommitType } from "../interfaces/CommitMessageGenerator";

/**
 * Error types for AI service operations
 */
export class AIServiceError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "AIServiceError";
  }
}

export class AIServiceUnavailableError extends AIServiceError {
  constructor(message: string = "AI service is currently unavailable") {
    super(message, "SERVICE_UNAVAILABLE");
  }
}

export class AIRateLimitError extends AIServiceError {
  constructor(message: string = "AI service rate limit exceeded") {
    super(message, "RATE_LIMIT_EXCEEDED");
  }
}

export class AIInvalidResponseError extends AIServiceError {
  constructor(message: string = "AI service returned invalid response") {
    super(message, "INVALID_RESPONSE");
  }
}

/**
 * Implementation of AIService that interfaces with Kiro's AI capabilities
 */
export class KiroAIService implements AIService {
  private static instance: KiroAIService;
  private currentModel: AIModel | null = null;
  private isInitialized = false;

  private constructor() {}

  /**
   * Get singleton instance of KiroAIService
   */
  public static getInstance(): KiroAIService {
    if (!KiroAIService.instance) {
      KiroAIService.instance = new KiroAIService();
    }
    return KiroAIService.instance;
  }

  /**
   * Initialize the AI service
   */
  public async initialize(): Promise<void> {
    try {
      // In a real Kiro extension, this would connect to Kiro's AI service
      // For now, we'll simulate the initialization
      this.currentModel = await this.detectCurrentModel();
      this.isInitialized = true;
    } catch (error) {
      throw new AIServiceUnavailableError(
        `Failed to initialize AI service: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Get the currently selected AI model in Kiro
   */
  public async getCurrentModel(): Promise<AIModel> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.currentModel) {
      throw new AIServiceUnavailableError("No AI model is currently available");
    }

    return this.currentModel;
  }

  /**
   * Check if AI service is available
   */
  public async isAvailable(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      return this.currentModel !== null && this.currentModel.isAvailable;
    } catch {
      return false;
    }
  }

  /**
   * Generate commit message using AI
   */
  public async generateCommitMessage(
    prompt: string,
    context: ChangeContext
  ): Promise<string> {
    if (!(await this.isAvailable())) {
      throw new AIServiceUnavailableError("AI service is not available");
    }

    try {
      // Build the complete prompt with context
      const fullPrompt = this.buildPrompt(prompt, context);

      // In a real Kiro extension, this would call Kiro's AI service
      // For now, we'll simulate the AI response
      const response = await this.callKiroAI(fullPrompt);

      // Validate and clean the response
      const cleanedResponse = this.validateAndCleanResponse(response, context);

      return cleanedResponse;
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }

      // Handle different types of errors
      if (error instanceof Error) {
        if (error.message.includes("rate limit")) {
          throw new AIRateLimitError();
        }
        if (
          error.message.includes("unavailable") ||
          error.message.includes("timeout")
        ) {
          throw new AIServiceUnavailableError();
        }
      }

      throw new AIServiceError(
        `Failed to generate commit message: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "GENERATION_FAILED"
      );
    }
  }

  /**
   * Build the complete prompt for AI generation
   */
  private buildPrompt(basePrompt: string, context: ChangeContext): string {
    const { diff, preferences } = context;

    let prompt = basePrompt || this.getDefaultPrompt();

    // Add diff information
    prompt += "\n\nGit diff summary:\n";
    prompt += `Files changed: ${diff.files.length}\n`;
    prompt += `Additions: ${diff.additions}, Deletions: ${diff.deletions}\n`;

    // Add file changes with actual diff content
    prompt += "\nChanged files with actual changes:\n";
    diff.files.forEach((file) => {
      prompt += `\n📁 ${file.path} (${file.status}): +${file.additions} -${file.deletions}\n`;

      // Add actual diff content (truncated for AI context)
      if (file.diff && file.diff.trim()) {
        const truncatedDiff = this.truncateDiff(file.diff, 300);
        prompt += `Changes:\n${truncatedDiff}\n`;
      }
    });

    // Add analysis hint with actual content context
    prompt += `\nAnalysis: Look at the actual code changes above to understand what was implemented, fixed, or modified. Focus on the purpose and impact of the changes, not just file names.`;

    // Add preferences
    if (preferences.commitStyle === "conventional") {
      prompt += "\nUse conventional commit format: type(scope): description\n";
      prompt += `Available types: ${preferences.customTypes.join(", ")}\n`;
    }

    if (preferences.analysisSettings.enableScopeInference) {
      prompt += "Include appropriate scope based on changed files.\n";
    }

    // Add project context if available
    if (context.projectContext) {
      prompt += `\nProject context: ${context.projectContext.name} (${context.projectContext.language})\n`;
    }

    prompt += "\nGenerate a concise, descriptive commit message:";

    return prompt;
  }

  /**
   * Get default prompt for commit message generation
   */
  private getDefaultPrompt(): string {
    return `You are an expert developer creating a git commit message. Analyze the file changes and generate a single, concise commit message that accurately describes the main purpose of these changes.

Rules:
- Use conventional commit format: type(scope): description
- Focus on the PRIMARY change, not every small detail
- Choose the most appropriate commit type based on the main change
- Use imperative mood (add, fix, update, implement)
- Be specific but concise
- If multiple files changed, focus on the main purpose/feature being implemented`;
  }

  /**
   * Truncate diff content to keep AI prompt manageable
   */
  private truncateDiff(diff: string, maxLength: number): string {
    if (!diff || diff.length <= maxLength) {
      return diff;
    }

    // Split into lines and keep the most important ones
    const lines = diff.split("\n");
    const importantLines: string[] = [];
    let currentLength = 0;

    // Prioritize lines that show actual changes (+ and -)
    const changeLines = lines.filter(
      (line) =>
        line.startsWith("+") || line.startsWith("-") || line.startsWith("@@")
    );

    for (const line of changeLines) {
      if (currentLength + line.length > maxLength) {
        break;
      }
      importantLines.push(line);
      currentLength += line.length + 1; // +1 for newline
    }

    // If we have room, add some context lines
    if (currentLength < maxLength * 0.8) {
      const contextLines = lines.filter(
        (line) =>
          !line.startsWith("+") &&
          !line.startsWith("-") &&
          !line.startsWith("@@") &&
          line.trim()
      );

      for (const line of contextLines) {
        if (currentLength + line.length > maxLength) {
          break;
        }
        importantLines.push(line);
        currentLength += line.length + 1;
      }
    }

    const result = importantLines.join("\n");
    return result.length < diff.length ? result + "\n... (truncated)" : result;
  }

  /**
   * Call Kiro's AI service to generate commit message
   */
  private async callKiroAI(prompt: string): Promise<string> {
    try {
      // Use Kiro's AI service through VS Code API
      // This integrates with whatever AI model is currently selected in Kiro IDE
      const vscode = await import("vscode");

      // Check if Kiro AI service is available
      if (!vscode.lm) {
        throw new Error("Kiro AI service not available");
      }

      // Get available language models
      const models = await vscode.lm.selectChatModels();
      if (models.length === 0) {
        throw new Error("No AI models available in Kiro IDE");
      }

      // Use the first available model (or could be made configurable)
      const model = models[0];

      // Create chat request
      const messages = [vscode.LanguageModelChatMessage.User(prompt)];

      // Send request to AI model
      const request = await model.sendRequest(
        messages,
        {},
        new vscode.CancellationTokenSource().token
      );

      // Collect the response
      let response = "";
      for await (const fragment of request.text) {
        response += fragment;
      }

      if (!response.trim()) {
        throw new Error("AI service returned empty response");
      }

      return response.trim();
    } catch (error) {
      // If Kiro AI is not available, fall back to mock for development
      console.warn("Kiro AI service not available, using fallback:", error);
      return this.generateFallbackResponse(prompt);
    }
  }

  /**
   * Generate a fallback response when Kiro AI is not available
   * This analyzes the prompt to create a more intelligent response
   */
  private generateFallbackResponse(prompt: string): string {
    // Extract file information from the prompt
    const fileMatches = prompt.match(/📁 ([^:]+) \((\w+)\)/g) || [];
    const files = fileMatches
      .map((match) => {
        const parts = match.match(/📁 ([^:]+) \((\w+)\)/);
        return parts ? { path: parts[1], status: parts[2] } : null;
      })
      .filter(Boolean);

    // Analyze actual diff content for better understanding
    const diffContent = this.extractDiffContent(prompt);
    const changeContext = this.analyzeDiffContent(diffContent);

    // Analyze file patterns to determine commit type and scope
    let commitType = "feat";
    let scope = "";

    // Determine commit type based on actual changes and file patterns
    // Priority: test files > docs > config > new features > fixes > refactor
    if (
      files.some((f) => f?.path.includes("test") || f?.path.includes("spec")) &&
      changeContext.hasTestChanges
    ) {
      commitType = "test";
    } else if (
      files.some((f) => f?.path.includes(".md") || f?.path.includes("doc"))
    ) {
      commitType = "docs";
    } else if (
      changeContext.hasConfigChanges ||
      files.some(
        (f) => f?.path.includes("package.json") || f?.path.includes("config")
      )
    ) {
      commitType = "chore";
    } else if (
      changeContext.hasNewFunctions ||
      changeContext.hasClassChanges ||
      files.some((f) => f?.status === "added")
    ) {
      // New functions or classes are features, even if they're validation functions
      commitType = "feat";
    } else if (
      changeContext.hasNullChecks ||
      (changeContext.mainChangeType === "function" &&
        files.some((f) => f?.status === "modified"))
    ) {
      // If adding null checks or modifying existing functions, it's likely a fix
      commitType = "fix";
    } else if (files.some((f) => f?.status === "modified")) {
      commitType = "refactor";
    }

    // Determine scope based on file paths
    const commonPaths = files
      .map((f) => {
        const path = f?.path || "";
        // Skip root-level files like README.md, package.json for scope detection
        if (!path.includes("/")) return null;
        return path.split("/")[1] || path.split("/")[0];
      })
      .filter(Boolean) as string[];

    if (commonPaths.length > 0) {
      const pathCounts = commonPaths.reduce((acc, path) => {
        if (path) {
          acc[path] = (acc[path] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
      scope = Object.keys(pathCounts).sort(
        (a, b) => pathCounts[b] - pathCounts[a]
      )[0];
    }

    // Generate description based on files and changes
    let description = "";
    if (files.length === 1) {
      const file = files[0];
      const fileName = file?.path.split("/").pop() || file?.path;

      // Check if this is a deletion (only deletions, no additions)
      const isDeletion = this.isDeletionChange(prompt, file?.path || "");

      if (file?.status === "added") {
        description = `add ${fileName}`;
      } else if (isDeletion) {
        description = `remove ${fileName}`;
      } else {
        description = `update ${fileName}`;
      }
    } else if (files.length > 1) {
      // Find the file with the most changes to determine primary purpose
      // Focus on the most important file based on path
      const primaryFile =
        files.find(
          (f) => f?.path.includes("src/") && !f?.path.includes("test")
        ) || files[0];

      if (primaryFile) {
        const fileName = primaryFile.path.split("/").pop() || primaryFile.path;
        description =
          primaryFile.status === "added"
            ? `add ${fileName} and related changes`
            : `update ${fileName} and related files`;
      } else if (scope) {
        description = `update ${scope} implementation`;
      } else {
        description = `update multiple components`;
      }
    } else {
      description = "implement changes";
    }

    // Check for branding/naming changes first
    const hasBrandingChanges = this.detectBrandingChanges(prompt);
    if (hasBrandingChanges.isBrandingChange) {
      description = hasBrandingChanges.description;
      commitType = hasBrandingChanges.type;
      scope = ""; // No scope for branding changes - they affect the whole extension
    }
    // Use change context to improve description with more specificity
    else if (
      changeContext.hasNewFunctions &&
      changeContext.newFunctions.length > 0
    ) {
      const functionName = changeContext.newFunctions[0];

      // Make description more specific based on function name
      if (functionName.toLowerCase().includes("validate")) {
        description = `add ${functionName} validation function`;
      } else if (
        functionName.toLowerCase().includes("test") ||
        functionName.toLowerCase().includes("spec")
      ) {
        description = `add ${functionName} test function`;
      } else if (
        functionName.toLowerCase().includes("handle") ||
        functionName.toLowerCase().includes("click")
      ) {
        description = `add ${functionName} handler`;
      } else if (
        functionName.toLowerCase().includes("get") ||
        functionName.toLowerCase().includes("fetch")
      ) {
        description = `add ${functionName} getter function`;
      } else if (
        functionName.toLowerCase().includes("set") ||
        functionName.toLowerCase().includes("update")
      ) {
        description = `add ${functionName} setter function`;
      } else if (changeContext.newFunctions.length === 1) {
        description = `add ${functionName} function`;
      } else {
        // Multiple functions - be more descriptive
        const functionTypes = changeContext.newFunctions.map((fn) => {
          if (fn.toLowerCase().includes("validate")) return "validation";
          if (fn.toLowerCase().includes("test")) return "test";
          if (fn.toLowerCase().includes("handle")) return "handler";
          return "utility";
        });
        const uniqueTypes = [...new Set(functionTypes)];
        description =
          uniqueTypes.length === 1
            ? `add ${uniqueTypes[0]} functions`
            : `add ${changeContext.newFunctions.length} utility functions`;
      }
    } else if (changeContext.hasNullChecks) {
      description = `add null safety checks`;
    } else if (changeContext.hasValidation) {
      description = `add validation logic`;
    } else if (changeContext.hasImports) {
      description = `update imports and dependencies`;
    } else if (changeContext.hasConfigChanges) {
      description = `update configuration`;
    } else if (changeContext.hasTestChanges) {
      description = `add test coverage`;
    }

    // Format as conventional commit
    const scopeStr = scope ? `(${scope})` : "";
    return `${commitType}${scopeStr}: ${description}`;
  }

  /**
   * Extract diff content from the prompt
   */
  private extractDiffContent(prompt: string): string {
    const changesSections = prompt.split("Changes:\n");
    if (changesSections.length < 2) return "";

    return changesSections.slice(1).join("\n");
  }

  /**
   * Analyze diff content to understand what changed
   */
  private analyzeDiffContent(diffContent: string): {
    hasNewFunctions: boolean;
    newFunctions: string[];
    hasImports: boolean;
    hasConfigChanges: boolean;
    hasTestChanges: boolean;
    hasClassChanges: boolean;
    hasNullChecks: boolean;
    hasValidation: boolean;
    mainChangeType: string;
  } {
    const lines = diffContent.split("\n");
    const addedLines = lines.filter((line) => line.startsWith("+"));

    // Look for new functions
    const functionMatches = addedLines
      .map((line) =>
        line.match(
          /\+.*(?:function|const|let|var)\s+(\w+)|class\s+(\w+)|async\s+(\w+)/
        )
      )
      .filter(Boolean)
      .map((match) => match![1] || match![2] || match![3])
      .filter(Boolean);

    // Look for imports
    const hasImports = addedLines.some(
      (line) =>
        line.includes("import") ||
        line.includes("require") ||
        line.includes("from")
    );

    // Look for config changes
    const hasConfigChanges = addedLines.some(
      (line) => line.includes('"') && (line.includes(":") || line.includes("="))
    );

    // Look for test changes
    const hasTestChanges = addedLines.some(
      (line) =>
        line.includes("test(") ||
        line.includes("it(") ||
        line.includes("describe(") ||
        line.includes("expect(") ||
        line.includes("assert")
    );

    // Look for class changes
    const hasClassChanges = addedLines.some(
      (line) =>
        line.includes("class ") ||
        line.includes("interface ") ||
        line.includes("type ")
    );

    // Look for null checks and validation
    const hasNullChecks = addedLines.some(
      (line) =>
        line.includes("if (") &&
        (line.includes("null") ||
          line.includes("undefined") ||
          line.includes("!"))
    );

    const hasValidation = addedLines.some(
      (line) =>
        line.includes("validate") ||
        line.includes("check") ||
        line.includes("verify") ||
        line.includes("length") ||
        (line.includes("test(") && line.includes("/"))
    );

    return {
      hasNewFunctions: functionMatches.length > 0,
      newFunctions: functionMatches,
      hasImports,
      hasConfigChanges,
      hasTestChanges,
      hasClassChanges,
      hasNullChecks,
      hasValidation,
      mainChangeType: this.determineMainChangeType(addedLines),
    };
  }

  /**
   * Detect branding/naming changes in the prompt
   */
  private detectBrandingChanges(prompt: string): {
    isBrandingChange: boolean;
    description: string;
    type: string;
  } {
    // Look for name/branding changes - simpler, more reliable detection
    const hasAIGenerator = prompt.includes("AI Git Commit Message Generator");
    const hasKiroGenerator = prompt.includes(
      "Kiro Git Commit Message Generator"
    );
    const hasDisplayNameChange =
      prompt.includes("displayName") && hasAIGenerator && hasKiroGenerator;
    const hasTitleChange =
      prompt.includes("title") &&
      prompt.includes("Git Commit Generator") &&
      prompt.includes("Kiro Git Commit Generator");
    const hasNameRebrand =
      hasAIGenerator &&
      hasKiroGenerator &&
      (hasDisplayNameChange || hasTitleChange);

    const hasBrandingChange = hasNameRebrand;

    if (hasBrandingChange) {
      // Determine if it's docs (README) or chore (config files)
      const hasReadmeChanges = prompt.includes("README.md");
      const hasConfigChanges =
        prompt.includes("package.json") || prompt.includes("extension.ts");

      if (hasReadmeChanges && hasConfigChanges) {
        return {
          isBrandingChange: true,
          description: "rebrand extension to Kiro Git Commit Message Generator",
          type: "chore",
        };
      } else if (hasReadmeChanges) {
        return {
          isBrandingChange: true,
          description: "update branding to Kiro Git Commit Message Generator",
          type: "docs",
        };
      } else {
        return {
          isBrandingChange: true,
          description:
            "update extension name to Kiro Git Commit Message Generator",
          type: "chore",
        };
      }
    }

    return {
      isBrandingChange: false,
      description: "",
      type: "",
    };
  }

  /**
   * Detect if a change is primarily a deletion
   */
  private isDeletionChange(prompt: string, filePath: string): boolean {
    // Look for patterns indicating deletion
    const fileSection = this.extractFileSection(prompt, filePath);
    if (!fileSection) return false;

    // Check if there are only deletions (lines starting with -)
    const lines = fileSection.split("\n");
    const deletionLines = lines.filter(
      (line) => line.trim().startsWith("-") && line.trim() !== "-"
    );
    const additionLines = lines.filter(
      (line) => line.trim().startsWith("+") && line.trim() !== "+"
    );

    // It's a deletion if there are many deletions and no/few additions
    return deletionLines.length > 5 && additionLines.length === 0;
  }

  /**
   * Extract the section of the prompt related to a specific file
   */
  private extractFileSection(prompt: string, filePath: string): string {
    const fileMarker = `📁 ${filePath}`;
    const startIndex = prompt.indexOf(fileMarker);
    if (startIndex === -1) return "";

    // Find the next file marker or end of changes section
    const nextFileIndex = prompt.indexOf("📁 ", startIndex + fileMarker.length);
    const analysisIndex = prompt.indexOf("Analysis:", startIndex);

    const endIndex =
      nextFileIndex !== -1
        ? nextFileIndex
        : analysisIndex !== -1
        ? analysisIndex
        : prompt.length;

    return prompt.substring(startIndex, endIndex);
  }

  /**
   * Determine the main type of change based on added lines
   */
  private determineMainChangeType(addedLines: string[]): string {
    const patterns = {
      function: /(?:function|const|let|var)\s+\w+.*=/,
      class: /class\s+\w+/,
      interface: /interface\s+\w+/,
      import: /import.*from/,
      config: /"[^"]+"\s*:/,
      test: /(?:test|it|describe)\s*\(/,
      comment: /\/\/|\/\*/,
    };

    const counts: Record<string, number> = {};

    addedLines.forEach((line) => {
      Object.entries(patterns).forEach(([type, pattern]) => {
        if (pattern.test(line)) {
          counts[type] = (counts[type] || 0) + 1;
        }
      });
    });

    // Return the most common change type
    const sortedTypes = Object.entries(counts).sort(([, a], [, b]) => b - a);
    return sortedTypes.length > 0 ? sortedTypes[0][0] : "general";
  }

  /**
   * Validate and clean AI response
   */
  private validateAndCleanResponse(
    response: string,
    context: ChangeContext
  ): string {
    if (!response || typeof response !== "string") {
      throw new AIInvalidResponseError(
        "AI service returned empty or invalid response"
      );
    }

    // Clean the response
    let cleaned = response.trim();

    // Remove any markdown code blocks but preserve the content inside
    cleaned = cleaned.replace(/```[\s\S]*?\n([\s\S]*?)\n```/g, "$1");
    cleaned = cleaned.replace(/```([\s\S]*?)```/g, "$1");

    // Remove inline code formatting
    cleaned = cleaned.replace(/`([^`]+)`/g, "$1");

    // Remove extra whitespace
    cleaned = cleaned.replace(/\s+/g, " ").trim();

    // Validate length - if too long, try to extract just the first line (commit subject)
    const maxLength = context.preferences.analysisSettings ? 144 : 100; // More reasonable max length
    if (cleaned.length > maxLength) {
      // If too long, try to extract just the commit message part
      const lines = cleaned.split("\n");
      cleaned = lines[0].trim();

      // If still too long, truncate but try to keep it meaningful
      if (cleaned.length > maxLength) {
        cleaned = cleaned.substring(0, maxLength - 3) + "...";
      }
    }

    // Ensure it's not empty after cleaning
    if (!cleaned) {
      throw new AIInvalidResponseError("AI response was empty after cleaning");
    }

    return cleaned;
  }

  /**
   * Detect the current AI model available in Kiro
   * In a real implementation, this would query Kiro's AI service
   */
  private async detectCurrentModel(): Promise<AIModel> {
    // Simulate model detection
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Return a mock model for testing
    return {
      id: "kiro-ai-v1",
      name: "Kiro AI Assistant",
      provider: "Kiro",
      isAvailable: true,
    };
  }

  /**
   * Create a prompt specifically for commit message generation
   */
  public createCommitPrompt(
    diff: GitDiff,
    commitType?: CommitType,
    scope?: string
  ): string {
    let prompt = "Generate a git commit message for the following changes:\n\n";

    // Add file summary
    prompt += `Changed files (${diff.files.length}):\n`;
    diff.files.forEach((file) => {
      prompt += `- ${file.path} (${file.status})\n`;
    });

    prompt += `\nTotal changes: +${diff.additions} -${diff.deletions}\n`;

    // Add specific instructions
    if (commitType) {
      prompt += `\nUse commit type: ${commitType}\n`;
    }

    if (scope) {
      prompt += `Use scope: ${scope}\n`;
    }

    prompt += "\nRequirements:\n";
    prompt += "- Use conventional commit format: type(scope): description\n";
    prompt += "- Keep the subject line under 50 characters\n";
    prompt += '- Use imperative mood (e.g., "add", "fix", "update")\n';
    prompt += "- Be specific and descriptive\n";
    prompt += "- Focus on what and why, not how\n";

    return prompt;
  }
}
