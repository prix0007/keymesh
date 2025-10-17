// Debug Shamir Secret Sharing issue
import { splitSecret, reconstructSecret } from './src/crypto/shamir.js';

// Test with a simple case
const testSecret = new Uint8Array([42]); // Just one byte
console.log('Original secret:', testSecret);

const shares = splitSecret(testSecret, { shares: 3, threshold: 2 });
console.log('Generated shares:');
shares.forEach((share, i) => {
  console.log(`Share ${i + 1}: id=${share.id}, data=[${share.data[0]}]`);
});

// Test reconstruction with different combinations
console.log('\nTesting reconstruction:');
for (let i = 0; i < shares.length; i++) {
  for (let j = i + 1; j < shares.length; j++) {
    const subset = [shares[i], shares[j]];
    const reconstructed = reconstructSecret(subset);
    console.log(`Shares ${i+1},${j+1} -> [${reconstructed[0]}] (expected: ${testSecret[0]})`);
  }
}