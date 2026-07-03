// ══════════════════════════════════════════════════════════════
// link-teacher.js — links a verified teacher account to a student,
// after the teacher enters the student's email + invite code.
//
// Runs server-side so:
//  1. Only accounts that actually carry the `teacher` custom claim
//     can succeed (checked via verifyIdToken, cannot be spoofed).
//  2. The invite code comparison happens off the client, so a
//     student's invite code is never exposed to an unlinked teacher
//     through Firestore reads (Firestore rules also block that —
//     see firestore.rules — this is defence in depth).
// ══════════════════════════════════════════════════════════════
import { getAdmin } from './_firebaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { idToken, studentEmail, inviteCode } = req.body || {};
  if (!idToken || !studentEmail || !inviteCode) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    const admin = getAdmin();
    const decoded = await admin.auth().verifyIdToken(idToken);

    if (decoded.teacher !== true) {
      return res.status(403).json({ error: 'This account is not registered as a teacher.' });
    }

    const db = admin.firestore();
    const snap = await db.collection('users')
      .where('email', '==', String(studentEmail).trim().toLowerCase())
      .limit(1)
      .get();

    if (snap.empty) {
      return res.status(404).json({ error: 'No student account found with that email.' });
    }

    const studentDoc = snap.docs[0];
    const data = studentDoc.data();

    if (String(data.inviteCode || '').trim().toUpperCase() !== String(inviteCode).trim().toUpperCase()) {
      return res.status(403).json({ error: 'Incorrect invite code.' });
    }

    const teacherUids = new Set(data.teacherUids || []);
    teacherUids.add(decoded.uid);
    await studentDoc.ref.update({ teacherUids: Array.from(teacherUids) });

    return res.status(200).json({ ok: true, studentName: data.name || null });
  } catch (err) {
    console.error('link-teacher error:', err);
    return res.status(500).json({ error: 'Could not link account: ' + err.message });
  }
}
