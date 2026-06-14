// ══════════════════════════════════════════════════════════════
// sentence.js  —  English Daily API
// ══════════════════════════════════════════════════════════════

// Sub-level definitions
// Each sub-level has: label, CEFR, grammar scope, sentence complexity
const SUB_LEVELS = {
  'A1.1': { label:'A1.1 – First steps',       cefr:'A1', complexity:'very_short',  grammarScope: ['present simple to be','subject pronouns','basic articles'] },
  'A1.2': { label:'A1.2 – Getting started',   cefr:'A1', complexity:'short',       grammarScope: ['present simple (have/like/want)','plural nouns','basic prepositions'] },
  'A1.3': { label:'A1.3 – Building up',       cefr:'A1', complexity:'short_plus',  grammarScope: ['present continuous','basic adjectives','there is / there are'] },
  'A2.1': { label:'A2.1 – Moving forward',    cefr:'A2', complexity:'medium',      grammarScope: ['past simple regular','time expressions','can/can\'t'] },
  'A2.2': { label:'A2.2 – Growing confidence',cefr:'A2', complexity:'medium',      grammarScope: ['past simple irregular','object pronouns','frequency adverbs'] },
  'A2.3': { label:'A2.3 – Almost there',      cefr:'A2', complexity:'medium_plus', grammarScope: ['future with going to','comparatives','basic conjunctions'] },
  'B1.1': { label:'B1.1 – Intermediate start',cefr:'B1', complexity:'medium_plus', grammarScope: ['present perfect (experience)','for/since','relative clauses'] },
  'B1.2': { label:'B1.2 – Expanding range',   cefr:'B1', complexity:'longer',      grammarScope: ['past continuous','used to','first conditional'] },
  'B1.3': { label:'B1.3 – Getting fluent',    cefr:'B1', complexity:'longer',      grammarScope: ['present perfect continuous','modals of deduction','passive voice simple'] },
  'B2.1': { label:'B2.1 – Upper intermediate',cefr:'B2', complexity:'longer',      grammarScope: ['second conditional','reported speech','passive voice complex'] },
  'B2.2': { label:'B2.2 – Near fluency',      cefr:'B2', complexity:'complex',     grammarScope: ['third conditional','wish/if only','inversion for emphasis'] },
  'B2.3': { label:'B2.3 – Advanced ready',    cefr:'B2', complexity:'complex',     grammarScope: ['mixed conditionals','discourse markers','advanced passive'] },
  'C1.1': { label:'C1.1 – Advanced',          cefr:'C1', complexity:'complex',     grammarScope: ['subjunctive','cleft sentences','advanced modal meanings'] },
  'C1.2': { label:'C1.2 – Near native',       cefr:'C1', complexity:'native',      grammarScope: ['ellipsis and substitution','fronting for focus','idiomatic register'] },
  'C1.3': { label:'C1.3 – Mastery',           cefr:'C1', complexity:'native',      grammarScope: ['nuanced hedging','complex nominalisations','stylistic variation'] },
};

const THEMES = {
  1:'daily life and routines',
  2:'food, cafés and restaurants',
  3:'travel and transport',
  4:'work and technology',
  5:'nature and the environment',
  6:'health and wellbeing',
  7:'shopping and money',
  8:'family and relationships',
};

// Sentence length guidance per complexity
const COMPLEXITY_GUIDE = {
  very_short:  'Write a very short sentence of 4–7 words. Use only the most basic vocabulary.',
  short:       'Write a short sentence of 6–10 words. Use simple, common vocabulary.',
  short_plus:  'Write a sentence of 8–12 words. Vocabulary can include everyday phrases.',
  medium:      'Write a sentence of 10–15 words. Can include a subordinate clause.',
  medium_plus: 'Write a sentence of 12–18 words with one or two clauses.',
  longer:      'Write a sentence of 15–22 words with clear clause structure.',
  complex:     'Write a sentence of 18–28 words. Use complex grammar naturally.',
  native:      'Write a sentence of 20–35 words that sounds like natural educated native speech.',
};

// Within each 12-lesson cycle, lesson position affects sentence complexity
// Lessons 1-4: base complexity for this sub-level
// Lessons 5-8: one step up
// Lessons 9-11: two steps up (longer, more elaborate)
// Lesson 12: reading challenge
const COMPLEXITY_ORDER = ['very_short','short','short_plus','medium','medium_plus','longer','complex','native'];
function escalate(base, steps) {
  const idx = COMPLEXITY_ORDER.indexOf(base);
  return COMPLEXITY_ORDER[Math.min(idx + steps, COMPLEXITY_ORDER.length - 1)];
}

