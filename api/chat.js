const BASE = 'https://raw.githubusercontent.com/n8ellis-dotcom/rsu5-docs/main/';
const DOCS = {
  '00_meeting_transcripts.txt': ['meeting','board','vote','november','december','january','february','march','october','september','2025','2026','french','language','position','cut','superintendent','budget','discuss'],
  '01_agendas_2020_2026.txt': ['agenda','2020','2021','2022','2023','2024','2025','2026'],
  '03_minutes_2020_2026.txt': ['minutes','vote','approved','motion','record'],
  '05c_budget_2020_2027.txt': ['budget','spending','tax','cost','cut','staffing','enrollment','french','arts','property','mil'],
  '07_policies_A_to_L.txt': ['policy','conduct','harassment','attendance','curriculum','discipline'],
  '08_policies_M_to_Z.txt': ['policy','safety','student','staff','technology','phone','cell','suspension'],
};
function selectDocs(q) {
  q = q.toLowerCase();
  var scores = {};
  Object.keys(DOCS).forEach(function(f) { scores[f] = DOCS[f].filter(function(k){return q.indexOf(k)>=0;}).length; });
  var sorted = Object.keys(scores).sort(function(a,b){return scores[b]-scores[a];}).filter(function(f){return scores[f]>0;}).slice(0,3);
  var mw = ['meeting','vote','board','november','december','january','february','march','french','position','cut','language','budget','superintendent'];
  if (mw.some(function(w){return q.indexOf(w)>=0;}) && sorted.indexOf('00_meeting_transcripts.txt')<0) { sorted.unshift('00_meeting_transcripts.txt'); if(sorted.length>3)sorted.pop(); }
  return sorted.length ? sorted : ['00_meeting_transcripts.txt','05c_budget_2020_2027.txt','07_policies_A_to_L.txt'];
}
module.exports = async function(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error:'method not allowed'});
  var body = req.body, question = body && body.question;
  if (!question) return res.status(400).json({error:'no question'});
  var apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({error:'no api key'});
  try {
    var files = selectDocs(question), docs = [];
    for (var i=0; i<files.length; i++) {
      try { var r=await fetch(BASE+files[i]); if(r.ok){var t=await r.text(); docs.push('=== '+files[i]+' ===\n'+(t.length>80000?t.slice(0,80000)+'\n[truncated]':t));} } catch(e){}
    }
    var system = 'You are the RSU5 Community Information Assistant for Regional School Unit 5 (Freeport, Durham, Pownal, Maine). Answer using ONLY the provided documents. Cite your source and date. Be neutral and factual. Use position titles not staff names. If not found suggest rsu5.org or mcmanusg@rsu5.org.\n\nDOCUMENTS:\n'+docs.join('\n\n---\n\n');
    var messages = (body.history||[]).slice(-6).concat([{role:'user',content:question}]);
    var resp = await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1500,system:system,messages:messages})});
    if (!resp.ok) { var e=await resp.json(); throw new Error((e.error&&e.error.message)||'api error'); }
    var data = await resp.json();
    res.json({answer: data.content[0].text, docsUsed: files});
  } catch(e) { res.status(500).json({error:e.message}); }
};