// ==================== DATA LAYER ====================
const DB_KEY = 'mecachamps2_v1';

function getData() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

function saveData(data) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(data));
    return true;
  } catch(e) {
    alert('Error al guardar: almacenamiento lleno. Comprime las imágenes.');
    return false;
  }
}

function createId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Berger round-robin algorithm
function generateFixtures(teamIds, prefix) {
  const teams = [...teamIds];
  if (teams.length % 2 !== 0) teams.push(null);
  const n = teams.length;
  const idaRounds = [];
  let mc = 0;

  for (let r = 0; r < n - 1; r++) {
    const round = [];
    for (let m = 0; m < n / 2; m++) {
      const h = teams[m], a = teams[n - 1 - m];
      if (h !== null && a !== null) {
        round.push({
          id: `${prefix}_i${r+1}_${mc++}`,
          round: r + 1, leg: 'ida',
          homeTeamId: h, awayTeamId: a,
          played: false, homeScore: null, awayScore: null, events: []
        });
      }
    }
    idaRounds.push(round);
    teams.splice(1, 0, teams.pop());
  }

  const vueltaRounds = idaRounds.map((round, i) =>
    round.map(match => ({
      id: `${prefix}_v${i+1}_${mc++}`,
      round: idaRounds.length + i + 1, leg: 'vuelta',
      homeTeamId: match.awayTeamId, awayTeamId: match.homeTeamId,
      played: false, homeScore: null, awayScore: null, events: []
    }))
  );

  return [...idaRounds, ...vueltaRounds];
}

// ==================== CUP BRACKET ====================
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function mkCupMatch(id, homeTeamId, awayTeamId, phase, tieId, opts) {
  return Object.assign({
    id, phase, tieId,
    homeTeamId: homeTeamId || null,
    awayTeamId: awayTeamId || null,
    played: false, homeScore: null, awayScore: null, events: []
  }, opts || {});
}

// Returns [previa[], octavos[], cuartos[], semis[], final[]]
function generateCupBracket(teamIds) {
  const t = shuffle([...teamIds]);
  let mc = 0;
  const nid = ph => `c_${ph}_${mc++}`;

  // Previa: 4 ties (teams[0-7])
  const previa = [
    mkCupMatch(nid('pv'), t[0], t[1], 'previa', 'pv0'),
    mkCupMatch(nid('pv'), t[2], t[3], 'previa', 'pv1'),
    mkCupMatch(nid('pv'), t[4], t[5], 'previa', 'pv2'),
    mkCupMatch(nid('pv'), t[6], t[7], 'previa', 'pv3'),
  ];

  // Octavos: 4 seeded pairs (teams[8-15]) + 4 seeded vs previa winner (teams[16-19])
  const octavos = [
    mkCupMatch(nid('o'), t[8],  t[9],  'octavos', 'o0'),
    mkCupMatch(nid('o'), t[10], t[11], 'octavos', 'o1'),
    mkCupMatch(nid('o'), t[12], t[13], 'octavos', 'o2'),
    mkCupMatch(nid('o'), t[14], t[15], 'octavos', 'o3'),
    mkCupMatch(nid('o'), t[16], null, 'octavos', 'o4', { awayFromTie: 'pv0', pending: true }),
    mkCupMatch(nid('o'), t[17], null, 'octavos', 'o5', { awayFromTie: 'pv1', pending: true }),
    mkCupMatch(nid('o'), t[18], null, 'octavos', 'o6', { awayFromTie: 'pv2', pending: true }),
    mkCupMatch(nid('o'), t[19], null, 'octavos', 'o7', { awayFromTie: 'pv3', pending: true }),
  ];

  const cuartos = [
    mkCupMatch(nid('c'), null, null, 'cuartos', 'c0', { homeFromTie: 'o0', awayFromTie: 'o4', pending: true }),
    mkCupMatch(nid('c'), null, null, 'cuartos', 'c1', { homeFromTie: 'o1', awayFromTie: 'o5', pending: true }),
    mkCupMatch(nid('c'), null, null, 'cuartos', 'c2', { homeFromTie: 'o2', awayFromTie: 'o6', pending: true }),
    mkCupMatch(nid('c'), null, null, 'cuartos', 'c3', { homeFromTie: 'o3', awayFromTie: 'o7', pending: true }),
  ];

  const semis = [
    mkCupMatch(nid('s'), null, null, 'semis', 's0', { homeFromTie: 'c0', awayFromTie: 'c1', pending: true }),
    mkCupMatch(nid('s'), null, null, 'semis', 's1', { homeFromTie: 'c2', awayFromTie: 'c3', pending: true }),
  ];

  const final_ = [
    mkCupMatch(nid('f'), null, null, 'final', 'f0', { homeFromTie: 's0', awayFromTie: 's1', pending: true }),
  ];

  return [previa, octavos, cuartos, semis, final_];
}

