const BASE = 'https://raw.githubusercontent.com/n8ellis-dotcom/rsu5-docs/main/';
const INDEX_URL = BASE + 'index.json';
const GITHUB_TREE_URL = 'https://api.github.com/repos/n8ellis-dotcom/rsu5-docs/git/trees/main?recursive=1';

const YOUTUBE_IDS = {
  'transcript_2025-09-10': 'B4uYUWf69jc',
  'transcript_2025-09-24': 'O9rwZbpMQjE',
  'transcript_2025-10-08': 'zRT6zR_aXc8',
  'transcript_2025-10-22': 'rBdsP2quvQA',
  'transcript_2025-11-05': 'lorIdPQ-IvY',
  'transcript_2025-11-19': 'jN4BT2JjG5A',
  'transcript_2025-12-10': 'w-9C0GWxN08',
  'transcript_2026-01-14': 'Paj4BH2VkwY',
  'transcript_2026-01-28': 'Yujt36f5nJU',
  'transcript_2026-02-04': 'V3oYVFAx_6w',
  'transcript_2026-02-11': 'Wzpb70M9aig',
  'transcript_2026-02-25': '2UEfeUSKPY4',
  'transcript_2026-03-11': '4IipgPJRPYg',
};

function getYouTubeLink(filePath) {
  const match = filePath.match(/transcript_(\d{4}-\d{2}-\d{2})/);
  if (!match) return null;
  const id = YOUTUBE_IDS['transcript_' + match[1]];
  return id ? 'https://www.youtube.com/watch?v=' + id : null;
}

// ── Caches ────────────────────────────────────────────────────────────────────
let _indexCache = null;
let _policyFileListCache = null;

async function getIndex() {
  if (_indexCache) return _indexCache;
  const r = await fetch(INDEX_URL);
  if (!r.ok) throw new Error('Could not fetch index.json');
  const data = await r.json();
  _indexCache = data.files.map(([file, tagIds]) => ({
    file,
    tags: tagIds.map(i => data.tags[i])
  }));
  return _indexCache;
}

async function getPolicyFileList() {
  if (_policyFileListCache) return _policyFileListCache;
  const r = await fetch(GITHUB_TREE_URL);
  if (!r.ok) throw new Error('Could not fetch file tree');
  const data = await r.json();
  _policyFileListCache = data.tree
    .filter(f => f.type === 'blob' && f.path.startsWith('docs/') && f.path.includes('pdf'))
    .map(f => f.path);
  return _policyFileListCache;
}

// ── Year normalization (sync, fast) ───────────────────────────────────────────
function normalizeYears(q) {
  const YEAR_TO_FY = {
    '2015': 'fy16', '2016': 'fy17', '2017': 'fy18', '2018': 'fy19',
    '2019': 'fy20', '2020': 'fy21', '2021': 'fy22', '2022': 'fy23',
    '2023': 'fy24', '2024': 'fy25', '2025': 'fy26', '2026': 'fy27',
  };
  const extra = [];
  Object.entries(YEAR_TO_FY).forEach(([year, fy]) => {
    if (q.includes(year)) extra.push(fy);
  });
  if (/this year|current year|fy27/.test(q)) extra.push('fy27');
  if (/last year|prior year|previous year/.test(q)) extra.push('fy26');
  if (/two years ago/.test(q)) extra.push('fy25');
  return extra.length ? q + ' ' + extra.join(' ') : q;
}

// ── AI query expansion via Claude Haiku ───────────────────────────────────────
async function aiExpandQuery(q, apiKey) {
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        system: 'You generate search terms for an RSU5 Maine school district document index. Given a question, return 8-12 short search phrases that would appear as tags in official RSU5 documents. Think about: synonyms for key concepts, related document types, fiscal year tags (fy27, fy26, fy25 etc), specific school names (freeport high school, freeport middle school, mast landing, morse street, durham community, pownal elementary), and topic-specific terms a document would use. Return ONLY a JSON array of lowercase strings, nothing else. No explanation.',
        messages: [{ role: 'user', content: q }]
      })
    });
    if (!resp.ok) return q;
    const data = await resp.json();
    const text = data.content[0].text.trim().replace(/```json|```/g, '').trim();
    const terms = JSON.parse(text);
    if (!Array.isArray(terms)) return q;
    return q + ' ' + terms.join(' ');
  } catch(e) {
    console.warn('AI expansion failed, using raw query:', e.message);
    return q;
  }
}

