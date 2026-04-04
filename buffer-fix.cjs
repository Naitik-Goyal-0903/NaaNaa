const fs = require('fs');

let buf = fs.readFileSync('src/App.jsx');

// Use Buffer methods to find and replace mojibake patterns
// The broken emojis are UTF-8 sequences that got interpreted wrong

// Create a mapping of broken byte sequences to correct ones
const fixes = new Map();

// These are the byte patterns for mojibake - found by reading the buffer directly
// ðŸ"§ (wrench) -> 🔧
fixes.set(Buffer.from([0xc3, 0xb0, 0xc2, 0x9f, 0xc2, 0x94, 0xc2, 0xa7]), Buffer.from('🔧', 'utf8'));

// ðŸ"„ (refresh) -> 🔄
fixes.set(Buffer.from([0xc3, 0xb0, 0xc2, 0x9f, 0xc2, 0x94, 0xc2, 0x84]), Buffer.from('🔄', 'utf8'));

// ðŸ"Š (chart) -> 📊
fixes.set(Buffer.from([0xc3, 0xb0, 0xc2, 0x9f, 0xc2, 0x94, 0xc2, 0x8a]), Buffer.from('📊', 'utf8'));

// ðŸ"‹ (clipboard) -> 📋
fixes.set(Buffer.from([0xc3, 0xb0, 0xc2, 0x9f, 0xc2, 0x94, 0xc2, 0x8b]), Buffer.from('📋', 'utf8'));

// ðŸ'¥ (people) -> 👥
fixes.set(Buffer.from([0xc3, 0xb0, 0xc2, 0x9f, 0xc2, 0x91, 0xc2, 0xa5]), Buffer.from('👥', 'utf8'));

// ðŸ'° (money) -> 💰
fixes.set(Buffer.from([0xc3, 0xb0, 0xc2, 0x9f, 0xc2, 0x91, 0xc2, 0xb0]), Buffer.from('💰', 'utf8'));

let content = buf;

// Apply all fixes
for (let [broken, fixed] of fixes.entries()) {
  let pos = 0;
  while ((pos = content.indexOf(broken, pos)) !== -1) {
    content = Buffer.concat([
      content.slice(0, pos),
      fixed,
      content.slice(pos + broken.length)
    ]);
    pos += fixed.length;
  }
}

fs.writeFileSync('src/App.jsx', content);
console.log('✅ Fixed all mojibake icon sequences!');
