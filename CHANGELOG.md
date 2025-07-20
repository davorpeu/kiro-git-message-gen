# Change Log

All notable changes to the "git-commit-generator" extension will be documented in this file.

## [0.1.0] - 2024-12-20

### Added

- Initial release of Kiro Git Commit Message Generator
- AI-powered commit message generation using Kiro's AI models
- Support for conventional commit format
- Smart analysis of code changes to determine commit type and scope
- Multiple access methods:
  - Command palette integration
  - Source control panel button (GitHub Copilot style)
  - Context menu in git panel
- Comprehensive configuration options:
  - Custom commit types
  - Message templates
  - Analysis feature toggles
  - Maximum subject length settings
- Robust error handling with fallback mechanisms:
  - Template-based generation when AI is unavailable
  - Graceful handling of git repository issues
  - User-friendly error messages with recovery suggestions
- Extensive test coverage with integration tests
- Support for multiple project types and languages

### Features

- **Core Generation Engine**: Combines git analysis, AI generation, and template fallbacks
- **Change Analysis**: Intelligent detection of commit types based on file patterns
- **Validation System**: Automatic format correction and message validation
- **Configuration Management**: Flexible settings with user preferences
- **Error Recovery**: Comprehensive error handling with recovery actions

### Technical Details

- Built with TypeScript for type safety
- Comprehensive test suite with Vitest
- Modular architecture with clear separation of concerns
- Integration with Kiro IDE's AI and git systems
- Extensible design for future enhancements
