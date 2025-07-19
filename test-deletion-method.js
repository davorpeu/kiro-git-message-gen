// Test the isDeletionChange method directly
const testPrompt = `Generate a git commit message for the following changes:

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

Analysis: Look at the actual code changes above to understand what was implemented, fixed, or modified. Focus on the purpose and impact of the changes, not just file names.`;

// Replicate the exact methods from AIService
function extractFileSection(prompt, filePath) {
    const fileMarker = `📁 ${filePath}`;
    const startIndex = prompt.indexOf(fileMarker);
    if (startIndex === -1) {
        console.log(`❌ File marker not found: ${fileMarker}`);
        return '';
    }

    const nextFileIndex = prompt.indexOf('📁 ', startIndex + fileMarker.length);
    const analysisIndex = prompt.indexOf('Analysis:', startIndex);

    const endIndex = nextFileIndex !== -1 ? nextFileIndex :
        analysisIndex !== -1 ? analysisIndex : prompt.length;

    const section = prompt.substring(startIndex, endIndex);
    console.log(`✅ Extracted section (${section.length} chars)`);
    return section;
}

function isDeletionChange(prompt, filePath) {
    const fileSection = extractFileSection(prompt, filePath);
    if (!fileSection) {
        console.log('❌ No file section found');
        return false;
    }

    const lines = fileSection.split('\n');
    const deletionLines = lines.filter(line => line.trim().startsWith('-') && line.trim() !== '-');
    const additionLines = lines.filter(line => line.trim().startsWith('+') && line.trim() !== '+');

    console.log(`📊 Analysis:`);
    console.log(`  Total lines: ${lines.length}`);
    console.log(`  Deletion lines: ${deletionLines.length}`);
    console.log(`  Addition lines: ${additionLines.length}`);
    console.log(`  Condition: deletionLines > 5 && additionLines === 0`);
    console.log(`  Result: ${deletionLines.length} > 5 && ${additionLines.length} === 0 = ${deletionLines.length > 5 && additionLines.length === 0}`);

    return deletionLines.length > 5 && additionLines.length === 0;
}

console.log('🔍 Testing isDeletionChange Method Directly\n');

const filePath = 'README.md';
const result = isDeletionChange(testPrompt, filePath);

console.log(`\n🎯 Final Result: ${result ? '✅ DELETION DETECTED' : '❌ NOT DETECTED AS DELETION'}`);

if (result) {
    console.log('✅ Should generate: "docs: remove README.md"');
} else {
    console.log('❌ Will generate: "docs: update README.md"');
    console.log('💡 The method is not working as expected!');
}