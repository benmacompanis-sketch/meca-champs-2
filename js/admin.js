// ==================== ADMIN PANEL ====================
const ADMIN_USER = 'Mecachamps';
const ADMIN_PASS = 'abichuela';
let adminLoggedIn = false;
let _matchPlayers = [];

function toggleAdmin() {
  if (adminLoggedIn) {
    openAdminPanel();
  } else {
    openLoginModal();
  }
}

// ===== LOGIN =====
function openLoginModal() {
  document.getElementById('admin-overlay').classList.remove('hidden');
  document.getElementById('admin-panel').innerHTML = `
    <div class="admin-login-box">
      <div class="admin-login-logo">⚙ ADMIN MC2</div>
      <div class="admin-login-form">
        <div class="form-group">
          <label>USUARIO</label>
          <input type="text" id="login-user" placeholder="Usuario" autocomplete="username">
        </div>
        <div class="form-group">
          <label>CONTRASEÑA</label>
          <input type="password" id="login-pass" placeholder="Contraseña" autocomplete="current-password"
            onkeydown="if(event.key==='Enter') doLogin()">
        </div>
        <div id="login-error" class="login-error hidden">Usuario o contraseña incorrectos.</div>
        <div class="admin-btns">
          <button class="btn-primary" onclick="doLogin()">INGRESAR</button>
          <button class="btn-ghost" onclick="closeAdminPanel()">CANCELAR</button>
        </div>
      </div>
    </div>
  `;
  setTimeout(() => document.getElementById('login-user')?.focus(), 100);
}

function doLogin() {
  const user = document.getElementById('login-user').value.trim();
  const pass = document.getElementById('login-pass').value;
  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    adminLoggedIn = true;
    document.getElementById('admin-btn').classList.add('admin-active');
    openAdminPanel();
  } else {
    document.getElementById('login-error').classList.remove('hidden');
    document.getElementById('login-pass').value = '';
    document.getElementById('login-pass').focus();
  }
}

function doLogout() {
  adminLoggedIn = false;
  document.getElementById('admin-btn').classList.remove('admin-active');
  closeAdminPanel();
}

function closeAdminPanel() {
  document.getElementById('admin-overlay').classList.add('hidden');
}

// ===== ADMIN MAIN PANEL =====
function openAdminPanel() {
  document.getElementById('admin-overlay').classList.remove('hidden');
  document.getElementById('admin-panel').innerHTML = `
    <div class="admin-header">
      <div class="admin-title">⚙ PANEL ADMIN · MECA CHAMPS 2</div>
      <div class="admin-header-btns">
        <button class="btn-ghost btn-sm" onclick="doLogout()">CERRAR SESIÓN</button>
        <button class="btn-ghost btn-sm" onclick="closeAdminPanel()">✕</button>
      </div>
    </div>
    <div class="admin-nav-tabs">
      <button class="admin-tab active" data-atab="teams">EQUIPOS</button>
      <button class="admin-tab" data-atab="matches">PARTIDOS</button>
      <button class="admin-tab" data-atab="news">NOTICIAS</button>
    </div>
    <div id="admin-tab-content">
      ${renderAdminTeams()}
    </div>
  `;
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const atab = tab.dataset.atab;
      document.getElementById('admin-tab-content').innerHTML =
        atab === 'teams'   ? renderAdminTeams()   :
        atab === 'matches' ? renderAdminMatches()  :
                             renderAdminNews();
      if (atab === 'matches') loadAdminRounds();
    });
  });
}

