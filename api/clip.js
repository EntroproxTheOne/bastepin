// Vercel Serverless Function — /api/clip
// Storage: Vercel Blob (private store).
// Required env var: BLOB_READ_WRITE_TOKEN (auto-injected when you link the store)
//
// Max content size: 512 KB per slot (adjustable via MAX_BYTES below).


let put, list;
try {
  ({ put, list } = require('@vercel/blob'));
} catch {}

const MAX_BYTES = 512 * 1024; // 512 KB

function slotPath(slot) {
  return `clips/slot-${slot}.txt`;
}

// In-memory clipboard fallback (for local/dev only)
const localClipboard = {};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }


  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const useBlob = !!(token && put && list);

  // ── GET /api/clip?slot=N ──────────────────────────────────────────────────
  if (req.method === 'GET') {
    const slot = sanitizeSlot(req.query.slot);
    if (!slot) return res.status(400).json({ error: 'Invalid slot.' });

    if (useBlob) {
      try {
        const { blobs } = await list({ prefix: slotPath(slot), access: 'public', token });
        if (!blobs.length) return res.status(200).json({ text: '' });

        // Always fetch public blobs without auth header
        const fetchRes = await fetch(blobs[0].url);
        if (!fetchRes.ok) return res.status(200).json({ text: '' });
        const text = await fetchRes.text();
        return res.status(200).json({ text });
      } catch (e) {
        return res.status(502).json({ error: e.message });
      }
    } else {
      // Local fallback
      return res.status(200).json({ text: localClipboard[slot] || '' });
    }
  }

  // ── POST /api/clip ────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { slot, text } = req.body ?? {};
    const cleanSlot = sanitizeSlot(slot);
    if (!cleanSlot) return res.status(400).json({ error: 'Invalid slot.' });

    if (typeof text !== 'string') {
      return res.status(400).json({ error: 'text must be a string.' });
    }

    if (Buffer.byteLength(text, 'utf8') > MAX_BYTES) {
      return res.status(413).json({ error: `Content exceeds ${MAX_BYTES / 1024} KB limit.` });
    }

    if (useBlob) {
      try {
        await put(slotPath(cleanSlot), text, {
          access: 'public',
          contentType: 'text/plain; charset=utf-8',
          allowOverwrite: true,
          addRandomSuffix: false,
          token,
        });
        return res.status(200).json({ ok: true });
      } catch (e) {
        return res.status(502).json({ error: e.message });
      }
    } else {
      // Local fallback
      localClipboard[cleanSlot] = text;
      return res.status(200).json({ ok: true });
    }
  }

  return res.status(405).json({ error: 'Method not allowed.' });
};

function sanitizeSlot(raw) {
  // Accept only integers 1–20
  const n = parseInt(raw, 10);
  if (isNaN(n) || n < 1 || n > 20) return null;
  return String(n);
}
