// Test the complete deletion flow
const { KiroAIService } = require('./dist/services/AIService');

async function testDeletionFlow() {
    console.log('🔍 Testing Complete Deletion Flow\n');

    const aiService = KiroAIService.getInstance();

    // Simple deletion test
    const mockContext = {
        diff: {
            files: [
                {
                    path: 'README.md',
                    status: 'modified',
                    additions: 0,
                    deletions: 10,
                    diff: `-# 🤖 Kiro Git Commit Message Generator
-
-Generate intelligent, conventional commit messages using Kiro's AI based on your code changes.
-
-## ✨ Features
-
-- **🧠 AI-Powered**: Uses Kiro's AI models
-- **📝 Conventional Commits**: Follows conventional commit format
-- **🔍 Smart Analysis**: Analyzes file changes
-- **⚡ Multiple Access Points**: Available via command palette`
                }
            ],
            additions: 0,
            deletions: 10,
            summary: 'Deleted README content'
        },
        preferences: {
            commitStyle: 'conventional',
            customTypes: ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'],
            analysisSettings: { enableScopeInference: true }
        }
    };

    const prompt = `Generate a git commit message for the following changes:

Git diff summary:
Files changed: 1
Additions: 0, Deletions: 10

Changed files with actual changes:

📁 README.md (modified): +0 -10
Changes:
-# 🤖 Kiro Git Commit Message Generator
-
-Generate intelligent, conventional commit messages using Kiro's AI based on your code changes.
-
-## ✨ Features
-
-- **🧠 AI-Powered**: Uses Kiro's AI models
-- **📝 Conventional Commits**: Follows conventional commit format
-- **🔍 Smart Analysis**: Analyzes file changes
-- **⚡ Multiple Access Points**: Available via command palette

Analysis: Look at the actual code changes above to understand what was implemented, fixed, or modified. Focus on the purpose and impact of the changes, not just file names.

Use conventional commit format: type(scope): description
Available types: feat, fix, docs, style, refactor, test, chore
Include appropriate scope based on changed files.

Generate a concise, descriptive commit message:`;

    console.log('📋 Test Setup:');
    console.log('- File: README.md');
    console.log('- Status: modified');
    console.log('- Changes: +0 -10 (pure deletion)');
    console.log('- Expected: "docs: remove README.md"');

    try {
        const result = await aiService.generateCommitMessage(prompt, mockContext);
        console.log('\n🤖 Generated Result:', `"${result}"`);

        if (result.includes('remove') || result.includes('delete')) {
            console.log('✅ SUCCESS: Correctly detected deletion!');
        } else {
            console.log('❌ ISSUE: Did not detect deletion');
            console.log('   Expected: "docs: remove README.md"');
            console.log('   Got: Something with "update" probably');
        }

    } catch (error) {
        console.log('Error:', error.message);
    }
}

testDeletionFlow().catch(console.error);