// ══════════════════════════════════════════════════════════════
// config.js — serves the Firebase web config from environment
// variables so it never has to be pasted into index.html by hand.
//
// Firebase browser API keys are not secret by design (they are
// restricted by HTTP referrer, not by being hidden) — see
// https://firebase.google.com/docs/projects/api-keys — so returning
// them from an unauthenticated endpoint is safe, AS LONG AS the
// domain allow-list in Google Cloud Console stays correct.
// ══════════════════════════════════════════════════════════════

const REQUIRED_VARS = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID',
];

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const missing = REQUIRED_VARS.filter(k => !process.env[k]);
  if (missing.length) {
    console.error('Missing Firebase env vars:', missing.join(', '));
    return res.status(500).json({
      error: 'Server not configured. Missing env vars: ' + missing.join(', '),
    });
  }

  // Safe to cache briefly at the edge — this payload only changes when
  // Roby updates the Vercel env vars (which requires a redeploy anyway).
  res.setHeader('Cache-Control', 'public, max-age=300');

  return res.status(200).json({
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
  });
}
