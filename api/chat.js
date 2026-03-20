const BASE = 'https://raw.githubusercontent.com/n8ellis-dotcom/rsu5-docs/main/';
const INDEX_URL = BASE + 'index.json';

// YouTube video IDs for each transcript
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
  // Expand compact format: {tags: [...], files: [[path, [tag_ids]], ...]}
  _indexCache = data.files.map(([file, tagIds]) => ({
    file,
    tags: tagIds.map(i => data.tags[i])
  }));
  return _indexCache;
}

async function selectFiles(q) {
  q = q.toLowerCase();
  const index = await getIndex();

  // Score each file by how many of its tags appear in the question
  const scored = index.map(entry => {
    const score = entry.tags.filter(tag => q.includes(tag)).length;
    return { file: entry.file, score };
  }).filter(e => e.score > 0);

  // Sort by score descending, prefer part1 over part2 on ties
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.file.includes('part2') && !b.file.includes('part2')) return 1;
    if (b.file.includes('part2') && !a.file.includes('part2')) return -1;
    return 0;
  });

  // Take top 3, skipping part2 if part1 of same file already included
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

  // Fallback: most recent transcript + budget handbook
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

    // Build YouTube links for any transcript files used
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

