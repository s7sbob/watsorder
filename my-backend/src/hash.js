// hash.js
const bcrypt = require('bcrypt');

async function hashPassword(plainPassword) {
  const saltRounds = 10;
  const hashed = await bcrypt.hash(plainPassword, saltRounds);
  console.log(`Plain: ${plainPassword}\nHashed: ${hashed}`);
}

hashPassword("123"); // أو أي كلمة مرور تريد تشفيرها
