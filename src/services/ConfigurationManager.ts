import * as vscode from "vscode";
import {
  UserPreferences,
  AnalysisSettings,
  ConfigurationManager as IConfigurationManager,
} from "../interfaces/Configuration";
import { CommitType } from "../interfaces/CommitMessageGenerator";

export class ConfigurationManager implements IConfigurationManager {
  private static readonly EXTENSION_ID = "git-commit-generator";
  private static readonly CONFIG_SECTION = "commitMessageGenerator";

  /**
   * Get user preferences from VS Code settings
   */
  async getUserPreferences(): Promise<UserPreferences> {
    const config = vscode.workspace.getConfiguration(
      ConfigurationManager.CONFIG_SECTION
    );

    const preferences: UserPreferences = {
      commitStyle: config.get("commitStyle", "conventional"),
      includeBody: config.get("includeBody", false),
      customTypes: this.parseCustomTypes(config.get("customCommitTypes", [])),
      templates: config.get("customTemplates", {}),
      analysisSettings: this.getAnalysisSettings(config),
    };

    // Validate and return defaults if invalid
    if (!this.validateConfiguration(preferences)) {
      return this.getDefaultPreferences();
    }

    return preferences;
  }

  /**
   * Update user preferences in VS Code settings
   */
  async updatePreferences(
    preferences: Partial<UserPreferences>
  ): Promise<void> {
    const config = vscode.workspace.getConfiguration(
      ConfigurationManager.CONFIG_SECTION
    );

    if (preferences.commitStyle !== undefined) {
      await config.update(
        "commitStyle",
        preferences.commitStyle,
        vscode.ConfigurationTarget.Global
      );
    }

    if (preferences.includeBody !== undefined) {
      await config.update(
        "includeBody",
        preferences.includeBody,
        vscode.ConfigurationTarget.Global
      );
    }

    if (preferences.customTypes !== undefined) {
      const customTypesArray = preferences.customTypes.map((type) =>
        type.toString()
      );
      await config.update(
        "customCommitTypes",
        customTypesArray,
        vscode.ConfigurationTarget.Global
      );
    }

    if (preferences.templates !== undefined) {
      await config.update(
        "customTemplates",
        preferences.templates,
        vscode.ConfigurationTarget.Global
      );
    }

    if (preferences.analysisSettings !== undefined) {
      await config.update(
        "analysisFeatures",
        preferences.analysisSettings,
        vscode.ConfigurationTarget.Global
      );
    }
  }

  /**
   * Get default preferences following conventional commit standards
   */
  getDefaultPreferences(): UserPreferences {
    return {
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
    };
  }

  /**
   * Validate configuration object
   */
  validateConfiguration(config: any): boolean {
    if (!config || typeof config !== "object" || Array.isArray(config)) {
      return false;
    }

    // Validate commitStyle
    if (
      config.commitStyle &&
      !["conventional", "custom"].includes(config.commitStyle)
    ) {
      return false;
    }

    // Validate includeBody
    if (
      config.includeBody !== undefined &&
      typeof config.includeBody !== "boolean"
    ) {
      return false;
    }

    // Validate customTypes
    if (config.customTypes && !Array.isArray(config.customTypes)) {
      return false;
    }

    // Validate templates
    if (config.templates && typeof config.templates !== "object") {
      return false;
    }

    // Validate analysisSettings
    if (
      config.analysisSettings &&
      !this.validateAnalysisSettings(config.analysisSettings)
    ) {
      return false;
    }

    return true;
  }

  /**
   * Get analysis settings from configuration
   */
  private getAnalysisSettings(
    config: vscode.WorkspaceConfiguration
  ): AnalysisSettings {
    const analysisFeatures = config.get("analysisFeatures", {}) as any;

    return {
      enableFileTypeAnalysis: analysisFeatures.fileTypeAnalysis ?? true,
      enableScopeInference: analysisFeatures.scopeInference ?? true,
      enableImpactAnalysis: analysisFeatures.changeImpactAnalysis ?? true,
    };
  }

  /**
   * Parse custom commit types from configuration
   */
  private parseCustomTypes(customTypes: string[]): CommitType[] {
    const validTypes = Object.values(CommitType);
    return customTypes
      .filter((type) => validTypes.includes(type as CommitType))
      .map((type) => type as CommitType);
  }

  /**
   * Validate analysis settings object
   */
  private validateAnalysisSettings(settings: any): boolean {
    if (!settings || typeof settings !== "object") {
      return false;
    }

    const booleanFields = [
      "enableFileTypeAnalysis",
      "enableScopeInference",
      "enableImpactAnalysis",
    ];

    for (const field of booleanFields) {
      if (
        settings[field] !== undefined &&
        typeof settings[field] !== "boolean"
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Reset configuration to defaults
   */
  async resetToDefaults(): Promise<void> {
    const defaults = this.getDefaultPreferences();
    await this.updatePreferences(defaults);
  }

  /**
   * Get configuration schema for validation
   */
  getConfigurationSchema(): any {
    return {
      type: "object",
      properties: {
        commitStyle: {
          type: "string",
          enum: ["conventional", "custom"],
          default: "conventional",
          description: "Style of commit messages to generate",
        },
        includeBody: {
          type: "boolean",
          default: false,
          description: "Include body in generated commit messages",
        },
        customCommitTypes: {
          type: "array",
          items: {
            type: "string",
            enum: Object.values(CommitType),
          },
          default: Object.values(CommitType),
          description: "Custom commit types to use",
        },
        customTemplates: {
          type: "object",
          additionalProperties: {
            type: "string",
          },
          default: {},
          description: "Custom commit message templates",
        },
        analysisFeatures: {
          type: "object",
          properties: {
            fileTypeAnalysis: {
              type: "boolean",
              default: true,
              description: "Enable file type analysis",
            },
            scopeInference: {
              type: "boolean",
              default: true,
              description: "Enable scope inference from file paths",
            },
            changeImpactAnalysis: {
              type: "boolean",
              default: true,
              description: "Enable change impact analysis",
            },
          },
        },
      },
    };
  }
}
