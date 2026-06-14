export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { level, nativeLang = 'it', themeId = 1, sessionInTheme = 0, grammarLevel = 1, usedCompoundWords = [] } = req.body;

  // Language name map for the prompt
  const langNames = {
    it: 'Italian',
    es: 'Spanish',
    fr: 'French',
    pt: 'Portuguese',
    de: 'German',
    zh: 'Chinese (Simplified)',
    ko: 'Korean',
    ja: 'Japanese',
    ar: 'Arabic',
    ru: 'Russian',
    pl: 'Polish',
    nl: 'Dutch',
  };
  const nativeLangName = langNames[nativeLang] || 'Italian';

  const themeDescs = {
    1: 'café / coffee shop: ordering drinks, reading a menu, chatting with a barista',
    2: 'supermarket: finding products, checking prices, using a self-checkout',
    3: 'pharmacy / chemist: asking for medicine, describing symptoms, reading labels',
    4: 'transport: buying tickets, asking for directions, using public transit',
    5: 'restaurant: booking a table, ordering food, paying the bill',
  };

  const grammarDescs = {
    1: 'present simple: "I want", "She works", "Do you have...?"',
    2: 'polite requests: "I would like...", "Could I have...?", "Can I have...?"',
    3: 'questions: "Where is...?", "How much does it cost?", "What time...?"',
    4: 'present continuous: "I am waiting", "She is ordering", "They are sitting"',
    5: 'past simple: "I went", "I had", "It was", "We ordered"',
    6: 'future: "I will have...", "I am going to try...", "Shall we...?"',
  };

  const levelDescs = {
    principiante: 'A1-A2: very short sentence, max 8 words, common vocabulary only',
    intermedio: 'B1-B2: natural sentence 10-14 words, everyday vocabulary',
    avanzato: 'C1: natural flowing sentence, idiomatic language, up to 18 words',
  };

  const usedList = usedCompoundWords.length ? usedCompoundWords.join(', ') : 'none yet';

  const prompt = `You are a structured English curriculum designer for ${nativeLangName} speakers learning English. Generate ONE lesson entry.

CURRICULUM CONTEXT:
- Theme: ${themeDescs[themeId] || themeDescs[1]}
- Session ${sessionInTheme + 1} within this theme (vary the scenario each session)
- Grammar focus: ${grammarDescs[grammarLevel] || grammarDescs[1]}
- Student level: ${levelDescs[level] || levelDescs.principiante}
- Compound words already used (DO NOT repeat): ${usedList}

COMPOUND WORD RULES:
- Choose ONE compound word naturally used in the sentence
- Both parts should be guessable by a ${nativeLangName} speaker
- Must appear in the English sentence

IMPORTANT: All translations, grammar tips, phonetics, hints and explanations must be written in ${nativeLangName}, NOT in English (except for the English sentence itself and the vocabulary English words).

Respond ONLY in this exact JSON. No markdown, no preamble:
{
  "english": "The sentence here, containing the compound word.",
  "phonetic": "Pronunciation guide written in simple ${nativeLangName}-friendly phonetics for the hardest parts only",
  "translation": "The translation in ${nativeLangName}.",
  "grammarConcept": "Short concept name in ${nativeLangName} (e.g. 'Presente semplice')",
  "tip": "Clear grammar rule explanation in ${nativeLangName} using the sentence as example. Max 2 sentences.",
  "vocab": [
    {"en": "word1", "native": "translation1"},
    {"en": "word2", "native": "translation2"},
    {"en": "word3", "native": "translation3"}
  ],
  "compoundWord": {
    "word": "coffeehouse",
    "part1": "coffee",
    "part2": "house",
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
    const sentence = JSON.parse(clean);
    return res.status(200).json(sentence);
  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
