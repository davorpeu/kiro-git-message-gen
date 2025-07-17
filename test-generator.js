const { CommitMessageGeneratorImpl } = require('./dist/services/CommitMessageGenerator');
const { GitServiceImpl } = require('./dist/services/GitService');
const { KiroAIService } = require('./dist/services/AIService');
const { ChangeAnalysisServiceImpl } = require('./dist/services/ChangeAnalysisService');
const { CommitType } = require('./dist/interfaces/CommitMessageGenerator');

async function testCommitGenerator() {
    try {
        console.log('🚀 Testing Git Commit Message Generator...\n');

        // Initialize services
        const gitService = new GitServiceImpl(process.cwd());
        const aiService = KiroAIService.getInstance();
        const changeAnalysisService = new ChangeAnalysisServiceImpl();

        // User preferences
        const userPreferences = {
            commitStyle: 'conventional',
            includeBody: false,
            customTypes: [
                CommitType.FEAT,
                CommitType.FIX,
                CommitType.DOCS,
                CommitType.STYLE,
                CommitType.REFACTOR,
                CommitType.TEST,
                CommitType.CHORE
            ],
            templates: {},
            analysisSettings: {
                enableFileTypeAnalysis: true,
                enableScopeInference: true,
                enableImpactAnalysis: true
            }
        };

        // Initialize commit message generator
        const generator = new CommitMessageGeneratorImpl(
            gitService,
            aiService,
            changeAnalysisService,
            userPreferences
        );

        // Generation options
        const options = {
            includeScope: true,
            maxLength: 50
        };

        console.log('📋 Checking repository status...');
        const repoStatus = await gitService.getRepositoryStatus();
        console.log('Repository Status:', repoStatus);

        if (!repoStatus.hasStagedChanges) {
            console.log('❌ No staged changes found. Please stage some changes first.');
            return;
        }

        console.log('\n📊 Getting staged changes...');
        const stagedChanges = await gitService.getStagedChanges();
        console.log('Staged Changes:', {
            fileCount: stagedChanges.files.length,
            additions: stagedChanges.additions,
            deletions: stagedChanges.deletions,
            files: stagedChanges.files.map(f => ({ path: f.path, status: f.status }))
        });

        console.log('\n🔍 Analyzing changes...');
        const analysis = generator.analyzeChanges(stagedChanges);
        console.log('Change Analysis:', analysis);

        console.log('\n🤖 Generating commit message...');
        const commitMessage = await generator.generateMessage(options);

        console.log('\n✅ Generated Commit Message:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Subject: ${commitMessage.subject}`);
        console.log(`Type: ${commitMessage.type}`);
        console.log(`Scope: ${commitMessage.scope || 'none'}`);
        console.log(`Is Conventional: ${commitMessage.isConventional}`);
        if (commitMessage.body) {
            console.log(`Body: ${commitMessage.body}`);
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        console.log('\n🎉 Test completed successfully!');

    } catch (error) {
        console.error('❌ Error testing commit generator:', error.message);
        if (error.code) {
            console.error('Error Code:', error.code);
        }
    }
}

// Run the test
testCommitGenerator();