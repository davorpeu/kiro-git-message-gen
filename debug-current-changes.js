// Debug what our AI service is seeing with current changes
const { KiroAIService } = require('./dist/services/AIService');

async function debugCurrentChanges() {
    console.log('🔍 Debugging Current Changes Analysis\n');

    const aiService = KiroAIService.getInstance();

    // Simulate what the extension sees with current changes
    const mockContext = {
        diff: {
            files: [
                {
                    path: 'README.md',
                    status: 'modified',
                    additions: 2,
                    deletions: 2,
                    diff: `-# 🤖 AI Git Commit Message Generator
+# 🤖 Kiro Git Commit Message Generator

-Generate intelligent, conventional commit messages using AI based on your changes in Kiro IDE.
+Generate intelligent, conventional commit messages using Kiro's AI based on your code changes.`
                },
                {
                    path: 'package.json',
                    status: 'modified',
                    additions: 3,
                    deletions: 3,
                    diff: `-  "displayName": "AI Git Commit Message Generator",
+  "displayName": "Kiro Git Commit Message Generator",
-  "description": "Generate intelligent git commit messages using AI based on staged changes",
+  "description": "Generate intelligent git commit messages using Kiro's AI based on your code changes",
-      "title": "Git Commit Generator",
+      "title": "Kiro Git Commit Generator",`
                },
                {
                    path: 'src/extension.ts',
                    status: 'modified',
                    additions: 4,
                    deletions: 4,
                    diff: `-  console.log("Git Commit Message Generator extension is now active");
+  console.log("Kiro Git Commit Message Generator extension is now active");
-  console.log("Git Commit Message Generator extension is being deactivated");
+  console.log("Kiro Git Commit Message Generator extension is being deactivated");`
                }
            ],
            additions: 13,
            deletions: 11,
            summary: 'Updated extension branding'
        },
        preferences: {
            commitStyle: 'conventional',
            customTypes: ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'],
            analysisSettings: { enableScopeInference: true }
        }
    };

    const prompt = `Generate a git commit message for the following changes:

Git diff summary:
Files changed: ${mockContext.diff.files.length}
Additions: ${mockContext.diff.additions}, Deletions: ${mockContext.diff.deletions}

Changed files with actual changes:

📁 README.md (modified): +2 -2
Changes:
${mockContext.diff.files[0].diff}

📁 package.json (modified): +3 -3
Changes:
${mockContext.diff.files[1].diff}

📁 src/extension.ts (modified): +4 -4
Changes:
${mockContext.diff.files[2].diff}

Analysis: Look at the actual code changes above to understand what was implemented, fixed, or modified. Focus on the purpose and impact of the changes, not just file names.

Use conventional commit format: type(scope): description
Available types: feat, fix, docs, style, refactor, test, chore
Include appropriate scope based on changed files.

Generate a concise, descriptive commit message:`;

    console.log('📋 What the AI is seeing:');
    console.log('Files changed:', mockContext.diff.files.map(f => f.path));
    console.log('Total changes: +' + mockContext.diff.additions + ' -' + mockContext.diff.deletions);
    console.log('\n🤖 Generating message...');

    try {
        const result = await aiService.generateCommitMessage(prompt, mockContext);
        console.log('\n❌ Current Result:', `"${result}"`);
        console.log('\n✅ Should Be:', '"chore: rebrand extension to Kiro Git Commit Message Generator"');
        console.log('or:', '"docs: update branding from AI to Kiro Git Commit Message Generator"');

        console.log('\n🔍 Analysis:');
        console.log('The AI is clearly not understanding the context properly.');
        console.log('It should recognize this as a branding/naming change, not validation logic.');

    } catch (error) {
        console.log('Error:', error.message);
    }
}

debugCurrentChanges().catch(console.error);