# 📈 Version Update Guide

## 🔄 How to Update Extension Version

### Method 1: Using npm version (Recommended)

```bash
# For bug fixes (0.1.0 → 0.1.1)
npm version patch

# For new features (0.1.0 → 0.2.0)
npm version minor

# For breaking changes (0.1.0 → 1.0.0)
npm version major
```

This automatically:

- Updates `package.json` version
- Creates a git commit with the version change
- Creates a git tag

### Method 2: Manual Version Update

1. **Edit package.json**

   ```json
   {
     "version": "0.1.1" // Update this field
   }
   ```

2. **Update CHANGELOG.md**

   ```markdown
   ## [0.1.1] - 2024-12-21

   ### Fixed

   - Bug fix description

   ### Added

   - New feature description
   ```

## 🚀 Complete Update & Publish Workflow

### Step 1: Make Your Changes

```bash
# Make code changes, fix bugs, add features
git add .
git commit -m "feat: add new feature"
```

### Step 2: Update Version

```bash
# Choose appropriate version bump
npm version patch  # or minor/major
```

### Step 3: Build & Test

```bash
npm run build
npm test
```

### Step 4: Package Extension

```bash
vsce package
```

### Step 5: Publish Update

```bash
# Option A: Publish directly
vsce publish

# Option B: Publish from package
vsce publish --packagePath git-commit-generator-0.1.1.vsix
```

## 📋 Version Types Explained

### Patch (0.1.0 → 0.1.1)

**Use for**: Bug fixes, small improvements, documentation updates

```bash
npm version patch
```

### Minor (0.1.0 → 0.2.0)

**Use for**: New features, enhancements (backward compatible)

```bash
npm version minor
```

### Major (0.1.0 → 1.0.0)

**Use for**: Breaking changes, major rewrites

```bash
npm version major
```

## 🎯 Quick Update Commands

### For Bug Fixes

```bash
# 1. Fix the bug
git add .
git commit -m "fix: resolve issue with commit generation"

# 2. Update version
npm version patch

# 3. Build and publish
npm run build
vsce publish
```

### For New Features

```bash
# 1. Add the feature
git add .
git commit -m "feat: add custom template support"

# 2. Update version
npm version minor

# 3. Update changelog
# Edit CHANGELOG.md to document changes

# 4. Build and publish
npm run build
vsce publish
```

## 📝 Best Practices

### 1. Always Update CHANGELOG.md

```markdown
## [0.1.1] - 2024-12-21

### Added

- New configuration option for custom templates
- Support for multi-line commit messages

### Fixed

- Issue with AI service timeout handling
- Scope detection for nested directories

### Changed

- Improved error messages for better user experience
```

### 2. Test Before Publishing

```bash
# Run all tests
npm test

# Test the built extension
npm run build

# Package and test locally
vsce package
# Install the .vsix file in Kiro IDE to test
```

### 3. Use Semantic Versioning

- **MAJOR**: Breaking changes (1.0.0 → 2.0.0)
- **MINOR**: New features (1.0.0 → 1.1.0)
- **PATCH**: Bug fixes (1.0.0 → 1.0.1)

### 4. Git Workflow

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Merge to main
git checkout main
git merge feature/new-feature

# Update version and publish
npm version minor
npm run build
vsce publish
```

## 🔧 Advanced Version Management

### Pre-release Versions

```bash
# Create pre-release version (0.1.0 → 0.1.1-0)
npm version prerelease

# Publish as pre-release
vsce publish --pre-release
```

### Specific Version

```bash
# Set specific version
npm version 1.2.3

# Or edit package.json manually
```

### Version with Custom Message

```bash
# Custom commit message for version bump
npm version patch -m "Release version %s with bug fixes"
```

## 📊 Version History Tracking

### Check Current Version

```bash
npm version
# or
cat package.json | grep version
```

### View Version History

```bash
git tag  # Shows all version tags
git log --oneline --decorate --graph  # Shows commit history
```

## 🚨 Common Issues

### "Version already exists"

- Check marketplace for existing version
- Use `npm version patch` to increment properly

### "Package validation failed"

- Ensure package.json version is updated
- Rebuild with `npm run build`
- Repackage with `vsce package`

### "Git working directory not clean"

- Commit all changes before running `npm version`
- Or use `--allow-dirty` flag (not recommended)

## 🎉 Example Update Workflow

```bash
# Starting with version 0.1.0
# Made some bug fixes

# 1. Commit changes
git add .
git commit -m "fix: resolve AI timeout issues"

# 2. Update version (0.1.0 → 0.1.1)
npm version patch

# 3. Update changelog
echo "## [0.1.1] - $(date +%Y-%m-%d)

### Fixed
- Resolved AI service timeout issues
- Improved error handling for network failures
" >> CHANGELOG.md

# 4. Build and publish
npm run build
vsce publish

# Extension is now published as version 0.1.1!
```

---

**Remember**: Always test your changes thoroughly before publishing updates to ensure a good user experience! 🚀
