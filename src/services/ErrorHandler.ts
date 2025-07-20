import * as vscode from "vscode";

/**
 * Base error class for all extension errors
 */
export abstract class ExtensionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly severity: "info" | "warning" | "error" = "error"
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  abstract getUserMessage(): string;
  abstract getRecoveryActions(): RecoveryAction[];
}

/**
 * Git-related errors
 */
export class GitError extends ExtensionError {
  constructor(
    message: string,
    code: string,
    severity: "info" | "warning" | "error" = "error"
  ) {
    super(message, code, severity);
  }

  getUserMessage(): string {
    switch (this.code) {
      case "NOT_A_REPOSITORY":
        return "This folder is not a Git repository. Initialize Git to use commit message generation.";
      case "NO_STAGED_CHANGES":
        return "No staged changes found. Stage your changes first using 'git add' or the Source Control panel.";
      case "NO_CHANGES":
        return "No changes detected in the repository. Make some changes first.";
      case "MERGE_CONFLICTS":
        return "Merge conflicts detected. Resolve conflicts before generating commit messages.";
      case "REPOSITORY_ACCESS_ERROR":
        return "Unable to access Git repository. Check file permissions and Git installation.";
      default:
        return `Git error: ${this.message}`;
    }
  }

  getRecoveryActions(): RecoveryAction[] {
    switch (this.code) {
      case "NOT_A_REPOSITORY":
        return [
          {
            label: "Initialize Git Repository",
            action: async () => {
              const terminal = vscode.window.createTerminal("Git Init");
              terminal.sendText("git init");
              terminal.show();
            },
          },
          {
            label: "Open Different Folder",
            action: async () => {
              await vscode.commands.executeCommand(
                "workbench.action.files.openFolder"
              );
            },
          },
        ];
      case "NO_STAGED_CHANGES":
        return [
          {
            label: "Open Source Control",
            action: async () => {
              await vscode.commands.executeCommand("workbench.view.scm");
            },
          },
          {
            label: "Stage All Changes",
            action: async () => {
              const terminal = vscode.window.createTerminal("Git Add");
              terminal.sendText("git add .");
              terminal.show();
            },
          },
        ];
      case "NO_CHANGES":
        return [
          {
            label: "View Git Status",
            action: async () => {
              const terminal = vscode.window.createTerminal("Git Status");
              terminal.sendText("git status");
              terminal.show();
            },
          },
        ];
      case "MERGE_CONFLICTS":
        return [
          {
            label: "Open Source Control",
            action: async () => {
              await vscode.commands.executeCommand("workbench.view.scm");
            },
          },
          {
            label: "View Conflicts",
            action: async () => {
              const terminal = vscode.window.createTerminal("Git Status");
              terminal.sendText("git status");
              terminal.show();
            },
          },
        ];
      default:
        return [];
    }
  }
}

/**
 * AI service related errors
 */
export class AIError extends ExtensionError {
  constructor(
    message: string,
    code: string,
    severity: "info" | "warning" | "error" = "error"
  ) {
    super(message, code, severity);
  }

  getUserMessage(): string {
    switch (this.code) {
      case "SERVICE_UNAVAILABLE":
        return "AI service is currently unavailable. Using fallback commit message generation.";
      case "RATE_LIMIT_EXCEEDED":
        return "AI service rate limit exceeded. Please wait a moment before trying again.";
      case "INVALID_RESPONSE":
        return "AI service returned an invalid response. Using fallback generation.";
      case "MODEL_NOT_AVAILABLE":
        return "No AI model is currently available in Kiro IDE. Check your AI settings.";
      case "GENERATION_FAILED":
        return "Failed to generate commit message with AI. Using fallback method.";
      default:
        return `AI service error: ${this.message}`;
    }
  }

