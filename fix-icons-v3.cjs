const fs = require('fs');

let buf = fs.readFileSync('src/App.jsx');
let str = buf.toString('utf8');

// Get hex representation of what's in the file
let idx1 = str.indexOf('editingProduct ? "');
if (idx1 > -1) {
  let snippet = str.slice(idx1 + 18, idx1 + 25);
  console.log('Current chars at edit icon position:', JSON.stringify(snippet));
  // Print each character code
  for (let i = 0; i < snippet.length; i++) {
    console.log(`  [${i}]: U+${snippet.charCodeAt(i).toString(16).toUpperCase().padStart(4, '0')}`);
  }
}

// Try replacing with different byte patterns
// The mojibake sequences are:
// âœï¸ appears to be mojibake for ✏️
// ðŸ'¾ appears to be mojibake for 💾

// Try using Buffer.from with specific encoding
let content = fs.readFileSync('src/App.jsx', 'utf8');

// Replace mojibake sequences by their UTF-8 byte representation
// âœï¸ = 0xC3 0xA2 0xC3 0x9F 0xEF 0xB8 0x8F in UTF-8 mojibake
content = content.replace(/\xc3\xa2\xc3\x9f\xef\xb8\x8f/g, '✏️');

// ðŸ'¾ = similar mojibake pattern
content = content.replace(/\xc3\xb0\xc2\x9f\xc2\x91\xc2\xbe/g, '💾');

fs.writeFileSync('src/App.jsx', content, 'utf8');
console.log('✅ Replacements complete!');
