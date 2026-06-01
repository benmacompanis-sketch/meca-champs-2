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
      <button class="admin-tab" data-atab="copa">COPA MC2</button>
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
        atab === 'copa'    ? renderAdminCopa()    :
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
          <label>VALORACIÓN GENERAL (OVR)</label>
          <input type="number" id="te-rating" min="1" max="99" value="${team.rating}">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>PRESIDENTE — Nombre</label>
          <input type="text" id="te-pres-name" value="${escHtml(teamPresident(team).name)}" placeholder="Nombre del presidente">
          <label style="margin-top:.5rem">PRESIDENTE — Foto</label>
          ${teamPresident(team).photo
            ? `<img src="${teamPresident(team).photo}" class="preview-img" id="preview-pres">`
            : `<div class="preview-img preview-empty" id="preview-pres">SIN FOTO</div>`}
          <input type="file" id="te-pres-photo" accept="image/*" onchange="previewUpload('te-pres-photo','preview-pres',300,400)">
        </div>
        <div class="form-group">
          <label>DT — Nombre</label>
          <input type="text" id="te-dt-name" value="${escHtml(teamDT(team).name)}" placeholder="Nombre del DT">
          <label style="margin-top:.5rem">DT — Media (OVR)</label>
          <input type="number" id="te-dt-rating" min="1" max="99" value="${teamDT(team).rating || 70}">
          <label style="margin-top:.5rem">DT — Foto</label>
          ${teamDT(team).photo
            ? `<img src="${teamDT(team).photo}" class="preview-img" id="preview-dt">`
            : `<div class="preview-img preview-empty" id="preview-dt">SIN FOTO</div>`}
          <input type="file" id="te-dt-photo" accept="image/*" onchange="previewUpload('te-dt-photo','preview-dt',300,400)">
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
  team.name   = document.getElementById('te-name').value.trim() || team.name;
  team.rating = parseInt(document.getElementById('te-rating').value) || team.rating;

  const pres = teamPresident(team);
  pres.name = document.getElementById('te-pres-name').value.trim();
  const presPhoto = document.getElementById('te-pres-photo');
  if (presPhoto?.dataset.resized) pres.photo = presPhoto.dataset.resized;
  team.president = pres;

  const dt = teamDT(team);
  dt.name   = document.getElementById('te-dt-name').value.trim();
  dt.rating = parseInt(document.getElementById('te-dt-rating').value) || dt.rating;
  const dtPhoto = document.getElementById('te-dt-photo');
  if (dtPhoto?.dataset.resized) dt.photo = dtPhoto.dataset.resized;
  team.dt = dt;

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
  const newPlayer = { id: createId(), name: 'Jugador', photo: null, position: 'DEL', rating: 70, age: 20, country: '' };
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
            <optgroup label="Portero">
              <option value="POR" ${player.position==='POR'?'selected':''}>POR — Portero</option>
            </optgroup>
            <optgroup label="Defensa">
              <option value="DFC" ${player.position==='DFC'?'selected':''}>DFC — Defensor Central</option>
              <option value="LD"  ${player.position==='LD' ?'selected':''}>LD — Lateral Derecho</option>
              <option value="LI"  ${player.position==='LI' ?'selected':''}>LI — Lateral Izquierdo</option>
            </optgroup>
            <optgroup label="Mediocampo">
              <option value="MCD" ${player.position==='MCD'?'selected':''}>MCD — Mediocampista Defensivo</option>
              <option value="MC"  ${player.position==='MC' ?'selected':''}>MC — Mediocampista Central</option>
              <option value="MD"  ${player.position==='MD' ?'selected':''}>MD — Mediocampista Derecho</option>
              <option value="MI"  ${player.position==='MI' ?'selected':''}>MI — Mediocampista Izquierdo</option>
              <option value="MCO" ${player.position==='MCO'?'selected':''}>MCO — Mediocampista Ofensivo</option>
            </optgroup>
            <optgroup label="Ataque">
              <option value="ED"  ${player.position==='ED' ?'selected':''}>ED — Extremo Derecho</option>
              <option value="EI"  ${player.position==='EI' ?'selected':''}>EI — Extremo Izquierdo</option>
              <option value="SD"  ${player.position==='SD' ?'selected':''}>SD — Segunda Delantera</option>
              <option value="DC"  ${player.position==='DC' ?'selected':''}>DC — Delantero Centro</option>
            </optgroup>
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
        <div class="form-group">
          <label>PAÍS DE ORIGEN</label>
          <input type="text" id="pl-country" value="${escHtml(player.country||'')}" placeholder="Ej: Argentina">
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

  player.name    = document.getElementById('pl-name').value.trim() || player.name;
  player.position = document.getElementById('pl-pos').value;
  player.age     = parseInt(document.getElementById('pl-age').value) || player.age;
  player.rating  = parseInt(document.getElementById('pl-rating').value) || player.rating;
  player.country = document.getElementById('pl-country').value.trim();

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