// Called after every Copa match save — propagates winners through bracket
function advanceCupBracket(data) {
  const flat = data.matches.copa.flat();

  // Build winner map from all played matches
  const winnerOf = {};
  for (const m of flat) {
    if (m.played && m.homeTeamId && m.awayTeamId) {
      if (m.homeScore > m.awayScore)      winnerOf[m.tieId] = m.homeTeamId;
      else if (m.awayScore > m.homeScore) winnerOf[m.tieId] = m.awayTeamId;
    }
  }

  // Propagate winners to dependent matches
  for (const m of flat) {
    if (!m.homeFromTie && !m.awayFromTie) continue;

    const newHome = m.homeFromTie ? (winnerOf[m.homeFromTie] || null) : m.homeTeamId;
    const newAway = m.awayFromTie ? (winnerOf[m.awayFromTie] || null) : m.awayTeamId;

    if (newHome !== m.homeTeamId || newAway !== m.awayTeamId) {
      m.homeTeamId = newHome;
      m.awayTeamId = newAway;
      if (!newHome || !newAway) {
        // Teams no longer known — invalidate any result on this match
        m.pending = true;
        m.played = false; m.homeScore = null; m.awayScore = null; m.events = [];
      } else {
        m.pending = false;
      }
    }
  }
}

function createDefaultTeam(division, num) {
  return {
    id: createId(),
    name: `Equipo ${num}`,
    division,
    shield: null,
    president: '',
    rating: 70,
    jerseyHome: null,
    jerseyAway: null,
    players: []
  };
}

function initializeApp() {
  let data = getData();
  if (!data) {
    const primera = Array.from({length: 10}, (_, i) => createDefaultTeam('primera', i + 1));
    const segunda  = Array.from({length: 10}, (_, i) => createDefaultTeam('segunda',  i + 1));
    const pIds = primera.map(t => t.id);
    const sIds = segunda.map(t => t.id);
    data = {
      teams: { primera, segunda },
      matches: {
        primera: generateFixtures(pIds, 'p'),
        segunda:  generateFixtures(sIds, 's'),
        copa:     generateCupBracket([...pIds, ...sIds])
      },
      news: []
    };
    saveData(data);
  } else {
    // Migration: detect old round-robin Copa (had .leg property) → replace with cup bracket
    const sample = data.matches.copa?.[0]?.[0];
    if (sample && sample.leg !== undefined) {
      const pIds = data.teams.primera.map(t => t.id);
      const sIds = data.teams.segunda.map(t => t.id);
      data.matches.copa = generateCupBracket([...pIds, ...sIds]);
      saveData(data);
    }
  }
  return data;
}

function computeStandings(tournament) {
  const data = getData();
  let teams;
  if (tournament === 'primera')     teams = [...data.teams.primera];
  else if (tournament === 'segunda') teams = [...data.teams.segunda];
  else teams = [...data.teams.primera, ...data.teams.segunda];

  const stats = {};
  for (const t of teams)
    stats[t.id] = { team: t, pj:0, pg:0, pe:0, pp:0, gf:0, gc:0 };

  for (const match of data.matches[tournament].flat()) {
    if (!match.played) continue;
    const h = stats[match.homeTeamId], a = stats[match.awayTeamId];
    if (!h || !a) continue;
    h.pj++; a.pj++;
    h.gf += match.homeScore; h.gc += match.awayScore;
    a.gf += match.awayScore; a.gc += match.homeScore;
    if (match.homeScore > match.awayScore)      { h.pg++; a.pp++; }
    else if (match.homeScore < match.awayScore) { a.pg++; h.pp++; }
    else                                         { h.pe++; a.pe++; }
  }

  return Object.values(stats).map(s => ({
    ...s, dg: s.gf - s.gc, pts: s.pg * 3 + s.pe
  })).sort((a, b) =>
    b.pts - a.pts || b.dg - a.dg || b.gf - a.gf ||
    a.team.name.localeCompare(b.team.name)
  );
}

function computePlayerStats(tournament) {
  const data = getData();
  const allTeams = [...data.teams.primera, ...data.teams.segunda];
  const playerMap = {};
  for (const team of allTeams)
    for (const p of team.players)
      playerMap[p.id] = { player: p, team };

  const stats = {};
  for (const match of data.matches[tournament].flat()) {
    if (!match.played) continue;
    for (const ev of match.events) {
      if (!stats[ev.playerId]) {
        const info = playerMap[ev.playerId];
        if (!info) continue;
        stats[ev.playerId] = { player: info.player, team: info.team, goals:0, assists:0, yellows:0, reds:0 };
      }
      const s = stats[ev.playerId];
      if (ev.type === 'goal')   s.goals++;
      if (ev.type === 'assist') s.assists++;
      if (ev.type === 'yellow') s.yellows++;
      if (ev.type === 'red')    s.reds++;
    }
  }
  return Object.values(stats);
}

function getTeamById(id) {
  const data = getData();
  return [...data.teams.primera, ...data.teams.segunda].find(t => t.id === id);
}

function getAllPlayers() {
  const data = getData();
  const result = [];
  for (const div of ['primera','segunda'])
    for (const team of data.teams[div])
      for (const p of team.players)
        result.push({ player: p, team });
  return result;
}

async function resizeImage(dataUrl, maxW, maxH, q = 0.82) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      const ratio = Math.min(maxW / w, maxH / h, 1);
      w = Math.round(w * ratio); h = Math.round(h * ratio);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/jpeg', q));
    };
    img.src = dataUrl;
  });
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = e => resolve(e.target.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function regenerateFixtures() {
  const data = getData();
  const pIds = data.teams.primera.map(t => t.id);
  const sIds = data.teams.segunda.map(t => t.id);
  data.matches.primera = generateFixtures(pIds, 'p');
  data.matches.segunda  = generateFixtures(sIds, 's');
  data.matches.copa     = generateCupBracket([...pIds, ...sIds]);
  saveData(data);
}
