// ==================== MAIN APPLICATION ====================
let currentView = 'home';
let currentTournamentTab = 'standings';
let isAdmin = false;

const TOURNAMENT_NAMES = {
  primera: 'Primera División',
  segunda: 'Segunda División',
  copa: 'Copa MC2'
};


function navigate(view, extra) {
  currentView = view;
  currentTournamentTab = 'standings';
  renderView(view, extra);
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.view === view);
  });
  window.scrollTo(0, 0);
  if (window.innerWidth <= 768) {
    document.getElementById('nav-links').classList.remove('open');
  }
}

function renderView(view, extra) {
  const main = document.getElementById('main-content');
  if (view === 'home')           main.innerHTML = renderHome();
  else if (view === 'primera')   main.innerHTML = renderTournament('primera');
  else if (view === 'segunda')   main.innerHTML = renderTournament('segunda');
  else if (view === 'copa')      main.innerHTML = renderCopa();
  else if (view === 'equipos')   main.innerHTML = renderEquipos();
  else if (view === 'team')      main.innerHTML = renderTeamPage(extra);
  bindTabEvents();
}

// ===== HOME / NEWS =====
function renderHome() {
  const data = getData();
  const news = [...data.news].reverse();
  const featuredStats = getFeaturedStats();
  return `
    <div class="hero-section">
      <div class="hero-logo">
        <img src="assets/logo.png" alt="Meca Champs 2" class="hero-logo-img">
        <p class="hero-sub">EL TORNEO DEFINITIVO · TEMPORADA 2</p>
      </div>
      <div class="hero-cards">
        <div class="stat-card">
          <span class="sc-num">${data.teams.primera.length + data.teams.segunda.length}</span>
          <span class="sc-label">EQUIPOS</span>
        </div>
        <div class="stat-card">
          <span class="sc-num">3</span>
          <span class="sc-label">TORNEOS</span>
        </div>
        <div class="stat-card">
          <span class="sc-num">${countPlayedMatches()}</span>
          <span class="sc-label">PARTIDOS JUG.</span>
        </div>
        <div class="stat-card">
          <span class="sc-num">${countTotalGoals()}</span>
          <span class="sc-label">GOLES</span>
        </div>
      </div>
    </div>

    <div class="section-title-bar"><span>NOTICIAS</span></div>
    <div class="news-grid">
      ${news.length === 0
        ? '<div class="empty-state">No hay noticias aún.</div>'
        : news.map(n => `
          <article class="news-card" onclick="openNewsModal('${n.id}')">
            ${n.image ? `<div class="news-img"><img src="${n.image}" alt="${escHtml(n.title)}"></div>` : '<div class="news-img news-no-img"><span>MC2</span></div>'}
            <div class="news-body">
              <span class="news-date">${formatDate(n.date)}</span>
              <h3>${escHtml(n.title)}</h3>
              <p>${escHtml(n.content).substring(0, 120)}${n.content.length > 120 ? '...' : ''}</p>
            </div>
          </article>
        `).join('')}
    </div>

    <div class="home-standings-preview">
      <div class="section-title-bar"><span>LIDERES · PRIMERA DIVISIÓN</span></div>
      ${renderStandingsTable('primera', 3)}
      <div class="section-title-bar" style="margin-top:2rem"><span>LIDERES · SEGUNDA DIVISIÓN</span></div>
      ${renderStandingsTable('segunda', 3)}
    </div>

    <div id="news-modal" class="modal hidden">
      <div class="modal-overlay" onclick="closeNewsModal()"></div>
      <div class="modal-box" id="news-modal-box"></div>
    </div>
  `;
}

function countPlayedMatches() {
  const data = getData();
  let c = 0;
  for (const t of ['primera','segunda','copa'])
    for (const r of data.matches[t])
      for (const m of r) if (m.played) c++;
  return c;
}

function countTotalGoals() {
  const data = getData();
  let g = 0;
  for (const t of ['primera','segunda','copa'])
    for (const r of data.matches[t])
      for (const m of r) if (m.played) g += (m.homeScore||0) + (m.awayScore||0);
  return g;
}

function getFeaturedStats() { return {}; }