// ===== ADMIN: COPA DRAW =====
function renderAdminCopa() {
  const data = getData();
  const allTeams = [...data.teams.primera, ...data.teams.segunda];
  const copa = data.matches.copa;

  const teamGroup = {};
  for (const g of copa.groups)
    for (const tid of g.teamIds)
      teamGroup[tid] = g.id;

  const hasResults = copa.groups.some(g => g.matches.some(m => m.played)) ||
                     copa.knockout.flat().some(m => m.played);

  const groupColors = { A: '#0055ff', B: '#00cc55', C: '#ff9900', D: '#cc00cc' };

  const teamsHtml = allTeams.map(t => {
    const assigned = teamGroup[t.id] || '';
    const color = assigned ? groupColors[assigned] : 'var(--border2)';
    return `
      <div class="copa-draw-row" id="cdr-${t.id}" style="border-left:3px solid ${color}">
        <div class="cdr-info">
          ${t.shield ? `<img src="${t.shield}" class="grp-shield" alt="">` : `<div class="bk-ini">${t.name.charAt(0)}</div>`}
          <span>${escHtml(t.name)}</span>
          <span class="cdr-div">${t.division === 'primera' ? '1ra' : '2da'}</span>
        </div>
        <select class="cdr-sel" id="cg-${t.id}" onchange="updateDrawRowColor('${t.id}')">
          <option value="">— Sin grupo</option>
          ${['A','B','C','D'].map(g =>
            `<option value="${g}" ${assigned === g ? 'selected' : ''}>${g}</option>`
          ).join('')}
        </select>
      </div>`;
  }).join('');

  return `
    <div class="admin-section">
      <div class="admin-section-header">
        <span>SORTEO GRUPOS · COPA MC2</span>
        <button class="btn-primary btn-sm" onclick="randomizeCopaGroups()">🎲 ALEATORIO</button>
      </div>
      ${hasResults ? `<div class="admin-warning"><small>⚠ Ya hay resultados cargados en la Copa. Cambiar grupos borrará todos los resultados de la Copa.</small></div>` : ''}
      <div class="copa-draw-legend">
        ${['A','B','C','D'].map(g => `<span class="cdl-tag" style="background:${groupColors[g]}">GR. ${g} <span class="cdl-count" id="cdl-${g}">0</span></span>`).join('')}
        <span class="cdl-tag" style="background:var(--border2)">SIN GRUPO <span class="cdl-count" id="cdl-none">0</span></span>
      </div>
      <div class="copa-draw-list" id="copa-draw-list">${teamsHtml}</div>
      <div id="copa-draw-msg"></div>
      <div class="admin-btns" style="margin-top:1rem">
        <button class="btn-primary" onclick="saveCopaGroups()">💾 GUARDAR GRUPOS</button>
      </div>
    </div>
  `;
}

function updateDrawRowColor(teamId) {
  const sel = document.getElementById(`cg-${teamId}`);
  const row = document.getElementById(`cdr-${teamId}`);
  const colors = { A: '#0055ff', B: '#00cc55', C: '#ff9900', D: '#cc00cc', '': 'var(--border2)' };
  if (row && sel) row.style.borderLeftColor = colors[sel.value] || 'var(--border2)';
  updateDrawCounts();
}

function updateDrawCounts() {
  const data = getData();
  const allTeams = [...data.teams.primera, ...data.teams.segunda];
  const counts = { A:0, B:0, C:0, D:0, none:0 };
  for (const t of allTeams) {
    const v = document.getElementById(`cg-${t.id}`)?.value || '';
    if (counts[v] !== undefined) counts[v]++;
    else counts.none++;
  }
  for (const g of ['A','B','C','D']) {
    const el = document.getElementById(`cdl-${g}`);
    if (el) el.textContent = counts[g];
  }
  const noneEl = document.getElementById('cdl-none');
  if (noneEl) noneEl.textContent = counts.none;
}

function randomizeCopaGroups() {
  const data = getData();
  const allTeams = [...data.teams.primera, ...data.teams.segunda];
  const ids = shuffle(allTeams.map(t => t.id));
  const labels = ['A','B','C','D'];
  ids.forEach((tid, i) => {
    const sel = document.getElementById(`cg-${tid}`);
    if (sel) { sel.value = labels[Math.floor(i / 5)]; updateDrawRowColor(tid); }
  });
  updateDrawCounts();
}

