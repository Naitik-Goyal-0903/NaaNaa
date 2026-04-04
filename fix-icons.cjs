const fs = require('fs');

let c = fs.readFileSync('src/App.jsx', 'utf8');
c = c.replace('âœï¸', '✏️');
c = c.replace('ðŸ\'¾', '💾');
fs.writeFileSync('src/App.jsx', c, 'utf8');
console.log('✅ Done!');
