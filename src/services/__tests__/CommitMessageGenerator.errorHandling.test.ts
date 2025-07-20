import { vi } from "vitest";
import { CommitMessageGeneratorImpl } from "../CommitMessageGenerator";
import {
  GitService,
  GitDiff,
  RepoStatus,
  ConflictInfo,
} from "../../interfaces/GitService";
import { AIService, ChangeContext } from "../../interfaces/AIService";
import { ChangeAnalysisService } from "../../interfaces/ChangeAnalysis";
import { ChangeAnalysis } from "../../interfaces/CommitMessageGenerator";
import { UserPreferences } from "../../interfaces/Configuration";
import { CommitType } from "../../interfaces/CommitMessageGenerator";
import {
  GitError,
  AIError,
  ValidationError,
  ErrorHandler,
} from "../ErrorHandler";
import { GenerationOptions } from "../../interfaces/CommitMessageGenerator";

// Mock vscode module
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

describe("CommitMessageGenerator Error Handling Integration", () => {
  let generator: CommitMessageGeneratorImpl;
  let mockGitService: any;
  let mockAIService: any;
  let mockChangeAnalysisService: any;
  let mockUserPreferences: UserPreferences;
  let mockErrorHandler: any;

  const mockDiff: GitDiff = {
    files: [
      {
        path: "src/features/newFeature.ts",
        status: "added",
        additions: 10,
        deletions: 0,
        diff: "mock diff content with new feature implementation",
      },
    ],
    additions: 10,
    deletions: 0,
    summary: "Added new feature",
  };

  const mockAnalysis: ChangeAnalysis = {
    commitType: CommitType.FEAT,
    scope: "features",
    description: "Add new feature functionality",
    impactLevel: "moderate",
    fileTypes: ["typescript"],
  };

  beforeEach(() => {
    // Create mocked services
    mockGitService = {
      getStagedChanges: vi.fn(),
      getAllChanges: vi.fn(),
      getRepositoryStatus: vi.fn(),
      isValidRepository: vi.fn(),
      getConflictStatus: vi.fn(),
    };

    mockAIService = {
      getCurrentModel: vi.fn(),
      generateCommitMessage: vi.fn(),
      isAvailable: vi.fn(),
    };

    mockChangeAnalysisService = {
      analyzeChanges: vi.fn(),
    };

    mockUserPreferences = {
      commitStyle: "conventional",
      includeBody: false,
      customTypes: [CommitType.FEAT, CommitType.FIX, CommitType.DOCS],
      templates: {},
      analysisSettings: {
        enableFileTypeAnalysis: true,
        enableScopeInference: true,
        enableImpactAnalysis: true,
      },
    };

    // Mock ErrorHandler
    mockErrorHandler = {
      handleGitError: vi.fn(),
      handleAIError: vi.fn(),
      handleConfigError: vi.fn(),
      handleValidationError: vi.fn(),
      showErrorToUser: vi.fn(),
      dispose: vi.fn(),
    } as any;

    // Mock ErrorHandler.getInstance()
    vi.spyOn(ErrorHandler, "getInstance").mockReturnValue(mockErrorHandler);

    // Create generator instance
    generator = new CommitMessageGeneratorImpl(
      mockGitService,
      mockAIService,
      mockChangeAnalysisService,
      mockUserPreferences
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Git Error Handling Integration", () => {
    it("should handle NOT_A_REPOSITORY error with proper error flow", async () => {
      // Arrange
      const gitError = new GitError("Not a git repository", "NOT_A_REPOSITORY");
      mockGitService.isValidRepository.mockRejectedValue(gitError);

      const errorResponse = {
        canRecover: true,
        userMessage:
          "This folder is not a Git repository. Initialize Git to use commit message generation.",
        logLevel: "error" as const,
        recoveryActions: [],
      };
      mockErrorHandler.handleGitError.mockResolvedValue(errorResponse);

      const options: GenerationOptions = {
        includeScope: true,
        maxLength: 50,
      };

      // Act & Assert
      await expect(generator.generateMessage(options)).rejects.toThrow(
        GitError
      );

      // Verify error handling flow
      expect(mockErrorHandler.handleGitError).toHaveBeenCalledWith(gitError);
      expect(mockErrorHandler.showErrorToUser).toHaveBeenCalledWith(
        errorResponse
      );
    });

    it("should handle NO_CHANGES error during validation", async () => {
      // Arrange
      mockGitService.isValidRepository.mockResolvedValue(true);

      const repoStatus: RepoStatus = {
        hasChanges: false,
        hasStagedChanges: false,
        isRepository: true,
        currentBranch: "main",
        
        
      };
      mockGitService.getRepositoryStatus.mockResolvedValue(repoStatus);

      const conflictStatus: ConflictInfo = {
        hasConflicts: false,
        conflictedFiles: [],
      };
      mockGitService.getConflictStatus.mockResolvedValue(conflictStatus);

      const errorResponse = {
        canRecover: true,
        userMessage:
          "No changes detected in the repository. Make some changes first.",
        logLevel: "error" as const,
        recoveryActions: [],
      };
      mockErrorHandler.handleGitError.mockResolvedValue(errorResponse);

      const options: GenerationOptions = {
        includeScope: true,
        maxLength: 50,
      };

      // Act & Assert
      await expect(generator.generateMessage(options)).rejects.toThrow(
        GitError
      );

      // Verify the specific error was handled
      expect(mockErrorHandler.handleGitError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "NO_CHANGES",
        })
      );
    });

    it("should handle MERGE_CONFLICTS error during validation", async () => {
      // Arrange
      mockGitService.isValidRepository.mockResolvedValue(true);

      const repoStatus: RepoStatus = {
        hasChanges: true,
        hasStagedChanges: true,
        isRepository: true,
        currentBranch: "main",
        
        
      };
      mockGitService.getRepositoryStatus.mockResolvedValue(repoStatus);

      const conflictStatus: ConflictInfo = {
        hasConflicts: true,
        conflictedFiles: ["src/conflict.ts", "package.json"],
      };
      mockGitService.getConflictStatus.mockResolvedValue(conflictStatus);

      const errorResponse = {
        canRecover: true,
        userMessage:
          "Merge conflicts detected. Resolve conflicts before generating commit messages.",
        logLevel: "error" as const,
        recoveryActions: [],
      };
      mockErrorHandler.handleGitError.mockResolvedValue(errorResponse);

      const options: GenerationOptions = {
        includeScope: true,
        maxLength: 50,
      };

      // Act & Assert
      await expect(generator.generateMessage(options)).rejects.toThrow(
        GitError
      );

      // Verify the specific error was handled
      expect(mockErrorHandler.handleGitError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "MERGE_CONFLICTS",
          message: expect.stringContaining("src/conflict.ts, package.json"),
        })
      );
    });
  });

  describe("AI Error Handling Integration", () => {
    beforeEach(() => {
      // Setup successful git operations
      mockGitService.isValidRepository.mockResolvedValue(true);
      mockGitService.getRepositoryStatus.mockResolvedValue({
        hasChanges: true,
        hasStagedChanges: true,
        isRepository: true,
        currentBranch: "main",
        
        
      });
      mockGitService.getConflictStatus.mockResolvedValue({
        hasConflicts: false,
        conflictedFiles: [],
      });
      mockGitService.getAllChanges.mockResolvedValue(mockDiff);
      mockChangeAnalysisService.analyzeChanges.mockReturnValue(mockAnalysis);
    });

    it("should handle AI SERVICE_UNAVAILABLE error and fall back to template generation", async () => {
      // Arrange
      const aiError = new AIError(
        "AI service unavailable",
        "SERVICE_UNAVAILABLE"
      );
      mockAIService.generateCommitMessage.mockRejectedValue(aiError);

      const errorResponse = {
        canRecover: true,
        userMessage:
          "AI service is currently unavailable. Using fallback commit message generation.",
        logLevel: "error" as const,
        recoveryActions: [],
      };
      mockErrorHandler.handleAIError.mockResolvedValue(errorResponse);

      const options: GenerationOptions = {
        includeScope: true,
        maxLength: 50,
      };

      // Act
      const result = await generator.generateMessage(options);

      // Assert
      expect(result).toBeDefined();
      expect(result.subject).toBeTruthy();
      expect(mockErrorHandler.handleAIError).toHaveBeenCalledWith(aiError);
      expect(mockErrorHandler.showErrorToUser).toHaveBeenCalledWith(
        errorResponse
      );

      // Should have fallen back to template generation
      expect(result.subject).toContain("feat"); // Should use fallback template
    });

    it("should handle AI RATE_LIMIT_EXCEEDED error with proper recovery", async () => {
      // Arrange
      const aiError = new AIError("Rate limit exceeded", "RATE_LIMIT_EXCEEDED");
      mockAIService.generateCommitMessage.mockRejectedValue(aiError);

      const errorResponse = {
        canRecover: true,
        userMessage:
          "AI service rate limit exceeded. Please wait a moment before trying again.",
        logLevel: "error" as const,
        recoveryActions: [
          {
            label: "Try Again Later",
            action: vi.fn(),
          },
        ],
      };
      mockErrorHandler.handleAIError.mockResolvedValue(errorResponse);

      const options: GenerationOptions = {
        includeScope: true,
        maxLength: 50,
      };

      // Act
      const result = await generator.generateMessage(options);

      // Assert
      expect(result).toBeDefined();
      expect(mockErrorHandler.handleAIError).toHaveBeenCalledWith(aiError);
      expect(mockErrorHandler.showErrorToUser).toHaveBeenCalledWith(
        errorResponse
      );
    });

    it("should handle AI INVALID_RESPONSE error and continue with fallback", async () => {
      // Arrange
      const aiError = new AIError("Invalid AI response", "INVALID_RESPONSE");
      mockAIService.generateCommitMessage.mockRejectedValue(aiError);

      const errorResponse = {
        canRecover: true,
        userMessage:
          "AI service returned an invalid response. Using fallback generation.",
        logLevel: "error" as const,
        recoveryActions: [],
      };
      mockErrorHandler.handleAIError.mockResolvedValue(errorResponse);

      const options: GenerationOptions = {
        includeScope: true,
        maxLength: 50,
      };

      // Act
      const result = await generator.generateMessage(options);

      // Assert
      expect(result).toBeDefined();
      expect(result.subject).toBeTruthy();
      expect(mockErrorHandler.handleAIError).toHaveBeenCalledWith(aiError);

      // Should have used fallback generation
      expect(result.type).toBe("feat"); // From analysis
    });
  });

  describe("Validation Error Handling Integration", () => {
    beforeEach(() => {
      // Setup successful git and AI operations
      mockGitService.isValidRepository.mockResolvedValue(true);
      mockGitService.getRepositoryStatus.mockResolvedValue({
        hasChanges: true,
        hasStagedChanges: true,
        isRepository: true,
        currentBranch: "main",
        
        
      });
      mockGitService.getConflictStatus.mockResolvedValue({
        hasConflicts: false,
        conflictedFiles: [],
      });
      mockGitService.getAllChanges.mockResolvedValue(mockDiff);
      mockChangeAnalysisService.analyzeChanges.mockReturnValue(mockAnalysis);
    });

    it("should handle MESSAGE_TOO_LONG validation error with truncation", async () => {
      // Arrange
      const longMessage = "feat(test): " + "a".repeat(100); // Very long message
      mockAIService.generateCommitMessage.mockResolvedValue(longMessage);

      const errorResponse = {
        canRecover: true,
        userMessage:
          "Generated commit message is too long. It has been automatically shortened.",
        logLevel: "warn" as const,
        recoveryActions: [],
      };
      mockErrorHandler.handleValidationError.mockResolvedValue(errorResponse);

      const options: GenerationOptions = {
        includeScope: true,
        maxLength: 50, // Short limit to trigger truncation
      };

      // Act
      const result = await generator.generateMessage(options);

      // Assert
      expect(result).toBeDefined();
      expect(result.subject.length).toBeLessThanOrEqual(50);
      expect(result.subject).toContain("...");
      expect(mockErrorHandler.handleValidationError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "MESSAGE_TOO_LONG",
        })
      );
    });

    it("should handle INVALID_COMMIT_FORMAT validation error with format correction", async () => {
      // Arrange
      const invalidMessage = "just some text without format";
      mockAIService.generateCommitMessage.mockResolvedValue(invalidMessage);

      const options: GenerationOptions = {
        includeScope: true,
        maxLength: 100,
      };

      // Act
      const result = await generator.generateMessage(options);

      // Assert
      expect(result).toBeDefined();
      expect(result.subject).toMatch(/^feat(\(features\))?: /); // Should be corrected to conventional format
    });

    it("should handle EMPTY_MESSAGE validation error", async () => {
      // Arrange
      mockAIService.generateCommitMessage.mockResolvedValue("");

      const options: GenerationOptions = {
        includeScope: true,
        maxLength: 50,
      };

      // Act & Assert
      await expect(generator.generateMessage(options)).rejects.toThrow(
        ValidationError
      );

      // The error should be thrown directly, not handled by error handler
      expect(mockErrorHandler.handleValidationError).not.toHaveBeenCalled();
    });
  });

  describe("Complex Error Scenarios Integration", () => {
    it("should handle cascading errors: AI fails, fallback succeeds", async () => {
      // Arrange
      mockGitService.isValidRepository.mockResolvedValue(true);
      mockGitService.getRepositoryStatus.mockResolvedValue({
        hasChanges: true,
        hasStagedChanges: true,
        isRepository: true,
        currentBranch: "main",
        
        
      });
      mockGitService.getConflictStatus.mockResolvedValue({
        hasConflicts: false,
        conflictedFiles: [],
      });
      mockGitService.getAllChanges.mockResolvedValue(mockDiff);
      mockChangeAnalysisService.analyzeChanges.mockReturnValue(mockAnalysis);

      // AI fails
      const aiError = new AIError("Service unavailable", "SERVICE_UNAVAILABLE");
      mockAIService.generateCommitMessage.mockRejectedValue(aiError);

      const aiErrorResponse = {
        canRecover: true,
        userMessage:
          "AI service is currently unavailable. Using fallback commit message generation.",
        logLevel: "error" as const,
        recoveryActions: [],
      };
      mockErrorHandler.handleAIError.mockResolvedValue(aiErrorResponse);

      const options: GenerationOptions = {
        includeScope: true,
        maxLength: 50,
      };

      // Act
      const result = await generator.generateMessage(options);

      // Assert
      expect(result).toBeDefined();
      expect(result.subject).toBeTruthy();
      expect(result.type).toBe("feat");
      expect(mockErrorHandler.handleAIError).toHaveBeenCalledWith(aiError);
      expect(mockErrorHandler.showErrorToUser).toHaveBeenCalledWith(
        aiErrorResponse
      );
    });

    it("should handle multiple validation errors in sequence", async () => {
      // Arrange
      mockGitService.isValidRepository.mockResolvedValue(true);
      mockGitService.getRepositoryStatus.mockResolvedValue({
        hasChanges: true,
        hasStagedChanges: true,
        isRepository: true,
        currentBranch: "main",
        
        
      });
      mockGitService.getConflictStatus.mockResolvedValue({
        hasConflicts: false,
        conflictedFiles: [],
      });
      mockGitService.getAllChanges.mockResolvedValue(mockDiff);
      mockChangeAnalysisService.analyzeChanges.mockReturnValue(mockAnalysis);

      // AI returns invalid format AND too long message
      const longInvalidMessage =
        "invalid format message that is way too long " + "x".repeat(100);
      mockAIService.generateCommitMessage.mockResolvedValue(longInvalidMessage);

      const validationErrorResponse = {
        canRecover: true,
        userMessage:
          "Generated commit message is too long. It has been automatically shortened.",
        logLevel: "warn" as const,
        recoveryActions: [],
      };
      mockErrorHandler.handleValidationError.mockResolvedValue(
        validationErrorResponse
      );

      const options: GenerationOptions = {
        includeScope: true,
        maxLength: 50,
      };

      // Act
      const result = await generator.generateMessage(options);

      // Assert
      expect(result).toBeDefined();
      expect(result.subject.length).toBeLessThanOrEqual(50);
      expect(result.subject).toMatch(/^feat(\(features\))?: /); // Should be corrected to conventional format
      expect(mockErrorHandler.handleValidationError).toHaveBeenCalled();
    });

    it("should handle error during error handling (error handler failure)", async () => {
      // Arrange
      const gitError = new GitError("Not a git repository", "NOT_A_REPOSITORY");
      mockGitService.isValidRepository.mockRejectedValue(gitError);

      // Error handler itself fails
      mockErrorHandler.handleGitError.mockRejectedValue(
        new Error("Error handler failed")
      );

      const options: GenerationOptions = {
        includeScope: true,
        maxLength: 50,
      };

      // Act & Assert
      await expect(generator.generateMessage(options)).rejects.toThrow(
        GitError
      );
      expect(mockErrorHandler.handleGitError).toHaveBeenCalledWith(gitError);
    });
  });

  describe("Error Recovery Integration", () => {
    it("should provide appropriate recovery actions for different error types", async () => {
      // Arrange
      const gitError = new GitError("No staged changes", "NO_STAGED_CHANGES");
      mockGitService.isValidRepository.mockResolvedValue(true);
      mockGitService.getRepositoryStatus.mockResolvedValue({
        hasChanges: false,
        hasStagedChanges: false,
        isRepository: true,
        currentBranch: "main",
        
        
      });

      const errorResponse = {
        canRecover: true,
        userMessage:
          "No staged changes found. Stage your changes first using 'git add' or the Source Control panel.",
        logLevel: "error" as const,
        recoveryActions: [
          {
            label: "Open Source Control",
            action: vi.fn(),
          },
          {
            label: "Stage All Changes",
            action: vi.fn(),
          },
        ],
      };
      mockErrorHandler.handleGitError.mockResolvedValue(errorResponse);

      const options: GenerationOptions = {
        includeScope: true,
        maxLength: 50,
      };

      // Act & Assert
      await expect(generator.generateMessage(options)).rejects.toThrow();

      // Verify recovery actions are provided
      expect(mockErrorHandler.showErrorToUser).toHaveBeenCalledWith(
        expect.objectContaining({
          recoveryActions: expect.arrayContaining([
            expect.objectContaining({
              label: "Open Source Control",
            }),
            expect.objectContaining({
              label: "Stage All Changes",
            }),
          ]),
        })
      );
    });
  });
});
