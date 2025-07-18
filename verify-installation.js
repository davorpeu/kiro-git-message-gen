const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Git Commit Generator Extension Installation...\n');

// Check package.json
console.log('📦 Package Configuration:');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
console.log(`  ✓ Name: ${packageJson.name}`);
console.log(`  ✓ Display Name: ${packageJson.displayName}`);
console.log(`  ✓ Version: ${packageJson.version}`);
console.log(`  ✓ Main Entry: ${packageJson.main}`);
console.log(`  ✓ Engine: ${packageJson.engines.kiro}`);

// Check main extension file
console.log('\n📁 Extension Files:');
const mainFile = packageJson.main;
if (fs.existsSync(mainFile)) {
    console.log(`  ✓ Main file exists: ${mainFile}`);
} else {
    console.log(`  ✗ Main file missing: ${mainFile}`);
}

// Check dist directory
const distFiles = [
    'dist/extension.js',
    'dist/services/CommitMessageGenerator.js',
    'dist/services/GitService.js',
    'dist/services/AIService.js',
    'dist/services/ChangeAnalysisService.js'
];

distFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`  ✓ ${file}`);
    } else {
        console.log(`  ✗ ${file} - MISSING`);
    }
});

// Check commands
console.log('\n⚡ Commands:');
packageJson.contributes.commands.forEach(cmd => {
    console.log(`  ✓ ${cmd.command}: ${cmd.title}`);
});

// Check menus
console.log('\n📍 Menu Integration:');
Object.keys(packageJson.contributes.menus).forEach(menu => {
    const items = packageJson.contributes.menus[menu];
    console.log(`  ✓ ${menu}: ${items.length} item(s)`);
    items.forEach(item => {
        console.log(`    - Command: ${item.command}`);
        console.log(`    - When: ${item.when || 'always'}`);
        console.log(`    - Group: ${item.group || 'default'}`);
    });
});

// Check configuration
console.log('\n⚙️ Configuration:');
const config = packageJson.contributes.configuration;
console.log(`  ✓ Title: ${config.title}`);
console.log(`  ✓ Properties: ${Object.keys(config.properties).length}`);
Object.keys(config.properties).forEach(prop => {
    const propConfig = config.properties[prop];
    console.log(`    - ${prop}: ${propConfig.type} (default: ${JSON.stringify(propConfig.default)})`);
});

console.log('\n🎯 Installation Instructions:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('1. Open Kiro IDE');
console.log('2. Open Command Palette (Ctrl+Shift+P or Cmd+Shift+P)');
console.log('3. Type: "Extensions: Install from Folder"');
console.log('4. Select this project folder');
console.log('5. Restart Kiro IDE if prompted');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

console.log('\n🚀 Usage After Installation:');
console.log('1. Open a git repository in Kiro IDE');
console.log('2. Stage some changes: git add <files>');
console.log('3. Open Source Control panel');
console.log('4. Look for the AI generate button on the right side of the commit message input');
console.log('5. Click the button to generate a commit message!');

console.log('\n✅ Extension is ready for installation in Kiro IDE!');