// ===== ADMIN: TEAMS =====
function renderAdminTeams() {
  const data = getData();
  const renderDivTeams = (teams, division) => teams.map(t => `
    <div class="admin-team-row">
      <div class="atr-shield">
        ${t.shield ? `<img src="${t.shield}" alt="">` : `<div class="shield-placeholder-sm">${t.name.charAt(0)}</div>`}
      </div>
      <div class="atr-info">
        <strong>${escHtml(t.name)}</strong>
        <span>${t.players.length} jugadores · ${division === 'primera' ? '1ra' : '2da'} Div</span>
      </div>
      <button class="btn-primary btn-sm" onclick="openEditTeam('${t.id}')">EDITAR</button>
    </div>
  `).join('');

  return `
    <div class="admin-section">
      <div class="admin-section-header">
        <span>PRIMERA DIVISIÓN</span>
        <button class="btn-primary btn-sm" onclick="openAddTeam('primera')">+ EQUIPO</button>
      </div>
      <div class="admin-team-list">${renderDivTeams(data.teams.primera, 'primera')}</div>

      <div class="admin-section-header" style="margin-top:1.5rem">
        <span>SEGUNDA DIVISIÓN</span>
        <button class="btn-primary btn-sm" onclick="openAddTeam('segunda')">+ EQUIPO</button>
      </div>
      <div class="admin-team-list">${renderDivTeams(data.teams.segunda, 'segunda')}</div>

      <div class="admin-warning">
        <button class="btn-danger btn-sm" onclick="confirmRegenFixtures()">⚠ REGENERAR FIXTURE</button>
        <small>Solo si cambias equipos. Borra todos los resultados.</small>
      </div>
    </div>
    <div id="team-editor"></div>
  `;
}

function openAddTeam(division) {
  const newTeam = createDefaultTeam(division, 'Nuevo');
  const data = getData();
  data.teams[division].push(newTeam);
  saveData(data);
  openEditTeam(newTeam.id);
}

function openEditTeam(teamId) {
  const team = getTeamById(teamId);
  if (!team) return;
  document.getElementById('team-editor').innerHTML = `
    <div class="team-editor-panel">
      <div class="editor-header">
        <h3>EDITAR: ${escHtml(team.name)}</h3>
        <button class="btn-ghost btn-sm" onclick="document.getElementById('team-editor').innerHTML=''">✕</button>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>NOMBRE DEL EQUIPO</label>
          <input type="text" id="te-name" value="${escHtml(team.name)}">
        </div>
        <div class="form-group">
          <label>PRESIDENTE / DT</label>
          <input type="text" id="te-president" value="${escHtml(team.president)}">
        </div>
        <div class="form-group">
          <label>VALORACIÓN GENERAL (OVR)</label>
          <input type="number" id="te-rating" min="1" max="99" value="${team.rating}">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>ESCUDO</label>
          ${team.shield ? `<img src="${team.shield}" class="preview-img" id="preview-shield">` : `<div class="preview-img preview-empty" id="preview-shield">SIN ESCUDO</div>`}
          <input type="file" id="te-shield" accept="image/*" onchange="previewUpload('te-shield','preview-shield',200,200)">
        </div>
        <div class="form-group">
          <label>CAMISETA TITULAR</label>
          ${team.jerseyHome ? `<img src="${team.jerseyHome}" class="preview-img" id="preview-jh">` : `<div class="preview-img preview-empty" id="preview-jh">SIN CAMISETA</div>`}
          <input type="file" id="te-jh" accept="image/*" onchange="previewUpload('te-jh','preview-jh',400,600)">
        </div>
        <div class="form-group">
          <label>CAMISETA SUPLENTE / AMBAS</label>
          ${team.jerseyAway ? `<img src="${team.jerseyAway}" class="preview-img" id="preview-ja">` : `<div class="preview-img preview-empty" id="preview-ja">SIN CAMISETA</div>`}
          <input type="file" id="te-ja" accept="image/*" onchange="previewUpload('te-ja','preview-ja',400,600)">
        </div>
      </div>

      <div class="admin-section-header" style="margin:.5rem 0">
        <span>PLANTEL (${team.players.length} jugadores)</span>
        <button class="btn-primary btn-sm" onclick="addPlayer('${teamId}')">+ JUGADOR</button>
      </div>
      <div id="players-list-${teamId}">
        ${renderPlayersList(team)}
      </div>

      <div class="admin-btns" style="margin-top:1rem">
        <button class="btn-primary" onclick="saveTeamEdits('${teamId}')">💾 GUARDAR EQUIPO</button>
        <button class="btn-danger btn-sm" onclick="deleteTeam('${teamId}')">ELIMINAR EQUIPO</button>
      </div>
    </div>
  `;
}