function openNewsModal(id) {
  const data = getData();
  const n = data.news.find(x => x.id === id);
  if (!n) return;
  document.getElementById('news-modal-box').innerHTML = `
    <button class="modal-close" onclick="closeNewsModal()">✕</button>
    ${n.image ? `<img src="${n.image}" alt="${escHtml(n.title)}" style="width:100%;border-radius:4px;margin-bottom:1rem">` : ''}
    <span class="news-date">${formatDate(n.date)}</span>
    <h2 style="margin:.5rem 0 1rem;color:var(--cyan)">${escHtml(n.title)}</h2>
    <p style="white-space:pre-wrap;line-height:1.7">${escHtml(n.content)}</p>
  `;
  document.getElementById('news-modal').classList.remove('hidden');
}

function closeNewsModal() {
  document.getElementById('news-modal').classList.add('hidden');
}

// ===== TOURNAMENT VIEW =====
function renderTournament(tournament) {
  const name = TOURNAMENT_NAMES[tournament];
  return `
    <div class="section-title-bar"><span>${name.toUpperCase()}</span></div>
    <div class="tournament-tabs">
      <button class="ttab active" data-tab="standings" data-tournament="${tournament}">TABLA</button>
      <button class="ttab" data-tab="fixtures" data-tournament="${tournament}">FIXTURE</button>
      <button class="ttab" data-tab="stats" data-tournament="${tournament}">ESTADÍSTICAS</button>
    </div>
    <div id="tournament-content">
      ${renderTournamentTab(tournament, 'standings')}
    </div>
  `;
}

// ===== COPA MC2 (GROUPS + KNOCKOUT) =====
function renderCopa() {
  return `
    <div class="section-title-bar"><span>COPA MC2</span></div>
    <div class="tournament-tabs">
      <button class="ttab active" data-tab="grupos"       data-tournament="copa">GRUPOS</button>
      <button class="ttab"        data-tab="eliminatoria" data-tournament="copa">ELIMINATORIA</button>
      <button class="ttab"        data-tab="stats"        data-tournament="copa">ESTADÍSTICAS</button>
    </div>
    <div id="tournament-content">
      ${renderCupGroups()}
    </div>
  `;
}

