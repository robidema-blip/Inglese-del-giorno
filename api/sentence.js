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

// Spaced repetition: picks the best-scoring grammar point to review from
// history, favouring points that are overdue (large gap since last seen)
// and/or shaky (high wrongCount), while a strong correctStreak pushes a
// point down the priority list since it doesn't need review yet.
const REVIEW_MIN_GAP = 2;
function pickReviewPoint(grammarHistory, currentLessonNumber) {
  if (!Array.isArray(grammarHistory) || !grammarHistory.length) return null;
  let best = null, bestScore = -Infinity;
  for (const item of grammarHistory) {
    if (!item || !item.key) continue;
    const gap = currentLessonNumber - (item.lastLesson || 0);
    if (gap < REVIEW_MIN_GAP) continue;
    const wrongCount = item.wrongCount || 0;
    const correctStreak = item.correctStreak || 0;
    const score = gap * (1 + wrongCount * 0.5) - correctStreak * 2;
    if (score > bestScore) { bestScore = score; best = item; }
  }
  return best;
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
    lessonsAtThisLevel = 0, // how many lessons the student has had AT this exact sub-level (resets only on promotion, not on cycle rollover) — used to build a cumulative "grammar introduced so far" allow-list, so content can't jump ahead of what's actually been taught.
    grammarHistory = [], // spaced repetition: [{ key, lastLesson, correctStreak, wrongCount }]
    lessonNumber   = 0,  // absolute lesson count, used to space out review slots
  } = req.body;

  const sl        = SUB_LEVELS[subLevel] || SUB_LEVELS['A1.1'];
  const theme     = THEMES[themeId] || THEMES[1];
  const nativeName = NATIVE_LANG_NAMES[nativeLang] || 'Italian';
  // Quiz/comprehension-check language: native language through B1 (so a
  // beginner isn't blocked from answering by not understanding the
  // question itself), English from B2 upward, where the student should
  // be fluent enough that reading the question in English is itself good
  // practice rather than a barrier.
  const quizLang = ['B2', 'C1'].includes(sl.cefr) ? 'English' : nativeName;
  const usedList  = usedCompoundWords.length
    ? `Compound words already used (do NOT repeat): ${usedCompoundWords.join(', ')}.`
    : '';

  // Cumulative "grammar introduced so far" — everything from sub-levels
  // already fully passed through, plus however much of the current
  // sub-level's own rotation has actually happened. This is the hard
  // ceiling the AI is told not to exceed, so a student two lessons into
  // A1.1 never sees a phrasal verb or an irregular past tense that isn't
  // due until much later.
  const subLevelIds = Object.keys(SUB_LEVELS);
  const curLevelIdx  = Math.max(0, subLevelIds.indexOf(subLevel));
  const priorGrammar = subLevelIds.slice(0, curLevelIdx).flatMap(id => SUB_LEVELS[id].grammarScope);
  const introducedHere = sl.grammarScope.slice(0, Math.max(1, Math.min(lessonsAtThisLevel + 1, sl.grammarScope.length)));
  const cumulativeGrammar = [...priorGrammar, ...introducedHere];
  const isVeryFirstLesson = curLevelIdx === 0 && lessonsAtThisLevel === 0;

  // Grammar point for this session — normally rotates through the scope
  // list, but every 3rd lesson in the cycle (never the very first lesson)
  // becomes a spaced-repetition review slot instead, picked from grammar
  // the student has already been taught (defence in depth: filtered to
  // cumulativeGrammar so we never "review" something not yet taught).
  const isReviewSlot = mode === 'lesson' && !isVeryFirstLesson &&
    sessionInTheme > 0 && sessionInTheme % 3 === 2;
  const eligibleHistory = grammarHistory.filter(h => cumulativeGrammar.includes(h.key));
  const reviewCandidate = isReviewSlot ? pickReviewPoint(eligibleHistory, lessonNumber) : null;
  const isReview = !!reviewCandidate;
  const reviewOf = isReview ? reviewCandidate.key : null;
  const grammarPoint = isReview
    ? reviewCandidate.key
    : sl.grammarScope[sessionInTheme % sl.grammarScope.length];

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
This is a capstone for the cycle they just finished — it should feel like a natural step up
from their daily lessons, not a jump into unfamiliar grammar.

