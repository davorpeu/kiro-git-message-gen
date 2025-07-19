// Test branding detection specifically
const testPrompt = `Generate a git commit message for the following changes:

Git diff summary:
Files changed: 3
Additions: 13, Deletions: 11

Changed files with actual changes:

📁 README.md (modified): +2 -2
Changes:
-# 🤖 AI Git Commit Message Generator
+# 🤖 Kiro Git Commit Message Generator

-Generate intelligent, conventional commit messages using AI based on your changes in Kiro IDE.
+Generate intelligent, conventional commit messages using Kiro's AI based on your code changes.

📁 package.json (modified): +3 -3
Changes:
-  "displayName": "AI Git Commit Message Generator",
+  "displayName": "Kiro Git Commit Message Generator",
-  "description": "Generate intelligent git commit messages using AI based on staged changes",
+  "description": "Generate intelligent git commit messages using Kiro's AI based on your code changes",
-      "title": "Git Commit Generator",
+      "title": "Kiro Git Commit Generator",

📁 src/extension.ts (modified): +4 -4
Changes:
-  console.log("Git Commit Message Generator extension is now active");
+  console.log("Kiro Git Commit Message Generator extension is now active");
-  console.log("Git Commit Message Generator extension is being deactivated");
+  console.log("Kiro Git Commit Message Generator extension is being deactivated");

Analysis: Look at the actual code changes above to understand what was implemented, fixed, or modified. Focus on the purpose and impact of the changes, not just file names.

Use conventional commit format: type(scope): description
Available types: feat, fix, docs, style, refactor, test, chore
Include appropriate scope based on changed files.

Generate a concise, descriptive commit message:`;

console.log('🔍 Testing Branding Detection Patterns\n');

// Test the patterns
const brandingPatterns = [
    /AI.*Git.*Commit.*Generator.*Kiro.*Git.*Commit.*Generator/i,
    /displayName.*AI.*Kiro/i,
    /title.*Git.*Commit.*Generator.*Kiro.*Git.*Commit.*Generator/i,
    /"AI.*".*"Kiro.*"/i,
    /AI Git Commit Message Generator.*Kiro Git Commit Message Generator/i
];

console.log('📋 Testing each pattern:');
brandingPatterns.forEach((pattern, index) => {
    const matches = pattern.test(testPrompt);
    console.log(`Pattern ${index + 1}: ${matches ? '✅ MATCHES' : '❌ NO MATCH'}`);
    console.log(`  Regex: ${pattern}`);
});

console.log('\n🔍 Looking for specific text in prompt:');
console.log('Contains "AI Git Commit Message Generator":', testPrompt.includes('AI Git Commit Message Generator'));
console.log('Contains "Kiro Git Commit Message Generator":', testPrompt.includes('Kiro Git Commit Message Generator'));
console.log('Contains "displayName":', testPrompt.includes('displayName'));
console.log('Contains "README.md":', testPrompt.includes('README.md'));
console.log('Contains "package.json":', testPrompt.includes('package.json'));

console.log('\n💡 Suggested better patterns:');
const betterPatterns = [
    /AI Git Commit Message Generator.*Kiro Git Commit Message Generator/i,
    /displayName.*AI.*Generator.*Kiro.*Generator/i,
    /-.*AI.*\+.*Kiro/i
];

betterPatterns.forEach((pattern, index) => {
    const matches = pattern.test(testPrompt);
    console.log(`Better Pattern ${index + 1}: ${matches ? '✅ MATCHES' : '❌ NO MATCH'}`);
    console.log(`  Regex: ${pattern}`);
});

console.log('\n🎯 This should help us fix the branding detection!');