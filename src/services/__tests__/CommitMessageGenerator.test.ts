import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { CommitMessageGeneratorImpl } from "../CommitMessageGenerator";
import { GitError, ValidationError } from "../ErrorHandler";
import {
  CommitMessage,
  GenerationOptions,
  CommitType,
  ChangeAnalysis,
} from "../../interfaces/CommitMessageGenerator";
import {
  GitDiff,
  GitService,
  RepoStatus,
  ConflictInfo,
} from "../../interfaces/GitService";
import { AIService, ChangeContext } from "../../interfaces/AIService";
import { ChangeAnalysisService } from "../../interfaces/ChangeAnalysis";
import { UserPreferences } from "../../interfaces/Configuration";

// Mock implementations
class MockGitService implements GitService {
  private mockStagedChanges: GitDiff = {
    files: [
      {
        path: "src/components/Button.tsx",
        status: "modified",
        additions: 5,
        deletions: 2,
        diff: "+  const handleClick = () => {\n+    onClick();\n+  };",
      },
    ],
    additions: 5,
    deletions: 2,
    summary: "Modified Button component",
  };

  private mockRepoStatus: RepoStatus = {
    isRepository: true,
    hasChanges: true,
    hasStagedChanges: true,
    currentBranch: "main",
  };

  private mockConflictStatus: ConflictInfo = {
    hasConflicts: false,
    conflictedFiles: [],
  };

  async getAllChanges(): Promise<GitDiff> {
    return this.mockStagedChanges;
  }

  async getStagedChanges(): Promise<GitDiff> {
    return this.mockStagedChanges;
  }

  async getRepositoryStatus(): Promise<RepoStatus> {
    return this.mockRepoStatus;
  }

  async isValidRepository(): Promise<boolean> {
    return this.mockRepoStatus.isRepository;
  }

  async getConflictStatus(): Promise<ConflictInfo> {
    return this.mockConflictStatus;
  }

  // Test helper methods
  setStagedChanges(changes: GitDiff): void {
    this.mockStagedChanges = changes;
  }

  setRepoStatus(status: RepoStatus): void {
    this.mockRepoStatus = status;
  }

  setConflictStatus(conflicts: ConflictInfo): void {
    this.mockConflictStatus = conflicts;
  }
}

class MockAIService implements AIService {
  private mockResponse =
    "feat(components): add click handler to Button component";

  async getCurrentModel() {
    return {
      id: "test-model",
      name: "Test Model",
      provider: "test",
      isAvailable: true,
    };
  }

  async generateCommitMessage(
    prompt: string,
    context: ChangeContext
  ): Promise<string> {
    return this.mockResponse;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  // Test helper method
  setMockResponse(response: string): void {
    this.mockResponse = response;
  }
}

class MockChangeAnalysisService implements ChangeAnalysisService {
  private mockAnalysis: ChangeAnalysis = {
    commitType: CommitType.FEAT,
    scope: "components",
    description: "add click handler to Button component",
    impactLevel: "minor",
    fileTypes: ["typescript", "react"],
  };

  analyzeChanges(diff: GitDiff): ChangeAnalysis {
    return this.mockAnalysis;
  }

  inferCommitType(): CommitType {
    return this.mockAnalysis.commitType;
  }

  detectScope(): string | undefined {
    return this.mockAnalysis.scope;
  }

  categorizeFilesByType(): Record<string, string[]> {
    return { typescript: ["Button.tsx"] };
  }

  assessImpactLevel(): "minor" | "moderate" | "major" {
    return this.mockAnalysis.impactLevel;
  }