Student sub-level: ${sl.label} (${cefr})
Theme: "${theme}"
Grammar the student has been taught so far, cumulatively: ${cumulativeGrammar.join(', ')}

REAL-WORLD PLAUSIBILITY — HARD RULE:
A sentence can be grammatically perfect and still be nonsense — e.g. "My backpack is with my
books" pairs real nouns and a real verb, but no real person would plausibly say it. Every
sentence in every paragraph must describe something a real person could actually think, say, or
do in real life.
- Before finalizing, check each sentence: does this specific combination of subject + action +
  object/time/place make ordinary real-world sense, not just grammatical sense?
- If any sentence's combination is implausible or absurd (even if each word is correct and
  on-level), rewrite that sentence with a different, sensible combination before responding —
  don't let an odd sentence slip through just because the paragraph around it reads fine.

Write a short, engaging passage of exactly ${paraCount} paragraphs, total ${wordCount} words.
- Write like a real article or blog post — natural, not textbook
- Every sentence must describe something a real person would plausibly think, say, or do — not
  just grammatically correct but semantically sensible
- Grammar structures used must stay within what's listed above as already taught — this is a
  review/consolidation piece, not the place to introduce something new
- Avoid phrasal verbs and irregular past tense unless "past simple irregular" is in the list above
- Include 2 true compound words, where BOTH halves are complete standalone modern English words
  (not a suffix like -ing/-er/-tion/-ed/-ly, and not an archaic word). GOOD: sunscreen, doorstep,
  bookshelf, headphones, breakfast, afternoon. BAD: morning, evening (both end in the suffix
  "-ing", not the word "ing") — verify each half is a real standalone word before using it. ${usedList}
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
  "comprehensionQuestion": "Question in ${quizLang}",
  "comprehensionCorrect": "Correct answer in ${quizLang}",
  "comprehensionWrong1": "Wrong answer 1 in ${quizLang}",
  "comprehensionWrong2": "Wrong answer 2 in ${quizLang}"
}`;

    return callClaude(prompt, 2000, res);
  }

  // ── STANDARD LESSON ──────────────────────────────────────────
  const prompt = `You are an expert English teacher creating a daily lesson for a ${nativeName}-speaking student.
You specialize in true beginners and never rush — a real teacher reviewing your lessons
flagged that past output introduced grammar too quickly, so follow the constraints below
strictly even if a more "natural-sounding" sentence tempts you to go further.

Student sub-level: ${sl.label} (CEFR: ${sl.cefr})
Theme: "${theme}" (lesson ${sessionInTheme + 1} of 12 in this cycle)
Grammar focus for TODAY: ${grammarPoint}
Sentence complexity: ${complexityGuide}
${usedList}

GRAMMAR CEILING — HARD RULE:
The student has only been taught these grammar points so far, in this exact order:
${cumulativeGrammar.map((g,i)=>`${i+1}. ${g}`).join('\n')}
- Do NOT use any grammar structure that is not on this list. This includes phrasal verbs
  (e.g. "wake up", "get up", "turn on", "look for") and irregular past-tense verbs UNLESS
  "past simple irregular" is explicitly on the list above.
- If ANY word in your sentence is a phrasal verb, or any irregular form not yet introduced,
  rewrite the sentence with a simpler equivalent before responding.
${isVeryFirstLesson ? '- This is this student\'s VERY FIRST lesson ever. Keep it as minimal as possible: a subject + "to be" + one simple word (e.g. "I am happy.", "She is here."). Nothing else.' : ''}
- If the sentence contains an article ("a"/"an"/"the") or a preposition whose usage isn't
  obvious from a literal translation (a common confusion point for learners), briefly explain
  WHY it's used that way as a short second sentence inside the "tip" field — don't assume it's
  self-evident just because it's not today's main grammar focus.