function saveCopaGroups() {
  const data = getData();
  const allTeams = [...data.teams.primera, ...data.teams.segunda];
  const groupMap = { A:[], B:[], C:[], D:[] };

  for (const t of allTeams) {
    const g = document.getElementById(`cg-${t.id}`)?.value;
    if (g && groupMap[g]) groupMap[g].push(t.id);
  }

  const wrong = ['A','B','C','D'].filter(g => groupMap[g].length !== 5);
  const msg = document.getElementById('copa-draw-msg');
  if (wrong.length) {
    const detail = ['A','B','C','D'].map(g => `Grupo ${g}: ${groupMap[g].length}/5`).join('  ·  ');
    if (msg) msg.innerHTML = `<div style="color:var(--red);padding:.5rem 0;font-size:.82rem">⚠ Cada grupo necesita exactamente 5 equipos.&nbsp;&nbsp;${detail}</div>`;
    return;
  }

  data.matches.copa = generateCopaWithGroups(groupMap);
  if (saveData(data)) {
    if (msg) msg.innerHTML = '';
    alert('✅ Grupos guardados. Copa regenerada.');
    document.getElementById('admin-tab-content').innerHTML = renderAdminCopa();
    renderView(currentView);
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
  const sel = document.getElementById('match-round');
  if (!sel) return;
  if (tournament === 'copa') {
    const copa = data.matches.copa;
    sel.innerHTML = [
      ...copa.groups.map(g => `<option value="group_${g.id}">Grupo ${g.id}</option>`),
      `<option value="knockout_0">Cuartos de Final</option>`,
      `<option value="knockout_1">Semifinal</option>`,
      `<option value="knockout_2">Gran Final</option>`,
      `<option value="knockout_3">Tercer Lugar</option>`,
    ].join('');
  } else {
    const rounds = data.matches[tournament];
    sel.innerHTML = rounds.map((r, i) => {
      const leg = r[0]?.leg === 'vuelta' ? 'V' : 'I';
      return `<option value="${i}">${leg} - Fecha ${r[0]?.round ?? i+1}</option>`;
    }).join('');
  }
  loadAdminMatches();
}

function loadAdminMatches() {
  const tournament = document.getElementById('match-tournament')?.value;
  const roundVal = document.getElementById('match-round')?.value;
  if (!tournament || !roundVal) return;
  const data = getData();
  let round;
  if (tournament === 'copa') {
    const copa = data.matches.copa;
    if (roundVal.startsWith('group_')) {
      const gId = roundVal.replace('group_', '');
      round = copa.groups.find(g => g.id === gId)?.matches || [];
    } else {
      const idx = parseInt(roundVal.replace('knockout_', ''));
      round = copa.knockout[idx] || [];
    }
  } else {
    round = data.matches[tournament][parseInt(roundVal)] || [];
  }
  if (!round) return;

  const el = document.getElementById('admin-matches-list');
  if (!el) return;
  el.innerHTML = round.map(match => {
    const home = match.homeTeamId ? getTeamById(match.homeTeamId) : null;
    const away = match.awayTeamId ? getTeamById(match.awayTeamId) : null;

    if (match.pending || !home || !away) {
      const hn = home ? escHtml(home.name) : '(A definir)';
      const an = away ? escHtml(away.name) : '(A definir)';
      return `
        <div class="admin-match-row admin-match-tbd">
          <span class="amr-home">${hn}</span>
          <span class="amr-score">vs</span>
          <span class="amr-away">${an}</span>
          <span class="amr-pending">PENDIENTE</span>
        </div>
      `;
    }

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
  if (tournament === 'copa') {
    const copa = data.matches.copa;
    for (const g of copa.groups)
      for (const m of g.matches)
        if (m.id === matchId) return m;
    for (const round of copa.knockout)
      for (const m of round)
        if (m.id === matchId) return m;
    return null;
  }
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
  const setResult = m => { m.played = true; m.homeScore = homeScore; m.awayScore = awayScore; m.events = events; };
  if (tournament === 'copa') {
    const copa = data.matches.copa;
    let found = false;
    for (const g of copa.groups) { for (const m of g.matches) { if (m.id === matchId) { setResult(m); found = true; break; } } if (found) break; }
    if (!found) for (const round of copa.knockout) { for (const m of round) { if (m.id === matchId) { setResult(m); found = true; break; } } if (found) break; }
    advanceCupKnockout(data);
    saveData(data);
  } else {
    for (const round of data.matches[tournament])
      for (const m of round)
        if (m.id === matchId) { setResult(m); break; }
    saveData(data);
  }

  alert('✅ Resultado guardado. Tablas actualizadas.');
  document.getElementById('match-result-editor').innerHTML = '';
  loadAdminMatches();
  renderView(currentView);
}

function clearMatchResult(tournament, matchId) {
  if (!confirm('¿Borrar el resultado de este partido?')) return;
  const data = getData();
  const clearResult = m => { m.played = false; m.homeScore = null; m.awayScore = null; m.events = []; };
  if (tournament === 'copa') {
    const copa = data.matches.copa;
    let found = false;
    for (const g of copa.groups) { for (const m of g.matches) { if (m.id === matchId) { clearResult(m); found = true; break; } } if (found) break; }
    if (!found) for (const round of copa.knockout) { for (const m of round) { if (m.id === matchId) { clearResult(m); found = true; break; } } if (found) break; }
    advanceCupKnockout(data);
  } else {
    for (const round of data.matches[tournament])
      for (const m of round)
        if (m.id === matchId) { clearResult(m); break; }
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

