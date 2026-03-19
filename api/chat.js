const BASE = 'https://raw.githubusercontent.com/n8ellis-dotcom/rsu5-docs/main/';

// Topic routing: question keywords -> filename fragments to match in docs/
const TOPIC_MAP = [
  {
    keywords: ['budget', 'spending', 'appropriat', 'article', 'expenditure', 'fiscal'],
    files: ['2026-2027_Superintendents_Recommended_Budget_Articles', '2691', '2683', 'FY26', '2692', 'Board_of_Directors_Adopted_Budget', '2696', '2735']
  },
  {
    keywords: ['tax', 'tax impact', 'mil rate', 'property tax', 'municipality'],
    files: ['Tax_Impact', 'Proposed_Tax_Impact', '2162']
  },
  {
    keywords: ['reduction', 'cut', 'eliminate', 'fte', 'french', 'world language', 'staffing', 'position'],
    files: ['2026-2027_Superintendents_Recommended_Budget_Handbook', '2686', '2683', '2691']
  },
  {
    keywords: ['handbook', 'superintendent recommend'],
    files: ['Superintendents_Recommended_Budget_Handbook', '2686', '2715']
  },
  {
    keywords: ['policy', 'policies', 'procedure', 'regulation'],
    files: ['Policy', 'policy', '_pdf']
  },
  {
    keywords: ['phone', 'cell phone', 'electronic device'],
    files: ['JICJ', 'Electronic', 'Cell', 'Phone']
  },
  {
    keywords: ['special education', 'sped', 'iep', 'disability', 'out of district'],
    files: ['Special_Ed', 'JKD', 'JKE', 'IDEA']
  },
  {
    keywords: ['nutrition', 'lunch', 'food', 'meal', 'cafeteria'],
    files: ['School_Nutrition', 'Nutrition']
  },
  {
    keywords: ['transportation', 'bus', 'busing'],
    files: ['Transportation', 'Bus']
  },
  {
    keywords: ['athletics', 'sport', 'extracurricular', 'activity'],
    files: ['Athletics']
  },
  {
    keywords: ['technology', 'chromebook', 'computer', 'internet', 'network'],
    files: ['Technology']
  },
  {
    keywords: ['enrollment', 'student count', 'population'],
    files: ['Enrollment', 'Population']
  },
  {
    keywords: ['curriculum', 'literacy', 'math', 'reading', 'instruction', 'program of studies'],
    files: ['Curriculum', 'Literacy', 'Program_of_Studies', 'Instruction']
  },
  {
    keywords: ['staff contract', 'bargain', 'union', 'educator agreement', 'salary', 'wage'],
    files: ['Educators_Agreement', 'Contract', 'Bargain']
  },
  {
    keywords: ['grant', 'title i', 'title 1', 'esser', 'federal fund'],
    files: ['Grant_Reporting', 'Grant', 'Title']
  },
  {
    keywords: ['revenue', 'income', 'subsidy', 'state aid'],
    files: ['Revenue_Reporting', 'Revenue']
  },
  {
    keywords: ['freeport high school', 'fhs'],
    files: ['Freeport_High_School', 'FHS']
  },
  {
    keywords: ['freeport middle school', 'fms'],
    files: ['Freeport_Middle_School', 'FMS']
  },
  {
    keywords: ['mast landing'],
    files: ['Mast_Landing_School']
  },
  {
    keywords: ['morse street'],
    files: ['Morse_Street_School']
  },
  {
    keywords: ['durham community', 'durham school'],
    files: ['Durham_Community_School']
  },
  {
    keywords: ['pownal'],
    files: ['Pownal_Elementary_School']
  },
  {
    keywords: ['dei', 'equity', 'diversity', 'inclusion'],
    files: ['DEI', 'Equity', 'Diversity']
  },
  {
    keywords: ['facility', 'facilities', 'building', 'construction', 'renovation'],
    files: ['Facilities', 'Construction', 'Building']
  },
  {
    keywords: ['early childhood', 'pre-k', 'prek', 'preschool', 'kindergarten'],
    files: ['Early_Childhood', 'Preschool', 'Kindergarten']
  },
  {
    keywords: ['adult education', 'recreation', 'community'],
    files: ['Community_RecreationAdult_Education', 'Adult_Ed']
  },
  {
    keywords: ['report by article', 'financial report', 'general budget report'],
    files: ['Report_by_Article', 'General_Budget_Report']
  },
];

async function getDocFileList() {
  const r = await fetch('https://api.github.com/repos/n8ellis-dotcom/rsu5-docs/git/trees/main?recursive=1');
  if (!r.ok) throw new Error('Could not fetch file list');
  const data = await r.json();
  return data.tree
    .filter(f => f.type === 'blob' && f.path.startsWith('docs/'))
    .map(f => f.path);
}

async function selectFiles(q) {
  q = q.toLowerCase();
  const allDocs = await getDocFileList();

  const matchedFragments = new Set();
  for (const topic of TOPIC_MAP) {
    if (topic.keywords.some(kw => q.includes(kw))) {
      topic.files.forEach(f => matchedFragments.add(f.toLowerCase()));
    }
  }

  let docMatches = [];
  if (matchedFragments.size > 0) {
    docMatches = allDocs
      .filter(path => {
        const name = path.toLowerCase();
        return Array.from(matchedFragments).some(frag => name.includes(frag));
      })
      .sort((a, b) => {
        const numA = parseInt(a.replace('docs/','')) || 0;
        const numB = parseInt(b.replace('docs/','')) || 0;
        return numB - numA;
      })
      .slice(0, 3);
  }

  const transcriptMatches = [];
  const meetingWords = ['meeting', 'board', 'discuss', 'vote', 'approve', 'motion', 'agenda', 'minutes', 'hearing'];
  if (meetingWords.some(w => q.includes(w))) {
    transcriptMatches.push(
      'transcripts/transcript_2026-03-11_4IipgPJRPYg_part1.txt',
      'transcripts/transcript_2026-02-25_2UEfeUSKPY4_part1.txt'
    );
  }

  const combined = [...new Set([...transcriptMatches, ...docMatches])].slice(0, 4);

  if (combined.length === 0) {
    const fallback = allDocs.find(f => f.includes('2686')) || allDocs.find(f => f.includes('Budget_Handbook'));
    if (fallback) combined.push(fallback);
    combined.push('transcripts/transcript_2026-03-11_4IipgPJRPYg_part1.txt');
  }

  return combined;
}

async function fetchDoc(path) {
  const r = await fetch(BASE + path);
  if (!r.ok) throw new Error('Could not fetch ' + path);
  const t = await r.text();
  return t.length > 80000 ? t.slice(0, 80000) + '\n[truncated]' : t;
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
    const docs = [];
    for (const file of files) {
      try {
        const content = await fetchDoc(file);
        docs.push('=== ' + file + ' ===\n' + content);
      } catch(e) { console.warn('skip', file); }
    }

    const system = 'You are the RSU5 Community Information Assistant for Regional School Unit 5 (Freeport, Durham, Pownal, Maine). Answer using ONLY the provided documents. Cite source and date. Be neutral and factual. Use position titles not staff names. If information is not found, suggest rsu5.org or mcmanusg@rsu5.org.\n\nDOCUMENTS:\n' + docs.join('\n\n---\n\n');
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

    res.json({answer: answer, docsUsed: files});
  } catch(e) {
    res.status(500).json({error: e.message});
  }
};
