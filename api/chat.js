const BASE = 'https://raw.githubusercontent.com/n8ellis-dotcom/rsu5-docs/main/';

const TRANSCRIPTS = {
  'sep10_p1': 'transcripts/transcript_2025-09-10_B4uYUWf69jc_part1.txt',
  'sep10_p2': 'transcripts/transcript_2025-09-10_B4uYUWf69jc_part2.txt',
  'sep24_p1': 'transcripts/transcript_2025-09-24_O9rwZbpMQjE_part1.txt',
  'sep24_p2': 'transcripts/transcript_2025-09-24_O9rwZbpMQjE_part2.txt',
  'oct8_p1':  'transcripts/transcript_2025-10-08_zRT6zR_aXc8_part1.txt',
  'oct8_p2':  'transcripts/transcript_2025-10-08_zRT6zR_aXc8_part2.txt',
  'oct22_p1': 'transcripts/transcript_2025-10-22_rBdsP2quvQA_part1.txt',
  'oct22_p2': 'transcripts/transcript_2025-10-22_rBdsP2quvQA_part2.txt',
  'nov5_p1':  'transcripts/transcript_2025-11-05_lorIdPQ-IvY_part1.txt',
  'nov5_p2':  'transcripts/transcript_2025-11-05_lorIdPQ-IvY_part2.txt',
  'nov19_p1': 'transcripts/transcript_2025-11-19_jN4BT2JjG5A_part1.txt',
  'nov19_p2': 'transcripts/transcript_2025-11-19_jN4BT2JjG5A_part2.txt',
  'dec10_p1': 'transcripts/transcript_2025-12-10_w-9C0GWxN08_part1.txt',
  'dec10_p2': 'transcripts/transcript_2025-12-10_w-9C0GWxN08_part2.txt',
  'jan14_p1': 'transcripts/transcript_2026-01-14_Paj4BH2VkwY_part1.txt',
  'jan14_p2': 'transcripts/transcript_2026-01-14_Paj4BH2VkwY_part2.txt',
  'jan28_p1': 'transcripts/transcript_2026-01-28_Yujt36f5nJU_part1.txt',
  'jan28_p2': 'transcripts/transcript_2026-01-28_Yujt36f5nJU_part2.txt',
  'feb4_p1':  'transcripts/transcript_2026-02-04_V3oYVFAx_6w_part1.txt',
  'feb4_p2':  'transcripts/transcript_2026-02-04_V3oYVFAx_6w_part2.txt',
  'feb11_p1': 'transcripts/transcript_2026-02-11_Wzpb70M9aig_part1.txt',
  'feb11_p2': 'transcripts/transcript_2026-02-11_Wzpb70M9aig_part2.txt',
  'feb25_p1': 'transcripts/transcript_2026-02-25_2UEfeUSKPY4_part1.txt',
  'feb25_p2': 'transcripts/transcript_2026-02-25_2UEfeUSKPY4_part2.txt',
  'mar11_p1': 'transcripts/transcript_2026-03-11_4IipgPJRPYg_part1.txt',
  'mar11_p2': 'transcripts/transcript_2026-03-11_4IipgPJRPYg_part2.txt',
};