function renderCupGroups() {
  const copa = getData().matches.copa;
  return copa.groups.map(group => {
    const standings = computeGroupStandings(group);
    const tableHtml = `
      <table class="grp-table">
        <thead><tr>
          <th class="grp-th-team">Equipo</th>
          <th>PJ</th><th>PG</th><th>PE</th><th>PP</th>
          <th>GF</th><th>GC</th><th>DG</th><th class="grp-pts-hd">PTS</th>
        </tr></thead>
        <tbody>${standings.map((s, i) => {
          const team = getTeamById(s.teamId);
          return `<tr class="${i < 2 ? 'grp-qualify' : ''}">
            <td><div class="grp-team-cell">
              ${team?.shield ? `<img src="${team.shield}" class="grp-shield" alt="">` : `<div class="bk-ini">${team?.name?.charAt(0)||'?'}</div>`}
              <a class="team-link" onclick="navigate('team','${s.teamId}')">${escHtml(team?.name||'?')}</a>
            </div></td>
            <td>${s.pj}</td><td>${s.pg}</td><td>${s.pe}</td><td>${s.pp}</td>
            <td>${s.gf}</td><td>${s.gc}</td>
            <td>${s.dg > 0 ? '+' + s.dg : s.dg}</td>
            <td class="grp-pts">${s.pts}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>`;
    const matchesHtml = group.matches.map(m => {
      const home = getTeamById(m.homeTeamId), away = getTeamById(m.awayTeamId);
      return `<div class="fixture-match ${m.played ? 'fm-played' : ''}">
        <div class="fm-team fm-home">
          ${home?.shield ? `<img src="${home.shield}" class="fm-shield" alt="">` : ''}
          <span>${escHtml(home?.name||'?')}</span>
        </div>
        <div class="fm-score">${m.played ? `${m.homeScore} - ${m.awayScore}` : 'vs'}</div>
        <div class="fm-team fm-away">
          <span>${escHtml(away?.name||'?')}</span>
          ${away?.shield ? `<img src="${away.shield}" class="fm-shield" alt="">` : ''}
        </div>
      </div>`;
    }).join('');
    return `<div class="grp-section">
      <div class="grp-header">GRUPO ${group.id} <span class="grp-qualify-note">· clasifican top 2</span></div>
      <div class="grp-body">
        <div class="grp-table-wrap">${tableHtml}</div>
        <div class="grp-matches-wrap">${matchesHtml}</div>
      </div>
    </div>`;
  }).join('');
}

function renderCupKnockout() {
  const copa = getData().matches.copa;
  const knockout = copa.knockout; // [qf[4], sf[2], final[1], third[1]]
  const flatK = knockout.flat();

  function bkTeamRow(team, fromGroup, fromPos, fromTie, fromLoser, isWin, score, played) {
    if (team) {
      const shield = team.shield
        ? `<img src="${team.shield}" class="bk-shield" alt="">`
        : `<div class="bk-ini">${team.name.charAt(0)}</div>`;
      return `<div class="bk-team ${isWin ? 'bk-win' : played ? 'bk-lose' : ''}">
        ${shield}<span class="bk-name">${escHtml(team.name)}</span>
        ${played ? `<span class="bk-sc ${isWin ? 'bk-sc-win' : ''}">${score}</span>` : ''}
      </div>`;
    }
    let label = 'A definir';
    if (fromGroup) {
      label = `${fromPos === 1 ? '1°' : '2°'} Grupo ${fromGroup}`;
    } else if (fromTie) {
      const src = flatK.find(m => m.tieId === fromTie);
      const t1 = src?.homeTeamId ? getTeamById(src.homeTeamId) : null;
      const t2 = src?.awayTeamId ? getTeamById(src.awayTeamId) : null;
      if (t1 && t2) label = `Gan. ${escHtml(t1.name)} / ${escHtml(t2.name)}`;
    } else if (fromLoser) {
      const src = flatK.find(m => m.tieId === fromLoser);
      const t1 = src?.homeTeamId ? getTeamById(src.homeTeamId) : null;
      const t2 = src?.awayTeamId ? getTeamById(src.awayTeamId) : null;
      if (t1 && t2) label = `Perd. ${escHtml(t1.name)} / ${escHtml(t2.name)}`;
    }
    return `<div class="bk-team bk-tbd"><span class="bk-name bk-tbd-txt">${label}</span></div>`;
  }

  function bkMatch(m) {
    const home = m.homeTeamId ? getTeamById(m.homeTeamId) : null;
    const away = m.awayTeamId ? getTeamById(m.awayTeamId) : null;
    const p = m.played, hW = p && m.homeScore > m.awayScore, aW = p && m.awayScore > m.homeScore;
    const isDraw = p && m.homeScore === m.awayScore;
    return `<div class="bk-match ${isDraw ? 'bk-draw' : ''}">
      ${bkTeamRow(home, m.homeFromGroup, m.homeFromPos, m.homeFromTie, m.homeFromLoser, hW, m.homeScore, p)}
      <div class="bk-sep"></div>
      ${bkTeamRow(away, m.awayFromGroup, m.awayFromPos, m.awayFromTie, m.awayFromLoser, aW, m.awayScore, p)}
      ${isDraw ? '<div class="bk-draw-note">⚠ Empate</div>' : ''}
    </div>`;
  }

  const [qf, semis, final_, third] = knockout;
  const finalWinner = final_[0]?.played
    ? getTeamById(final_[0].homeScore > final_[0].awayScore ? final_[0].homeTeamId : final_[0].awayTeamId)
    : null;
  const thirdWinner = third[0]?.played
    ? getTeamById(third[0].homeScore > third[0].awayScore ? third[0].homeTeamId : third[0].awayTeamId)
    : null;

  const qfCol = `<div class="bk-col bk-col-r1">
    <div class="bk-col-hdr">CUARTOS DE FINAL</div>
    <div class="bk-col-body">
      <div class="bk-pair">
        <div class="bk-slot">${bkMatch(qf[0])}</div>
        <div class="bk-slot">${bkMatch(qf[1])}</div>
      </div>
      <div class="bk-pair">
        <div class="bk-slot">${bkMatch(qf[2])}</div>
        <div class="bk-slot">${bkMatch(qf[3])}</div>
      </div>
    </div>
  </div>`;

  const sfCol = `<div class="bk-col bk-col-r2">
    <div class="bk-col-hdr">SEMIFINAL</div>
    <div class="bk-col-body">
      <div class="bk-pair">
        <div class="bk-slot">${bkMatch(semis[0])}</div>
        <div class="bk-slot">${bkMatch(semis[1])}</div>
      </div>
    </div>
  </div>`;

  const finalCol = `<div class="bk-col bk-col-semis">
    <div class="bk-col-hdr">🏆 FINAL</div>
    <div class="bk-col-body">
      <div class="bk-pair bk-pair-final">
        <div class="bk-slot">${bkMatch(final_[0])}</div>
      </div>
    </div>
  </div>`;

  const winnerCol = finalWinner ? `<div class="bk-col bk-col-winner">
    <div class="bk-col-hdr">&nbsp;</div>
    <div class="bk-col-body">
      <div class="bk-pair bk-pair-final">
        <div class="bk-slot bk-slot-winner">
          <div class="bk-award">🥇</div>
          ${finalWinner.shield ? `<img src="${finalWinner.shield}" class="bk-award-shield" alt="">` : `<div class="bk-ini bk-ini-lg">${finalWinner.name.charAt(0)}</div>`}
          <div class="bk-award-name">${escHtml(finalWinner.name)}</div>
        </div>
      </div>
    </div>
  </div>` : '';

  const thirdSection = `<div class="bk-bronze-wrap">
    <div class="bk-bronze-title">🥉 TERCER LUGAR</div>
    <div class="bk-bronze-track">
      <div class="bk-col bk-col-br2">
        <div class="bk-col-hdr">PARTIDO POR 3°</div>
        <div class="bk-col-body">
          <div class="bk-pair bk-pair-final">
            <div class="bk-slot">${bkMatch(third[0])}</div>
          </div>
        </div>
      </div>
      ${thirdWinner ? `<div class="bk-col bk-col-winner">
        <div class="bk-col-hdr">&nbsp;</div>
        <div class="bk-col-body">
          <div class="bk-pair bk-pair-final">
            <div class="bk-slot bk-slot-winner bk-slot-bronze">
              <div class="bk-award">🥉</div>
              ${thirdWinner.shield ? `<img src="${thirdWinner.shield}" class="bk-award-shield" alt="">` : `<div class="bk-ini bk-ini-lg">${thirdWinner.name.charAt(0)}</div>`}
              <div class="bk-award-name">${escHtml(thirdWinner.name)}</div>
            </div>
          </div>
        </div>
      </div>` : ''}
    </div>
  </div>`;

  return `<div class="bracket-wrap">
    <div class="bracket-track">${qfCol}${sfCol}${finalCol}${winnerCol}</div>
    ${thirdSection}
  </div>`;
}


function bindTabEvents() {
  document.querySelectorAll('.ttab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tournament = btn.dataset.tournament;
      const tab = btn.dataset.tab;
      document.querySelectorAll('.ttab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tournament-content').innerHTML = renderTournamentTab(tournament, tab);
      bindFixtureFilters();
    });
  });
  bindFixtureFilters();
}

function renderTournamentTab(tournament, tab) {
  if (tournament === 'copa') {
    if (tab === 'grupos')       return renderCupGroups();
    if (tab === 'eliminatoria') return renderCupKnockout();
    if (tab === 'stats')        return renderStatsSection('copa');
    return renderCupGroups();
  }
  if (tab === 'standings') return renderStandingsSection(tournament);
  if (tab === 'fixtures')  return renderFixturesSection(tournament);
  if (tab === 'stats')     return renderStatsSection(tournament);
  return '';
}

// ===== STANDINGS =====
function renderStandingsSection(tournament) {
  return `
    <div class="standings-wrap">
      ${renderStandingsTable(tournament, 0)}
      ${tournament === 'primera' || tournament === 'segunda' ? renderLegend(tournament) : ''}
    </div>
  `;
}

function renderStandingsTable(tournament, limit) {
  const standings = computeStandings(tournament);
  const rows = limit > 0 ? standings.slice(0, limit) : standings;
  const total = standings.length;

  return `
    <div class="table-container">
      <table class="standings-table">
        <thead>
          <tr>
            <th class="pos-col">#</th>
            <th class="team-col">EQUIPO</th>
            <th>PJ</th><th>PG</th><th>PE</th><th>PP</th>
            <th>GF</th><th>GC</th><th>DG</th><th class="pts-col">PTS</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((s, i) => {
            const pos = standings.indexOf(s) + 1;
            const cls = getRowClass(pos, tournament, total);
            return `
              <tr class="${cls}">
                <td class="pos-col"><span class="pos-badge">${pos}</span></td>
                <td class="team-col">
                  <a class="team-link" onclick="navigate('team','${s.team.id}')">
                    ${s.team.shield
                      ? `<img src="${s.team.shield}" class="team-shield-sm" alt="">`
                      : `<div class="shield-placeholder-sm">${s.team.name.charAt(0)}</div>`}
                    <span>${escHtml(s.team.name)}</span>
                  </a>
                </td>
                <td>${s.pj}</td><td>${s.pg}</td><td>${s.pe}</td><td>${s.pp}</td>
                <td>${s.gf}</td><td>${s.gc}</td>
                <td class="${s.dg > 0 ? 'dg-pos' : s.dg < 0 ? 'dg-neg' : ''}">${s.dg > 0 ? '+' : ''}${s.dg}</td>
                <td class="pts-col"><strong>${s.pts}</strong></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
    ${limit > 0 && standings.length > limit ? `<a class="view-all-link" onclick="navigate('${tournament}')">Ver tabla completa →</a>` : ''}
  `;
}

function getRowClass(pos, tournament, total) {
  if (tournament === 'primera') {
    if (pos === 1) return 'row-champion';
    if (pos >= total - 1) return 'row-relegation';
  }
  if (tournament === 'segunda') {
    if (pos === 1) return 'row-champion';
    if (pos === 2) return 'row-promotion';
  }
  if (tournament === 'copa') {
    if (pos === 1) return 'row-champion';
  }
  return '';
}

function renderLegend(tournament) {
  let items = [];
  if (tournament === 'primera') {
    items = [
      { cls: 'row-champion', text: 'Campeón' },
      { cls: 'row-relegation', text: 'Descienden' }
    ];
  } else {
    items = [
      { cls: 'row-champion', text: 'Campeón' },
      { cls: 'row-promotion', text: 'Asciende a 1ra' }
    ];
  }
  return `
    <div class="legend">
      ${items.map(it => `<div class="legend-item"><span class="legend-dot ${it.cls}"></span>${it.text}</div>`).join('')}
    </div>
  `;
}

// ===== FIXTURES =====
function renderFixturesSection(tournament) {
  const data = getData();
  const rounds = data.matches[tournament];
  if (!rounds || rounds.length === 0) return '<div class="empty-state">No hay fixture generado.</div>';

  const maxRound = rounds.length;
  const half = maxRound / 2;

  return `
    <div class="fixture-controls">
      <div class="leg-tabs">
        <button class="leg-tab active" data-leg="all">TODAS</button>
        <button class="leg-tab" data-leg="ida">IDA</button>
        <button class="leg-tab" data-leg="vuelta">VUELTA</button>
      </div>
      <div class="round-jump">
        <label>FECHA:</label>
        <select id="round-select" onchange="jumpToRound(this.value)">
          ${rounds.map((r, i) => `<option value="${i}">${r[0]?.leg === 'vuelta' ? 'V' : 'I'} - Fecha ${r[0]?.round ?? i+1}</option>`).join('')}
        </select>
      </div>
    </div>
    <div id="fixture-list">
      ${rounds.map((round, ri) => renderRound(round, ri, tournament)).join('')}
    </div>
  `;
}

function renderRound(round, ri, tournament) {
  if (!round || round.length === 0) return '';
  const legLabel = round[0].leg === 'vuelta' ? 'VUELTA' : 'IDA';
  return `
    <div class="round-block" data-leg="${round[0].leg}" id="round-${ri}">
      <div class="round-header">
        <span class="round-leg">${legLabel}</span>
        <span class="round-num">FECHA ${round[0].round}</span>
      </div>
      ${round.map(match => renderMatchCard(match, tournament)).join('')}
    </div>
  `;
}

function renderMatchCard(match, tournament) {
  const home = getTeamById(match.homeTeamId);
  const away = getTeamById(match.awayTeamId);
  if (!home || !away) return '';

  const played = match.played;
  const scoreHtml = played
    ? `<div class="match-score">${match.homeScore} <span class="score-sep">-</span> ${match.awayScore}</div>`
    : `<div class="match-score-pending">VS</div>`;

  const allPlayers = [
    ...home.players.map(p => ({ ...p, teamId: home.id })),
    ...away.players.map(p => ({ ...p, teamId: away.id }))
  ];

  const evIconMap = { goal: '⚽', assist: '🎯', yellow: '🟨', red: '🟥' };
  const hasEvents = played && (match.events?.some(e => evIconMap[e.type]));

  const buildEventsHtml = (teamId, align) => {
    const evs = (match.events || []).filter(e => e.teamId === teamId && evIconMap[e.type]);
    const items = evs.map(e => {
      const p = allPlayers.find(x => x.id === e.playerId);
      const name = p ? p.name.split(' ')[0] : '?';
      return `<span class="me-item">${evIconMap[e.type]} ${escHtml(name)}${e.minute ? ` <small>${e.minute}'</small>` : ''}</span>`;
    }).join('');
    return `<div class="match-events ${align === 'right' ? 'me-right' : 'me-left'}">${items}</div>`;
  };

  return `
    <div class="match-card ${played ? 'match-played' : ''}">
      <div class="match-team home-team">
        ${home.shield
          ? `<img src="${home.shield}" class="match-shield" alt="">`
          : `<div class="shield-placeholder-md">${home.name.charAt(0)}</div>`}
        <span class="match-team-name">${escHtml(home.name)}</span>
      </div>
      ${scoreHtml}
      <div class="match-team away-team">
        <span class="match-team-name">${escHtml(away.name)}</span>
        ${away.shield
          ? `<img src="${away.shield}" class="match-shield" alt="">`
          : `<div class="shield-placeholder-md">${away.name.charAt(0)}</div>`}
      </div>
      ${hasEvents ? buildEventsHtml(match.homeTeamId, 'right') : ''}
      ${hasEvents ? '<div></div>' : ''}
      ${hasEvents ? buildEventsHtml(match.awayTeamId, 'left') : ''}
    </div>
  `;
}

function bindFixtureFilters() {
  document.querySelectorAll('.leg-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.leg-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const leg = btn.dataset.leg;
      document.querySelectorAll('.round-block').forEach(block => {
        block.style.display = (leg === 'all' || block.dataset.leg === leg) ? '' : 'none';
      });
    });
  });
}

function jumpToRound(index) {
  const el = document.getElementById(`round-${index}`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===== STATS =====
function renderStatsSection(tournament) {
  const stats = computePlayerStats(tournament);

  const makeTable = (title, field, icon) => {
    const sorted = [...stats].filter(s => s[field] > 0).sort((a,b) => b[field] - a[field]).slice(0,20);
    return `
      <div class="stats-block">
        <div class="stats-block-title">${icon} ${title}</div>
        ${sorted.length === 0
          ? '<div class="empty-state-sm">Sin datos aún</div>'
          : `<table class="stats-table">
              <thead><tr><th>#</th><th>JUGADOR</th><th>EQUIPO</th><th>${icon}</th></tr></thead>
              <tbody>
                ${sorted.map((s, i) => `
                  <tr>
                    <td>${i+1}</td>
                    <td>
                      <a class="player-link" onclick="navigate('team','${s.team.id}')">
                        ${s.player.photo
                          ? `<img src="${s.player.photo}" class="player-avatar-sm" alt="">`
                          : `<div class="avatar-placeholder-sm">${s.player.name.charAt(0)}</div>`}
                        ${escHtml(s.player.name)}
                      </a>
                    </td>
                    <td><a class="team-link-sm" onclick="navigate('team','${s.team.id}')">${escHtml(s.team.name)}</a></td>
                    <td><strong>${s[field]}</strong></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>`}
      </div>
    `;
  };

  return `
    <div class="stats-grid">
      ${makeTable('GOLEADORES', 'goals', '⚽')}
      ${makeTable('ASISTENCIAS', 'assists', '🎯')}
      ${makeTable('AMARILLAS', 'yellows', '🟨')}
      ${makeTable('ROJAS', 'reds', '🟥')}
    </div>
  `;
}

// ===== EQUIPOS =====
function renderEquipos() {
  const data = getData();
  const renderDiv = (teams, title) => `
    <div class="section-title-bar"><span>${title}</span></div>
    <div class="teams-grid">
      ${teams.map(t => `
        <div class="team-card" onclick="navigate('team','${t.id}')">
          <div class="team-card-shield">
            ${t.shield
              ? `<img src="${t.shield}" alt="${escHtml(t.name)}">`
              : `<div class="shield-placeholder-lg">${t.name.charAt(0)}</div>`}
          </div>
          <div class="team-card-info">
            <div class="team-card-name">${escHtml(t.name)}</div>
            <div class="team-card-rating">
              <span class="rating-badge">${t.rating}</span>
              <span class="rating-label">OVR</span>
            </div>
            ${t.president ? `<div class="team-card-pres">DT: ${escHtml(t.president)}</div>` : ''}
            <div class="team-card-players">${t.players.length} jugadores</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  return `
    ${renderDiv(data.teams.primera, 'PRIMERA DIVISIÓN')}
    ${renderDiv(data.teams.segunda, 'SEGUNDA DIVISIÓN')}
  `;
}

// ===== TEAM PAGE =====
function renderTeamPage(teamId) {
  const team = getTeamById(teamId);
  if (!team) return '<div class="empty-state">Equipo no encontrado.</div>';

  const divisionLabel = team.division === 'primera' ? 'Primera División' : 'Segunda División';

  const statsHtml = (() => {
    const st = computeStandings(team.division);
    const entry = st.find(s => s.team.id === teamId);
    if (!entry) return '';
    return `
      <div class="team-stats-row">
        <div class="tsr-item"><span>${entry.pj}</span>PJ</div>
        <div class="tsr-item"><span>${entry.pg}</span>PG</div>
        <div class="tsr-item"><span>${entry.pe}</span>PE</div>
        <div class="tsr-item"><span>${entry.pp}</span>PP</div>
        <div class="tsr-item"><span>${entry.gf}</span>GF</div>
        <div class="tsr-item"><span>${entry.gc}</span>GC</div>
        <div class="tsr-item"><span>${entry.dg > 0 ? '+' : ''}${entry.dg}</span>DG</div>
        <div class="tsr-item"><span>${entry.pts}</span>PTS</div>
      </div>
    `;
  })();

  const playersHtml = team.players.length === 0
    ? '<div class="empty-state-sm">No hay jugadores registrados.</div>'
    : `<div class="players-grid">
        ${team.players.map(p => `
          <div class="player-card">
            <div class="player-card-photo">
              ${p.photo
                ? `<img src="${p.photo}" alt="${escHtml(p.name)}">`
                : `<div class="player-photo-placeholder">${p.name.charAt(0)}</div>`}
              <span class="player-position-badge">${escHtml(p.position || 'JUG')}</span>
            </div>
            <div class="player-card-info">
              <div class="player-name">${escHtml(p.name)}</div>
              <div class="player-meta">${p.age ? p.age + ' años' : '—'}</div>
              <div class="player-rating-bar">
                <div class="prb-fill" style="width:${p.rating}%"></div>
              </div>
              <div class="player-rating-num">${p.rating} OVR</div>
            </div>
          </div>
        `).join('')}
      </div>`;

  const jerseyHtml = (team.jerseyHome || team.jerseyAway)
    ? `<div class="jersey-section">
        ${team.jerseyHome ? `<div class="jersey-item"><img src="${team.jerseyHome}" alt="Titular"><span>TITULAR</span></div>` : ''}
        ${team.jerseyAway ? `<div class="jersey-item"><img src="${team.jerseyAway}" alt="Suplente"><span>SUPLENTE</span></div>` : ''}
      </div>`
    : '';

  return `
    <div class="team-page">
      <div class="team-page-header">
        <div class="team-page-shield">
          ${team.shield
            ? `<img src="${team.shield}" alt="${escHtml(team.name)}">`
            : `<div class="shield-placeholder-xl">${team.name.charAt(0)}</div>`}
        </div>
        <div class="team-page-info">
          <div class="team-page-division">${divisionLabel}</div>
          <h1 class="team-page-name">${escHtml(team.name)}</h1>
          ${team.president ? `<div class="team-page-pres">🏆 ${escHtml(team.president)}</div>` : ''}
          <div class="team-page-rating">
            <span class="rating-big">${team.rating}</span><span class="rating-ovr-label">OVR</span>
          </div>
        </div>
      </div>

      ${statsHtml}
      ${jerseyHtml}

      <div class="section-title-bar" style="margin-top:2rem"><span>PLANTEL</span></div>
      ${playersHtml}
    </div>
  `;
}

// ===== UTILITIES =====
function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-AR', { day:'2-digit', month:'short', year:'numeric' });
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  navigate('home');

  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      navigate(link.dataset.view);
    });
  });
});
