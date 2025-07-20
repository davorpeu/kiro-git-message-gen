# 🚀 Step-by-Step Publishing Guide

## Current Status

✅ Extension package created: `git-commit-generator-0.1.0.vsix`
✅ All files prepared and ready
⏳ **Next Step**: Set up publisher account and publish

## 📋 Publishing Steps

### Step 1: Create Publisher Account

1. **Go to VS Code Marketplace**

   - Visit: https://marketplace.visualstudio.com/manage/publishers/
   - Sign in with your Microsoft account

2. **Create New Publisher**
   - Click "Create publisher"
   - **Publisher ID**: `dadop` (must match package.json)
   - **Display Name**: `Dadop`
   - **Description**: `Publisher for Kiro IDE extensions and development tools`

### Step 2: Generate Personal Access Token

1. **Go to Azure DevOps**

   - Visit: https://dev.azure.com
   - Sign in with the same Microsoft account

2. **Create Personal Access Token**
   - Click your profile → User Settings → Personal Access Tokens
   - Click "New Token"
   - **Name**: `VS Code Extension Publishing`
   - **Organization**: All accessible organizations
   - **Expiration**: 1 year (or custom)
   - **Scopes**:
     - ✅ Marketplace → **Manage**
   - Click "Create"
   - **⚠️ IMPORTANT**: Copy the token immediately (you won't see it again)

### Step 3: Login with vsce

```bash
vsce login dadop
```

When prompted, paste your Personal Access Token.

### Step 4: Publish the Extension

Option A - Publish from package:

```bash
vsce publish --packagePath git-commit-generator-0.1.0.vsix
```

Option B - Publish directly:

```bash
vsce publish
```

### Step 5: Verify Publication

1. **Check Marketplace**

   - Visit: https://marketplace.visualstudio.com/items?itemName=dadop.git-commit-generator
   - Verify listing appears correctly

2. **Test Installation**
   - Install in Kiro IDE
   - Test functionality
   - Check for any issues

## 🔧 Troubleshooting

### Common Issues

**"Publisher 'dadop' not found"**

- Ensure you created the publisher account with ID "kiro"
- Wait a few minutes for the account to propagate

**"Authentication failed"**

- Regenerate Personal Access Token
- Ensure token has "Marketplace → Manage" scope
- Re-login with `vsce login dadop`

**"Invalid package"**

- Rebuild package: `vsce package`
- Check package.json for required fields

### Alternative Publishing Method

If you encounter issues, you can also publish through the web interface:

1. Go to https://marketplace.visualstudio.com/manage/publishers/dadop
2. Click "New extension"
3. Upload the `git-commit-generator-0.1.0.vsix` file
4. Fill in any additional details
5. Click "Upload"

## 📊 Post-Publishing Checklist

After successful publication:

- [ ] Verify extension appears in marketplace
- [ ] Test installation in Kiro IDE
- [ ] Check all features work correctly
- [ ] Monitor for initial user feedback
- [ ] Share announcement with community

## 🎯 Expected Results

Once published, your extension will be available at:

- **Marketplace URL**: https://marketplace.visualstudio.com/items?itemName=dadop.git-commit-generator
- **Install Command**: `ext install dadop.git-commit-generator`

## 📈 Next Steps After Publishing

1. **Promote the Extension**

   - Share on social media
   - Post in Kiro IDE community
   - Write blog post or announcement

2. **Monitor Feedback**

   - Watch marketplace reviews
   - Monitor GitHub issues
   - Respond to user questions

3. **Plan Updates**
   - Gather feature requests
   - Fix any reported bugs
   - Plan version 0.2.0 features

---

**You're almost there!** 🎉

The extension is fully prepared and packaged. Just follow the steps above to create your publisher account and publish to the marketplace.