  getRecoveryActions(): RecoveryAction[] {
    switch (this.code) {
      case "SERVICE_UNAVAILABLE":
      case "MODEL_NOT_AVAILABLE":
        return [
          {
            label: "Check AI Settings",
            action: async () => {
              await vscode.commands.executeCommand(
                "workbench.action.openSettings",
                "kiro.ai"
              );
            },
          },
          {
            label: "Use Fallback Generation",
            action: async () => {
              // This would trigger fallback generation
              vscode.window.showInformationMessage(
                "Using template-based commit message generation."
              );
            },
          },
        ];
      case "RATE_LIMIT_EXCEEDED":
        return [
          {
            label: "Try Again Later",
            action: async () => {
              // Wait and retry
              await new Promise((resolve) => setTimeout(resolve, 5000));
              vscode.window.showInformationMessage(
                "You can try generating a commit message again now."
              );
            },
          },
        ];
      default:
        return [
          {
            label: "Use Fallback Generation",
            action: async () => {
              vscode.window.showInformationMessage(
                "Using template-based commit message generation."
              );
            },
          },
        ];
    }
  }
}

/**
 * Configuration related errors
 */
export class ConfigurationError extends ExtensionError {
  constructor(
    message: string,
    code: string,
    severity: "info" | "warning" | "error" = "warning"
  ) {
    super(message, code, severity);
  }

  getUserMessage(): string {
    switch (this.code) {
      case "INVALID_SETTINGS":
        return "Invalid extension settings detected. Using default configuration.";
      case "MISSING_TEMPLATE":
        return "Custom template not found. Using default template.";
      case "TEMPLATE_VALIDATION_FAILED":
        return "Custom template validation failed. Using default template.";
      default:
        return `Configuration error: ${this.message}`;
    }
  }

  getRecoveryActions(): RecoveryAction[] {
    switch (this.code) {
      case "INVALID_SETTINGS":
        return [
          {
            label: "Open Settings",
            action: async () => {
              await vscode.commands.executeCommand(
                "workbench.action.openSettings",
                "gitCommitGenerator"
              );
            },
          },
          {
            label: "Reset to Defaults",
            action: async () => {
              await vscode.commands.executeCommand(
                "workbench.action.openSettings",
                "gitCommitGenerator"
              );
              vscode.window.showInformationMessage(
                "Please reset the extension settings to defaults."
              );
            },
          },
        ];
      case "MISSING_TEMPLATE":
      case "TEMPLATE_VALIDATION_FAILED":
        return [
          {
            label: "Edit Templates",
            action: async () => {
              await vscode.commands.executeCommand(
                "workbench.action.openSettings",
                "gitCommitGenerator.templates"
              );
            },
          },
        ];
      default:
        return [];
    }
  }
}

/**
 * Validation related errors
 */
export class ValidationError extends ExtensionError {
  constructor(
    message: string,
    code: string,
    severity: "info" | "warning" | "error" = "warning"
  ) {
    super(message, code, severity);
  }

  getUserMessage(): string {
    switch (this.code) {
      case "MESSAGE_TOO_LONG":
        return "Generated commit message is too long. It has been automatically shortened.";
      case "INVALID_COMMIT_FORMAT":
        return "Generated commit message doesn't follow conventional format. Using corrected format.";
      case "EMPTY_MESSAGE":
        return "Generated commit message is empty. Please try again or use manual input.";
      default:
        return `Validation error: ${this.message}`;
    }
  }

  getRecoveryActions(): RecoveryAction[] {
    switch (this.code) {
      case "MESSAGE_TOO_LONG":
        return [
          {
            label: "Edit Message",
            action: async () => {
              vscode.window.showInformationMessage(
                "You can edit the commit message before committing."
              );
            },
          },
        ];
      case "INVALID_COMMIT_FORMAT":
        return [
          {
            label: "View Format Guide",
            action: async () => {
              await vscode.env.openExternal(
                vscode.Uri.parse("https://www.conventionalcommits.org/")
              );
            },
          },
        ];
      case "EMPTY_MESSAGE":
        return [
          {
            label: "Try Again",
            action: async () => {
              // This would trigger regeneration
              vscode.window.showInformationMessage(
                "Click the generate button to try again."
              );
            },
          },
          {
            label: "Write Manually",
            action: async () => {
              await vscode.commands.executeCommand("workbench.view.scm");
            },
          },
        ];
      default:
        return [];
    }
  }
}

/**
 * Recovery action interface
 */
export interface RecoveryAction {
  label: string;
  action: () => Promise<void>;
}

/**
 * Error response interface
 */
export interface ErrorResponse {
  canRecover: boolean;
  fallbackAction?: () => Promise<void>;
  userMessage: string;
  logLevel: "info" | "warn" | "error";
  recoveryActions: RecoveryAction[];
}

