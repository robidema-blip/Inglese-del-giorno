export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    level = 'principiante',
    themeId = 'caffe',
    grammarLevel = 1,
    sessionInTheme = 0,
    usedCompoundWords = [],
  } = req.body;

  const themeDescs = {
    caffe:        'ordering and enjoying coffee at an Italian-style café in Britain (menus, ordering, paying, sitting down, the coffee itself)',
    supermercato: 'shopping at a British supermarket (finding items, reading labels, asking for help, checking out, prices)',
    farmacia:     'visiting a British pharmacy or chemist (asking for medicine, describing symptoms, reading instructions)',
    trasporti:    'using British public transport (asking for directions, buying tickets, bus/train/tube)',
    ristorante:   'dining at a British restaurant (booking a table, ordering food, complaining politely, paying the bill)',
  };

  const grammarDescs = {
    1: 'simple present tense: "I want", "I like", "The café has...", "It opens at...". Focus on affirmative statements.',
    2: 'polite requests: "I would like...", "Could I have...?", "Can I have...?". Explain that "would like" is more polite than "want".',
    3: 'questions: "Where is...?", "How much does it cost?", "What time...?", "Which one...?". Focus on question word order.',
    4: 'present continuous: "I am waiting", "She is ordering", "They are sitting". Contrast with simple present.',
    5: 'past simple: "I went", "I had", "It was", "We ordered". Focus on irregular verbs common in this context.',
    6: 'future plans: "I will have...", "I am going to try...", "Shall we...?". Introduce both "will" and "going to".',
  };

  const levelDescs = {
    principiante: 'A1-A2: very short sentence, maximum 8 words, only common vocabulary, no contractions',
    intermedio:   'B1-B2: natural sentence of 10-14 words, everyday vocabulary, some contractions fine',
    avanzato:     'C1: natural flowing sentence, idiomatic language, up to 18 words',
  };

  const usedList = usedCompoundWords.length ? usedCompoundWords.join(', ') : 'none yet';

  const prompt = `You are a structured English curriculum designer for Italian adult learners. Generate ONE lesson entry.

CURRICULUM CONTEXT:
- Theme: ${themeDescs[themeId] || themeDescs.caffe}
- Session ${sessionInTheme + 1} within this theme (make the situation slightly different each session — different moment, different person speaking, different item)
- Grammar focus: ${grammarDescs[grammarLevel] || grammarDescs[1]}
- Student level: ${levelDescs[level] || levelDescs.principiante}
- Compound words already used (DO NOT repeat any of these): ${usedList}

COMPOUND WORD RULES:
- Choose ONE compound word that is: (a) naturally used in the sentence, (b) made of two standalone English words both known to an Italian speaker or guessable from their Italian cognate, (c) thematically relevant
- Good examples for café theme: coffeehouse, tablecloth, teaspoon, milkshake, lunchtime, afternoon, takeaway, checkout, milkjug, coffeecup, teabag, hotdog, overcoat (for waiting outside), raincoat
- The compound word MUST appear in the English sentence
- Split it clearly into its two components

GRAMMAR TIP: The tip must name and explain the grammar concept in simple Italian, using the sentence as an example. Never just translate — explain the rule.

Respond ONLY in this exact JSON. No markdown, no preamble:
{
  "english": "The sentence here, containing the compound word.",
  "phonetic": "Guida alla pronuncia con fonetica semplice italiana (solo le parti più difficili)",
  "italian": "La traduzione italiana della frase.",
  "grammarConcept": "Nome breve del concetto (es: 'Presente semplice')",
  "tip": "Spiegazione chiara della regola grammaticale in italiano, usando la frase come esempio. Max 2 frasi.",
  "vocab": [
    {"en": "word1", "it": "parola1"},
    {"en": "word2", "it": "parola2"},
    {"en": "word3", "it": "parola3"}
  ],
  "compoundWord": {
    "word": "teaspoon",
    "part1": "tea",
    "part2": "spoon",
    "meaning1": "tè",
    "meaning2": "cucchiaio",
    "combined": "cucchiaino da tè",
    "hint": "Cosa usi per mescolare lo zucchero nel caffè?",
    "explanation": "In inglese, si uniscono due parole per crearne una nuova: 'tea' (tè) + 'spoon' (cucchiaio) = cucchiaino!"
  },
  "quizQuestion": "Cosa significa '___' nella frase?",
  "quizCorrect": "La risposta corretta in italiano",
  "quizWrong1": "Risposta sbagliata plausibile 1",
  "quizWrong2": "Risposta sbagliata plausibile 2",
  "quizWrong3": "Risposta sbagliata plausibile 3"
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
        max_tokens: 900,
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
