const BASE = 'https://raw.githubusercontent.com/n8ellis-dotcom/rsu5-docs/main/';

const TRANSCRIPTS = {
      'sep10': 'transcripts/transcript_2025-09-10_B4uYUWf69jc.txt',
      'sep24': 'transcripts/transcript_2025-09-24_O9rwZbpMQjE.txt',
      'oct8':  'transcripts/transcript_2025-10-08_zRT6zR_aXc8.txt',
      'oct22': 'transcripts/transcript_2025-10-22_rBdsP2quvQA.txt',
      'nov5':  'transcripts/transcript_2025-11-05_lorIdPQ-IvY.txt',
      'nov19': 'transcripts/transcript_2025-11-19_jN4BT2JjG5A.txt',
      'dec10': 'transcripts/transcript_2025-12-10_w-9C0GWxN08.txt',
      'jan14': 'transcripts/transcript_2026-01-14_Paj4BH2VkwY.txt',
      'jan28': 'transcripts/transcript_2026-01-28_Yujt36f5nJU.txt',
      'feb4':  'transcripts/transcript_2026-02-04_V3oYVFAx_6w.txt',
      'feb11': 'transcripts/transcript_2026-02-11_Wzpb70M9aig.txt',
      'feb25': 'transcripts/transcript_2026-02-25_2UEfeUSKPY4.txt',
      'mar11': 'transcripts/transcript_2026-03-11_4IipgPJRPYg.txt',
};

function selectFiles(q) {
      q = q.toLowerCase();
      var files = [];
      if (q.indexOf('september') >= 0) { files.push('sep10','sep24'); }
      if (q.indexOf('october') >= 0) { files.push('oct8','oct22'); }
      if (q.indexOf('november') >= 0) { files.push('nov5','nov19'); }
      if (q.indexOf('december') >= 0) { files.push('dec10'); }
      if (q.indexOf('january') >= 0) { files.push('jan14','jan28'); }
      if (q.indexOf('february') >= 0) { files.push('feb4','feb11','feb25'); }
      if (q.indexOf('march') >= 0) { files.push('mar11'); }
      var transcriptFiles = files.slice(0,2).map(function(k){return TRANSCRIPTS[k];}).filter(Boolean);
      if (transcriptFiles.length === 0) {
              var meetingWords = ['meeting','board','discuss','vote','french','position','cut','language','staffing','superintendent','enrollment','budget','consolidat','world'];
              if (meetingWords.some(function(w){return q.indexOf(w)>=0;})) {
                        transcriptFiles = [TRANSCRIPTS['mar11'], TRANSCRIPTS['feb25']];
              }
      }
      var docFiles = [];
      if (q.indexOf('budget') >= 0 || q.indexOf('tax') >= 0 || q.indexOf('cost') >= 0 || q.indexOf('spending') >= 0 || q.indexOf('cut') >= 0 || q.indexOf('french') >= 0 || q.indexOf('position') >= 0 || q.indexOf('staffing') >= 0) {
              docFiles.push('05c_budget_2020_2027.txt');
      }
      if (q.indexOf('policy') >= 0 || q.indexOf('phone') >= 0 || q.indexOf('cell') >= 0 || q.indexOf('conduct') >= 0) {
              docFiles.push(q.indexOf('phone') >= 0 || q.indexOf('cell') >= 0 ? '08_policies_M_to_Z.txt' : '07_policies_A_to_L.txt');
      }
      return transcriptFiles.concat(docFiles).slice(0,3);
}

async function fetchDoc(path) {
      var r = await fetch(BASE + path);
      if (!r.ok) throw new Error('Could not fetch ' + path);
      var t = await r.text();
      return t.length > 25000 ? t.slice(0, 25000) + '\n[truncated - first 25k chars shown]' : t;
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
