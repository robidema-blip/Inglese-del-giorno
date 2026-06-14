export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { teacherEmail, studentName, studentEmail, pin, level, lang } = req.body;

  if (!teacherEmail || !studentName || !pin) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const langNames = {
    it: 'Italian', es: 'Spanish', fr: 'French', pt: 'Portuguese',
    de: 'German', zh: 'Chinese', ko: 'Korean', ja: 'Japanese',
    ar: 'Arabic', ru: 'Russian', pl: 'Polish', nl: 'Dutch',
  };
  const levelNames = {
    principiante: 'Beginner (A1-A2)',
    intermedio: 'Intermediate (B1-B2)',
    avanzato: 'Advanced (C1)',
  };

  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not set');
    return res.status(200).json({ ok: true, note: 'Email skipped — no API key configured' });
  }

  const emailBody = `
Hi,

A new student has just registered on English Daily and added you as their teacher.

Student details:
• Name: ${studentName}
• Email: ${studentEmail}
• Level: ${levelNames[level] || level}
• Native language: ${langNames[lang] || lang}
• Teacher PIN: ${pin}

To view their progress, open the app, go to the Teacher tab, and enter the PIN above.

App: https://inglese-del-giorno.vercel.app

— English Daily
  `.trim();

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'English Daily <onboarding@resend.dev>',
        to: [teacherEmail],
        subject: `New student registered: ${studentName}`,
        text: emailBody,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Resend error:', err);
      return res.status(200).json({ ok: true, note: 'Email failed silently' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Email error:', err);
    return res.status(200).json({ ok: true, note: 'Email failed silently' });
  }
}
