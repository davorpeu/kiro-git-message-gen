// Debug deletion detection logic
const testPrompt = `Generate a git commit message for the following changes:

Git diff summary:
Files changed: 1
Additions: 0, Deletions: 150

Changed files with actual changes:

📁 README.md (modified): +0 -150
Changes:
-# 🤖 Kiro Git Commit Message Generator
-
-Generate intelligent, conventional commit messages using Kiro's AI based on your code changes.
-
-## ✨ Features
-
-- **🧠 AI-Powered**: Uses Kiro's AI models to generate contextually appropriate commit messages
-- **📝 Conventional Commits**: Follows conventional commit format (\`type(scope): description\`)
-- **🔍 Smart Analysis**: Analyzes file changes to determine commit type and scope automatically
-- **⚡ Multiple Access Points**: Available via command palette, context menu, and source control panel button
-- **⚙️ Configurable**: Customize commit types, templates, and analysis settings
-- **🛡️ Error Handling**: Graceful handling of edge cases and AI service issues
-[... many more deleted lines ...]

Analysis: Look at the actual code changes above to understand what was implemented, fixed, or modified. Focus on the purpose and impact of the changes, not just file names.`;

console.log('🔍 Testing Deletion Detection Logic\n');

// Simulate the detection logic
function extractFileSection(prompt, filePath) {
    const fileMarker = `📁 ${filePath}`;
    const startIndex = prompt.indexOf(fileMarker);
    if (startIndex === -1) return '';

    const nextFileIndex = prompt.indexOf('📁 ', startIndex + fileMarker.length);
    const analysisIndex = prompt.indexOf('Analysis:', startIndex);

    const endIndex = nextFileIndex !== -1 ? nextFileIndex :
        analysisIndex !== -1 ? analysisIndex : prompt.length;

    return prompt.substring(startIndex, endIndex);
}

function isDeletionChange(prompt, filePath) {
    const fileSection = extractFileSection(prompt, filePath);
    if (!fileSection) return false;

    const lines = fileSection.split('\n');
    const deletionLines = lines.filter(line => line.trim().startsWith('-') && line.trim() !== '-');
    const additionLines = lines.filter(line => line.trim().startsWith('+') && line.trim() !== '+');

    console.log('📋 File Section Analysis:');
    console.log('File section length:', fileSection.length);
    console.log('Total lines:', lines.length);
    console.log('Deletion lines:', deletionLines.length);
    console.log('Addition lines:', additionLines.length);
    console.log('First few deletion lines:', deletionLines.slice(0, 3));

    return deletionLines.length > 5 && additionLines.length === 0;
}

const filePath = 'README.md';
const fileSection = extractFileSection(testPrompt, filePath);
console.log('📁 Extracted file section:');
console.log(fileSection.substring(0, 200) + '...\n');

const isDeleted = isDeletionChange(testPrompt, filePath);
console.log('🗑️ Is deletion detected:', isDeleted ? '✅ YES' : '❌ NO');

if (isDeleted) {
    console.log('✅ Should generate: "docs: remove README.md"');
} else {
    console.log('❌ Will generate generic: "docs: update README.md"');
    console.log('\n💡 The detection logic needs improvement!');
}