const jwt = require('jsonwebtoken');
const fetch = global.fetch || require('node-fetch');

const token = jwt.sign({ userid: 5, companyid: 1, role: 'staff', username: 'testuser' }, 'yourSuperSecretKey123', { expiresIn: '1h' });
console.log('TOKEN', token);

(async () => {
  try {
    const res = await fetch('http://localhost:3000/api/company-invites', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('STATUS', res.status);
    console.log(await res.text());
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
