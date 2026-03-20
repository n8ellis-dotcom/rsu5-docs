const BASE = 'https://raw.githubusercontent.com/n8ellis-dotcom/rsu5-docs/main/';
const INDEX_URL = BASE + 'index.json';

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

let _indexCache = null;
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

function expandQuery(q) {
  const expanded = [q];

  // Calendar year -> FY tag
  const YEAR_TO_FY = {
    '2015': 'fy16', '2016': 'fy17', '2017': 'fy18', '2018': 'fy19',
    '2019': 'fy20', '2020': 'fy21', '2021': 'fy22', '2022': 'fy23',
    '2023': 'fy24', '2024': 'fy25', '2025': 'fy26', '2026': 'fy27',
  };
  Object.entries(YEAR_TO_FY).forEach(([year, fy]) => {
    if (q.includes(year)) expanded.push(fy);
  });

  // Relative year references
  if (/this year|current year|fy27|2026.2027/.test(q)) expanded.push('fy27');
  if (/last year|prior year|previous year|fy26|2025.2026/.test(q)) expanded.push('fy26');
  if (/two years ago|fy25|2024.2025/.test(q)) expanded.push('fy25');

  // Topic synonyms
  const SYNONYMS = {
    'teacher': 'staffing',
    'educator': 'staffing',
    'hire': 'staffing',
    'layoff': 'reductions',
    'laid off': 'reductions',
    'eliminate': 'reductions',
    'cut': 'reductions',
    'trim': 'reductions',
    'spanish': 'world language',
    'language program': 'world language',
    'esl': 'world language',
    'esol': 'world language',
    'lunch': 'nutrition',
    'food service': 'nutrition',
    'special ed': 'special education',
    'iep': 'special education',
    'disability': 'special education',
    'school bus': 'transportation',
    'busing': 'transportation',
    'sport': 'athletics',
    'team': 'athletics',
    'chromebook': 'technology',
    'laptop': 'technology',
    'reading': 'curriculum',
    'math': 'curriculum',
    'science': 'curriculum',
    'class size': 'enrollment',
    'students': 'enrollment',
    'headcount': 'enrollment',
    'property tax': 'tax impact',
    'mil rate': 'tax impact',
    'homeowner': 'tax impact',
    'levy': 'tax impact',
    'state funding': 'revenue',
    'state subsidy': 'revenue',
    'federal': 'grant',
    'title i': 'grant',
    'esser': 'grant',
    'kindergarten': 'early childhood',
    'pre-k': 'early childhood',
    'preschool': 'early childhood',
    'vote': 'board vote',
    'approved': 'board vote',
    'motion': 'board vote',
    'meeting': 'board meeting',
    'hearing': 'board meeting',
    'freeport high': 'freeport high school',
    'freeport middle': 'freeport middle school',
    'fhs': 'freeport high school',
    'fms': 'freeport middle school',
    'mls': 'mast landing',
    'durham': 'durham community',
    'pownal': 'pownal elementary',
    'cell phone': 'cell phone policy',
    'phone policy': 'cell phone policy',
    'electronic device': 'acceptable use policy',
    'hazing': 'hazing policy',
    'bullying': 'bullying prevention',
    'expulsion': 'student discipline',
    'suspension': 'student discipline',
    'grievance': 'complaint procedures',
    'discrimination': 'nondiscrimination policy',
    'harassment': 'harassment complaint procedures',
    'homeschool': 'home schooling policy',
    'home school': 'home schooling policy',
    'graduation': 'graduation requirements',
    'absences': 'attendance policy',
    'truancy': 'attendance policy',
    'open enrollment': 'student assignment policy',
  };
  Object.entries(SYNONYMS).forEach(([word, tag]) => {
    if (q.includes(word)) expanded.push(tag);
  });

  return expanded.join(' ');
}

// Score a file's tags against the expanded query
// Uses word-set matching so tag "cell phone policy" matches query "policy on cell phones"
function scoreEntry(entry, expandedQ) {
  const STOPWORDS = new Set(['the','and','for','are','was','what','when','does','did','how',
    'why','who','which','that','this','with','have','has','had','not','but','from','they',
    'will','about','can','tell','give','show','any','all','more','some','there','been',
    'school','rsu5','rsu','please','information']);
  const qWords = new Set(expandedQ.split(/\s+/).filter(w => w.length >= 3 && !STOPWORDS.has(w)));

  let score = 0;
  for (const tag of entry.tags) {
    // Exact: full tag is a substring of the query (highest confidence)
    if (expandedQ.includes(tag)) {
      score += 3;
    } else {
      const tagWords = tag.split(/\s+/).filter(w => w.length >= 3);
      const tagWordSet = new Set(tagWords);
      // All tag words appear somewhere in query words
      if (tagWords.length > 0 && [...tagWordSet].every(tw => qWords.has(tw))) {
        score += 2;
      }
      // Majority of multi-word tag words appear in query
      else if (tagWords.length >= 2) {
        const overlap = [...tagWordSet].filter(tw => qWords.has(tw)).length;
        if (overlap >= Math.ceil(tagWords.length * 0.6)) {
          score += 1;
        }
      }
    }
  }
  return score;
}

async function selectFiles(q) {
  q = q.toLowerCase();
  const expandedQ = expandQuery(q);
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

  if (selected.length === 0) {
    selected.push(
      'transcripts/transcript_2026-03-11_4IipgPJRPYg_part1.txt',
      'docs/2686_2026-2027_Superintendents_Recommended_Budget_Handbook.txt'
    );
  }

  return selected;
}

async function fetchDoc(path) {
  const r = await fetch(BASE + path);
  if (!r.ok) throw new Error('Could not fetch ' + path);
  const t = await r.text();
  return t.length > 60000 ? t.slice(0, 60000) + '\n[truncated]' : t;
}

module.exports = async function(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error: 'method not allowed'});
  const body = req.body;
  const question = body && body.question;
  if (!question) return res.status(400).json({error: 'no question'});
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({error: 'no api key'});

  try {
    const files = await selectFiles(question);

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

    const system = 'You are the RSU5 Community Information Assistant for Regional School Unit 5 (Freeport, Durham, Pownal, Maine). Answer using ONLY the provided documents. Cite source and date. Be neutral and factual. Use position titles not staff names. When citing a board meeting transcript, include the YouTube link so the user can watch the full meeting. If information is not found, suggest rsu5.org or mcmanusg@rsu5.org.\n\nDOCUMENTS:\n' + docs.join('\n\n---\n\n') + youtubeNote;

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

    res.json({ answer, docsUsed: files, youtubeLinks });
  } catch(e) {
    res.status(500).json({error: e.message});
  }
};

