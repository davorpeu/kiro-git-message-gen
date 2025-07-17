// Simple test without VS Code dependencies
const { ChangeAnalysisServiceImpl } = require('./dist/services/ChangeAnalysisService');
const { CommitType } = require('./dist/interfaces/CommitMessageGenerator');

async function testChangeAnalysis() {
    try {
        console.log('🔍 Testing Change Analysis Service...\n');

        const changeAnalysisService = new ChangeAnalysisServiceImpl();

        // Mock git diff data
        const mockDiff = {
            files: [
                {
                    path: 'src/services/CommitMessageGenerator.ts',
                    status: 'added',
                    additions: 150,
                    deletions: 0,
                    diff: '+export class CommitMessageGeneratorImpl...'
                },
                {
                    path: 'src/services/__tests__/CommitMessageGenerator.test.ts',
                    status: 'added',
                    additions: 200,
                    deletions: 0,
                    diff: '+describe("CommitMessageGenerator"...'
                },
                {
                    path: 'src/extension.ts',
                    status: 'modified',
                    additions: 50,
                    deletions: 10,
                    diff: '+import { CommitMessageGeneratorImpl }...'
                }
            ],
            additions: 400,
            deletions: 10,
            summary: 'Added commit message generator and tests'
        };

        console.log('📊 Mock Git Diff:');
        console.log('Files:', mockDiff.files.map(f => ({ path: f.path, status: f.status })));
        console.log('Changes: +' + mockDiff.additions + ' -' + mockDiff.deletions);

        console.log('\n🔍 Analyzing changes...');
        const analysis = changeAnalysisService.analyzeChanges(mockDiff);

        console.log('\n✅ Change Analysis Result:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Commit Type: ${analysis.commitType}`);
        console.log(`Scope: ${analysis.scope || 'none'}`);
        console.log(`Description: ${analysis.description}`);
        console.log(`Impact Level: ${analysis.impactLevel}`);
        console.log(`File Types: ${analysis.fileTypes.join(', ')}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Test individual methods
        console.log('\n🧪 Testing individual methods...');

        const filePaths = mockDiff.files.map(f => f.path);
        const changes = mockDiff.files.map(f => ({ additions: f.additions, deletions: f.deletions }));

        const inferredType = changeAnalysisService.inferCommitType(filePaths, changes);
        console.log(`Inferred Commit Type: ${inferredType}`);

        const detectedScope = changeAnalysisService.detectScope(filePaths);
        console.log(`Detected Scope: ${detectedScope || 'none'}`);

        const fileCategories = changeAnalysisService.categorizeFilesByType(filePaths);
        console.log('File Categories:', fileCategories);

        const impactLevel = changeAnalysisService.assessImpactLevel(
            mockDiff.additions,
            mockDiff.deletions,
            mockDiff.files.length
        );
        console.log(`Impact Level: ${impactLevel}`);

        console.log('\n🎉 Change Analysis test completed successfully!');

        // Test with different scenarios
        console.log('\n📋 Testing different scenarios...');

        // Documentation changes
        const docsDiff = {
            files: [
                { path: 'README.md', status: 'modified', additions: 20, deletions: 5, diff: '+## New section' },
                { path: 'docs/api.md', status: 'added', additions: 100, deletions: 0, diff: '+# API Documentation' }
            ],
            additions: 120,
            deletions: 5,
            summary: 'Documentation updates'
        };

        const docsAnalysis = changeAnalysisService.analyzeChanges(docsDiff);
        console.log('📚 Docs scenario:', {
            type: docsAnalysis.commitType,
            scope: docsAnalysis.scope,
            description: docsAnalysis.description
        });

        // Test files
        const testDiff = {
            files: [
                { path: 'src/components/__tests__/Button.test.tsx', status: 'added', additions: 50, deletions: 0, diff: '+test cases' }
            ],
            additions: 50,
            deletions: 0,
            summary: 'Added tests'
        };

        const testAnalysis = changeAnalysisService.analyzeChanges(testDiff);
        console.log('🧪 Test scenario:', {
            type: testAnalysis.commitType,
            scope: testAnalysis.scope,
            description: testAnalysis.description
        });

        // Configuration changes
        const configDiff = {
            files: [
                { path: 'package.json', status: 'modified', additions: 3, deletions: 1, diff: '+new dependency' },
                { path: 'tsconfig.json', status: 'modified', additions: 2, deletions: 0, diff: '+compiler option' }
            ],
            additions: 5,
            deletions: 1,
            summary: 'Config updates'
        };

        const configAnalysis = changeAnalysisService.analyzeChanges(configDiff);
        console.log('⚙️  Config scenario:', {
            type: configAnalysis.commitType,
            scope: configAnalysis.scope,
            description: configAnalysis.description
        });

    } catch (error) {
        console.error('❌ Error testing change analysis:', error.message);
        console.error(error.stack);
    }
}

// Run the test
testChangeAnalysis();