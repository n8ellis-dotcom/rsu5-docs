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

// Extract relevant sections from a large document based on keywords
function extractRelevant(text, keywords, contextChars) {
        contextChars = contextChars || 3000;
        var lower = text.toLowerCase();
        var sections = [];
        var used = [];
        for (var i = 0; i < keywords.length; i++) {
                  var kw = keywords[i].toLowerCase();
                  var idx = 0;
                  while (true) {
                              idx = lower.indexOf(kw, idx);
                              if (idx < 0) break;
                              var start = Math.max(0, idx - 500);
                              var end = Math.min(text.length, idx + contextChars);
                              var alreadyCovered = false;
                              for (var j = 0; j < used.length; j++) {
                                            if (idx >= used[j][0] && idx <= used[j][1]) { alreadyCovered = true; break; }
                              }
                              if (!alreadyCovered) {
                                            sections.push(text.slice(start, end));
                                            used.push([start, end]);
                              }
                              idx += kw.length;
                              if (sections.length >= 6) break;
                  }
                  if (sections.length >= 6) break;
        }
        if (sections.length === 0) return text.slice(0, 25000);
        return sections.join('\n\n...\n\n');
}

function selectFiles(q) {
        q = q.toLowerCase();
        var keys = [];
        if (q.indexOf('september') >= 0) keys.push('sep10','sep24');
        if (q.indexOf('october') >= 0) keys.push('oct8','oct22');
        if (q.indexOf('november') >= 0) keys.push('nov5','nov19');
        if (q.indexOf('december') >= 0) keys.push('dec10');
        if (q.indexOf('january') >= 0) keys.push('jan14','jan28');
        if (q.indexOf('february') >= 0) keys.push('feb4','feb11','feb25');
        if (q.indexOf('march') >= 0) keys.push('mar11');
        var transcriptFiles = keys.slice(0,2).map(function(k){return TRANSCRIPTS[k];}).filter(Boolean);
        if (transcriptFiles.length === 0) {
                  var mw = ['meeting','board','discuss','vote','french','language','staffing','superintendent','enrollment','consolidat','world','mtss','gate','special ed'];
                  if (mw.some(function(w){return q.indexOf(w)>=0;})) {
                              transcriptFiles = [TRANSCRIPTS['mar11'], TRANSCRIPTS['feb25']];
                  }
        }
        var docFiles = [];
        var budgetWords = ['budget','tax','cost','spending','cut','french','position','teacher','educator','fte','staffing','reduction','proposed','eliminate','latin','esol','math','ela','ed tech'];
        if (budgetWords.some(function(w){return q.indexOf(w)>=0;})) docFiles.push('05c_budget_2020_2027.txt');
        var policyWords = ['policy','phone','cell','conduct','harassment','attendance','suspension','wellness','technology'];
        if (policyWords.some(function(w){return q.indexOf(w)>=0;})) {
                  docFiles.push(q.indexOf('phone')>=0||q.indexOf('cell')>=0 ? '08_policies_M_to_Z.txt' : '07_policies_A_to_L.txt');
        }
        return {transcripts: transcriptFiles, docs: docFiles};
}

async function fetchDoc(path) {
        var r = await fetch(BASE + path);
        if (!r.ok) throw new Error('Could not fetch ' + path);
        return await r.text();
}

