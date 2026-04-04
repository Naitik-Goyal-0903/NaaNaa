const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');

// Fix the edit icon (line ~2527)
// âœï¸ = \xc3\xa2\xc3\x9f\xef\xb8\x8f
content = content.replace(/\u00c3\u00a2\u00c3\u009f\u00ef\u00b8\u008f/g, '✏️');

// Fix the save icon (line ~2579) 
// ðŸ'¾ = \xc3\xb0\xc2\x9f\xc2\x91\xc2\xbe
content = content.replace(/\u00c3\u00b0\u00c2\u009f\u00c2\u0091\u00c2\u00be/g, '💾');

fs.writeFileSync('src/App.jsx', content, 'utf8');
console.log('✅ All icons fixed!');
