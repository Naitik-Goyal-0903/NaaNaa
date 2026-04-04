const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');

// All the emoji replacements needed - using Unicode escape sequences
const replacements = [
  ['\u00f0\u009f\u0094\u00a7', '🔧'],  // wrench
  ['\u00f0\u009f\u0094\u0084', '🔄'],  // refresh
  ['\u00e2\u2020\u00e2\u0080\u0093', '←'],  // left arrow
  ['\u00f0\u009f\u0094\u0090', '📊'],  // chart
  ['\u00f0\u009f\u0094\u008b', '📋'],  // clipboard
  ['\u00f0\u009f\u0091\u00a5', '👥'],  // people
  ['\u00f0\u009f\u0091\u00b0', '💰'],  // money
  ['\u00e2\u0153\u00ef\u00b8\u008f', '✏️'],  // edit
  ['\u00f0\u009f\u0097\u0091\u00ef\u00b8\u008f', '🗑️'],  // trash
  ['\u00e2\u017e\u2022', '➕'],  // plus
  ['\u00f0\u009f\u0092\u00be', '💾'],  // save
  ['\u00e2\u0098\u0085', '★'],  // star
  // Decorative line
  ['\u00e2\u0094\u0080', '─']  // horizontal line
];

replacements.forEach(([broken, fixed]) => {
  content = content.split(broken).join(fixed);
});

fs.writeFileSync('src/App.jsx', content, 'utf8');
console.log('✅ All remaining icons fixed!');
