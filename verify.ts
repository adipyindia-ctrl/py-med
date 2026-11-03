import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

Promise.all([
  pool.query('SELECT email,name FROM doctors'),
  pool.query('SELECT COUNT(*) FROM knowledge_base'),
])
  .then(([d, k]) => {
    console.log('Doctors:', d.rows);
    console.log('KnowledgeBase count:', k.rows[0].count);
    pool.end();
  })
  .catch((e: Error) => {
    console.error(e.message);
    pool.end();
  });
