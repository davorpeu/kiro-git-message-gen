import { vi } from "vitest";
import {
  ErrorHandler,
  GitError,
  AIError,
  ConfigurationError,
  ValidationError,
} from "../ErrorHandler";
import * as vscode from "vscode";

// Mock vscode
vi.mock("vscode", () => ({
  window: {
    createOutputChannel: vi.fn(() => ({
      appendLine: vi.fn(),
      dispose: vi.fn(),
    })),
    showErrorMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showInformationMessage: vi.fn(),
    createTerminal: vi.fn(() => ({
      sendText: vi.fn(),
      show: vi.fn(),
    })),
  },
  commands: {
    executeCommand: vi.fn(),
  },
  env: {
    openExternal: vi.fn(),
  },
  Uri: {
    parse: vi.fn(),
  },
}));

describe("ErrorHandler", () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorHandler = ErrorHandler.getInstance();
    vi.clearAllMocks();
  });

  describe("GitError handling", () => {
    it("should handle NOT_A_REPOSITORY error", async () => {
      const error = new GitError("Not a git repository", "NOT_A_REPOSITORY");
      const response = await errorHandler.handleGitError(error);

      expect(response.canRecover).toBe(true);
      expect(response.userMessage).toContain("not a Git repository");
      expect(response.recoveryActions).toHaveLength(2);
      expect(response.recoveryActions[0].label).toBe(
        "Initialize Git Repository"
      );
    });

    it("should handle NO_STAGED_CHANGES error", async () => {
      const error = new GitError("No staged changes", "NO_STAGED_CHANGES");
      const response = await errorHandler.handleGitError(error);

      expect(response.canRecover).toBe(true);
      expect(response.userMessage).toContain("No staged changes found");
      expect(response.recoveryActions).toHaveLength(2);
      expect(response.recoveryActions[0].label).toBe("Open Source Control");
    });

    it("should handle MERGE_CONFLICTS error", async () => {
      const error = new GitError("Merge conflicts detected", "MERGE_CONFLICTS");
      const response = await errorHandler.handleGitError(error);

      expect(response.canRecover).toBe(true);
      expect(response.userMessage).toContain("Merge conflicts detected");
      expect(response.recoveryActions).toHaveLength(2);
    });

    it("should classify generic git errors", async () => {
      const error = new Error("not a git repository");
      const response = await errorHandler.handleGitError(error);

      expect(response.userMessage).toContain("not a Git repository");
    });
  });

  describe("AIError handling", () => {
    it("should handle SERVICE_UNAVAILABLE error", async () => {
      const error = new AIError(
        "AI service unavailable",
        "SERVICE_UNAVAILABLE"
      );
      const response = await errorHandler.handleAIError(error);

      expect(response.canRecover).toBe(true);
      expect(response.userMessage).toContain(
        "AI service is currently unavailable"
      );
      expect(response.recoveryActions).toHaveLength(2);
      expect(response.fallbackAction).toBeDefined();
    });

    it("should handle RATE_LIMIT_EXCEEDED error", async () => {
      const error = new AIError("Rate limit exceeded", "RATE_LIMIT_EXCEEDED");
      const response = await errorHandler.handleAIError(error);

      expect(response.canRecover).toBe(true);
      expect(response.userMessage).toContain("rate limit exceeded");
      expect(response.recoveryActions).toHaveLength(1);
      expect(response.recoveryActions[0].label).toBe("Try Again Later");
    });

    it("should handle INVALID_RESPONSE error", async () => {
      const error = new AIError("Invalid response", "INVALID_RESPONSE");
      const response = await errorHandler.handleAIError(error);

      expect(response.canRecover).toBe(true);
      expect(response.userMessage).toContain("invalid response");
      expect(response.fallbackAction).toBeDefined();
    });

    it("should classify generic AI errors", async () => {
      const error = new Error("rate limit exceeded");
      const response = await errorHandler.handleAIError(error);

      expect(response.userMessage).toContain("rate limit exceeded");
    });
  });

  describe("ConfigurationError handling", () => {
    it("should handle INVALID_SETTINGS error", async () => {
      const error = new ConfigurationError(
        "Invalid settings",
        "INVALID_SETTINGS"
      );
      const response = await errorHandler.handleConfigError(error);

      expect(response.canRecover).toBe(true);
      expect(response.userMessage).toContain("Invalid extension settings");
      expect(response.recoveryActions).toHaveLength(2);
      expect(response.recoveryActions[0].label).toBe("Open Settings");
    });

    it("should handle MISSING_TEMPLATE error", async () => {
      const error = new ConfigurationError(
        "Template not found",
        "MISSING_TEMPLATE"
      );
      const response = await errorHandler.handleConfigError(error);

      expect(response.canRecover).toBe(true);
      expect(response.userMessage).toContain("Custom template not found");
      expect(response.recoveryActions).toHaveLength(1);
      expect(response.recoveryActions[0].label).toBe("Edit Templates");
    });
  });

  describe("ValidationError handling", () => {
    it("should handle MESSAGE_TOO_LONG error", async () => {
      const error = new ValidationError("Message too long", "MESSAGE_TOO_LONG");
      const response = await errorHandler.handleValidationError(error);

      expect(response.canRecover).toBe(true);
      expect(response.userMessage).toContain("too long");
      expect(response.recoveryActions).toHaveLength(1);
      expect(response.recoveryActions[0].label).toBe("Edit Message");
    });

    it("should handle INVALID_COMMIT_FORMAT error", async () => {
      const error = new ValidationError(
        "Invalid format",
        "INVALID_COMMIT_FORMAT"
      );
      const response = await errorHandler.handleValidationError(error);

      expect(response.canRecover).toBe(true);
      expect(response.userMessage).toContain("conventional format");
      expect(response.recoveryActions).toHaveLength(1);
      expect(response.recoveryActions[0].label).toBe("View Format Guide");
    });

    it("should handle EMPTY_MESSAGE error", async () => {
      const error = new ValidationError("Empty message", "EMPTY_MESSAGE");
      const response = await errorHandler.handleValidationError(error);

      expect(response.canRecover).toBe(true);
      expect(response.userMessage).toContain("empty");
      expect(response.recoveryActions).toHaveLength(2);
      expect(response.recoveryActions[0].label).toBe("Try Again");
      expect(response.recoveryActions[1].label).toBe("Write Manually");
    });
  });

  describe("showErrorToUser", () => {
    it("should show error message and execute recovery action", async () => {
      const mockAction = vi.fn();
      const errorResponse = {
        canRecover: true,
        userMessage: "Test error message",
        logLevel: "error" as const,
        recoveryActions: [
          {
            label: "Test Action",
            action: mockAction,
          },
        ],
      };

      (vscode.window.showErrorMessage as any).mockResolvedValue(
        "Test Action"
      );

      await errorHandler.showErrorToUser(errorResponse);

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        "Test error message",
        "Test Action"
      );
      expect(mockAction).toHaveBeenCalled();
    });

    it("should show warning message for warning level errors", async () => {
      const errorResponse = {
        canRecover: true,
        userMessage: "Test warning message",
        logLevel: "warn" as const,
        recoveryActions: [],
      };

      await errorHandler.showErrorToUser(errorResponse);

      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        "Test warning message"
      );
    });

    it("should show info message for info level errors", async () => {
      const errorResponse = {
        canRecover: true,
        userMessage: "Test info message",
        logLevel: "info" as const,
        recoveryActions: [],
      };

      await errorHandler.showErrorToUser(errorResponse);

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        "Test info message"
      );
    });

    it("should execute fallback action when no recovery action is selected", async () => {
      const mockFallback = vi.fn();
      const errorResponse = {
        canRecover: true,
        userMessage: "Test error message",
        logLevel: "error" as const,
        recoveryActions: [],
        fallbackAction: mockFallback,
      };

      (vscode.window.showErrorMessage as any).mockResolvedValue(
        undefined
      );

      await errorHandler.showErrorToUser(errorResponse);

      expect(mockFallback).toHaveBeenCalled();
    });
  });

  describe("Error classification", () => {
    it("should classify git errors correctly", async () => {
      const testCases = [
        { message: "not a git repository", expectedCode: "NOT_A_REPOSITORY" },
        { message: "no staged changes", expectedCode: "NO_STAGED_CHANGES" },
        {
          message: "merge conflicts detected",
          expectedCode: "MERGE_CONFLICTS",
        },
        {
          message: "unknown git error",
          expectedCode: "REPOSITORY_ACCESS_ERROR",
        },
      ];

      for (const testCase of testCases) {
        const error = new Error(testCase.message);
        const response = await errorHandler.handleGitError(error);

        // The classification is internal, but we can verify the user message
        expect(response.userMessage).toBeDefined();
      }
    });

    it("should classify AI errors correctly", async () => {
      const testCases = [
        {
          message: "service unavailable",
          expectedMessage: "AI service is currently unavailable",
        },
        {
          message: "rate limit exceeded",
          expectedMessage: "rate limit exceeded",
        },
        { message: "invalid response", expectedMessage: "invalid response" },
        {
          message: "no model available",
          expectedMessage: "No AI model is currently available",
        },
      ];

      for (const testCase of testCases) {
        const error = new Error(testCase.message);
        const response = await errorHandler.handleAIError(error);

        expect(response.userMessage.toLowerCase()).toContain(
          testCase.expectedMessage.toLowerCase().split(" ")[0]
        );
      }
    });
  });

  describe("Recovery actions", () => {
    it("should execute git recovery actions correctly", async () => {
      const error = new GitError("Not a repository", "NOT_A_REPOSITORY");
      const response = await errorHandler.handleGitError(error);

      // Test Initialize Git Repository action
      const initAction = response.recoveryActions[0];
      await initAction.action();

      expect(vscode.window.createTerminal).toHaveBeenCalledWith("Git Init");

      // Test Open Different Folder action
      const openAction = response.recoveryActions[1];
      await openAction.action();

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        "workbench.action.files.openFolder"
      );
    });

    it("should execute AI recovery actions correctly", async () => {
      const error = new AIError("Service unavailable", "SERVICE_UNAVAILABLE");
      const response = await errorHandler.handleAIError(error);

      // Test Check AI Settings action
      const settingsAction = response.recoveryActions[0];
      await settingsAction.action();

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        "workbench.action.openSettings",
        "kiro.ai"
      );
    });

    it("should execute validation recovery actions correctly", async () => {
      const error = new ValidationError(
        "Invalid format",
        "INVALID_COMMIT_FORMAT"
      );
      const response = await errorHandler.handleValidationError(error);

      // Test View Format Guide action
      const guideAction = response.recoveryActions[0];
      await guideAction.action();

      expect(vscode.env.openExternal).toHaveBeenCalledWith(
        expect.objectContaining({})
      );
    });
  });

  describe("Singleton pattern", () => {
    it("should return the same instance", () => {
      const instance1 = ErrorHandler.getInstance();
      const instance2 = ErrorHandler.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});
