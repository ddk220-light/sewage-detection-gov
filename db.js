import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = process.env.DATABASE_URL;
const isInternalOrLocal = connectionString && (
  connectionString.includes('.internal') ||
  connectionString.includes('localhost') ||
  connectionString.includes('127.0.0.1')
);

const pool = new Pool({
  connectionString,
  ssl: isInternalOrLocal ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000
});

async function initDB() {
  console.log('Connecting to database...', connectionString ? connectionString.replace(/:[^:@]*@/, ':***@') : 'UNDEFINED');

  let retries = 10;
  while (retries > 0) {
    try {
      const client = await pool.connect();
      try {
        console.log('Reading schema file...');
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        console.log('Executing schema...');
        await client.query(schema);
        console.log('Database initialized successfully!');
        return;
      } finally {
        client.release();
      }
    } catch (err) {
      retries--;
      console.error(`DB connection failed (${retries} retries left):`, err.message);
      if (retries === 0) throw err;
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  initDB().catch(console.error);
}

export default pool;
