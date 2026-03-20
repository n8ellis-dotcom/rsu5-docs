const OPENAI_KEY   = process.env.OPENAI_API_KEY;
const PINECONE_KEY = process.env.PINECONE_API_KEY;
const PINECONE_HOST = process.env.PINECONE_HOST;
const GITHUB_BASE  = 'https://raw.githubusercontent.com/n8ellis-dotcom/rsu5-docs/main/';
const GITHUB_TREE  = 'https://api.github.com/repos/n8ellis-dotcom/rsu5-docs/git/trees/main?recursive=1';
const FILES_PER_PAGE = 40;

function chunkText(text, filepath) {
  text = text.slice(0, 6000);
  const chunks = [], CHUNK = 1000, OVERLAP = 100;
  let start = 0, idx = 0;
  while (start < text.length) {
    let end = Math.min(start + CHUNK, text.length);
    if (end < text.length) {
      const pb = text.lastIndexOf('\n\n', end);
      if (pb > start + 400) end = pb;
    }
    const c = text.slice(start, end).trim();
    if (c.length > 40) {
      const id = filepath.replace(/[\/.\-]/g, '_') + '_c' + idx;
      chunks.push({ id, text: c, filepath });
      idx++;
    }
    start = end - OVERLAP;
    if (start >= text.length - 40) break;
  }
  return chunks;
}

async function embedTexts(texts) {
  const r = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + OPENAI_KEY },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: texts })
  });
  const d = await r.json();
  if (d.error) throw new Error('OpenAI: ' + d.error.message);
  return d.data.map(e => e.embedding);
}

async function upsertVectors(vectors) {
  const r = await fetch('https://' + PINECONE_HOST + '/vectors/upsert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Api-Key': PINECONE_KEY },
    body: JSON.stringify({ vectors })
  });
  if (!r.ok) throw new Error('Pinecone upsert failed: ' + r.status);
}

module.exports = async function(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  // Secret check so random people can't trigger this
  if (req.query.secret !== process.env.SETUP_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const page = parseInt(req.query.page || '0');

  try {
    // Get file list from GitHub
    const treeResp = await fetch(GITHUB_TREE);
    const treeData = await treeResp.json();
    const allFiles = treeData.tree
      .filter(f => f.type === 'blob' &&
        (f.path.startsWith('docs/') || f.path.startsWith('transcripts/')))
      .map(f => f.path);

    const totalPages = Math.ceil(allFiles.length / FILES_PER_PAGE);
    const pageFiles  = allFiles.slice(page * FILES_PER_PAGE, (page + 1) * FILES_PER_PAGE);

    if (pageFiles.length === 0) {
      return res.json({ done: true, message: 'All pages complete!', totalFiles: allFiles.length });
    }

    let totalVectors = 0;
    const errors = [];

    for (const filepath of pageFiles) {
      try {
        const fileResp = await fetch(GITHUB_BASE + filepath);
        if (!fileResp.ok) continue;
        const text = await fileResp.text();
        const chunks = chunkText(text, filepath);
        if (!chunks.length) continue;

        const embeddings = await embedTexts(chunks.map(c => c.text));
        const vectors = chunks.map((c, i) => ({
          id: c.id,
          values: embeddings[i],
          metadata: { filepath: c.filepath, text: c.text.slice(0, 300) }
        }));

        await upsertVectors(vectors);
        totalVectors += vectors.length;
      } catch(e) {
        errors.push({ file: filepath, error: e.message });
      }
    }

    res.json({
      done: false,
      page,
      totalPages,
      filesProcessed: pageFiles.length,
      vectorsUpserted: totalVectors,
      errors: errors.length,
      nextPage: page + 1,
      nextUrl: `/api/setup?secret=${req.query.secret}&page=${page + 1}`,
      progress: `${Math.round((page + 1) / totalPages * 100)}%`
    });

  } catch(e) {
    res.status(500).json({ error: e.message });
  }
};
