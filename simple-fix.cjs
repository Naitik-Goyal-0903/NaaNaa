const fs = require('fs');

let c = fs.readFileSync('src/App.jsx', 'utf8');

// Replace using exact strings as shown
c = c.replace(/ðŸ"§/g, '🔧');
c = c.replace(/ðŸ"„/g, '🔄');
c = c.replace(/ðŸ"Š/g, '📊');
c = c.replace(/ðŸ"‹/g, '📋');
c = c.replace(/ðŸ'¥/g, '👥');
c = c.replace(/ðŸ'°/g, '💰');

fs.writeFileSync('src/App.jsx', c, 'utf8');
console.log('✅ Done!');
