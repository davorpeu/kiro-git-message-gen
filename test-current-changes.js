// Test commit message generation for current actual changes
const { KiroAIService } = require('./dist/services/AIService');

async function testCurrentChanges() {
    console.log('🔍 Testing Current Actual Changes\n');

    const aiService = KiroAIService.getInstance();

    // Simulate the current changes to AIService.ts
    const mockContext = {
        diff: {
            files: [
                {
                    path: 'src/services/AIService.ts',
                    status: 'modified',
                    additions: 61,
                    deletions: 4,
                    diff: `@@ -419,6 +419,10 @@
     // Check for branding/naming changes first
     const hasBrandingChanges = this.detectBrandingChanges(prompt);
     if (hasBrandingChanges.isBrandingChange) {
+      description = hasBrandingChanges.description;
+      commitType = hasBrandingChanges.type;
+      scope = ""; // No scope for branding changes - they affect the whole extension
+    }
+    // Use change context to improve description with more specificity
+    else if (
+      changeContext.hasNewFunctions &&
+      changeContext.newFunctions.length > 0
+    ) {
+      const functionName = changeContext.newFunctions[0];
+
+      // Make description more specific based on function name
+      if (functionName.toLowerCase().includes("validate")) {
+        description = \`add \${functionName} validation function\`;
+      } else if (
+        functionName.toLowerCase().includes("test") ||
+        functionName.toLowerCase().includes("spec")
+      ) {
+        description = \`add \${functionName} test function\`;
+      } else if (
+        functionName.toLowerCase().includes("handle") ||
+        functionName.toLowerCase().includes("click")
+      ) {
+        description = \`add \${functionName} handler\`;
+      } else if (
+        functionName.toLowerCase().includes("get") ||
+        functionName.toLowerCase().includes("fetch")
+      ) {
+        description = \`add \${functionName} getter function\`;
+      } else if (
+        functionName.toLowerCase().includes("set") ||
+        functionName.toLowerCase().includes("update")
+      ) {
+        description = \`add \${functionName} setter function\`;
+      } else if (changeContext.newFunctions.length === 1) {
+        description = \`add \${functionName} function\`;
+      } else {
+        // Multiple functions - be more descriptive
+        const functionTypes = changeContext.newFunctions.map((fn) => {
+          if (fn.toLowerCase().includes("validate")) return "validation";
+          if (fn.toLowerCase().includes("test")) return "test";
+          if (fn.toLowerCase().includes("handle")) return "handler";
+          return "utility";
+        });
+        const uniqueTypes = [...new Set(functionTypes)];
+        description =
+          uniqueTypes.length === 1
+            ? \`add \${uniqueTypes[0]} functions\`
+            : \`add \${changeContext.newFunctions.length} utility functions\`;
+      }
+    } else if (changeContext.hasNullChecks) {
+      description = \`add null safety checks\`;
+    } else if (changeContext.hasValidation) {
+      description = \`add validation logic\`;
+    } else if (changeContext.hasImports) {
+      description = \`update imports and dependencies\`;
+    } else if (changeContext.hasConfigChanges) {
+      description = \`update configuration\`;
+    } else if (changeContext.hasTestChanges) {
+      description = \`add test coverage\`;
+    }
+
+[... more additions for deletion detection, branding detection, etc ...]`
                }
            ],
            additions: 61,
            deletions: 4,
            summary: 'Enhanced AI service with deletion detection and branding detection'
        },
        preferences: {
            commitStyle: 'conventional',
            customTypes: ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'],
            analysisSettings: { enableScopeInference: true }
        }
    };

    const prompt = `Generate a git commit message for the following changes:

Git diff summary:
Files changed: 1
Additions: 61, Deletions: 4

Changed files with actual changes:

📁 src/services/AIService.ts (modified): +61 -4
Changes:
${mockContext.diff.files[0].diff}

Analysis: Look at the actual code changes above to understand what was implemented, fixed, or modified. Focus on the purpose and impact of the changes, not just file names.

Use conventional commit format: type(scope): description
Available types: feat, fix, docs, style, refactor, test, chore
Include appropriate scope based on changed files.

Generate a concise, descriptive commit message:`;

    console.log('📋 Current Changes Analysis:');
    console.log('- File: src/services/AIService.ts');
    console.log('- Changes: +61 -4 (significant additions)');
    console.log('- Type: New functionality (deletion detection, branding detection)');
    console.log('- Expected: "feat(services): add deletion detection and branding analysis"');

    try {
        const result = await aiService.generateCommitMessage(prompt, mockContext);
        console.log('\n🤖 Generated Message:', `"${result}"`);

        // Analyze the quality
        if (result.includes('feat') && result.includes('services')) {
            console.log('✅ EXCELLENT: Correct type and scope!');
        } else if (result.includes('feat')) {
            console.log('✅ GOOD: Correct type, scope could be better');
        } else {
            console.log('⚠️  Could be better: Check type detection');
        }

        if (result.includes('detection') || result.includes('analysis') || result.includes('branding')) {
            console.log('✅ EXCELLENT: Describes the actual changes!');
        } else {
            console.log('⚠️  Generic: Could be more specific about what was added');
        }

    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

testCurrentChanges().catch(console.error);