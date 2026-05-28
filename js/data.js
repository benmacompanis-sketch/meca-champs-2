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
        copa:     generateFixtures([...pIds, ...sIds], 'c')
      },
      news: []
    };
    saveData(data);
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
  data.matches.copa     = generateFixtures([...pIds, ...sIds], 'c');
  saveData(data);
}