/**
 * Main error handler for the extension
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private outputChannel: vscode.OutputChannel;

  private constructor() {
    this.outputChannel = vscode.window.createOutputChannel(
      "Git Commit Generator"
    );
  }

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle Git-related errors
   */
  async handleGitError(error: Error): Promise<ErrorResponse> {
    let gitError: GitError;

    if (error instanceof GitError) {
      gitError = error;
    } else {
      // Convert generic errors to GitError
      const code = this.classifyGitError(error.message);
      gitError = new GitError(error.message, code);
    }

    this.logError(gitError);

    return {
      canRecover: gitError.getRecoveryActions().length > 0,
      userMessage: gitError.getUserMessage(),
      logLevel:
        gitError.severity === "error"
          ? "error"
          : gitError.severity === "warning"
          ? "warn"
          : "info",
      recoveryActions: gitError.getRecoveryActions(),
      fallbackAction: this.createGitFallbackAction(gitError),
    };
  }

  /**
   * Handle AI service errors
   */
  async handleAIError(error: Error): Promise<ErrorResponse> {
    let aiError: AIError;

    if (error instanceof AIError) {
      aiError = error;
    } else {
      // Convert generic errors to AIError
      const code = this.classifyAIError(error.message);
      aiError = new AIError(error.message, code);
    }

    this.logError(aiError);

    return {
      canRecover: true, // AI errors are always recoverable with fallback
      userMessage: aiError.getUserMessage(),
      logLevel:
        aiError.severity === "error"
          ? "error"
          : aiError.severity === "warning"
          ? "warn"
          : "info",
      recoveryActions: aiError.getRecoveryActions(),
      fallbackAction: this.createAIFallbackAction(),
    };
  }

  /**
   * Handle configuration errors
   */
  async handleConfigError(error: Error): Promise<ErrorResponse> {
    let configError: ConfigurationError;

    if (error instanceof ConfigurationError) {
      configError = error;
    } else {
      // Convert generic errors to ConfigurationError
      const code = this.classifyConfigError(error.message);
      configError = new ConfigurationError(error.message, code);
    }

    this.logError(configError);

    return {
      canRecover: true, // Config errors are recoverable by using defaults
      userMessage: configError.getUserMessage(),
      logLevel:
        configError.severity === "error"
          ? "error"
          : configError.severity === "warning"
          ? "warn"
          : "info",
      recoveryActions: configError.getRecoveryActions(),
      fallbackAction: this.createConfigFallbackAction(),
    };
  }

  /**
   * Handle validation errors
   */
  async handleValidationError(error: Error): Promise<ErrorResponse> {
    let validationError: ValidationError;

    if (error instanceof ValidationError) {
      validationError = error;
    } else {
      // Convert generic errors to ValidationError
      const code = this.classifyValidationError(error.message);
      validationError = new ValidationError(error.message, code);
    }

    this.logError(validationError);

    return {
      canRecover: true, // Validation errors are usually recoverable
      userMessage: validationError.getUserMessage(),
      logLevel:
        validationError.severity === "error"
          ? "error"
          : validationError.severity === "warning"
          ? "warn"
          : "info",
      recoveryActions: validationError.getRecoveryActions(),
    };
  }

  /**
   * Show error to user with recovery options
   */
  async showErrorToUser(errorResponse: ErrorResponse): Promise<void> {
    const actions = errorResponse.recoveryActions.map((action) => action.label);

    let selectedAction: string | undefined;

    if (errorResponse.logLevel === "error") {
      selectedAction = await vscode.window.showErrorMessage(
        errorResponse.userMessage,
        ...actions
      );
    } else if (errorResponse.logLevel === "warn") {
      selectedAction = await vscode.window.showWarningMessage(
        errorResponse.userMessage,
        ...actions
      );
    } else {
      selectedAction = await vscode.window.showInformationMessage(
        errorResponse.userMessage,
        ...actions
      );
    }

    // Execute selected recovery action
    if (selectedAction) {
      const recoveryAction = errorResponse.recoveryActions.find(
        (action) => action.label === selectedAction
      );
      if (recoveryAction) {
        try {
          await recoveryAction.action();
        } catch (actionError) {
          this.outputChannel.appendLine(
            `Recovery action failed: ${actionError}`
          );
        }
      }
    }

    // Execute fallback action if available and no recovery action was selected
    if (!selectedAction && errorResponse.fallbackAction) {
      try {
        await errorResponse.fallbackAction();
      } catch (fallbackError) {
        this.outputChannel.appendLine(
          `Fallback action failed: ${fallbackError}`
        );
      }
    }
  }

  /**
   * Log error to output channel
   */
  private logError(error: ExtensionError): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(
      `[${timestamp}] ${error.name}: ${error.message}`
    );
    this.outputChannel.appendLine(
      `Code: ${error.code}, Severity: ${error.severity}`
    );

    if (error.stack) {
      this.outputChannel.appendLine(`Stack: ${error.stack}`);
    }
  }

  /**
   * Classify generic Git errors
   */
  private classifyGitError(message: string): string {
    if (
      message.includes("not a git repository") ||
      message.includes("Not a git repository")
    ) {
      return "NOT_A_REPOSITORY";
    }
    if (
      message.includes("no staged changes") ||
      message.includes("No staged changes")
    ) {
      return "NO_STAGED_CHANGES";
    }
    if (message.includes("no changes") || message.includes("No changes")) {
      return "NO_CHANGES";
    }
    if (message.includes("merge conflict") || message.includes("conflicts")) {
      return "MERGE_CONFLICTS";
    }
    return "REPOSITORY_ACCESS_ERROR";
  }

  /**
   * Classify generic AI errors
   */
  private classifyAIError(message: string): string {
    if (message.includes("unavailable") || message.includes("not available")) {
      return "SERVICE_UNAVAILABLE";
    }
    if (
      message.includes("rate limit") ||
      message.includes("too many requests")
    ) {
      return "RATE_LIMIT_EXCEEDED";
    }
    if (
      message.includes("invalid response") ||
      message.includes("empty response")
    ) {
      return "INVALID_RESPONSE";
    }
    if (message.includes("no model") || message.includes("model not found")) {
      return "MODEL_NOT_AVAILABLE";
    }
    return "GENERATION_FAILED";
  }

  /**
   * Classify generic configuration errors
   */
  private classifyConfigError(message: string): string {
    if (
      message.includes("invalid settings") ||
      message.includes("invalid configuration")
    ) {
      return "INVALID_SETTINGS";
    }
    if (
      message.includes("template not found") ||
      message.includes("missing template")
    ) {
      return "MISSING_TEMPLATE";
    }
    if (
      message.includes("template validation") ||
      message.includes("invalid template")
    ) {
      return "TEMPLATE_VALIDATION_FAILED";
    }
    return "CONFIGURATION_ERROR";
  }

  /**
   * Classify generic validation errors
   */
  private classifyValidationError(message: string): string {
    if (message.includes("too long") || message.includes("exceeds length")) {
      return "MESSAGE_TOO_LONG";
    }
    if (message.includes("invalid format") || message.includes("format")) {
      return "INVALID_COMMIT_FORMAT";
    }
    if (message.includes("empty") || message.includes("blank")) {
      return "EMPTY_MESSAGE";
    }
    return "VALIDATION_FAILED";
  }

  /**
   * Create fallback action for Git errors
   */
  private createGitFallbackAction(
    error: GitError
  ): (() => Promise<void>) | undefined {
    switch (error.code) {
      case "NOT_A_REPOSITORY":
        return async () => {
          vscode.window.showInformationMessage(
            "Please initialize a Git repository or open a folder with an existing repository."
          );
        };
      case "NO_STAGED_CHANGES":
      case "NO_CHANGES":
        return async () => {
          await vscode.commands.executeCommand("workbench.view.scm");
        };
      default:
        return undefined;
    }
  }

  /**
   * Create fallback action for AI errors
   */
  private createAIFallbackAction(): () => Promise<void> {
    return async () => {
      // This would trigger template-based generation
      vscode.window.showInformationMessage(
        "Falling back to template-based commit message generation."
      );
    };
  }

  /**
   * Create fallback action for configuration errors
   */
  private createConfigFallbackAction(): () => Promise<void> {
    return async () => {
      vscode.window.showInformationMessage(
        "Using default configuration settings."
      );
    };
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.outputChannel.dispose();
  }
}
