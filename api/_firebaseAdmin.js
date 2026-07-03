// ══════════════════════════════════════════════════════════════
// _firebaseAdmin.js — shared Firebase Admin SDK bootstrap.
// Used by server-side endpoints that need privileged access
// (setting custom claims, reading/writing across users, etc.)
// that must NEVER be done from the browser.
//
// Requires the FIREBASE_SERVICE_ACCOUNT env var: the full JSON
// key of a Firebase service account, stored as a single-line
// string. See DEPLOY.md for exact steps to generate and add it.
// ══════════════════════════════════════════════════════════════
import admin from 'firebase-admin';

export function getAdmin() {
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT env var is not set on the server.');
    }
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(raw);
    } catch (e) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT env var is not valid JSON.');
    }
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
  return admin;
}
