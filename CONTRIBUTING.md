# Contributing to Kiro Git Commit Message Generator

Thank you for your interest in contributing to the Kiro Git Commit Message Generator! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Kiro IDE
- Git

### Development Setup

1. **Fork and Clone**

   ```bash
   git clone https://github.com/your-username/git-commit-generator.git
   cd git-commit-generator
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Build the Extension**

   ```bash
   npm run build
   ```

4. **Run Tests**

   ```bash
   npm test
   ```

5. **Watch Mode for Development**
   ```bash
   npm run watch
   ```

## 🏗️ Project Structure

```
├── src/
│   ├── extension.ts              # Main extension entry point
│   ├── services/                 # Core business logic
│   │   ├── CommitMessageGenerator.ts
│   │   ├── AIService.ts
│   │   ├── GitService.ts
│   │   ├── ErrorHandler.ts
│   │   └── __tests__/           # Service tests
│   ├── interfaces/              # TypeScript interfaces
│   └── schemas/                 # Configuration schemas
├── resources/                   # Extension resources (icons, etc.)
├── dist/                       # Compiled output
└── docs/                       # Documentation
```

## 🧪 Testing

We maintain comprehensive test coverage. Please ensure all tests pass before submitting a PR.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- CommitMessageGenerator.test.ts
```

### Test Categories

- **Unit Tests**: Test individual functions and classes
- **Integration Tests**: Test component interactions
- **Error Handling Tests**: Test error scenarios and recovery

### Writing Tests

- Use descriptive test names
- Follow the AAA pattern (Arrange, Act, Assert)
- Mock external dependencies
- Test both success and error scenarios

## 📝 Code Style

We use TypeScript with strict type checking. Please follow these guidelines:

### TypeScript Guidelines

- Use explicit types where helpful for clarity
- Prefer interfaces over type aliases for object shapes
- Use enums for constants with semantic meaning
- Document public APIs with JSDoc comments

### Code Organization

- Keep functions small and focused
- Use meaningful variable and function names
- Separate concerns into different modules
- Follow the existing project structure

### Error Handling

- Use custom error classes for different error types
- Provide meaningful error messages
- Include recovery suggestions where possible
- Log errors appropriately

## 🔄 Pull Request Process

1. **Create a Feature Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**

   - Write code following the style guidelines
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Your Changes**

   ```bash
   npm test
   npm run build
   ```

4. **Commit Your Changes**

   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### PR Requirements

- [ ] All tests pass
- [ ] Code follows style guidelines
- [ ] New features have tests
- [ ] Documentation is updated
- [ ] Commit messages follow conventional format

## 🐛 Bug Reports

When reporting bugs, please include:

- Kiro IDE version
- Extension version
- Steps to reproduce
- Expected vs actual behavior
- Error messages or logs
- Screenshots if applicable

## 💡 Feature Requests

For feature requests, please provide:

- Clear description of the feature
- Use case and motivation
- Proposed implementation approach
- Any relevant examples or mockups

## 🏷️ Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat(ai): add support for custom AI models
fix(git): resolve issue with merge conflict detection
docs(readme): update installation instructions
test(generator): add integration tests for error handling
```

## 📋 Development Guidelines

### Adding New Features

1. **Design First**: Consider the architecture and interfaces
2. **Test-Driven**: Write tests before implementation
3. **Incremental**: Break large features into smaller PRs
4. **Documentation**: Update relevant documentation

### Modifying Existing Code

1. **Understand Impact**: Consider backward compatibility
2. **Test Coverage**: Ensure existing tests still pass
3. **Migration**: Provide migration path if needed

### Performance Considerations

- Avoid blocking the main thread
- Use async/await for I/O operations
- Cache expensive computations
- Profile performance-critical code

## 🤝 Community Guidelines

- Be respectful and inclusive
- Help others learn and grow
- Share knowledge and best practices
- Provide constructive feedback

## 📞 Getting Help

- Check existing issues and discussions
- Ask questions in GitHub Discussions
- Join our community channels
- Reach out to maintainers

## 🙏 Recognition

Contributors will be recognized in:

- CHANGELOG.md for significant contributions
- README.md contributors section
- Release notes for major features

Thank you for contributing to make this extension better for everyone! 🎉
