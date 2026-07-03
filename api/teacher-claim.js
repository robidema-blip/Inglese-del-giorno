// ══════════════════════════════════════════════════════════════
// teacher-claim.js — grants the `teacher: true` custom claim to a
// freshly-created Firebase Auth account, right after teacher signup.
//
// This is the ONLY place in the whole app that decides "this
// account is a teacher". It runs server-side with the Admin SDK
// so it cannot be spoofed from the browser. The Firestore Security
// Rules trust request.auth.token.teacher, which Firebase itself
// signs into the user's ID token — a client cannot forge this.
// ══════════════════════════════════════════════════════════════
import { getAdmin } from './_firebaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { idToken, name } = req.body || {};
  if (!idToken) return res.status(400).json({ error: 'Missing idToken' });

  try {
    const admin = getAdmin();
    const decoded = await admin.auth().verifyIdToken(idToken);

    if (decoded.teacher === true) {
      return res.status(200).json({ ok: true, note: 'Account is already a teacher.' });
    }

    await admin.auth().setCustomUserClaims(decoded.uid, { teacher: true });

    await admin.firestore().collection('teachers').doc(decoded.uid).set({
      name: name || null,
      email: decoded.email || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('teacher-claim error:', err);
    return res.status(500).json({ error: 'Could not set up teacher account: ' + err.message });
  }
}
