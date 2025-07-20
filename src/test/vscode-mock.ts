// Mock implementation of vscode module for testing
import { vi } from "vitest";

export const window = {
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
};

export const commands = {
  executeCommand: vi.fn(),
};

export const env = {
  openExternal: vi.fn(),
};

export const Uri = {
  parse: vi.fn(),
};

export const workspace = {
  getConfiguration: vi.fn(() => ({
    get: vi.fn(),
    update: vi.fn(),
  })),
};

export const ExtensionContext = {};

// Add other vscode API mocks as needed
