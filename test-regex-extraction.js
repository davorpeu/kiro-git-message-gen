// Test the file extraction regex
const testPrompt = `📁 README.md (modified): +0 -10
Changes:
-# 🤖 Kiro Git Commit Message Generator`;

console.log('🔍 Testing File Extraction Regex\n');

// Current regex from the code
const currentRegex = /📁 ([^:]+) \((\w+)\)/g;
const currentMatches = testPrompt.match(currentRegex) || [];

console.log('📋 Current Regex: /📁 ([^:]+) \\((\w+)\\)/g');
console.log('Current matches:', currentMatches);

if (currentMatches.length > 0) {
    const files = currentMatches.map((match) => {
        const parts = match.match(/📁 ([^:]+) \((\w+)\)/);
        return parts ? { path: parts[1], status: parts[2] } : null;
    }).filter(Boolean);

    console.log('Extracted files:', files);
    console.log('Files length:', files.length);
} else {
    console.log('❌ No files extracted with current regex!');
}

// Test improved regex
console.log('\n🔧 Testing Improved Regex:');
const improvedRegex = /📁 ([^(]+)\((\w+)\)/g;
const improvedMatches = testPrompt.match(improvedRegex) || [];

console.log('Improved regex: /📁 ([^(]+)\\((\\w+)\\)/g');
console.log('Improved matches:', improvedMatches);

if (improvedMatches.length > 0) {
    const files = improvedMatches.map((match) => {
        const parts = match.match(/📁 ([^(]+)\((\w+)\)/);
        return parts ? { path: parts[1].trim(), status: parts[2] } : null;
    }).filter(Boolean);

    console.log('Extracted files:', files);
    console.log('Files length:', files.length);
    console.log('✅ This should work better!');
}