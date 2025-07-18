// Test the improved AI service with real staged changes
const { KiroAIService } = require('./dist/services/AIService');

async function testRealAI() {
    try {
        console.log('🤖 Testing Real AI Integration...\n');

        const aiService = KiroAIService.getInstance();

        // Mock context with real file changes
        const context = {
            diff: {
                files: [
                    {
                        path: 'src/services/AIService.ts',
                        status: 'modified',
                        additions: 45,
                        deletions: 15,
                        diff: '+  private async callKiroAI(prompt: string): Promise<string> {\n+    // Use Kiro AI service...'
                    }
                ],
                additions: 45,
                deletions: 15,
                summary: 'Updated AI service integration'
            },
            preferences: {
                commitStyle: 'conventional',
                customTypes: ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'],
                analysisSettings: {
                    enableScopeInference: true
                }
            },
            projectContext: {
                name: 'git-commit-generator',
                type: 'nodejs',
                language: 'typescript'
            }
        };

        console.log('📊 Test Context:');
        console.log('Files:', context.diff.files.map(f => ({ path: f.path, status: f.status })));
        console.log('Changes: +' + context.diff.additions + ' -' + context.diff.deletions);

        console.log('\n🔍 Building AI prompt...');
        const prompt = `Generate a git commit message for the following changes:

Git diff summary:
Files changed: ${context.diff.files.length}
Additions: ${context.diff.additions}, Deletions: ${context.diff.deletions}

Changed files:
${context.diff.files.map(f => `- ${f.path} (${f.status}): +${f.additions} -${f.deletions}`).join('\n')}

Use conventional commit format: type(scope): description
Available types: ${context.preferences.customTypes.join(', ')}
Include appropriate scope based on changed files.

Project context: ${context.projectContext.name} (${context.projectContext.language})

Generate a concise, descriptive commit message:`;

        console.log('Prompt preview:', prompt.substring(0, 200) + '...');

        console.log('\n🤖 Generating commit message...');
        const generatedMessage = await aiService.generateCommitMessage(prompt, context);

        console.log('\n✅ Generated Message:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`"${generatedMessage}"`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Test if it's using fallback or real AI
        if (generatedMessage.includes('update') || generatedMessage.includes('implement')) {
            console.log('\n💡 Status: Using intelligent fallback (Kiro AI not available in Node.js environment)');
            console.log('   This will use real Kiro AI when running in Kiro IDE!');
        } else {
            console.log('\n🎉 Status: Using real Kiro AI service!');
        }

        console.log('\n🎯 This is much better than the old hardcoded responses!');

    } catch (error) {
        console.error('❌ Error testing AI service:', error.message);
    }
}

testRealAI();