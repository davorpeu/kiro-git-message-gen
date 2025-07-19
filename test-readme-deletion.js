// Test README deletion scenario
const { KiroAIService } = require('./dist/services/AIService');

async function testReadmeDeletion() {
    console.log('🗑️ Testing README Deletion Scenario\n');

    const aiService = KiroAIService.getInstance();

    // Simulate deleting entire README file
    const mockContext = {
        diff: {
            files: [
                {
                    path: 'README.md',
                    status: 'modified',
                    additions: 0,
                    deletions: 150, // Assuming README had ~150 lines
                    diff: `-# 🤖 Kiro Git Commit Message Generator
-
-Generate intelligent, conventional commit messages using Kiro's AI based on your code changes.
-
-## ✨ Features
-
-- **🧠 AI-Powered**: Uses Kiro's AI models to generate contextually appropriate commit messages
-- **📝 Conventional Commits**: Follows conventional commit format (\`type(scope): description\`)
-- **🔍 Smart Analysis**: Analyzes file changes to determine commit type and scope automatically
-[... entire README content deleted ...]`
                }
            ],
            additions: 0,
            deletions: 150,
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
Files changed: ${mockContext.diff.files.length}
Additions: ${mockContext.diff.additions}, Deletions: ${mockContext.diff.deletions}

Changed files with actual changes:

📁 README.md (modified): +0 -150
Changes:
${mockContext.diff.files[0].diff}

Analysis: Look at the actual code changes above to understand what was implemented, fixed, or modified. Focus on the purpose and impact of the changes, not just file names.

Use conventional commit format: type(scope): description
Available types: feat, fix, docs, style, refactor, test, chore
Include appropriate scope based on changed files.

Generate a concise, descriptive commit message:`;

    console.log('📋 Scenario: Entire README file deleted');
    console.log('Changes: +0 -150 (all content removed)');
    console.log('Expected: "docs: remove README.md" or "chore: remove project documentation"');

    try {
        const result = await aiService.generateCommitMessage(prompt, mockContext);
        console.log('\n❌ Current Result:', `"${result}"`);

        // Analyze the result
        if (result.includes('remove') || result.includes('delete')) {
            console.log('✅ Good: Correctly identified as removal');
        } else if (result.includes('update')) {
            console.log('⚠️  Issue: Says "update" but should say "remove"');
        } else {
            console.log('❌ Issue: Doesn\'t recognize this as a deletion');
        }

        console.log('\n💡 The AI should detect:');
        console.log('- Only deletions (0 additions, 150 deletions)');
        console.log('- All content removed (entire file deleted)');
        console.log('- Generate: "docs: remove README.md" or similar');

    } catch (error) {
        console.log('Error:', error.message);
    }
}

testReadmeDeletion().catch(console.error);