// ── Tag scoring ───────────────────────────────────────────────────────────────
function scoreEntry(entry, expandedQ) {
  const STOPWORDS = new Set(['the','and','for','are','was','what','when','does','did','how',
    'why','who','which','that','this','with','have','has','had','not','but','from','they',
    'will','about','can','tell','give','show','any','all','more','some','there','been',
    'school','rsu5','rsu','please','information']);
  const qWords = new Set(expandedQ.split(/\s+/).filter(w => w.length >= 3 && !STOPWORDS.has(w)));

  // Generic single-word tags that appear in many files — lower weight
  const GENERIC = new Set(['positions','policy','budget','salary','staffing','curriculum',
    'enrollment','facilities','revenue','grant','minutes','agenda','continued','part2']);

  let score = 0;
  for (const tag of entry.tags) {
    if (expandedQ.includes(tag)) {
      score += (!tag.includes(' ') && GENERIC.has(tag)) ? 1 : 3;
    } else {
      const tagWords = tag.split(/\s+/).filter(w => w.length >= 3);
      const tagWordSet = new Set(tagWords);
      if (tagWords.length > 0 && [...tagWordSet].every(tw => qWords.has(tw))) {
        score += 2;
      } else if (tagWords.length >= 2) {
        const overlap = [...tagWordSet].filter(tw => qWords.has(tw)).length;
        if (overlap >= Math.ceil(tagWords.length * 0.6)) {
          score += 1;
        }
      }
    }
  }
  return score;
}

// ── Pass 1: index-based selection ─────────────────────────────────────────────
async function selectFromIndex(expandedQ) {
  const index = await getIndex();
  const scored = index
    .map(entry => ({ file: entry.file, score: scoreEntry(entry, expandedQ) }))
    .filter(e => e.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.file.includes('part2') && !b.file.includes('part2')) return 1;
      if (b.file.includes('part2') && !a.file.includes('part2')) return -1;
      return 0;
    });

  const topScore = scored.length > 0 ? scored[0].score : 0;

  const selected = [];
  const seenBases = new Set();
  for (const entry of scored) {
    const base = entry.file.replace('_part1', '').replace('_part2', '');
    if (!seenBases.has(base)) {
      seenBases.add(base);
      selected.push(entry.file);
    }
    if (selected.length >= 3) break;
  }

  return { files: selected, topScore };
}