function selectFiles(q) {
  q = q.toLowerCase();
  var files = [];

  // Month-based selection — always pull both parts of matched months
  if (q.indexOf('september') >= 0) { files.push('sep10_p1','sep10_p2','sep24_p1','sep24_p2'); }
  if (q.indexOf('october')   >= 0) { files.push('oct8_p1','oct8_p2','oct22_p1','oct22_p2'); }
  if (q.indexOf('november')  >= 0) { files.push('nov5_p1','nov5_p2','nov19_p1','nov19_p2'); }
  if (q.indexOf('december')  >= 0) { files.push('dec10_p1','dec10_p2'); }
  if (q.indexOf('january')   >= 0) { files.push('jan14_p1','jan14_p2','jan28_p1','jan28_p2'); }
  if (q.indexOf('february')  >= 0) { files.push('feb4_p1','feb4_p2','feb11_p1','feb11_p2','feb25_p1','feb25_p2'); }
  if (q.indexOf('march')     >= 0) { files.push('mar11_p1','mar11_p2'); }

  // Deduplicate and map to paths, limit to 4 parts (~4 x 90KB = fits context well)
  var seen = {};
  var transcriptFiles = [];
  for (var i = 0; i < files.length; i++) {
    if (!seen[files[i]] && TRANSCRIPTS[files[i]]) {
      seen[files[i]] = true;
      transcriptFiles.push(TRANSCRIPTS[files[i]]);
    }
  }
  transcriptFiles = transcriptFiles.slice(0, 4);

  // Fallback: topic keywords -> most recent meetings (both parts)
  if (transcriptFiles.length === 0) {
    var meetingWords = ['meeting','board','discuss','vote','french','position','cut','language',
                        'staffing','superintendent','enrollment','budget','consolidat','world',
                        'reduction','teacher','school','program','class','staff'];
    if (meetingWords.some(function(w){ return q.indexOf(w) >= 0; })) {
      transcriptFiles = [
        TRANSCRIPTS['mar11_p1'], TRANSCRIPTS['mar11_p2'],
        TRANSCRIPTS['feb25_p1'], TRANSCRIPTS['feb25_p2'],
      ];
    }
  }

  // Budget/policy doc files
  var docFiles = [];
  if (q.indexOf('budget') >= 0 || q.indexOf('tax') >= 0 || q.indexOf('cost') >= 0 ||
      q.indexOf('spending') >= 0 || q.indexOf('cut') >= 0 || q.indexOf('french') >= 0 ||
      q.indexOf('position') >= 0 || q.indexOf('staffing') >= 0 || q.indexOf('reduction') >= 0) {
    docFiles.push('05c_budget_2020_2027.txt');
  }
  if (q.indexOf('policy') >= 0 || q.indexOf('phone') >= 0 || q.indexOf('cell') >= 0 || q.indexOf('conduct') >= 0) {
    docFiles.push((q.indexOf('phone') >= 0 || q.indexOf('cell') >= 0) ? '08_policies_M_to_Z.txt' : '07_policies_A_to_L.txt');
  }

  return transcriptFiles.concat(docFiles).slice(0, 5);
}

async function fetchDoc(path) {
  var r = await fetch(BASE + path);
  if (!r.ok) throw new Error('Could not fetch ' + path);
  var t = await r.text();
  // Raised limit: chunks are ~80-110KB, 100K chars covers them fully
  return t.length > 100000 ? t.slice(0, 100000) + '\n[truncated - file exceeded 100k chars]' : t;
}

module.exports = async function(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error:'method not allowed'});
  var body = req.body;
  var question = body && body.question;
  if (!question) return res.status(400).json({error:'no question'});
  var apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({error:'no api key'});
  try {
    var files = selectFiles(question);
    var docs = [];
    for (var i = 0; i < files.length; i++) {
      try {
        var content = await fetchDoc(files[i]);
        docs.push('=== ' + files[i] + ' ===\n' + content);
      } catch(e) { console.warn('skip', files[i]); }
    }
    var system = 'You are the RSU5 Community Information Assistant for Regional School Unit 5 (Freeport, Durham, Pownal, Maine). Answer using ONLY the provided documents. Cite source and date. Be neutral and factual. Use position titles not staff names. If not found suggest rsu5.org or mcmanusg@rsu5.org.\n\nDOCUMENTS:\n' + docs.join('\n\n---\n\n');
    var hist = Array.isArray(body.history) ? body.history : [];
    var messages = hist.slice(-4).concat([{role:'user',content:question}]);
    var resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'},
      body: JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,system:system,messages:messages})
    });
    if (!resp.ok) { var e = await resp.json(); throw new Error((e.error&&e.error.message)||'api error'); }
    var data = await resp.json();
    var answer = data.content && data.content[0] && data.content[0].text;
    if (!answer) throw new Error('No response from Claude');
    res.json({answer: answer, docsUsed: files});
  } catch(e) { res.status(500).json({error: e.message}); }
};
