const fs = require('fs');
const path = require('path');

console.log('📦 Packaging Kiro Git Commit Generator Extension...\n');

// Check if all required files exist
const requiredFiles = [
    'package.json',
    'dist/extension.js',
    'README.md'
];

console.log('✅ Checking required files:');
requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`  ✓ ${file}`);
    } else {
        console.log(`  ✗ ${file} - MISSING!`);
        process.exit(1);
    }
});

console.log('\n📋 Extension Information:');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
console.log(`  Name: ${packageJson.displayName}`);
console.log(`  ID: ${packageJson.name}`);
console.log(`  Version: ${packageJson.version}`);
console.log(`  Publisher: ${packageJson.publisher}`);
console.log(`  Main: ${packageJson.main}`);

console.log('\n🎯 Commands:');
packageJson.contributes.commands.forEach(cmd => {
    console.log(`  - ${cmd.title} (${cmd.command})`);
});

console.log('\n📍 Menu Locations:');
Object.keys(packageJson.contributes.menus).forEach(menu => {
    console.log(`  - ${menu}: ${packageJson.contributes.menus[menu].length} item(s)`);
});

console.log('\n🚀 Extension is ready for installation!');
console.log('\nTo install in Kiro IDE:');
console.log('1. Open Kiro IDE');
console.log('2. Open Command Palette (Ctrl+Shift+P)');
console.log('3. Run: "Extensions: Install from Folder"');
console.log('4. Select this project folder');
console.log('\nOr copy this entire folder to your Kiro extensions directory.');