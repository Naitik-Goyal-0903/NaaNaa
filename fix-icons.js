const fs = require('fs');
const path = 'src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

// Fix all broken emojis
const fixes = [
  ['ðŸ"§', '🔧'],
  ['ðŸ"„', '🔄'],
  ['â†', '←'],
  ['ðŸ"Š', '📊'],
  ['ðŸ"‹', '📋'],
  ['ðŸ'¥', '👥'],
  ['ðŸ'°', '💰'],
  ['âœï¸', '✏️'],
  ['ðŸ—'ï¸', '🗑️'],
  ['âž•', '➕'],
  ['ðŸ'¾', '💾'],
  ['â˜…', '★'],
  ['â€º', '›'],
];

let count = 0;
fixes.forEach(([broken, fixed]) => {
  const regex = new RegExp(broken.split('').map(c => '\\u' + ('000' + c.charCodeAt(0).toString(16)).slice(-4)).join(''), 'g');
  const matches = (content.match(regex) || []).length;
  content = content.replaceAll(broken, fixed);
  count += matches;
});

fs.writeFileSync(path, content, 'utf8');
console.log(`✅ Fixed ${count} broken icons!`);
