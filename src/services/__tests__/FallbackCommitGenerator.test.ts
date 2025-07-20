import { FallbackCommitGenerator } from "../FallbackCommitGenerator";
import { GitDiff, ChangedFile } from "../../interfaces/GitService";
import {
  GenerationOptions,
  CommitType,
} from "../../interfaces/CommitMessageGenerator";
import { UserPreferences } from "../../interfaces/Configuration";

describe("FallbackCommitGenerator", () => {
  let generator: FallbackCommitGenerator;
  let mockPreferences: UserPreferences;

  beforeEach(() => {
    mockPreferences = {
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

    generator = new FallbackCommitGenerator(mockPreferences);
  });

  describe("generateMessage", () => {
    it("should generate message for single new file", () => {
      const diff: GitDiff = {
        files: [
          {
            path: "src/components/Button.tsx",
            status: "added",
            additions: 50,
            deletions: 0,
            diff: "+export const Button = () => { ... }",
          },
        ],
        additions: 50,
        deletions: 0,
        summary: "1 file added",
      };

      const options: GenerationOptions = {
        includeScope: true,
        maxLength: 50,
      };

      const result = generator.generateMessage(diff, options);

      expect(result.subject).toBe("feat(components): add Button");
      expect(result.type).toBe("feat");
      expect(result.scope).toBe("components");
      expect(result.isConventional).toBe(true);
    });

    it("should generate message for single modified file", () => {
      const diff: GitDiff = {
        files: [
          {
            path: "src/utils/helpers.ts",
            status: "modified",
            additions: 10,
            deletions: 5,
            diff: "+function validateInput() { ... }",
          },
        ],
        additions: 10,
        deletions: 5,
        summary: "1 file modified",
      };

      const options: GenerationOptions = {
        includeScope: true,
        maxLength: 50,
      };

      const result = generator.generateMessage(diff, options);

      expect(result.subject).toBe("feat(utils): update helpers");
      expect(result.type).toBe("feat");
      expect(result.scope).toBe("utils");
    });

    it("should generate message for test files", () => {
      const diff: GitDiff = {
        files: [
          {
            path: "src/components/__tests__/Button.test.tsx",
            status: "added",
            additions: 30,
            deletions: 0,
            diff: "+describe('Button', () => { ... })",
          },
        ],
        additions: 30,
        deletions: 0,
        summary: "1 test file added",
      };

      const options: GenerationOptions = {
        includeScope: true,
        maxLength: 50,
      };

      const result = generator.generateMessage(diff, options);

      expect(result.subject).toBe("test(components): add Button.test");
      expect(result.type).toBe("test");
    });

    it("should generate message for documentation files", () => {
      const diff: GitDiff = {
        files: [
          {
            path: "README.md",
            status: "modified",
            additions: 20,
            deletions: 5,
            diff: "+## Installation\n+npm install ...",
          },
        ],
        additions: 20,
        deletions: 5,
        summary: "1 file modified",
      };

      const options: GenerationOptions = {
        includeScope: false,
        maxLength: 50,
      };

      const result = generator.generateMessage(diff, options);

      expect(result.subject).toBe("docs: update README documentation");
      expect(result.type).toBe("docs");
    });

    it("should generate message for configuration files", () => {
      const diff: GitDiff = {
        files: [
          {
            path: "package.json",
            status: "modified",
            additions: 3,
            deletions: 1,
            diff: '+  "dependency": "^1.0.0"',
          },
        ],
        additions: 3,
        deletions: 1,
        summary: "1 file modified",
      };

      const options: GenerationOptions = {
        includeScope: false,
        maxLength: 50,
      };

      const result = generator.generateMessage(diff, options);

      expect(result.subject).toBe("chore: update package");
      expect(result.type).toBe("chore");
    });

    it("should generate message for multiple files", () => {
      const diff: GitDiff = {
        files: [
          {
            path: "src/components/Button.tsx",
            status: "modified",
            additions: 10,
            deletions: 2,
            diff: "+const handleClick = () => { ... }",
          },
          {
            path: "src/components/Input.tsx",
            status: "added",
            additions: 40,
            deletions: 0,
            diff: "+export const Input = () => { ... }",
          },
          {
            path: "src/components/index.ts",
            status: "modified",
            additions: 1,
            deletions: 0,
            diff: "+export { Input } from './Input';",
          },
        ],
        additions: 51,
        deletions: 2,
        summary: "3 files changed",
      };

      const options: GenerationOptions = {
        includeScope: true,
        maxLength: 50,
      };

      const result = generator.generateMessage(diff, options);

      expect(result.subject).toBe(
        "feat(components): add Input and related changes"
      );
      expect(result.type).toBe("feat");
      expect(result.scope).toBe("components");
    });

    it("should detect bug fix patterns", () => {
      const diff: GitDiff = {
        files: [
          {
            path: "src/utils/validation.ts",
            status: "modified",
            additions: 5,
            deletions: 2,
            diff: "+if (value === null || value === undefined) { return false; }",
          },
        ],
        additions: 5,
        deletions: 2,
        summary: "1 file modified",
      };

      const options: GenerationOptions = {
        includeScope: true,
        maxLength: 50,
      };

      const result = generator.generateMessage(diff, options);

      expect(result.subject).toBe("fix(utils): fix validation issues");
      expect(result.type).toBe("fix");
    });

    it("should detect style changes", () => {
      const diff: GitDiff = {
        files: [
          {
            path: "src/styles/components.css",
            status: "modified",
            additions: 15,
            deletions: 3,
            diff: "+.button { background-color: blue; }",
          },
        ],
        additions: 15,
        deletions: 3,
        summary: "1 file modified",
      };

      const options: GenerationOptions = {
        includeScope: true,
        maxLength: 50,
      };

      const result = generator.generateMessage(diff, options);

      expect(result.subject).toBe("style(styles): style components");
      expect(result.type).toBe("style");
    });

    it("should handle files without scope", () => {
      const diff: GitDiff = {
        files: [
          {
            path: "index.html",
            status: "modified",
            additions: 5,
            deletions: 1,
            diff: "+<title>New Title</title>",
          },
        ],
        additions: 5,
        deletions: 1,
        summary: "1 file modified",
      };

      const options: GenerationOptions = {
        includeScope: true,
        maxLength: 50,
      };

      const result = generator.generateMessage(diff, options);

      expect(result.subject).toBe("feat: update index");
      expect(result.type).toBe("feat");
      expect(result.scope).toBeUndefined();
    });

    it("should truncate long messages", () => {
      const diff: GitDiff = {
        files: [
          {
            path: "src/components/VeryLongComponentNameThatExceedsLimits.tsx",
            status: "added",
            additions: 100,
            deletions: 0,
            diff: "+export const VeryLongComponentName = () => { ... }",
          },
        ],
        additions: 100,
        deletions: 0,
        summary: "1 file added",
      };

      const options: GenerationOptions = {
        includeScope: true,
        maxLength: 30,
      };

      const result = generator.generateMessage(diff, options);

      expect(result.subject.length).toBeLessThanOrEqual(30);
      expect(result.subject).toContain("...");
    });

    it("should generate body when requested", () => {
      mockPreferences.includeBody = true;
      generator = new FallbackCommitGenerator(mockPreferences);

      const diff: GitDiff = {
        files: [
          {
            path: "src/components/Button.tsx",
            status: "added",
            additions: 50,
            deletions: 0,
            diff: "+export const Button = () => { ... }",
          },
        ],
        additions: 50,
        deletions: 0,
        summary: "1 file added",
      };

      const options: GenerationOptions = {
        includeScope: true,
        maxLength: 50,
      };

      const result = generator.generateMessage(diff, options);

      expect(result.body).toBeDefined();
      expect(result.body).toContain("Button.tsx");
      expect(result.body).toContain("+50 -0");
    });

    it("should handle non-conventional commit style", () => {
      mockPreferences.commitStyle = "custom";
      generator = new FallbackCommitGenerator(mockPreferences);

      const diff: GitDiff = {
        files: [
          {
            path: "src/utils/helpers.ts",
            status: "modified",
            additions: 10,
            deletions: 5,
            diff: "+function newHelper() { ... }",
          },
        ],
        additions: 10,
        deletions: 5,
        summary: "1 file modified",
      };

      const options: GenerationOptions = {
        includeScope: true,
        maxLength: 50,
      };

      const result = generator.generateMessage(diff, options);

      expect(result.subject).toBe("update helpers");
      expect(result.isConventional).toBe(false);
    });

    it("should apply custom template", () => {
      const diff: GitDiff = {
        files: [
          {
            path: "src/components/Button.tsx",
            status: "added",
            additions: 50,
            deletions: 0,
            diff: "+export const Button = () => { ... }",
          },
        ],
        additions: 50,
        deletions: 0,
        summary: "1 file added",
      };

      const options: GenerationOptions = {
        includeScope: true,
        maxLength: 50,
        customTemplate: "[{Type}] {description} in {scope}",
      };

      const result = generator.generateMessage(diff, options);

      expect(result.subject).toBe("[Feat] add Button in components");
    });
  });

  describe("updatePreferences", () => {
    it("should update preferences", () => {
      const newPreferences: UserPreferences = {
        ...mockPreferences,
        commitStyle: "custom",
        includeBody: true,
      };

      generator.updatePreferences(newPreferences);

      const diff: GitDiff = {
        files: [
          {
            path: "test.ts",
            status: "added",
            additions: 10,
            deletions: 0,
            diff: "+const test = true;",
          },
        ],
        additions: 10,
        deletions: 0,
        summary: "1 file added",
      };

      const options: GenerationOptions = {
        includeScope: false,
        maxLength: 50,
      };

      const result = generator.generateMessage(diff, options);

      expect(result.isConventional).toBe(false);
      expect(result.body).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("should handle empty diff", () => {
      const diff: GitDiff = {
        files: [],
        additions: 0,
        deletions: 0,
        summary: "No changes",
      };

      const options: GenerationOptions = {
        includeScope: false,
        maxLength: 50,
      };

      const result = generator.generateMessage(diff, options);

      expect(result.subject).toBe("chore: update 0 files");
      expect(result.type).toBe("chore");
    });

    it("should handle deleted files", () => {
      const diff: GitDiff = {
        files: [
          {
            path: "src/deprecated/OldComponent.tsx",
            status: "deleted",
            additions: 0,
            deletions: 100,
            diff: "-export const OldComponent = () => { ... }",
          },
        ],
        additions: 0,
        deletions: 100,
        summary: "1 file deleted",
      };

      const options: GenerationOptions = {
        includeScope: true,
        maxLength: 50,
      };

      const result = generator.generateMessage(diff, options);

      expect(result.subject).toBe("chore(deprecated): remove OldComponent");
      expect(result.type).toBe("chore");
    });

    it("should handle renamed files", () => {
      const diff: GitDiff = {
        files: [
          {
            path: "src/components/NewButton.tsx",
            status: "renamed",
            additions: 5,
            deletions: 5,
            diff: "renamed from Button.tsx",
          },
        ],
        additions: 5,
        deletions: 5,
        summary: "1 file renamed",
      };

      const options: GenerationOptions = {
        includeScope: true,
        maxLength: 50,
      };

      const result = generator.generateMessage(diff, options);

      expect(result.subject).toBe("refactor(components): rename NewButton");
      expect(result.type).toBe("refactor");
    });
  });
});
