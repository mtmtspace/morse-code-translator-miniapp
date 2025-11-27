const ctc = require('ctc');
console.log('Keys:', Object.keys(ctc));
try {
  console.log('你:', ctc.convert('你'));
} catch (e) { console.log('convert error:', e.message); }

try {
  // Guessing reverse
  if (ctc.reverse) console.log('Reverse 0427:', ctc.reverse('0427'));
} catch (e) {}