// ── Pass 2: deep policy file scan ─────────────────────────────────────────────
async function selectFromPolicyFiles(expandedQ) {
  const allPolicyFiles = await getPolicyFileList();
  const STOPWORDS = new Set(['the','and','for','are','was','pdf','what','when','does','use',
    'with','board','rsu','rsu5','directors','of','in']);

  const qWords = expandedQ.split(/\s+/)
    .map(w => w.replace(/[^a-z0-9]/g, ''))
    .filter(w => w.length >= 3 && !STOPWORDS.has(w));

  const scored = allPolicyFiles.map(path => {
    const nameLower = path.toLowerCase().replace(/_/g, ' ').replace(/pdf/g, '');
    const score = qWords.filter(w => nameLower.includes(w)).length;
    return { file: path, score };
  }).filter(e => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return scored.map(e => e.file);
}

// ── Main file selector ────────────────────────────────────────────────────────
const SCORE_THRESHOLD = 2;

async function selectFiles(q, apiKey) {
  // Step 1: normalize years (fast, sync)
  const yearNormalized = normalizeYears(q);

  // Step 2: AI expansion (fast Haiku call, ~0.5s)
  const expandedQ = await aiExpandQuery(yearNormalized, apiKey);

  // Step 3: score index
  const { files, topScore } = await selectFromIndex(expandedQ);

  if (topScore >= SCORE_THRESHOLD && files.length > 0) {
    // For tax impact queries, ensure budget handbook is included
    const hasTaxQuery = expandedQ.includes('tax impact') || expandedQ.includes('mil rate') ||
      expandedQ.includes('homeowner') || expandedQ.includes('property tax') ||
      expandedQ.includes('home value') || expandedQ.includes('per household');
    const hasTaxFile = files.some(f =>
      f.includes('Tax_Impact') || f.includes('2686') || f.includes('2715') ||
      f.includes('Budget_Handbook') || f.includes('tax') || f.includes('2021_')
    );
    if (hasTaxQuery && !hasTaxFile) {
      files[files.length - 1] = 'docs/2686_2026-2027_Superintendents_Recommended_Budget_Handbook.txt';
    }
    return { files, deepSearch: false, expandedQ };
  }

  // Step 4: fallback to policy deep scan
  const deepFiles = await selectFromPolicyFiles(expandedQ);
  if (deepFiles.length > 0) {
    return { files: deepFiles, deepSearch: true, expandedQ };
  }

  return {
    files: [
      'transcripts/transcript_2026-03-11_4IipgPJRPYg_part1.txt',
      'docs/2686_2026-2027_Superintendents_Recommended_Budget_Handbook.txt'
    ],
    deepSearch: false,
    expandedQ
  };
}

async function fetchDoc(path) {
  const r = await fetch(BASE + path);
  if (!r.ok) throw new Error('Could not fetch ' + path);
  const t = await r.text();
  return t.length > 60000 ? t.slice(0, 60000) + '\n[truncated]' : t;
}

// ── Handler ───────────────────────────────────────────────────────────────────
module.exports = async function(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error: 'method not allowed'});
  const body = req.body;
  const question = body && body.question;
  if (!question) return res.status(400).json({error: 'no question'});
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({error: 'no api key'});

  try {
    const q = question.toLowerCase();
    const forceDeep = body.forceDeep === true;

    let files, deepSearch, expandedQ;
    if (forceDeep) {
      const yearNorm = normalizeYears(q);
      const expanded = await aiExpandQuery(yearNorm, apiKey);
      files = await selectFromPolicyFiles(expanded);
      deepSearch = true;
      expandedQ = expanded;
    } else {
      ({ files, deepSearch, expandedQ } = await selectFiles(q, apiKey));
    }

    const youtubeLinks = [];
    files.forEach(f => {
      if (f.startsWith('transcripts/')) {
        const link = getYouTubeLink(f);
        if (link) {
          const dateMatch = f.match(/(\d{4}-\d{2}-\d{2})/);
          const date = dateMatch ? dateMatch[1] : 'meeting';
          if (!youtubeLinks.find(l => l.url === link)) {
            youtubeLinks.push({ date, url: link });
          }
        }
      }
    });

    const docs = [];
    for (const file of files) {
      try {
        const content = await fetchDoc(file);
        docs.push('=== ' + file + ' ===\n' + content);
      } catch(e) { console.warn('skip', file); }
    }

    const youtubeNote = youtubeLinks.length > 0
      ? '\n\nYOUTUBE LINKS (include these when referencing transcript sources):\n' +
        youtubeLinks.map(l => l.date + ': ' + l.url).join('\n')
      : '';

    const deepNote = deepSearch
      ? '\n\nNote: This answer required a deeper search beyond the standard index.'
      : '';

    const system = 'You are the RSU5 Community Information Assistant for Regional School Unit 5 (Freeport, Durham, Pownal, Maine). Answer using ONLY the provided documents. Cite source and date. Be neutral and factual. Use position titles not staff names. When citing a board meeting transcript, include the YouTube link so the user can watch the full meeting. If information is not found in the provided documents, say so clearly and suggest rsu5.org or mcmanusg@rsu5.org.\n\nDOCUMENTS:\n' + docs.join('\n\n---\n\n') + youtubeNote + deepNote;

    const hist = Array.isArray(body.history) ? body.history : [];
    const messages = hist.slice(-4).concat([{role: 'user', content: question}]);

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: system,
        messages: messages
      })
    });

    if (!resp.ok) {
      const e = await resp.json();
      throw new Error((e.error && e.error.message) || 'api error');
    }

    const data = await resp.json();
    const answer = data.content && data.content[0] && data.content[0].text;
    if (!answer) throw new Error('No response from Claude');

    res.json({ answer, docsUsed: files, youtubeLinks, deepSearch, expandedQ });
  } catch(e) {
    res.status(500).json({error: e.message});
  }
};