function renderPlayersList(team) {
  if (team.players.length === 0) return '<div class="empty-state-sm">Sin jugadores. Agrega uno.</div>';
  return team.players.map(p => `
    <div class="player-admin-row" id="par-${p.id}">
      <div class="par-photo">
        ${p.photo ? `<img src="${p.photo}" alt="">` : `<div class="avatar-placeholder-sm">${p.name.charAt(0)}</div>`}
      </div>
      <div class="par-info">
        <strong>${escHtml(p.name)}</strong>
        <span>${escHtml(p.position || '—')} · ${p.age || '—'} años · ${p.rating} OVR</span>
      </div>
      <button class="btn-ghost btn-sm" onclick="openEditPlayer('${team.id}','${p.id}')">EDITAR</button>
      <button class="btn-danger btn-sm" onclick="deletePlayer('${team.id}','${p.id}')">✕</button>
    </div>
  `).join('');
}

async function previewUpload(inputId, previewId, maxW, maxH) {
  const file = document.getElementById(inputId).files[0];
  if (!file) return;
  const dataUrl = await readFile(file);
  const resized = await resizeImage(dataUrl, maxW, maxH);
  const el = document.getElementById(previewId);
  if (el.tagName === 'IMG') {
    el.src = resized;
  } else {
    el.outerHTML = `<img src="${resized}" class="preview-img" id="${previewId}">`;
  }
  document.getElementById(inputId).dataset.resized = resized;
}

async function saveTeamEdits(teamId) {
  const data = getData();
  const div = data.teams.primera.find(t => t.id === teamId) ? 'primera' : 'segunda';
  const idx = data.teams[div].findIndex(t => t.id === teamId);
  if (idx === -1) return;

  const team = data.teams[div][idx];
  team.name = document.getElementById('te-name').value.trim() || team.name;
  team.president = document.getElementById('te-president').value.trim();
  team.rating = parseInt(document.getElementById('te-rating').value) || team.rating;

  const shieldInput = document.getElementById('te-shield');
  if (shieldInput.dataset.resized) team.shield = shieldInput.dataset.resized;

  const jhInput = document.getElementById('te-jh');
  if (jhInput.dataset.resized) team.jerseyHome = jhInput.dataset.resized;

  const jaInput = document.getElementById('te-ja');
  if (jaInput.dataset.resized) team.jerseyAway = jaInput.dataset.resized;

  if (saveData(data)) {
    alert('✅ Equipo guardado correctamente.');
    renderView(currentView);
  }
}

function deleteTeam(teamId) {
  if (!confirm('¿Eliminar este equipo? Se perderán todos sus datos.')) return;
  const data = getData();
  for (const div of ['primera','segunda']) {
    data.teams[div] = data.teams[div].filter(t => t.id !== teamId);
  }
  saveData(data);
  document.getElementById('admin-tab-content').innerHTML = renderAdminTeams();
  renderView(currentView);
}

function confirmRegenFixtures() {
  if (!confirm('⚠️ Esto borrará TODOS los resultados y genera un fixture nuevo.\n¿Confirmar?')) return;
  regenerateFixtures();
  alert('✅ Fixture regenerado.');
  document.getElementById('admin-tab-content').innerHTML = renderAdminTeams();
  renderView(currentView);
}

// ===== PLAYERS =====
function addPlayer(teamId) {
  const data = getData();
  const div = data.teams.primera.find(t => t.id === teamId) ? 'primera' : 'segunda';
  const team = data.teams[div].find(t => t.id === teamId);
  if (!team) return;
  const newPlayer = { id: createId(), name: 'Jugador', photo: null, position: 'DEL', rating: 70, age: 20 };
  team.players.push(newPlayer);
  saveData(data);
  openEditPlayer(teamId, newPlayer.id);
}

