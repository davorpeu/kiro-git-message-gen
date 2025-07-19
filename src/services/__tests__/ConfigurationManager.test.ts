import { describe, it, expect, beforeEach, vi, Mock } from "vitest";
import * as vscode from "vscode";
import { ConfigurationManager } from "../ConfigurationManager";
import {
  UserPreferences,
  AnalysisSettings,
} from "../../interfaces/Configuration";
import { CommitType } from "../../interfaces/CommitMessageGenerator";

// Mock VS Code API
vi.mock("vscode", () => ({
  workspace: {
    getConfiguration: vi.fn(),
  },
  ConfigurationTarget: {
    Global: 1,
  },
}));

describe("ConfigurationManager", () => {
  let configManager: ConfigurationManager;
  let mockConfig: any;

  beforeEach(() => {
    configManager = new ConfigurationManager();
    mockConfig = {
      get: vi.fn(),
      update: vi.fn(),
    };
    (vscode.workspace.getConfiguration as Mock).mockReturnValue(mockConfig);
  });

  describe("getDefaultPreferences", () => {
    it("should return default preferences with conventional commit standards", () => {
      const defaults = configManager.getDefaultPreferences();

      expect(defaults).toEqual({
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
        templates: {
          conventional: "{type}({scope}): {description}",
          simple: "{type}: {description}",
          detailed: "{type}({scope}): {description}\n\n{body}",
        },
        analysisSettings: {
          enableFileTypeAnalysis: true,
          enableScopeInference: true,
          enableImpactAnalysis: true,
        },
      });
    });

    it("should include all conventional commit types", () => {
      const defaults = configManager.getDefaultPreferences();
      const expectedTypes = Object.values(CommitType);

      expect(defaults.customTypes).toHaveLength(expectedTypes.length);
      expectedTypes.forEach((type) => {
        expect(defaults.customTypes).toContain(type);
      });
    });
  });

  describe("getUserPreferences", () => {
    it("should return user preferences from VS Code configuration", async () => {
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        const values: Record<string, any> = {
          commitStyle: "custom",
          includeBody: true,
          customCommitTypes: ["feat", "fix"],
          customTemplates: { custom: "{type}: {description}" },
          analysisFeatures: {
            fileTypeAnalysis: false,
            scopeInference: true,
            changeImpactAnalysis: false,
          },
        };
        return values[key] ?? defaultValue;
      });

      const preferences = await configManager.getUserPreferences();

      expect(preferences).toEqual({
        commitStyle: "custom",
        includeBody: true,
        customTypes: [CommitType.FEAT, CommitType.FIX],
        templates: { custom: "{type}: {description}" },
        analysisSettings: {
          enableFileTypeAnalysis: false,
          enableScopeInference: true,
          enableImpactAnalysis: false,
        },
      });
    });

    it("should return defaults when configuration is invalid", async () => {
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === "commitStyle") return "invalid-style";
        return defaultValue;
      });

      const preferences = await configManager.getUserPreferences();
      const defaults = configManager.getDefaultPreferences();

      expect(preferences).toEqual(defaults);
    });

    it("should handle missing analysis features configuration", async () => {
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === "analysisFeatures") return {};
        return defaultValue;
      });

      const preferences = await configManager.getUserPreferences();

      expect(preferences.analysisSettings).toEqual({
        enableFileTypeAnalysis: true,
        enableScopeInference: true,
        enableImpactAnalysis: true,
      });
    });
  });

  describe("updatePreferences", () => {
    it("should update commit style preference", async () => {
      await configManager.updatePreferences({ commitStyle: "custom" });

      expect(mockConfig.update).toHaveBeenCalledWith(
        "commitStyle",
        "custom",
        vscode.ConfigurationTarget.Global
      );
    });

    it("should update include body preference", async () => {
      await configManager.updatePreferences({ includeBody: true });

      expect(mockConfig.update).toHaveBeenCalledWith(
        "includeBody",
        true,
        vscode.ConfigurationTarget.Global
      );
    });

    it("should update custom types preference", async () => {
      const customTypes = [CommitType.FEAT, CommitType.FIX];
      await configManager.updatePreferences({ customTypes });

      expect(mockConfig.update).toHaveBeenCalledWith(
        "customCommitTypes",
        ["feat", "fix"],
        vscode.ConfigurationTarget.Global
      );
    });

    it("should update templates preference", async () => {
      const templates = { custom: "{type}: {description}" };
      await configManager.updatePreferences({ templates });

      expect(mockConfig.update).toHaveBeenCalledWith(
        "customTemplates",
        templates,
        vscode.ConfigurationTarget.Global
      );
    });

    it("should update analysis settings preference", async () => {
      const analysisSettings: AnalysisSettings = {
        enableFileTypeAnalysis: false,
        enableScopeInference: true,
        enableImpactAnalysis: false,
      };
      await configManager.updatePreferences({ analysisSettings });

      expect(mockConfig.update).toHaveBeenCalledWith(
        "analysisFeatures",
        analysisSettings,
        vscode.ConfigurationTarget.Global
      );
    });

    it("should not update undefined preferences", async () => {
      await configManager.updatePreferences({});

      expect(mockConfig.update).not.toHaveBeenCalled();
    });
  });

  describe("validateConfiguration", () => {
    it("should validate valid configuration", () => {
      const validConfig: UserPreferences = {
        commitStyle: "conventional",
        includeBody: true,
        customTypes: [CommitType.FEAT, CommitType.FIX],
        templates: { custom: "{type}: {description}" },
        analysisSettings: {
          enableFileTypeAnalysis: true,
          enableScopeInference: false,
          enableImpactAnalysis: true,
        },
      };

      expect(configManager.validateConfiguration(validConfig)).toBe(true);
    });

    it("should reject null or undefined configuration", () => {
      expect(configManager.validateConfiguration(null)).toBe(false);
      expect(configManager.validateConfiguration(undefined)).toBe(false);
    });

    it("should reject non-object configuration", () => {
      expect(configManager.validateConfiguration("string")).toBe(false);
      expect(configManager.validateConfiguration(123)).toBe(false);
      expect(configManager.validateConfiguration([])).toBe(false);
    });

    it("should reject invalid commit style", () => {
      const invalidConfig = {
        commitStyle: "invalid-style",
        includeBody: false,
        customTypes: [],
        templates: {},
        analysisSettings: {
          enableFileTypeAnalysis: true,
          enableScopeInference: true,
          enableImpactAnalysis: true,
        },
      };

      expect(configManager.validateConfiguration(invalidConfig)).toBe(false);
    });

    it("should reject invalid includeBody type", () => {
      const invalidConfig = {
        commitStyle: "conventional",
        includeBody: "not-boolean",
        customTypes: [],
        templates: {},
        analysisSettings: {
          enableFileTypeAnalysis: true,
          enableScopeInference: true,
          enableImpactAnalysis: true,
        },
      };

      expect(configManager.validateConfiguration(invalidConfig)).toBe(false);
    });

    it("should reject invalid customTypes type", () => {
      const invalidConfig = {
        commitStyle: "conventional",
        includeBody: false,
        customTypes: "not-array",
        templates: {},
        analysisSettings: {
          enableFileTypeAnalysis: true,
          enableScopeInference: true,
          enableImpactAnalysis: true,
        },
      };

      expect(configManager.validateConfiguration(invalidConfig)).toBe(false);
    });

    it("should reject invalid templates type", () => {
      const invalidConfig = {
        commitStyle: "conventional",
        includeBody: false,
        customTypes: [],
        templates: "not-object",
        analysisSettings: {
          enableFileTypeAnalysis: true,
          enableScopeInference: true,
          enableImpactAnalysis: true,
        },
      };

      expect(configManager.validateConfiguration(invalidConfig)).toBe(false);
    });

    it("should reject invalid analysis settings", () => {
      const invalidConfig = {
        commitStyle: "conventional",
        includeBody: false,
        customTypes: [],
        templates: {},
        analysisSettings: {
          enableFileTypeAnalysis: "not-boolean",
          enableScopeInference: true,
          enableImpactAnalysis: true,
        },
      };

      expect(configManager.validateConfiguration(invalidConfig)).toBe(false);
    });
  });

  describe("resetToDefaults", () => {
    it("should reset configuration to default values", async () => {
      await configManager.resetToDefaults();

      const defaults = configManager.getDefaultPreferences();

      expect(mockConfig.update).toHaveBeenCalledWith(
        "commitStyle",
        defaults.commitStyle,
        vscode.ConfigurationTarget.Global
      );
      expect(mockConfig.update).toHaveBeenCalledWith(
        "includeBody",
        defaults.includeBody,
        vscode.ConfigurationTarget.Global
      );
      expect(mockConfig.update).toHaveBeenCalledWith(
        "customCommitTypes",
        defaults.customTypes.map((type) => type.toString()),
        vscode.ConfigurationTarget.Global
      );
      expect(mockConfig.update).toHaveBeenCalledWith(
        "customTemplates",
        defaults.templates,
        vscode.ConfigurationTarget.Global
      );
      expect(mockConfig.update).toHaveBeenCalledWith(
        "analysisFeatures",
        defaults.analysisSettings,
        vscode.ConfigurationTarget.Global
      );
    });
  });

  describe("getConfigurationSchema", () => {
    it("should return valid JSON schema", () => {
      const schema = configManager.getConfigurationSchema();

      expect(schema).toHaveProperty("type", "object");
      expect(schema).toHaveProperty("properties");
      expect(schema.properties).toHaveProperty("commitStyle");
      expect(schema.properties).toHaveProperty("includeBody");
      expect(schema.properties).toHaveProperty("customCommitTypes");
      expect(schema.properties).toHaveProperty("customTemplates");
      expect(schema.properties).toHaveProperty("analysisFeatures");
    });

    it("should include all commit types in enum", () => {
      const schema = configManager.getConfigurationSchema();
      const commitTypesEnum = schema.properties.customCommitTypes.items.enum;

      Object.values(CommitType).forEach((type) => {
        expect(commitTypesEnum).toContain(type);
      });
    });
  });

  describe("edge cases", () => {
    it("should handle empty custom types array", async () => {
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === "customCommitTypes") return [];
        return defaultValue;
      });

      const preferences = await configManager.getUserPreferences();
      expect(preferences.customTypes).toEqual([]);
    });

    it("should filter invalid commit types", async () => {
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === "customCommitTypes") return ["feat", "invalid-type", "fix"];
        return defaultValue;
      });

      const preferences = await configManager.getUserPreferences();
      expect(preferences.customTypes).toEqual([
        CommitType.FEAT,
        CommitType.FIX,
      ]);
    });

    it("should handle partial analysis settings", async () => {
      mockConfig.get.mockImplementation((key: string, defaultValue: any) => {
        if (key === "analysisFeatures") return { fileTypeAnalysis: false };
        return defaultValue;
      });

      const preferences = await configManager.getUserPreferences();
      expect(preferences.analysisSettings).toEqual({
        enableFileTypeAnalysis: false,
        enableScopeInference: true,
        enableImpactAnalysis: true,
      });
    });
  });
});
