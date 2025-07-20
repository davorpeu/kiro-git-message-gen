# Publishing Guide for Kiro Git Commit Message Generator

This guide covers the process of publishing the extension to the marketplace.

## 📦 Package Creation

The extension has been successfully packaged as `git-commit-generator-0.1.0.vsix`.

### Package Contents

- **Size**: 81.42 KB (76 files)
- **Main Extension**: `dist/extension.js`
- **Icon**: `resources/icon.png`
- **Documentation**: README.md, CHANGELOG.md, LICENSE
- **Configuration**: `src/schemas/settings.json`

## 🚀 Publishing Steps

### 1. Prerequisites

Before publishing, ensure you have:

- [ ] A publisher account on the VS Code Marketplace
- [ ] Personal Access Token (PAT) from Azure DevOps
- [ ] Extension tested and working properly
- [ ] All documentation complete

### 2. Create Publisher Account

1. Go to [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage)
2. Sign in with your Microsoft account
3. Create a new publisher with ID "kiro" (or update package.json if different)

### 3. Generate Personal Access Token

1. Go to [Azure DevOps](https://dev.azure.com)
2. Navigate to User Settings → Personal Access Tokens
3. Create new token with:
   - **Name**: "VS Code Extension Publishing"
   - **Organization**: All accessible organizations
   - **Scopes**: Marketplace → Manage

### 4. Login to vsce

```bash
vsce login kiro
```

Enter your Personal Access Token when prompted.

### 5. Publish the Extension

```bash
# Publish the current version
vsce publish

# Or publish a specific version
vsce publish 0.1.0

# Or publish from the packaged .vsix file
vsce publish git-commit-generator-0.1.0.vsix
```

## 📋 Pre-Publishing Checklist

### Code Quality

- [ ] All tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] No TypeScript errors
- [ ] Code follows style guidelines

### Documentation

- [ ] README.md is comprehensive and up-to-date
- [ ] CHANGELOG.md includes all changes
- [ ] LICENSE file is present
- [ ] Package.json metadata is complete

### Extension Metadata

- [ ] Icon is present and properly sized
- [ ] Display name is descriptive
- [ ] Description is clear and concise
- [ ] Keywords are relevant
- [ ] Categories are appropriate
- [ ] Repository URL is correct

### Testing

- [ ] Extension loads properly in Kiro IDE
- [ ] All commands work as expected
- [ ] Configuration options work
- [ ] Error handling works correctly
- [ ] No console errors

### Marketplace Requirements

- [ ] Extension follows VS Code extension guidelines
- [ ] No trademark violations
- [ ] Appropriate content rating
- [ ] Privacy policy if collecting data

## 🔄 Update Process

For future updates:

1. **Update Version**

   ```bash
   # Update package.json version
   npm version patch  # or minor/major
   ```

2. **Update CHANGELOG.md**

   - Add new version section
   - Document all changes

3. **Build and Test**

   ```bash
   npm run build
   npm test
   ```

4. **Package and Publish**
   ```bash
   vsce package
   vsce publish
   ```

## 📊 Marketplace Analytics

After publishing, monitor:

- Download statistics
- User ratings and reviews
- Issue reports
- Feature requests

## 🛠️ Troubleshooting

### Common Issues

**"Publisher not found" error**

- Ensure publisher ID in package.json matches your marketplace publisher

**"Invalid manifest" error**

- Check package.json for required fields
- Validate JSON syntax

**"Icon not found" error**

- Ensure icon path in package.json is correct
- Verify icon file exists in resources/

**Authentication issues**

- Regenerate Personal Access Token
- Re-login with `vsce login`

### Support Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Marketplace Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## 📈 Post-Publishing

### Promotion

- Share on social media
- Write blog posts
- Submit to extension lists
- Engage with the community

### Maintenance

- Monitor issues and feedback
- Regular updates and improvements
- Security updates
- Compatibility with new Kiro IDE versions

## 🎯 Success Metrics

Track these metrics to measure success:

- Number of downloads
- User ratings (aim for 4+ stars)
- Active installations
- User feedback and reviews
- GitHub stars and forks

## 📞 Support

For publishing support:

- VS Code Extension Documentation
- Marketplace Publisher Support
- Community forums and Discord

---

**Ready to publish!** 🚀

The extension is packaged and ready for marketplace submission. Follow the steps above to publish your first version.
