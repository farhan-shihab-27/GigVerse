const pool = require('./database/db');
(async () => {
  try {
    const [rows] = await pool.query('SELECT * FROM Users LIMIT 1');
    console.log(Object.keys(rows[0]));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
