import * as vscode from "vscode";
import { CommitMessageGeneratorImpl } from "./services/CommitMessageGenerator";
import { GitServiceImpl } from "./services/GitService";
import { KiroAIService } from "./services/AIService";
import { ChangeAnalysisServiceImpl } from "./services/ChangeAnalysisService";
import { UserPreferences } from "./interfaces/Configuration";
import { CommitType } from "./interfaces/CommitMessageGenerator";

// Global service instances
let commitMessageGenerator: CommitMessageGeneratorImpl;

/**
 * Extension activation function
 * Called when the extension is activated
 */
export function activate(context: vscode.ExtensionContext) {
  console.log("Git Commit Message Generator extension is now active");

  // Initialize services
  initializeServices(context);

  // Register the main command for generating commit messages
  const generateCommand = vscode.commands.registerCommand(
    "git-commit-generator.generate",
    async () => {
      try {
        await generateCommitMessage();
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to generate commit message: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }
  );

  // Add command to subscriptions for proper cleanup
  context.subscriptions.push(generateCommand);
}

/**
 * Extension deactivation function
 * Called when the extension is deactivated
 */
export function deactivate() {
  console.log("Git Commit Message Generator extension is being deactivated");
  // Cleanup resources if needed
  cleanupServices();
}

/**
 * Main function to generate commit message (Copilot-style)
 */
async function generateCommitMessage(): Promise<void> {
  if (!commitMessageGenerator) {
    vscode.window.showErrorMessage("Commit message generator not initialized");
    return;
  }

  try {
    // Show progress in status bar (less intrusive than notification)
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Window,
        title: "Generating commit message with AI...",
        cancellable: false,
      },
      async (progress) => {
        // Get user preferences from VS Code configuration
        const config = vscode.workspace.getConfiguration(
          "commitMessageGenerator"
        );
        const options = {
          includeScope: config.get<boolean>("includeScope", true),
          maxLength: config.get<number>("maxSubjectLength", 72), // Increased for better messages
        };

        // Generate the commit message
        const commitMessage = await commitMessageGenerator.generateMessage(
          options
        );

        // Directly insert into SCM input box (Copilot-style)
        await insertIntoSCM(commitMessage.subject);
      }
    );
  } catch (error: any) {
    // Handle specific error types with user-friendly messages
    if (error.code === "NO_CHANGES") {
      vscode.window.showWarningMessage(
        "No changes found. Please make some changes to your files before generating a commit message."
      );
    } else if (error.code === "NO_STAGED_CHANGES") {
      vscode.window.showWarningMessage(
        "No staged changes found. Please stage some changes before generating a commit message."
      );
    } else if (error.code === "INVALID_REPOSITORY") {
      vscode.window.showErrorMessage(
        "Not in a valid Git repository. Please open a Git repository to use this extension."
      );
    } else if (error.code === "MERGE_CONFLICTS_EXIST") {
      vscode.window.showErrorMessage(
        "Cannot generate commit message while merge conflicts exist. Please resolve conflicts first."
      );
    } else {
      vscode.window.showErrorMessage(
        `Failed to generate commit message: ${error.message || "Unknown error"}`
      );
    }
  }
}

/**
 * Insert the generated message into the SCM input box
 */
async function insertIntoSCM(message: string): Promise<void> {
  try {
    // Get the Git extension
    const gitExtension = vscode.extensions.getExtension("vscode.git")?.exports;
    if (!gitExtension) {
      vscode.window.showErrorMessage("Git extension not found");
      return;
    }

    const git = gitExtension.getAPI(1);
    if (git.repositories.length === 0) {
      vscode.window.showErrorMessage("No Git repositories found");
      return;
    }

    // Find the active repository (the one in current workspace)
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    let targetRepo = git.repositories[0]; // Default to first repo

    if (workspaceFolder && git.repositories.length > 1) {
      // Try to find the repo that matches current workspace
      const matchingRepo = git.repositories.find(
        (repo: any) => repo.rootUri.fsPath === workspaceFolder.uri.fsPath
      );
      if (matchingRepo) {
        targetRepo = matchingRepo;
      }
    }

    // Insert the message directly into the input box
    targetRepo.inputBox.value = message;

    // Show subtle success indication (like Copilot)
    vscode.window.setStatusBarMessage(
      "$(check) Commit message generated with AI",
      3000
    );
  } catch (error) {
    console.error("Failed to insert into SCM:", error);
    // Fallback: copy to clipboard and show subtle error
    await vscode.env.clipboard.writeText(message);
    vscode.window.showErrorMessage(
      "Failed to insert commit message. Message copied to clipboard instead."
    );
  }
}

/**
 * Allow user to edit the generated commit message
 */
async function editCommitMessage(initialMessage: string): Promise<void> {
  const editedMessage = await vscode.window.showInputBox({
    value: initialMessage,
    prompt: "Edit the commit message",
    placeHolder: "Enter your commit message...",
    validateInput: (value) => {
      if (!value.trim()) {
        return "Commit message cannot be empty";
      }
      if (value.length > 72) {
        return "Commit message is too long (max 72 characters recommended)";
      }
      return null;
    },
  });

  if (editedMessage) {
    const action = await vscode.window.showInformationMessage(
      `Edited commit message:\n\n"${editedMessage}"`,
      "Copy to Clipboard",
      "Insert into SCM"
    );

    if (action === "Copy to Clipboard") {
      await vscode.env.clipboard.writeText(editedMessage);
      vscode.window.showInformationMessage(
        "Edited commit message copied to clipboard!"
      );
    } else if (action === "Insert into SCM") {
      await insertIntoSCM(editedMessage);
    }
  }
}

/**
 * Initialize extension services
 */
function initializeServices(context: vscode.ExtensionContext): void {
  try {
    // Get workspace root path
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      console.warn("No workspace folder found, some features may not work");
    }

    // Get user preferences from VS Code configuration
    const config = vscode.workspace.getConfiguration("commitMessageGenerator");
    const userPreferences: UserPreferences = {
      commitStyle: config.get<boolean>("enableConventionalCommits", true)
        ? "conventional"
        : "custom",
      includeBody: false, // Can be made configurable later
      customTypes: config
        .get<string[]>("customCommitTypes", [
          "feat",
          "fix",
          "docs",
          "style",
          "refactor",
          "test",
          "chore",
        ])
        .map((type) => type as CommitType),
      templates: {}, // Can be expanded later
      analysisSettings: {
        enableFileTypeAnalysis: true,
        enableScopeInference: config.get<boolean>("includeScope", true),
        enableImpactAnalysis: true,
      },
    };

    // Initialize services
    const gitService = new GitServiceImpl(workspaceRoot || process.cwd());
    const aiService = KiroAIService.getInstance();
    const changeAnalysisService = new ChangeAnalysisServiceImpl();

    // Initialize the main commit message generator
    commitMessageGenerator = new CommitMessageGeneratorImpl(
      gitService,
      aiService,
      changeAnalysisService,
      userPreferences
    );

    console.log("Extension services initialized successfully");
  } catch (error) {
    console.error("Failed to initialize extension services:", error);
    vscode.window.showErrorMessage(
      `Failed to initialize Git Commit Generator: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Cleanup extension services
 * Placeholder for service cleanup
 */
function cleanupServices(): void {
  // TODO: Cleanup services if needed
  console.log("Extension services cleaned up");
}
