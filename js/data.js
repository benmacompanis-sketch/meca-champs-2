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

// Returns [r1[], r2[], semis[], final[]]
// All 20 teams play in R1 (10 matches). R2 pairs R1 winners (5 matches).
// 4 of 5 R2 winners play Semis; 5th R2 winner (isBronze) gets 3rd place automatically.
function generateCupBracket(teamIds) {
  const t = shuffle([...teamIds]);
  let mc = 0;
  const nid = ph => `c_${ph}_${mc++}`;

  // Ronda 1: all 20 teams play (10 matches, draw-determined)
  const r1 = [];
  for (let i = 0; i < 20; i += 2) {
    r1.push(mkCupMatch(nid('r1'), t[i], t[i + 1], 'r1', `r1_${i / 2}`));
  }
  // r1[0]='r1_0' ... r1[9]='r1_9'

  // Ronda 2: 5 matches (pairs of R1 winners)
  // r2_4 winner auto-advances to 3rd place (isBronze) — does NOT play Semis
  const r2 = [
    mkCupMatch(nid('r2'), null, null, 'r2', 'r2_0', { homeFromTie: 'r1_0', awayFromTie: 'r1_1', pending: true }),
    mkCupMatch(nid('r2'), null, null, 'r2', 'r2_1', { homeFromTie: 'r1_2', awayFromTie: 'r1_3', pending: true }),
    mkCupMatch(nid('r2'), null, null, 'r2', 'r2_2', { homeFromTie: 'r1_4', awayFromTie: 'r1_5', pending: true }),
    mkCupMatch(nid('r2'), null, null, 'r2', 'r2_3', { homeFromTie: 'r1_6', awayFromTie: 'r1_7', pending: true }),
    mkCupMatch(nid('r2'), null, null, 'r2', 'r2_4', { homeFromTie: 'r1_8', awayFromTie: 'r1_9', pending: true, isBronze: true }),
  ];

  // Semis: 4 teams (r2_0/r2_1 on one side, r2_2/r2_3 on the other)
  const semis = [
    mkCupMatch(nid('s'), null, null, 'semis', 's0', { homeFromTie: 'r2_0', awayFromTie: 'r2_1', pending: true }),
    mkCupMatch(nid('s'), null, null, 'semis', 's1', { homeFromTie: 'r2_2', awayFromTie: 'r2_3', pending: true }),
  ];

  const final_ = [
    mkCupMatch(nid('f'), null, null, 'final', 'f0', { homeFromTie: 's0', awayFromTie: 's1', pending: true }),
  ];

  return [r1, r2, semis, final_];
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
    // Migration: detect old Copa formats (round-robin with .leg, or old previa/octavos bracket)
    const sample = data.matches.copa?.[0]?.[0];
    if (sample && (sample.leg !== undefined || sample.phase === 'previa')) {
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
