// Test with current staged changes
const { ChangeAnalysisServiceImpl } = require('./dist/services/ChangeAnalysisService');

async function testCurrentChanges() {
    try {
        console.log('🔍 Testing with current staged changes...\n');

        const changeAnalysisService = new ChangeAnalysisServiceImpl();

        // Mock the current staged changes (package.json and tsconfig.json)
        const currentDiff = {
            files: [
                {
                    path: 'package.json',
                    status: 'added',
                    additions: 45,
                    deletions: 0,
                    diff: '+{\n+  "name": "git-commit-generator"...'
                },
                {
                    path: 'tsconfig.json',
                    status: 'added',
                    additions: 15,
                    deletions: 0,
                    diff: '+{\n+  "compilerOptions": {...'
                }
            ],
            additions: 60,
            deletions: 0,
            summary: 'Added project configuration files'
        };

        console.log('📊 Current Staged Changes:');
        console.log('Files:', currentDiff.files.map(f => ({ path: f.path, status: f.status })));
        console.log('Changes: +' + currentDiff.additions + ' -' + currentDiff.deletions);

        console.log('\n🔍 Analyzing current changes...');
        const analysis = changeAnalysisService.analyzeChanges(currentDiff);

        console.log('\n✅ Suggested Commit Message:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Format as conventional commit
        const scope = analysis.scope ? `(${analysis.scope})` : '';
        const commitMessage = `${analysis.commitType}${scope}: ${analysis.description}`;

        console.log(`${commitMessage}`);
        console.log('');
        console.log('Details:');
        console.log(`  Type: ${analysis.commitType}`);
        console.log(`  Scope: ${analysis.scope || 'none'}`);
        console.log(`  Impact: ${analysis.impactLevel}`);
        console.log(`  File Types: ${analysis.fileTypes.join(', ')}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        console.log('\n🎯 This is what our extension would generate!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testCurrentChanges();