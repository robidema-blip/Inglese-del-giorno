export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    level = 'principiante',
    nativeLang = 'it',
    themeId = 1,
    sessionInTheme = 0,
    grammarLevel = 1,
    usedCompoundWords = [],
    mode = 'lesson',
  } = req.body;

  const themes = {
    1: 'daily life and routines',
    2: 'food, cafés and restaurants',
    3: 'travel and transport',
    4: 'work and technology',
    5: 'nature and the environment',
  };
  const theme = themes[themeId] || themes[1];

  const levelMap = {
    principiante: 'beginner (A1-A2): short sentences, present tense, common everyday words',
    intermedio:   'intermediate (B1-B2): varied tenses, idiomatic phrases, moderate vocabulary',
    avanzato:     'advanced (C1): complex grammar, nuanced vocabulary, natural native-speaker rhythm',
  };
  const levelDesc = levelMap[level] || levelMap['principiante'];

  const nativeLangNames = {
    it:'Italian',es:'Spanish',fr:'French',pt:'Portuguese',de:'German',
    zh:'Mandarin Chinese',ko:'Korean',ja:'Japanese',ar:'Arabic',ru:'Russian',pl:'Polish',nl:'Dutch',
  };
  const nativeLangName = nativeLangNames[nativeLang] || 'Italian';

  const usedList = usedCompoundWords.length
    ? `Avoid these compound words already used: ${usedCompoundWords.join(', ')}.`
    : '';

  // ── READING CHALLENGE (lesson 12 of each cycle) ──────────────
  if (mode === 'reading') {
    const paragraphCount = level === 'principiante' ? 3 : level === 'intermedio' ? 4 : 5;
    const prompt = `You are an expert English teacher creating a reading comprehension passage for a ${nativeLangName}-speaking student at ${levelDesc} level.

The passage theme is: "${theme}". Session in theme: ${sessionInTheme}/12 (this is the capstone reading challenge).

Write a short, engaging passage of exactly ${paragraphCount} paragraphs. Each paragraph should be 2-4 sentences. The text should feel like something from a real magazine or blog — natural, interesting, not textbook-like.

Choose 2-3 compound words to feature naturally in the text. ${usedList}

Also provide:
- A comprehension question and 3 answer options (1 correct, 2 plausible wrong)
- Key vocabulary list (5-6 words used in the text)
- A full translation of each paragraph

Respond ONLY in this exact JSON. No markdown, no preamble:
{
  "title": "Short catchy title of the passage",
  "readingLevel": "${level === 'principiante' ? 'A1–A2' : level === 'intermedio' ? 'B1–B2' : 'C1'}",
  "paragraphs": [
    "First paragraph text.",
    "Second paragraph text.",
    "Third paragraph text."
  ],
  "paragraphTranslations": [
    "Translation of first paragraph in ${nativeLangName}.",
    "Translation of second paragraph in ${nativeLangName}.",
    "Translation of third paragraph in ${nativeLangName}."
  ],
  "compoundWords": [
    {
      "word": "weekday",
      "part1": "week",
      "part2": "day",
      "meaning1": "${nativeLangName} meaning of part1",
      "meaning2": "${nativeLangName} meaning of part2",
      "combined": "${nativeLangName} meaning of compound",
      "hint": "Guiding question in ${nativeLangName}",
      "explanation": "Brief ${nativeLangName} explanation"
    }
  ],
  "vocab": [
    {"en": "word", "native": "translation in ${nativeLangName}"}
  ],
  "grammarFocus": "Main grammar point illustrated (in ${nativeLangName})",
  "comprehensionQuestion": "Question about the text (in ${nativeLangName})",
  "comprehensionCorrect": "Correct answer (in ${nativeLangName})",
  "comprehensionWrong1": "Plausible wrong answer 1 (in ${nativeLangName})",
  "comprehensionWrong2": "Plausible wrong answer 2 (in ${nativeLangName})"
}`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        return res.status(response.status).json({ error: err.error?.message || 'API error' });
      }
      const data = await response.json();
      const text = data.content.map(b => b.text || '').join('');
      const clean = text.replace(/```json|```/g, '').trim();
      return res.status(200).json(JSON.parse(clean));
    } catch (err) {
      console.error('Reading error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ── STANDARD LESSON ──────────────────────────────────────────
  const grammarTopics = [
    'present simple (habits and facts)',
    'present continuous (actions happening now)',
    'past simple (completed actions)',
    'future with "will" and "going to"',
    'present perfect (experience and recent past)',
    'modal verbs (can, must, should, would)',
  ];
  const grammarTopic = grammarTopics[Math.min(grammarLevel - 1, grammarTopics.length - 1)];

  const prompt = `You are an expert English teacher creating a daily lesson for a ${nativeLangName}-speaking student.

Student level: ${levelDesc}
Theme: "${theme}" (session ${sessionInTheme + 1} of 12)
Grammar focus: ${grammarTopic}
${usedList}

Rules:
1. Write a natural, realistic English sentence that a person might actually say or read. It must fit the theme.
2. The sentence must contain exactly one compound word (two words joined together, e.g. "sunflower", "bookshelf", "raincoat"). The compound word must arise naturally from the sentence — do NOT force a sentence around the word.
3. The compound word must NOT be in this list: ${usedCompoundWords.join(', ') || 'none'}.

Respond ONLY in this exact JSON. No markdown, no preamble:
{
  "english": "The sentence here, containing the compound word.",
  "phonetic": "Pronunciation guide in simple ${nativeLangName}-friendly phonetics for the hardest parts only",
  "translation": "The sentence translated into ${nativeLangName}.",
  "grammarConcept": "Short concept name in ${nativeLangName} (e.g. 'Presente semplice')",
  "tip": "Clear grammar rule in ${nativeLangName} using the sentence as example. Max 2 sentences.",
  "vocab": [
    {"en": "word1", "native": "translation1"},
    {"en": "word2", "native": "translation2"},
    {"en": "word3", "native": "translation3"}
  ],
  "compoundWord": {
    "word": "thecompoundword",
    "part1": "first",
    "part2": "word",
    "meaning1": "${nativeLangName} meaning of part1",
    "meaning2": "${nativeLangName} meaning of part2",
    "combined": "${nativeLangName} meaning of the compound",
    "hint": "A guiding question in ${nativeLangName} to help the student figure it out",
    "explanation": "Brief ${nativeLangName} explanation of how the two parts combine"
  },
  "quizQuestion": "Quiz question in ${nativeLangName} about a key word",
  "quizCorrect": "Correct answer in ${nativeLangName}",
  "quizWrong1": "Plausible wrong answer 1 in ${nativeLangName}",
  "quizWrong2": "Plausible wrong answer 2 in ${nativeLangName}",
  "quizWrong3": "Plausible wrong answer 3 in ${nativeLangName}"
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err.error?.message || 'API error' });
    }
    const data = await response.json();
    const text = data.content.map(b => b.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    return res.status(200).json(JSON.parse(clean));
  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
