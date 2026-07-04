// ══════════════════════════════════════════════════════════════
// reset-student-password.js — lets a linked teacher directly set a
// new temporary password for one of their students, bypassing
// email entirely. Built as a workaround after Firebase's default
// password-reset emails proved unreliable (landing in spam, and
// likely getting their one-time link consumed by automated
// spam-scanners before the recipient could click it).
//
// Security: only works if (a) the caller's ID token carries the
// `teacher` custom claim, verified server-side, and (b) that
// teacher's uid is actually listed in the target student's
// teacherUids array — a teacher can only reset passwords for
// students they're genuinely linked to, never an arbitrary uid.
// ══════════════════════════════════════════════════════════════
import crypto from 'crypto';
import { getAdmin } from './_firebaseAdmin.js';

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(10);
  let out = '';
  for (let i = 0; i < 10; i++) out += chars[bytes[i] % chars.length];
  return out;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { idToken, studentUid } = req.body || {};
  if (!idToken || !studentUid) return res.status(400).json({ error: 'Missing fields' });

  try {
    const admin = getAdmin();
    const decoded = await admin.auth().verifyIdToken(idToken);
    if (decoded.teacher !== true) {
      return res.status(403).json({ error: 'This account is not registered as a teacher.' });
    }

    const db = admin.firestore();
    const studentRef = db.collection('users').doc(studentUid);
    const studentSnap = await studentRef.get();
    if (!studentSnap.exists) return res.status(404).json({ error: 'Student not found.' });

    const data = studentSnap.data();
    const teacherUids = data.teacherUids || [];
    if (!teacherUids.includes(decoded.uid)) {
      return res.status(403).json({ error: 'You are not linked to this student.' });
    }

    const newPassword = generateTempPassword();
    await admin.auth().updateUser(studentUid, { password: newPassword });

    return res.status(200).json({
      ok: true,
      newPassword,
      studentName: data.name || null,
      studentEmail: data.email || null,
    });
  } catch (err) {
    console.error('reset-student-password error:', err.message);
    return res.status(500).json({ error: 'Could not reset password: ' + err.message });
  }
}
