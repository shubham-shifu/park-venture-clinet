// Schema migration runner for Neon. Run with:
//   DATABASE_URL='postgres://...' node scripts/migrate.js
// or place DATABASE_URL in .env.local and run `npm run migrate`.
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^"|"$/g, '');
    }
  }
}

const { query, getPool } = require('../lib/db');

const SQL = `
CREATE TABLE IF NOT EXISTS copy_entries (
  id                  TEXT PRIMARY KEY,
  page                TEXT NOT NULL,
  section             TEXT NOT NULL,
  tag                 TEXT,
  original_text       TEXT NOT NULL,
  options             JSONB NOT NULL DEFAULT '[]'::jsonb,
  selected_option_id  TEXT,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_copy_entries_page    ON copy_entries(page);
CREATE INDEX IF NOT EXISTS idx_copy_entries_updated ON copy_entries(updated_at DESC);
`;

(async () => {
  try {
    console.log('Running migration on Neon…');
    await query(SQL);
    const c = await query('SELECT COUNT(*)::int AS n FROM copy_entries');
    console.log(`copy_entries rows: ${c.rows[0].n}`);
    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await getPool().end();
  }
})();
