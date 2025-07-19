// Debug the complete flow step by step
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

Analysis: Look at the actual code changes above to understand what was implemented, fixed, or modified. Focus on the purpose and impact of the changes, not just file names.

Use conventional commit format: type(scope): description
Available types: feat, fix, docs, style, refactor, test, chore
Include appropriate scope based on changed files.

Generate a concise, descriptive commit message:`;

console.log('🔍 Debugging Complete Flow Step by Step\n');

// Step 1: File extraction
console.log('📋 Step 1: File Extraction');
const fileMatches = testPrompt.match(/📁 ([^:]+) \((\w+)\)/g) || [];
console.log('File matches:', fileMatches);

const files = fileMatches.map((match) => {
    const parts = match.match(/📁 ([^:]+) \((\w+)\)/);
    return parts ? { path: parts[1], status: parts[2] } : null;
}).filter(Boolean);

console.log('Extracted files:', files);
console.log('Files length:', files.length);

// Step 2: Check which branch of logic it will take
console.log('\n🔀 Step 2: Logic Branch Determination');
if (files.length === 1) {
    console.log('✅ Will use SINGLE FILE logic');

    const file = files[0];
    const fileName = file?.path.split("/").pop() || file?.path;
    console.log('File name:', fileName);
    console.log('File status:', file?.status);

    // Step 3: Deletion detection
    console.log('\n🗑️ Step 3: Deletion Detection');

    // Simulate isDeletionChange
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

        return deletionLines.length > 5 && additionLines.length === 0;
    }

    const isDeletion = isDeletionChange(testPrompt, file?.path || "");
    console.log('Is deletion detected:', isDeletion);

    // Step 4: Description generation
    console.log('\n📝 Step 4: Description Generation');
    let description = "";
    if (file?.status === "added") {
        description = `add ${fileName}`;
        console.log('Branch: ADDED ->', description);
    } else if (isDeletion) {
        description = `remove ${fileName}`;
        console.log('Branch: DELETION ->', description);
    } else {
        description = `update ${fileName}`;
        console.log('Branch: UPDATE ->', description);
    }

    console.log('Final description:', description);

} else if (files.length > 1) {
    console.log('❌ Will use MULTI FILE logic');
} else {
    console.log('❌ Will use DEFAULT logic');
}

console.log('\n🎯 Expected Result: "docs: remove README.md"');
console.log('🤔 If the logic above shows deletion detection working but the final result is still "update", then the issue is elsewhere in the flow.');