function openEditPlayer(teamId, playerId) {
  const team = getTeamById(teamId);
  const player = team?.players.find(p => p.id === playerId);
  if (!player) return;

  const modal = document.createElement('div');
  modal.id = 'player-edit-modal';
  modal.className = 'inner-modal';
  modal.innerHTML = `
    <div class="inner-modal-box">
      <div class="editor-header">
        <h3>JUGADOR: ${escHtml(player.name)}</h3>
        <button class="btn-ghost btn-sm" onclick="document.getElementById('player-edit-modal').remove()">✕</button>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>NOMBRE</label>
          <input type="text" id="pl-name" value="${escHtml(player.name)}">
        </div>
        <div class="form-group">
          <label>POSICIÓN</label>
          <select id="pl-pos">
            ${['GK','DEF','MED','DEL'].map(p => `<option value="${p}" ${player.position===p?'selected':''}>${p}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>EDAD</label>
          <input type="number" id="pl-age" min="15" max="45" value="${player.age||''}">
        </div>
        <div class="form-group">
          <label>MEDIA (OVR)</label>
          <input type="number" id="pl-rating" min="1" max="99" value="${player.rating}">
        </div>
      </div>
      <div class="form-group">
        <label>FOTO DEL JUGADOR</label>
        ${player.photo ? `<img src="${player.photo}" class="preview-img" id="preview-photo">` : `<div class="preview-img preview-empty" id="preview-photo">SIN FOTO</div>`}
        <input type="file" id="pl-photo" accept="image/*" onchange="previewUpload('pl-photo','preview-photo',300,400)">
      </div>
      <div class="admin-btns">
        <button class="btn-primary" onclick="savePlayer('${teamId}','${playerId}')">💾 GUARDAR</button>
        <button class="btn-ghost" onclick="document.getElementById('player-edit-modal').remove()">CANCELAR</button>
      </div>
    </div>
  `;
  document.getElementById('admin-panel').appendChild(modal);
}

async function savePlayer(teamId, playerId) {
  const data = getData();
  const div = data.teams.primera.find(t => t.id === teamId) ? 'primera' : 'segunda';
  const team = data.teams[div].find(t => t.id === teamId);
  const player = team?.players.find(p => p.id === playerId);
  if (!player) return;

  player.name = document.getElementById('pl-name').value.trim() || player.name;
  player.position = document.getElementById('pl-pos').value;
  player.age = parseInt(document.getElementById('pl-age').value) || player.age;
  player.rating = parseInt(document.getElementById('pl-rating').value) || player.rating;

  const photoInput = document.getElementById('pl-photo');
  if (photoInput.dataset.resized) player.photo = photoInput.dataset.resized;

  if (saveData(data)) {
    document.getElementById('player-edit-modal')?.remove();
    const listEl = document.getElementById(`players-list-${teamId}`);
    if (listEl) listEl.innerHTML = renderPlayersList(getTeamById(teamId));
    alert('✅ Jugador guardado.');
  }
}

function deletePlayer(teamId, playerId) {
  if (!confirm('¿Eliminar este jugador?')) return;
  const data = getData();
  const div = data.teams.primera.find(t => t.id === teamId) ? 'primera' : 'segunda';
  const team = data.teams[div].find(t => t.id === teamId);
  if (team) {
    team.players = team.players.filter(p => p.id !== playerId);
    saveData(data);
    const listEl = document.getElementById(`players-list-${teamId}`);
    if (listEl) listEl.innerHTML = renderPlayersList(team);
  }
}

// ===== ADMIN: MATCHES =====
function renderAdminMatches() {
  return `
    <div class="admin-section">
      <div class="admin-section-header"><span>CARGAR RESULTADO</span></div>
      <div class="form-row">
        <div class="form-group">
          <label>TORNEO</label>
          <select id="match-tournament" onchange="loadAdminRounds()">
            <option value="primera">Primera División</option>
            <option value="segunda">Segunda División</option>
            <option value="copa">Copa MC2</option>
          </select>
        </div>
        <div class="form-group">
          <label>FECHA</label>
          <select id="match-round" onchange="loadAdminMatches()"></select>
        </div>
      </div>
      <div id="admin-matches-list"></div>
    </div>
    <div id="match-result-editor"></div>
  `;
}

function loadAdminRounds() {
  const tournament = document.getElementById('match-tournament')?.value;
  if (!tournament) return;
  const data = getData();
  const rounds = data.matches[tournament];
  const sel = document.getElementById('match-round');
  if (!sel) return;
  sel.innerHTML = rounds.map((r, i) => {
    const leg = r[0]?.leg === 'vuelta' ? 'V' : 'I';
    return `<option value="${i}">${leg} - Fecha ${r[0]?.round ?? i+1}</option>`;
  }).join('');
  loadAdminMatches();
}

function loadAdminMatches() {
  const tournament = document.getElementById('match-tournament')?.value;
  const roundIdx = parseInt(document.getElementById('match-round')?.value);
  if (!tournament || isNaN(roundIdx)) return;
  const data = getData();
  const round = data.matches[tournament][roundIdx];
  if (!round) return;

  const el = document.getElementById('admin-matches-list');
  if (!el) return;
  el.innerHTML = round.map(match => {
    const home = getTeamById(match.homeTeamId);
    const away = getTeamById(match.awayTeamId);
    if (!home || !away) return '';
    const played = match.played;
    return `
      <div class="admin-match-row ${played ? 'match-done' : ''}">
        <span class="amr-home">${escHtml(home.name)}</span>
        <span class="amr-score">${played ? `${match.homeScore} - ${match.awayScore}` : 'vs'}</span>
        <span class="amr-away">${escHtml(away.name)}</span>
        <button class="btn-primary btn-sm" onclick="openMatchEditor('${tournament}','${match.id}')">
          ${played ? 'EDITAR' : 'CARGAR'}
        </button>
      </div>
    `;
  }).join('');
}

function findMatch(tournament, matchId) {
  const data = getData();
  for (const round of data.matches[tournament])
    for (const m of round)
      if (m.id === matchId) return m;
  return null;
}

function openMatchEditor(tournament, matchId) {
  const match = findMatch(tournament, matchId);
  if (!match) return;
  const home = getTeamById(match.homeTeamId);
  const away = getTeamById(match.awayTeamId);
  if (!home || !away) return;

  _matchPlayers = [
    ...home.players.map(p => ({ ...p, teamId: home.id, teamName: home.name })),
    ...away.players.map(p => ({ ...p, teamId: away.id, teamName: away.name }))
  ];

  const eventsHtml = (match.events || []).map((ev, i) => makeEventRow(ev, i, _matchPlayers)).join('');

  document.getElementById('match-result-editor').innerHTML = `
    <div class="match-editor-panel">
      <div class="editor-header">
        <h3>${escHtml(home.name)} vs ${escHtml(away.name)}</h3>
        <button class="btn-ghost btn-sm" onclick="document.getElementById('match-result-editor').innerHTML=''">✕</button>
      </div>

      <div class="score-input-row">
        <div class="si-team">
          ${home.shield ? `<img src="${home.shield}" class="match-shield" alt="">` : ''}
          <span>${escHtml(home.name)}</span>
        </div>
        <input type="number" id="score-home" class="score-input" min="0" max="99" value="${match.homeScore ?? ''}">
        <span class="score-sep">-</span>
        <input type="number" id="score-away" class="score-input" min="0" max="99" value="${match.awayScore ?? ''}">
        <div class="si-team">
          ${away.shield ? `<img src="${away.shield}" class="match-shield" alt="">` : ''}
          <span>${escHtml(away.name)}</span>
        </div>
      </div>

      <div class="admin-section-header" style="margin-top:1rem">
        <span>EVENTOS DEL PARTIDO</span>
        <button class="btn-primary btn-sm" onclick="addEventRow()">+ EVENTO</button>
      </div>
      <div id="events-list">
        ${eventsHtml}
      </div>

      <div class="admin-btns" style="margin-top:1rem">
        <button class="btn-primary" onclick="saveMatchResult('${tournament}','${matchId}')">💾 GUARDAR RESULTADO</button>
        ${match.played ? `<button class="btn-danger btn-sm" onclick="clearMatchResult('${tournament}','${matchId}')">BORRAR RESULTADO</button>` : ''}
      </div>
    </div>
  `;
  document.getElementById('match-result-editor').scrollIntoView({ behavior:'smooth', block:'start' });
}

function makeEventRow(ev, i, allPlayers) {
  const playerOptions = allPlayers.map(p =>
    `<option value="${p.id}" data-team="${p.teamId}" ${p.id === ev.playerId ? 'selected' : ''}>${escHtml(p.name)} (${escHtml(p.teamName)})</option>`
  ).join('');
  return `
    <div class="event-row" id="ev-${i}">
      <select class="ev-type">
        ${['goal','assist','yellow','red'].map(t =>
          `<option value="${t}" ${ev.type===t?'selected':''}>${t==='goal'?'⚽ Gol':t==='assist'?'🎯 Asistencia':t==='yellow'?'🟨 Amarilla':'🟥 Roja'}</option>`
        ).join('')}
      </select>
      <select class="ev-player">${playerOptions}</select>
      <input type="number" class="ev-minute" placeholder="Min." min="1" max="120" value="${ev.minute||''}">
      <button class="btn-danger btn-sm" onclick="this.closest('.event-row').remove()">✕</button>
    </div>
  `;
}

function addEventRow() {
  const allPlayers = _matchPlayers;
  const container = document.getElementById('events-list');
  const i = Date.now();
  const playerOptions = allPlayers.map(p =>
    `<option value="${p.id}" data-team="${p.teamId}">${escHtml(p.name)} (${escHtml(p.teamName)})</option>`
  ).join('');
  const div = document.createElement('div');
  div.className = 'event-row';
  div.id = `ev-${i}`;
  div.innerHTML = `
    <select class="ev-type">
      <option value="goal">⚽ Gol</option>
      <option value="assist">🎯 Asistencia</option>
      <option value="yellow">🟨 Amarilla</option>
      <option value="red">🟥 Roja</option>
    </select>
    <select class="ev-player">${playerOptions}</select>
    <input type="number" class="ev-minute" placeholder="Min." min="1" max="120">
    <button class="btn-danger btn-sm" onclick="this.closest('.event-row').remove()">✕</button>
  `;
  container.appendChild(div);
}

function saveMatchResult(tournament, matchId) {
  const homeScore = parseInt(document.getElementById('score-home').value);
  const awayScore = parseInt(document.getElementById('score-away').value);

  if (isNaN(homeScore) || isNaN(awayScore) || homeScore < 0 || awayScore < 0) {
    alert('Ingresa un marcador válido.');
    return;
  }

  const events = [];
  document.querySelectorAll('#events-list .event-row').forEach(row => {
    const type = row.querySelector('.ev-type').value;
    const playerSel = row.querySelector('.ev-player');
    const playerId = playerSel.value;
    const teamId = playerSel.selectedOptions[0]?.dataset.team;
    const minute = parseInt(row.querySelector('.ev-minute').value) || 0;
    if (playerId && teamId) events.push({ type, playerId, teamId, minute });
  });

  const data = getData();
  for (const round of data.matches[tournament]) {
    for (const m of round) {
      if (m.id === matchId) {
        m.played = true;
        m.homeScore = homeScore;
        m.awayScore = awayScore;
        m.events = events;
        break;
      }
    }
  }

  if (saveData(data)) {
    alert('✅ Resultado guardado. Tablas actualizadas.');
    document.getElementById('match-result-editor').innerHTML = '';
    loadAdminMatches();
    renderView(currentView);
  }
}

function clearMatchResult(tournament, matchId) {
  if (!confirm('¿Borrar el resultado de este partido?')) return;
  const data = getData();
  for (const round of data.matches[tournament]) {
    for (const m of round) {
      if (m.id === matchId) {
        m.played = false; m.homeScore = null; m.awayScore = null; m.events = [];
        break;
      }
    }
  }
  saveData(data);
  document.getElementById('match-result-editor').innerHTML = '';
  loadAdminMatches();
  renderView(currentView);
}

// ===== ADMIN: NEWS =====
function renderAdminNews() {
  const data = getData();
  const news = [...data.news].reverse();
  return `
    <div class="admin-section">
      <div class="admin-section-header">
        <span>NOTICIAS</span>
        <button class="btn-primary btn-sm" onclick="openNewsEditor()">+ NOTICIA</button>
      </div>
      <div id="news-admin-list">
        ${news.map(n => `
          <div class="admin-news-row">
            <div class="anr-info">
              <strong>${escHtml(n.title)}</strong>
              <span>${formatDate(n.date)}</span>
            </div>
            <button class="btn-ghost btn-sm" onclick="openNewsEditor('${n.id}')">EDITAR</button>
            <button class="btn-danger btn-sm" onclick="deleteNews('${n.id}')">✕</button>
          </div>
        `).join('') || '<div class="empty-state-sm">Sin noticias.</div>'}
      </div>
      <div id="news-editor"></div>
    </div>
  `;
}

function openNewsEditor(newsId) {
  const data = getData();
  const news = newsId ? data.news.find(n => n.id === newsId) : null;
  document.getElementById('news-editor').innerHTML = `
    <div class="team-editor-panel" style="margin-top:1rem">
      <div class="editor-header">
        <h3>${news ? 'EDITAR NOTICIA' : 'NUEVA NOTICIA'}</h3>
        <button class="btn-ghost btn-sm" onclick="document.getElementById('news-editor').innerHTML=''">✕</button>
      </div>
      <div class="form-group">
        <label>TÍTULO</label>
        <input type="text" id="ne-title" value="${news ? escHtml(news.title) : ''}">
      </div>
      <div class="form-group">
        <label>CONTENIDO</label>
        <textarea id="ne-content" rows="6" style="width:100%;background:#111;color:#ddf;border:1px solid var(--border);padding:.5rem;resize:vertical">${news ? escHtml(news.content) : ''}</textarea>
      </div>
      <div class="form-group">
        <label>IMAGEN (opcional)</label>
        ${news?.image ? `<img src="${news.image}" class="preview-img" id="preview-news-img">` : `<div class="preview-img preview-empty" id="preview-news-img">SIN IMAGEN</div>`}
        <input type="file" id="ne-img" accept="image/*" onchange="previewUpload('ne-img','preview-news-img',800,500)">
      </div>
      <div class="admin-btns">
        <button class="btn-primary" onclick="saveNews('${newsId||''}')">💾 GUARDAR</button>
      </div>
    </div>
  `;
}

async function saveNews(newsId) {
  const title = document.getElementById('ne-title').value.trim();
  const content = document.getElementById('ne-content').value.trim();
  if (!title) { alert('El título es obligatorio.'); return; }

  const imgInput = document.getElementById('ne-img');
  const image = imgInput.dataset.resized || null;

  const data = getData();
  if (newsId) {
    const n = data.news.find(x => x.id === newsId);
    if (n) { n.title = title; n.content = content; if (image) n.image = image; }
  } else {
    data.news.push({ id: createId(), title, content, image, date: new Date().toISOString() });
  }

  if (saveData(data)) {
    alert('✅ Noticia guardada.');
    document.getElementById('admin-tab-content').innerHTML = renderAdminNews();
    renderView(currentView);
  }
}

function deleteNews(newsId) {
  if (!confirm('¿Eliminar esta noticia?')) return;
  const data = getData();
  data.news = data.news.filter(n => n.id !== newsId);
  saveData(data);
  document.getElementById('admin-tab-content').innerHTML = renderAdminNews();
  renderView(currentView);
}