module.exports = async function(req, res) {
        if (req.method !== 'POST') return res.status(405).json({error:'method not allowed'});
        var body = req.body;
        var question = body && body.question;
        if (!question) return res.status(400).json({error:'no question'});
        var apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) return res.status(500).json({error:'no api key'});
        try {
                  var selected = selectFiles(question);
                  var docs = [];
                  var filesUsed = [];
                  var q = question.toLowerCase();

          // Fetch transcripts - extract relevant sections
          var transcriptKeywords = ['french','teacher','educator','fte','cut','budget','vote','position','language','staffing','enrollment','consolidat'];
                  for (var i = 0; i < selected.transcripts.length; i++) {
                              try {
                                            var text = await fetchDoc(selected.transcripts[i]);
                                            var content = extractRelevant(text, [q].concat(transcriptKeywords), 4000);
                                            docs.push('=== TRANSCRIPT: ' + selected.transcripts[i] + ' ===\n' + content);
                                            filesUsed.push(selected.transcripts[i]);
                              } catch(e) { console.warn('skip transcript', selected.transcripts[i]); }
                  }

          // Fetch budget/policy docs - extract relevant sections
          var budgetKeywords = ['french','teacher','educator','fte','cut','reduction','proposed','position','latin','esol','math','ela','ed tech',c'oTn1s't, 'BTA2S'E] ;=
        ' h t tfposr: /(/vraarw .jg i=t h0u;b ujs e<r csoenlteecntte.dc.odmo/cns8.ellelnigst-hd;o tjc+o+m)/ r{s
              u 5 - d o c st/rmya i{n
                                    / ' ; 

               c o n svta rT RdAoNcSTCeRxItP T=S  a=w a{i
                                                        t   f'estecph1D0o'c:( s'etlreacntsecdr.idpotcss/[tjr]a)n;s
                                                              c r i p t _ 2 0 2v5a-r0 9i-s1P0o_lBi4cuyY U=W fs6e9ljecc.ttexdt.'d,o
                                                        c s ['js]e.pi2n4d'e:x O'ft(r'apnoslcirci'p)t s>/=t r0a;n
                                                              s c r i p t _ 2 0v2a5r- 0d9o-c2K4e_yOw9orrwdZsb p=M QijsEP.otlxitc'y, 
                                                              ?   ['qo]c t:8 'b:u d g'ettrKaenyswcorridpst;s
                                                              / t r a n s c r ivpatr_ 2d0o2c5C-o1n0t-e0n8t_ z=R Te6xztRr_aacXtcR8e.ltexvta'n,t
                                                              ( d o'coTcetx2t2,' :d o'ctKreaynwsocrrdisp,t s5/0t0r0a)n;s
                                                              c r i p t _ 2 0 2d5o-c1s0.-p2u2s_hr(B'd=s=P=2 q'u v+Q As.etlxetc't,e
                                                        d . d'oncosv[5j']:  +  ''t r=a=n=s\cnr'i p+t sd/otcrCaonnstcernitp)t;_
                                                              2 0 2 5 - 1 1 - 0f5i_lleosrUIsdePdQ.-pIuvsYh.(tsxetl'e,c
                                                              t e d'.ndoovc1s9['j:] )';t
                                                              r a n s c r i}p tcsa/ttcrha(nes)c r{i pcto_n2s0o2l5e-.1w1a-r1n9(_'jsNk4iBpT 2dJojcG'5,A .stexlte'c,t
                     e d .'ddoeccs1[0j']:) ;' t}r
                                    a n s c r}i
              p
              t s / t riafn s(cdroicpst._l2e0n2g5t-h1 2=-=1=0 _0w)- 9rCe0tGuWrxnN 0r8e.st.xjts'o,n
                    ( { a'njsawne1r4:'':I  'ctorualnds cnroitp tlso/atdr aannsyc rdiopctu_m2e0n2t6s-.0 1P-l1e4a_sPea jt4rByH 2aVgkawiYn. toxrt 'v,i
                       s i t' jrasnu258.'o:r g'.t'r,a ndsoccrsiUpstesd/:t[r]a}n)s;c
      r
      i p t _ 2v0a2r6 -s0y1s-t2e8m_ Y=u j'tY3o6uf 5anrJeU .tthxet 'R,S
      U 5  'Cfoembm4u'n:i t y' tIrnafnosrcmraitpitosn/ tArsasnissctrainptt _f2o0r2 6R-e0g2i-o0n4a_lV 3SocYhVoFoAlx _U6nwi.tt x5t '(,F
      r e e'pfoerbt1,1 'D:u r'htarma,n sPcorwinpatls,/ tMraainnsec)r.i pAtn_s2w0e2r6 -u0s2i-n1g1 _OWNzLpYb 7t0hMe9 apirgo.vtixdte'd, 
            d o c'ufmeebn2t5s'.:  C'ittrea ntshcer ispptesc/itfriacn sdcorciupmte_n2t0 2a6n-d0 2d-a2t5e_.2 UBEef enUeSuKtPrYa4l. taxntd' ,f
      a c t'umaalr.1 1U's:e  'ptorsaintsicorni pttist/ltersa nnsoctr isptta_f2f0 2n6a-m0e3s-.1 1I_f4 Inioptg PfJoRuPnYdg .stuxgtg'e,s
      t} ;r
s
u/5/. oErxgt roarc tm crmealneuvsagn@tr ssue5c.toirogn so rf r2o0m7 -a8 6l5a-r0g9e2 8d.o\cnu\mneDnOtC UbMaEsNeTdS :o\nn 'k e+y wdoorcdss.
      jfouinnc(t'i\onn\ ne-x-t-r\anc\tnR'e)l;e
v a n t (vtaerx th,i skte y=w oArrdrsa,y .ciosnAtrerxatyC(hbaordsy). h{i
s t ocroyn)t e?x tbCohdayr.sh i=s tcoornyt e:x t[C]h;a
                                                                       r s   | |v a3r0 0m0e;s
                                                                       s a gveasr  =l ohwiesrt .=s ltiecxet(.-t4o)L.ocwoenrcCaats(e[({)r;o
                                                                       l e :v'aurs esre'c,tcioonntse n=t :[q]u;e
                                                                       s t ivoanr} ]u)s;e
d   =   [v]a;r
  r efsopr  =( vaawra iit  =f e0t;c hi( '<h tktepysw:o/r/dasp.il.eanngtthhr;o pii+c+.)c o{m
                                       / v 1 / mveasrs akgwe s=' ,k e{y
        w o r d s [ im]e.tthooLdo:w e'rPCOaSsTe'(,)
; 
         vhaera diedrxs :=  {0';C
               o n t e nwth-iTlyep e('t:r'uaep)p l{i
                                                   c a t i o n /ijdsxo n=' ,l'oxw-earp.ii-nkdeeyx'O:fa(pkiwK,e yi,d'xa)n;t
                                                   h r o p i c -ivfe r(siidoxn '<: '02)0 2b3r-e0a6k-;0
                                                                       1 ' } , 
                                                             v a r   sbtoadryt:  =J SMOaNt.hs.tmraixn(g0i,f yi(d{xm o-d e5l0:0')c;l
                                                         a u d e - s ovnanre te-n4d- 2=0 2M5a0t5h1.4m'i,nm(atxe_xtto.kleennsg:t1h2,0 0i,dsxy s+t ecmo:nstyesxtteCmh,amress)s;a
                                                         g e s : m e svsaarg easl}r)e
                                                         a d y C o}v)e;r
                             e d   =  iffa l(s!er;e
                             s p . o k )  f{o rv a(rv aer  =j  a=w a0i;t  jr e<s pu.sjesdo.nl(e)n;g tthh;r ojw+ +n)e w{ 
                                            E r r o r ( ( e .iefr r(oird&x& e>.=e rursoerd.[mje]s[s0a]g e&)&| |i'daxp i< =e rursoerd'[)j;] [}1
                                            ] )   {  vaalrr edaadtyaC o=v earweadi t=  rtersupe.;j sborne(a)k;;
                                                  } 
                                                v a r   a}n
                                            s w e r   =  idfa t(a!.aclornetaednytC o&v&e rdeadt)a .{c
                                            o n t e n t [ 0 ]s e&c&t idoantsa..pcuosnht(etnetx[t0.]s.ltiecxet(;s
                                                                                                              t a r t ,i fe n(d!)a)n;s
                                            w e r )   t h r ouws ende.wp uEsrhr(o[rs(t'aNrot ,r eesnpdo]n)s;e
                                              f r o m   C}l
                             a u d e ' ) ;i
                                   d x   + =r eksw..jlseonng(t{ha;n
                                                               s w e r : a nisfw e(rs,e cdtoicosnUss.elde:nfgitlhe s>U=s e6d)} )b;r
                             e a k}; 
c a t c h}(
      e )   {  irfe s(.ssetcattiuosn(s5.0l0e)n.gjtsho n>(={ e6r)r obrr:eea.km;e
             s s a}g
e } )i;f  }(
      s}e;ctions.length === 0) return text.slice(0, 25000);
  return sections.join('\n\n...\n\n');
}

function selectFiles(q) {
        q = q.toLowerCase();
        var keys = [];
        if (q.indexOf('september') >= 0) keys.push('sep10','sep24');
        if (q.indexOf('october') >= 0) keys.push('oct8','oct22');
        if (q.indexOf('november') >= 0) keys.push('nov5','nov19');
        if (q.indexOf('december') >= 0) keys.push('dec10');
        if (q.indexOf('january') >= 0) keys.push('jan14','jan28');
        if (q.indexOf('february') >= 0) keys.push('feb4','feb11','feb25');
        if (q.indexOf('march') >= 0) keys.push('mar11');
        var transcriptFiles = keys.slice(0,2).map(function(k){return TRANSCRIPTS[k];}).filter(Boolean);
        if (transcriptFiles.length === 0) {
                  var mw = ['meeting','board','discuss','vote','french','language','staffing','superintendent','enrollment','consolidat','world','mtss','gate','special ed'];
                  if (mw.some(function(w){return q.indexOf(w)>=0;})) {
                              transcriptFiles = [TRANSCRIPTS['mar11'], TRANSCRIPTS['feb25']];
                  }
        }
        var docFiles = [];
        var budgetWords = ['budget','tax','cost','spending','cut','french','position','teacher','educator','fte','staffing','reduction','proposed','eliminate','latin','esol','math','ela','ed tech'];
        if (budgetWords.some(function(w){return q.indexOf(w)>=0;})) docFiles.push('05c_budget_2020_2027.txt');
        var policyWords = ['policy','phone','cell','conduct','harassment','attendance','suspension','wellness','technology'];
        if (policyWords.some(function(w){return q.indexOf(w)>=0;})) {
                  docFiles.push(q.indexOf('phone')>=0||q.indexOf('cell')>=0 ? '08_policies_M_to_Z.txt' : '07_policies_A_to_L.txt');
        }
        return {transcripts: transcriptFiles, docs: docFiles};
}

async function fetchDoc(path) {
        var r = await fetch(BASE + path);
        if (!r.ok) throw new Error('Could not fetch ' + path);
        return await r.text();
}

module.exports = async function(req, res) {
        if (req.method !== 'POST') return res.status(405).json({error:'method not allowed'});
        var body = req.body;
        var question = body && body.question;
        if (!question) return res.status(400).json({error:'no question'});
        var apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) return res.status(500).json({error:'no api key'});
        try {
                  var selected = selectFiles(question);
                  var docs = [];
                  var filesUsed = [];
                  var q = question.toLowerCase();

          // Fetch transcripts - extract relevant sections
          var transcriptKeywords = ['french','teache