REAL-WORLD PLAUSIBILITY — HARD RULE:
A sentence can be grammatically perfect and still be nonsense — e.g. "I like my backpack at
night" pairs a real noun, a real time expression, and a real verb, but no real person would
plausibly say it. The sentence must describe something a real person could actually think, say,
or do in real life.
- Before finalizing, check: does this specific combination of subject + action + object/time/
  place make ordinary real-world sense, not just grammatical sense?
- If the combination is implausible or absurd (even if each word is correct and on-level),
  rewrite the sentence with a different, sensible combination that still meets every requirement
  above (theme, grammar point, complexity, compound word) before responding.

${isReview ? `
SPACED REPETITION — REVIEW SLOT:
This lesson is a review, not a first introduction. The grammar point "${grammarPoint}" was
already taught to this student earlier. Write a fresh sentence in a new context — different
vocabulary and situation than a typical first-teaching example — that still tests this same
structure. Phrase the "tip" field as a brief reminder (e.g. start with "Remember:") rather than
a first-time explanation, since the student has already learned this once.
` : ''}
YOUR TASK:
1. Write ONE English sentence that:
   - Fits the theme naturally
   - Describes something a real person would plausibly think, say, or do — not just
     grammatically correct but semantically sensible
   - Demonstrates the grammar point: ${grammarPoint}
   - Obeys the grammar ceiling above — nothing beyond what's already been introduced
   - Matches exactly this complexity: ${complexityGuide}
   - Contains exactly ONE true compound word

2. The compound word MUST be made of TWO standalone modern English words joined together,
   where BOTH halves work as complete words on their own right now — not a suffix (-ing, -er,
   -tion, -ed, -ly are NOT standalone words) and not an archaic word no learner would know.
   GOOD: sunscreen (sun+screen), doorstep (door+step), bookshelf (book+shelf), headphones (head+phones), raincoat (rain+coat), weekend (week+end), footprint (foot+print), suitcase (suit+case), handbag (hand+bag), bedroom (bed+room), breakfast (break+fast), afternoon (after+noon).
   BAD (never use): kitchen, garden, window, button, ticket, carpet, curtain, morning (morn+"ing" — "ing" is a suffix, not a word), evening (even+"ing" — same problem), understanding (same suffix problem) — these are NOT true compounds.
   Verify: can you split the word into two real English words, BOTH still used as standalone words today? If either half fails → choose a different word.

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
  "quizQuestion": "Quiz question in ${quizLang} about a key word in the sentence",
  "quizCorrect": "Correct answer in ${quizLang}",
  "quizWrong1": "Plausible wrong answer in ${quizLang}",
  "quizWrong2": "Plausible wrong answer in ${quizLang}",
  "quizWrong3": "Plausible wrong answer in ${quizLang}"
}`;

  return callClaude(prompt, 1000, res, {
    grammarKey: grammarPoint,
    isReview,
    reviewOf,
  });
}

async function callClaude(prompt, maxTokens, res, extraFields = null) {
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
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
      console.error('sentence.js JSON parse failure: no valid { } span found. Raw Claude output:', text);
      return res.status(502).json({ error: 'The lesson generator returned an unexpected response. Please try again.' });
    }
    let parsed;
    try {
      parsed = JSON.parse(clean.slice(firstBrace, lastBrace + 1));
    } catch (parseErr) {
      console.error('sentence.js JSON parse failure: JSON.parse threw:', parseErr.message, '— Raw Claude output:', text);
      return res.status(502).json({ error: 'The lesson generator returned an unexpected response. Please try again.' });
    }
    if (extraFields) Object.assign(parsed, extraFields);
    return res.status(200).json(parsed);
  } catch (err) {
    console.error('sentence.js error:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
}
