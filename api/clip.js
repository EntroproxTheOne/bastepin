// Vercel Serverless Function — /api/clip
// Storage: Vercel KV (Redis). Set up via Vercel dashboard → Storage → KV.
// Required env vars (auto-injected when you link a KV store):
//   KV_REST_API_URL, KV_REST_API_TOKEN
//
// Max content size: 512 KB per slot (adjustable via MAX_BYTES below).

const MAX_BYTES = 512 * 1024; // 512 KB

async function kvGet(key) {
  const url = `${process.env.KV_REST_API_URL}/get/${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` }
  });
  if (!res.ok) throw new Error(`KV GET error: ${res.status}`);
  const json = await res.json();
  return json.result; // null if not set
}

async function kvSet(key, value) {
  const url = `${process.env.KV_REST_API_URL}/set/${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(value)
  });
  if (!res.ok) throw new Error(`KV SET error: ${res.status}`);
}

export default async function handler(req, res) {
  // CORS headers (restrict to same origin in production if desired)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Validate KV env vars are present
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return res.status(500).json({ error: 'KV store not configured. Add KV_REST_API_URL and KV_REST_API_TOKEN environment variables.' });
  }

  // ── GET /api/clip?slot=N ──────────────────────────────────────────────────
  if (req.method === 'GET') {
    const slot = sanitizeSlot(req.query.slot);
    if (!slot) return res.status(400).json({ error: 'Invalid slot.' });

    try {
      const text = await kvGet(`clip:${slot}`);
      return res.status(200).json({ text: text ?? '' });
    } catch (e) {
      return res.status(502).json({ error: e.message });
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

    try {
      await kvSet(`clip:${cleanSlot}`, text);
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(502).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed.' });
}

function sanitizeSlot(raw) {
  // Accept only integers 1–20
  const n = parseInt(raw, 10);
  if (isNaN(n) || n < 1 || n > 20) return null;
  return String(n);
}
