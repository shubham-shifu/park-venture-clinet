// Copy-editor API — single endpoint on Postgres (Neon).
//
// Endpoints:
//   GET  /api/copy             → { entries: [...] }
//   GET  /api/copy?format=md   → text/markdown attachment (unique-changes only)
//   POST /api/copy             → register / add-option / edit-option / delete-option / select
//
// Schema (see scripts/migrate.js):
//   copy_entries(id, page, section, tag, original_text, options jsonb,
//                selected_option_id, updated_at, created_at)

const { query, configured } = require('../lib/db');

function newOption(text) {
  return {
    id: 'opt-' + Math.random().toString(36).slice(2, 10),
    text: text || '',
    createdAt: Date.now(),
  };
}

function rowToEntry(row) {
  return {
    id: row.id,
    page: row.page,
    section: row.section,
    tag: row.tag,
    originalText: row.original_text,
    options: row.options || [],
    selectedOptionId: row.selected_option_id,
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
  };
}

async function getEntry(id) {
  const r = await query(
    `SELECT id, page, section, tag, original_text, options, selected_option_id, updated_at
       FROM copy_entries WHERE id = $1`,
    [id]
  );
  return r.rows.length ? rowToEntry(r.rows[0]) : null;
}

async function getAllEntries() {
  const r = await query(
    `SELECT id, page, section, tag, original_text, options, selected_option_id, updated_at
       FROM copy_entries
   ORDER BY page, section, id`
  );
  return r.rows.map(rowToEntry);
}

function renderMarkdown(entries) {
  // Only entries with at least one option — i.e. unique changes only.
  const touched = entries.filter(e => e.options && e.options.length > 0);
  if (!touched.length) return '# Copy changes\n\n_No changes yet._\n';

  const byPage = {};
  for (const e of touched) {
    (byPage[e.page] = byPage[e.page] || []).push(e);
  }

  let out = `# Copy changes\n\n_Exported: ${new Date().toISOString()}_\n\n`;
  out += `Each block below shows the original copy on the site, every option `;
  out += `that was drafted, and which one is currently selected. Use the `;
  out += `**Original** string as a search query in the codebase to locate the `;
  out += `line, then replace with the **Selected** option.\n\n---\n\n`;

  for (const page of Object.keys(byPage).sort()) {
    out += `## ${page}\n\n`;
    const groups = {};
    for (const e of byPage[page]) (groups[e.section] = groups[e.section] || []).push(e);
    for (const section of Object.keys(groups).sort()) {
      out += `### ${section}\n\n`;
      for (const e of groups[section]) {
        const selectedOpt = e.options.find(o => o.id === e.selectedOptionId);
        out += `**Original:** ${e.originalText.replace(/\n/g, ' ')}\n\n`;
        out += selectedOpt
          ? `**Selected:** ${selectedOpt.text.replace(/\n/g, ' ')}\n\n`
          : `**Selected:** _none — viewer drafted options but didn't pick one_\n\n`;
        if (e.options.length > 1 || !selectedOpt) {
          out += `<details><summary>All ${e.options.length} option${e.options.length === 1 ? '' : 's'} drafted</summary>\n\n`;
          for (const opt of e.options) {
            const mark = opt.id === e.selectedOptionId ? ' ← selected' : '';
            out += `- ${opt.text.replace(/\n/g, ' ') || '_(empty)_'}${mark}\n`;
          }
          out += `\n</details>\n\n`;
        }
      }
    }
  }
  return out;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  if (!configured()) {
    return res.status(503).json({
      error: 'storage not configured',
      detail: 'Set DATABASE_URL on the Vercel project (Settings → Environment Variables).',
    });
  }

  try {
    if (req.method === 'GET') {
      if ((req.query && req.query.format) === 'md') {
        const entries = await getAllEntries();
        const md = renderMarkdown(entries);
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="copy-changes.md"');
        return res.status(200).send(md);
      }
      const entries = await getAllEntries();
      return res.status(200).json({ entries });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const op = body.op;

      if (op === 'register') {
        const incoming = (Array.isArray(body.entries) ? body.entries : [])
          .filter(e => e && e.id);
        if (!incoming.length) return res.status(200).json({ added: 0, total: 0 });

        // Bulk insert via UNNEST so a 100-row register is one round-trip.
        const ids       = incoming.map(e => e.id);
        const pages     = incoming.map(e => e.page || 'unknown');
        const sections  = incoming.map(e => e.section || 'misc');
        const tags      = incoming.map(e => e.tag || null);
        const originals = incoming.map(e => e.originalText || '');

        const r = await query(
          `INSERT INTO copy_entries (id, page, section, tag, original_text)
           SELECT * FROM UNNEST($1::text[], $2::text[], $3::text[], $4::text[], $5::text[])
           ON CONFLICT (id) DO NOTHING
           RETURNING id`,
          [ids, pages, sections, tags, originals]
        );
        return res.status(200).json({ added: r.rowCount, total: incoming.length });
      }

      const id = body.id;
      if (!id) return res.status(400).json({ error: 'missing id' });
      const entry = await getEntry(id);
      if (!entry) return res.status(404).json({ error: 'entry not found' });

      if (op === 'add-option') {
        const opt = newOption(body.text);
        entry.options.push(opt);
        await query(
          `UPDATE copy_entries SET options = $1::jsonb, updated_at = NOW() WHERE id = $2`,
          [JSON.stringify(entry.options), id]
        );
        return res.status(200).json({ entry: await getEntry(id) });
      }

      if (op === 'edit-option') {
        const opt = entry.options.find(o => o.id === body.optionId);
        if (!opt) return res.status(404).json({ error: 'option not found' });
        opt.text = body.text || '';
        await query(
          `UPDATE copy_entries SET options = $1::jsonb, updated_at = NOW() WHERE id = $2`,
          [JSON.stringify(entry.options), id]
        );
        return res.status(200).json({ entry: await getEntry(id) });
      }

      if (op === 'delete-option') {
        const before = entry.options.length;
        entry.options = entry.options.filter(o => o.id !== body.optionId);
        if (entry.options.length === before) {
          return res.status(404).json({ error: 'option not found' });
        }
        const clearSelected = entry.selectedOptionId === body.optionId;
        await query(
          `UPDATE copy_entries
              SET options = $1::jsonb,
                  selected_option_id = CASE WHEN $3::bool THEN NULL ELSE selected_option_id END,
                  updated_at = NOW()
            WHERE id = $2`,
          [JSON.stringify(entry.options), id, clearSelected]
        );
        return res.status(200).json({ entry: await getEntry(id) });
      }

      if (op === 'select') {
        await query(
          `UPDATE copy_entries SET selected_option_id = $1, updated_at = NOW() WHERE id = $2`,
          [body.optionId || null, id]
        );
        return res.status(200).json({ entry: await getEntry(id) });
      }

      return res.status(400).json({ error: 'unknown op' });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    console.error('api/copy error:', err);
    return res.status(500).json({ error: 'internal error', detail: String(err.message || err) });
  }
};