const NATIVE_LANG_NAMES = {
  it:'Italian',es:'Spanish',fr:'French',pt:'Portuguese',de:'German',
  zh:'Mandarin Chinese',ko:'Korean',ja:'Japanese',ar:'Arabic',
  ru:'Russian',pl:'Polish',nl:'Dutch',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    subLevel     = 'A1.1',
    nativeLang   = 'it',
    themeId      = 1,
    sessionInTheme = 0,   // 0–11
    usedCompoundWords = [],
    mode         = 'lesson',
  } = req.body;

  const sl        = SUB_LEVELS[subLevel] || SUB_LEVELS['A1.1'];
  const theme     = THEMES[themeId] || THEMES[1];
  const nativeName = NATIVE_LANG_NAMES[nativeLang] || 'Italian';
  const usedList  = usedCompoundWords.length
    ? `Compound words already used (do NOT repeat): ${usedCompoundWords.join(', ')}.`
    : '';

  // Grammar point for this session (rotate through scope list)
  const grammarPoint = sl.grammarScope[sessionInTheme % sl.grammarScope.length];

  // Sentence complexity escalates within the cycle
  let complexity;
  if (sessionInTheme < 4)       complexity = sl.complexity;
  else if (sessionInTheme < 8)  complexity = escalate(sl.complexity, 1);
  else                          complexity = escalate(sl.complexity, 2);
  const complexityGuide = COMPLEXITY_GUIDE[complexity] || COMPLEXITY_GUIDE['medium'];

  // ── READING CHALLENGE (lesson 12) ────────────────────────────
  if (mode === 'reading') {
    const cefr    = sl.cefr;
    const paraCount = cefr === 'A1' ? 3 : cefr === 'A2' ? 3 : cefr === 'B1' ? 4 : cefr === 'B2' ? 4 : 5;
    const wordCount = cefr === 'A1' ? '60–90' : cefr === 'A2' ? '80–120' : cefr === 'B1' ? '120–160' : cefr === 'B2' ? '150–200' : '180–250';

    const prompt = `You are an expert English teacher writing a reading challenge for a ${nativeName}-speaking student.

Student sub-level: ${sl.label} (${cefr})
Theme: "${theme}"
Grammar focus for this cycle: ${sl.grammarScope.join(', ')}

Write a short, engaging passage of exactly ${paraCount} paragraphs, total ${wordCount} words.
- Write like a real article or blog post — natural, not textbook
- Grammar structures used must match ${cefr} level
- Include 2 true compound words (both halves must be standalone English words, e.g. sunscreen, doorstep, bookshelf, headphones). ${usedList}
- Comprehension question and 3 answer options
- Translate each paragraph to ${nativeName}
- Key vocabulary list (5 words from the text)

Respond ONLY in this exact JSON, no markdown, no preamble:
{
  "title": "Catchy title",
  "readingLevel": "${sl.label}",
  "paragraphs": ["para1","para2","para3"],
  "paragraphTranslations": ["trans1 in ${nativeName}","trans2","trans3"],
  "compoundWords": [
    {"word":"sunscreen","part1":"sun","part2":"screen","meaning1":"${nativeName} for sun","meaning2":"${nativeName} for screen","combined":"${nativeName} for sunscreen","hint":"hint in ${nativeName}","explanation":"explanation in ${nativeName}"}
  ],
  "vocab": [{"en":"word","native":"${nativeName} translation"}],
  "grammarFocus": "Main grammar point in ${nativeName}",
  "comprehensionQuestion": "Question in ${nativeName}",
  "comprehensionCorrect": "Correct answer in ${nativeName}",
  "comprehensionWrong1": "Wrong answer 1 in ${nativeName}",
  "comprehensionWrong2": "Wrong answer 2 in ${nativeName}"
}`;

    return callClaude(prompt, 2000, res);
  }

  // ── STANDARD LESSON ──────────────────────────────────────────
  const prompt = `You are an expert English teacher creating a daily lesson for a ${nativeName}-speaking student.

Student sub-level: ${sl.label} (CEFR: ${sl.cefr})
Theme: "${theme}" (lesson ${sessionInTheme + 1} of 12 in this cycle)
Grammar focus: ${grammarPoint}
Sentence complexity: ${complexityGuide}
${usedList}

YOUR TASK:
1. Write ONE English sentence that:
   - Fits the theme naturally
   - Demonstrates the grammar point: ${grammarPoint}
   - Matches exactly this complexity: ${complexityGuide}
   - Contains exactly ONE true compound word

2. The compound word MUST be made of TWO standalone English dictionary words joined together.
   GOOD: sunscreen (sun+screen), doorstep (door+step), bookshelf (book+shelf), headphones (head+phones), raincoat (rain+coat), weekend (week+end), footprint (foot+print), suitcase (suit+case), handbag (hand+bag), bedroom (bed+room).
   BAD (never use): kitchen, garden, window, button, ticket, carpet, curtain — these are NOT compounds.
   Verify: can you split the word into two real English words? If no → choose a different word.

3. Grammar tip must be clear and in ${nativeName}, using the sentence as the example.

Respond ONLY in this exact JSON, no markdown:
{
  "english": "The sentence.",
  "phonetic": "Phonetic hint for hardest word only, in ${nativeName}-friendly notation",
  "translation": "Full sentence in ${nativeName}.",
  "grammarConcept": "Short concept name in ${nativeName}",
  "tip": "Grammar explanation in ${nativeName}, max 2 sentences, use the sentence as example.",
  "complexity": "${complexity}",
  "vocab": [
    {"en":"word1","native":"${nativeName} meaning"},
    {"en":"word2","native":"${nativeName} meaning"},
    {"en":"word3","native":"${nativeName} meaning"}
  ],
  "compoundWord": {
    "word": "thecompound",
    "part1": "first",
    "part2": "second",
    "meaning1": "${nativeName} meaning of part1",
    "meaning2": "${nativeName} meaning of part2",
    "combined": "${nativeName} meaning of full compound",
    "hint": "Guiding question in ${nativeName}",
    "explanation": "How the two parts combine, in ${nativeName}"
  },
  "quizQuestion": "Quiz question in ${nativeName} about a key word in the sentence",
  "quizCorrect": "Correct answer in ${nativeName}",
  "quizWrong1": "Plausible wrong answer in ${nativeName}",
  "quizWrong2": "Plausible wrong answer in ${nativeName}",
  "quizWrong3": "Plausible wrong answer in ${nativeName}"
}`;

  return callClaude(prompt, 1000, res);
}

async function callClaude(prompt, maxTokens, res) {
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
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err.error?.message || 'Claude API error' });
    }
    const data = await response.json();
    const text = data.content.map(b => b.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    return res.status(200).json(JSON.parse(clean));
  } catch (err) {
    console.error('sentence.js error:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
}
