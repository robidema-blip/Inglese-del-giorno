# Inglese del Giorno v2 — Deployment Guide

## Deploy to Vercel (free, ~5 minutes)

### What you need
- Free Vercel account → https://vercel.com/signup
- Free GitHub account → https://github.com/signup
- Anthropic API key → https://console.anthropic.com

---

### Step 1 — Upload to GitHub

1. Go to https://github.com/new
   - Name: `inglese-del-giorno` | Set to **Private** | Click **Create repository**

2. Open a terminal in this folder and run:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/inglese-del-giorno.git
   git push -u origin main
   ```

---

### Step 2 — Deploy on Vercel

1. Go to https://vercel.com → **Add New → Project**
2. Select your `inglese-del-giorno` repo → **Import**
3. Framework Preset: **Other** | Output Directory: `public`
4. Click **Deploy**

---

### Step 3 — Add your API key

1. Project → **Settings → Environment Variables**
2. Add: Name = `ANTHROPIC_API_KEY`, Value = `sk-ant-...`
   Check all three environments (Production, Preview, Development)
3. **Save** → go to **Deployments** → Redeploy

---

### Step 4 — Share the link

Your app is live at `https://inglese-del-giorno.vercel.app`

**First run:** the student enters their name, level, and sets a teacher PIN.
**Teacher access:** click "👩‍🏫 Insegnante" at the bottom of the screen → enter PIN.
**Cross-device reporting:** in the teacher view, click "📋 Copia report" to paste into WhatsApp.

---

### Folder structure
```
inglese-del-giorno/
├── api/
│   └── sentence.js      ← serverless function (API key lives here, hidden)
├── public/
│   └── index.html       ← full app (student + teacher views)
├── package.json
├── vercel.json
└── DEPLOY.md
```

### Cost
- Vercel: free tier
- Anthropic Haiku: ~$0.001/sentence → $0.03/month for one daily user