  // Test helper method
  setMockAnalysis(analysis: ChangeAnalysis): void {
    this.mockAnalysis = analysis;
  }
}

describe("CommitMessageGenerator", () => {
  let generator: CommitMessageGeneratorImpl;
  let mockGitService: MockGitService;
  let mockAIService: MockAIService;
  let mockChangeAnalysisService: MockChangeAnalysisService;
  let defaultPreferences: UserPreferences;
  let defaultOptions: GenerationOptions;

  beforeEach(() => {
    mockGitService = new MockGitService();
    mockAIService = new MockAIService();
    mockChangeAnalysisService = new MockChangeAnalysisService();

    defaultPreferences = {
      commitStyle: "conventional",
      includeBody: false,
      customTypes: [
        CommitType.FEAT,
        CommitType.FIX,
        CommitType.DOCS,
        CommitType.STYLE,
        CommitType.REFACTOR,
        CommitType.TEST,
        CommitType.CHORE,
      ],
      templates: {},
      analysisSettings: {
        enableFileTypeAnalysis: true,
        enableScopeInference: true,
        enableImpactAnalysis: true,
      },
    };

    defaultOptions = {
      includeScope: true,
      maxLength: 50,
    };

    generator = new CommitMessageGeneratorImpl(
      mockGitService,
      mockAIService,
      mockChangeAnalysisService,
      defaultPreferences
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("generateMessage", () => {
    it("should generate a conventional commit message successfully", async () => {
      // Arrange
      mockAIService.setMockResponse(
        "feat(components): add click handler to Button"
      );

      // Act
      const result = await generator.generateMessage(defaultOptions);

      // Assert
      expect(result).toEqual({
        subject: "feat(components): add click handler to Button",
        type: "feat",
        scope: "components",
        body: undefined,
        isConventional: true,
      });
    });

    it("should generate message with body when includeBody is enabled", async () => {
      // Arrange
      const preferencesWithBody = { ...defaultPreferences, includeBody: true };
      generator = new CommitMessageGeneratorImpl(
        mockGitService,
        mockAIService,
        mockChangeAnalysisService,
        preferencesWithBody
      );
      mockAIService.setMockResponse(
        "feat(components): add click handler to Button"
      );

      // Act
      const result = await generator.generateMessage(defaultOptions);

      // Assert
      expect(result.body).toBeDefined();
      expect(result.body).toContain("Affects: typescript, react files");
    });

    it("should handle custom commit type in options", async () => {
      // Arrange
      const optionsWithType = { ...defaultOptions, commitType: "fix" };
      mockAIService.setMockResponse(
        "fix(components): resolve click handler issue"
      );

      // Act
      const result = await generator.generateMessage(optionsWithType);

      // Assert
      expect(result.type).toBe("fix");
      expect(result.subject).toContain("fix(components)");
    });

    it("should respect maxLength constraint", async () => {
      // Arrange
      const shortOptions = { ...defaultOptions, maxLength: 30 };
      mockAIService.setMockResponse(
        "feat(components): add click handler to Button component with very long description"
      );

      // Act & Assert
      await expect(generator.generateMessage(shortOptions)).rejects.toThrow(
        ValidationError
      );
    });

    it("should handle non-conventional commit style", async () => {
      // Arrange
      const customPreferences = {
        ...defaultPreferences,
        commitStyle: "custom" as const,
      };
      generator = new CommitMessageGeneratorImpl(
        mockGitService,
        mockAIService,
        mockChangeAnalysisService,
        customPreferences
      );
      mockAIService.setMockResponse("Add click handler to Button component");

      // Act
      const result = await generator.generateMessage(defaultOptions);

      // Assert
      expect(result.isConventional).toBe(false);
      expect(result.subject).toBe("Add click handler to Button component");
    });

    it("should handle custom template", async () => {
      // Arrange
      const optionsWithTemplate = {
        ...defaultOptions,
        customTemplate: "[{type}] {scope}: {description}",
      };
      mockAIService.setMockResponse("feat(components): add click handler");

      // Act
      const result = await generator.generateMessage(optionsWithTemplate);

      // Assert
      expect(result).toBeDefined();
      expect(result.subject).toContain("feat(components)");
    });
  });

  describe("validateChanges", () => {
    it("should return true when repository is valid and has changes", async () => {
      // Act
      const result = await generator.validateChanges();

      // Assert
      expect(result).toBe(true);
    });

    it("should throw GitError when not in a git repository", async () => {
      // Arrange
      mockGitService.setRepoStatus({
        isRepository: false,
        hasChanges: false,
        hasStagedChanges: false,
        currentBranch: "",
      });

      // Act & Assert
      await expect(generator.validateChanges()).rejects.toThrow(GitError);
    });

    it("should throw GitError when no changes exist", async () => {
      // Arrange
      mockGitService.setRepoStatus({
        isRepository: true,
        hasChanges: false,
        hasStagedChanges: false,
        currentBranch: "main",
      });

      // Act & Assert
      await expect(generator.validateChanges()).rejects.toThrow(GitError);
    });

    it("should throw Error when merge conflicts exist", async () => {
      // Arrange
      mockGitService.setConflictStatus({
        hasConflicts: true,
        conflictedFiles: ["src/components/Button.tsx", "src/utils/helper.ts"],
      });

      // Act & Assert
      await expect(generator.validateChanges()).rejects.toThrow(Error);
    });
  });

  describe("analyzeChanges", () => {
    it("should delegate to change analysis service", () => {
      // Arrange
      const mockDiff: GitDiff = {
        files: [
          {
            path: "test.ts",
            status: "modified",
            additions: 1,
            deletions: 0,
            diff: "+test",
          },
        ],
        additions: 1,
        deletions: 0,
        summary: "test change",
      };

      // Act
      const result = generator.analyzeChanges(mockDiff);

      // Assert
      expect(result).toEqual({
        commitType: CommitType.FEAT,
        scope: "components",
        description: "add click handler to Button component",
        impactLevel: "minor",
        fileTypes: ["typescript", "react"],
      });
    });
  });

  describe("error handling", () => {
    it("should wrap unknown errors in Error", async () => {
      // Arrange
      const errorGitService = {
        ...mockGitService,
        getStagedChanges: vi
          .fn()
          .mockRejectedValue(new Error("Git command failed")),
      } as unknown as GitService;

      generator = new CommitMessageGeneratorImpl(
        errorGitService,
        mockAIService,
        mockChangeAnalysisService,
        defaultPreferences
      );

      // Act & Assert
      await expect(generator.generateMessage(defaultOptions)).rejects.toThrow(
        Error
      );
    });

    it("should preserve specific error types", async () => {
      // Arrange
      mockGitService.setRepoStatus({
        isRepository: true,
        hasChanges: false,
        hasStagedChanges: false,
        currentBranch: "main",
      });

      // Act & Assert
      await expect(generator.generateMessage(defaultOptions)).rejects.toThrow(
        GitError
      );
    });
  });

  describe("message validation", () => {
    it("should validate conventional commit format", async () => {
      // Arrange
      mockAIService.setMockResponse("invalid format message");

      // Act
      const result = await generator.generateMessage(defaultOptions);

      // Assert - should still work but not be conventional
      expect(result.isConventional).toBe(false);
    });

    it("should reject empty commit messages", async () => {
      // Arrange
      mockAIService.setMockResponse("   ");

      // Act & Assert
      await expect(generator.generateMessage(defaultOptions)).rejects.toThrow(
        ValidationError
      );
    });

    it("should validate commit type against allowed types", async () => {
      // Arrange
      mockAIService.setMockResponse("invalid(scope): test message");

      // Act & Assert
      await expect(generator.generateMessage(defaultOptions)).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe("integration scenarios", () => {
    it("should handle multiple file changes", async () => {
      // Arrange
      const multiFileDiff: GitDiff = {
        files: [
          {
            path: "src/components/Button.tsx",
            status: "modified",
            additions: 5,
            deletions: 2,
            diff: "+handler",
          },
          {
            path: "src/components/Input.tsx",
            status: "added",
            additions: 20,
            deletions: 0,
            diff: "+new component",
          },
          {
            path: "README.md",
            status: "modified",
            additions: 3,
            deletions: 1,
            diff: "+documentation",
          },
        ],
        additions: 28,
        deletions: 3,
        summary: "Multiple component changes",
      };

      const extendedOptions = { ...defaultOptions, maxLength: 60 };

      mockGitService.setStagedChanges(multiFileDiff);
      mockChangeAnalysisService.setMockAnalysis({
        commitType: CommitType.FEAT,
        scope: "components",
        description: "add Input component and update Button",
        impactLevel: "moderate",
        fileTypes: ["typescript", "react", "markdown"],
      });
      mockAIService.setMockResponse(
        "feat(components): add Input component and update Button"
      );

      // Act
      const result = await generator.generateMessage(extendedOptions);

      // Assert
      expect(result.type).toBe("feat");
      expect(result.scope).toBe("components");
      expect(result.subject).toContain("Input component");
    });

    it("should handle large impact changes", async () => {
      // Arrange
      const largeDiff: GitDiff = {
        files: Array.from({ length: 15 }, (_, i) => ({
          path: `src/file${i}.ts`,
          status: "modified" as const,
          additions: 10,
          deletions: 5,
          diff: "+major changes",
        })),
        additions: 150,
        deletions: 75,
        summary: "Major refactoring",
      };

      const extendedOptions = { ...defaultOptions, maxLength: 60 };

      mockGitService.setStagedChanges(largeDiff);
      mockChangeAnalysisService.setMockAnalysis({
        commitType: CommitType.REFACTOR,
        scope: "core",
        description: "restructure application architecture",
        impactLevel: "major",
        fileTypes: ["typescript"],
      });
      mockAIService.setMockResponse(
        "refactor(core): restructure application architecture"
      );

      // Act
      const result = await generator.generateMessage(extendedOptions);

      // Assert
      expect(result.type).toBe("refactor");
      expect(result.subject).toContain("restructure");
    });

    it("should handle documentation-only changes", async () => {
      // Arrange
      const docsDiff: GitDiff = {
        files: [
          {
            path: "README.md",
            status: "modified",
            additions: 10,
            deletions: 2,
            diff: "+documentation",
          },
          {
            path: "docs/api.md",
            status: "added",
            additions: 50,
            deletions: 0,
            diff: "+new docs",
          },
        ],
        additions: 60,
        deletions: 2,
        summary: "Documentation updates",
      };

      mockGitService.setStagedChanges(docsDiff);
      mockChangeAnalysisService.setMockAnalysis({
        commitType: CommitType.DOCS,
        scope: undefined,
        description: "update README and add API documentation",
        impactLevel: "minor",
        fileTypes: ["markdown"],
      });
      mockAIService.setMockResponse(
        "docs: update README and add API documentation"
      );

      // Act
      const result = await generator.generateMessage(defaultOptions);

      // Assert
      expect(result.type).toBe("docs");
      expect(result.scope).toBeUndefined();
      expect(result.subject).toContain("README");
    });
  });

  describe("preferences management", () => {
    it("should update preferences correctly", () => {
      // Arrange
      const newPreferences: UserPreferences = {
        ...defaultPreferences,
        commitStyle: "custom",
        includeBody: true,
      };

      // Act
      generator.updatePreferences(newPreferences);
      const result = generator.getPreferences();

      // Assert
      expect(result.commitStyle).toBe("custom");
      expect(result.includeBody).toBe(true);
    });

    it("should return current preferences", () => {
      // Act
      const result = generator.getPreferences();

      // Assert
      expect(result).toEqual(defaultPreferences);
    });
  });
});
