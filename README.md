# 🤖 AI Git Commit Message Generator

Generate intelligent, conventional commit messages using AI based on your changes in Kiro IDE.

## ✨ Features

- **🧠 AI-Powered**: Uses Kiro's AI models to generate contextually appropriate commit messages
- **📝 Conventional Commits**: Follows conventional commit format (`type(scope): description`)
- **🔍 Smart Analysis**: Analyzes file changes to determine commit type and scope automatically
- **⚡ Multiple Access Points**: Available via command palette, context menu, and source control panel button
- **⚙️ Configurable**: Customize commit types, templates, and analysis settings
- **🛡️ Error Handling**: Graceful handling of edge cases and AI service issues

## 🚀 Installation

### Method 1: Install from Folder (Recommended for Development)

1. Open Kiro IDE
2. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
3. Run: `Extensions: Install from Folder`
4. Select this project folder

### Method 2: Copy to Extensions Directory

Copy this entire folder to your Kiro IDE extensions directory.

## 🎯 Usage

### Primary Method: Source Control Panel Button (Like GitHub Copilot)

1. Open the Source Control panel in Kiro IDE
2. Stage your changes (`git add <files>`)
3. Click the **sparkle (✨) button** in the commit message input field
4. The AI-generated commit message will be **automatically inserted** into the input field
5. Review and edit if needed, then commit!

### Alternative: Command Palette

1. Stage your changes
2. Open Command Palette (`Ctrl+Shift+P`)
3. Run: `Generate a commit message with AI`
4. The message will be automatically inserted into the Source Control panel

## 🔧 Configuration

Configure the extension through Kiro IDE settings:

```json
{
  "commitMessageGenerator.enableConventionalCommits": true,
  "commitMessageGenerator.customCommitTypes": [
    "feat",
    "fix",
    "docs",
    "style",
    "refactor",
    "test",
    "chore"
  ],
  "commitMessageGenerator.includeScope": true,
  "commitMessageGenerator.maxSubjectLength": 72
}
```

## 📊 Supported Commit Types

- **feat**: New features
- **fix**: Bug fixes
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks, configuration changes

## 🧪 Examples

### Feature Implementation

**Files**: `src/components/Button.tsx`, `src/components/__tests__/Button.test.tsx`
**Generated**: `feat(components): add Button component with click handling`

### Bug Fix

**Files**: `src/utils/validation.ts`
**Generated**: `fix(utils): resolve email validation regex issue`

### Documentation

**Files**: `README.md`, `docs/api.md`
**Generated**: `docs: update README and add API documentation`

### Configuration

**Files**: `package.json`, `tsconfig.json`
**Generated**: `chore: update project configuration`

## 🛠️ Development

### Prerequisites

- Node.js 18+
- TypeScript 5+
- Kiro IDE

### Build

```bash
npm install
npm run build
```

### Test

```bash
npm test
```

### Watch Mode

```bash
npm run watch
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Troubleshooting

### Extension Not Loading

- Ensure all dependencies are installed: `npm install`
- Rebuild the extension: `npm run build`
- Restart Kiro IDE

### No Staged Changes Error

- Stage some files first: `git add <files>`
- Ensure you're in a git repository

### AI Service Unavailable

- Check your Kiro IDE AI model selection
- Ensure you have an active AI model configured

### Button Not Visible

- Ensure you're in a git repository
- Check that the Source Control panel is open
- Verify the extension is activated

## 📞 Support

For issues and feature requests, please create an issue in the repository.
