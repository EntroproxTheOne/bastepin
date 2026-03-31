# Bastepin

A minimal remote clipboard — paste text on one device, retrieve it on another. No login required.

## Deploy to Vercel (2 minutes)

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "init"
# create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USER/bastepin.git
git push -u origin main
```

### 2. Import on Vercel

Go to [vercel.com/new](https://vercel.com/new), import the repo, click **Deploy**.

### 3. Add a Blob Store (for persistent storage)

1. In your Vercel project → **Storage** tab → **Create Database** → choose **Blob** → give it any name → **Create**.
2. Vercel automatically injects `BLOB_READ_WRITE_TOKEN` into your project's env vars.
3. **Redeploy** the project once (just click "Redeploy" in the Deployments tab).

That's it — your clipboard is live.

## Usage

| Action | How |
|--------|-----|
| Save text | Paste in the box → click **Save** |
| Retrieve on another device | Open the URL → pick the same slot → click **Load** |
| Copy to local clipboard | Click **Copy** |
| Multiple clipboards | Use Slots 1-5 |

## Structure

```
bastepin/
├── index.html       ← the entire frontend (single page)
├── api/
│   └── clip.js      ← serverless API (GET + POST)
├── vercel.json      ← routing config
├── package.json
└── .gitignore
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `BLOB_READ_WRITE_TOKEN` | Auto-set when you link a Vercel Blob store |

## Limits

- 512 KB max per slot (adjustable via `MAX_BYTES` in `api/clip.js`)
- 5 slots (slots 1–20 are all valid via API)
- Vercel Blob free tier: 500 MB storage, 100 GB bandwidth/month — plenty for personal use
