/**
 * TIC-TAC-TOE PRO — script.js
 * Features: PvP / PvAI, Easy/Medium/Hard (Minimax), Score tracking,
 *           Move history, Undo, Turn timer, Confetti, Dark/Light theme,
 *           Player name customisation, Stats modal, LocalStorage persistence.
 */

'use strict';

/* =====================================================
   CONSTANTS & STATE
   ===================================================== */

const WIN_COMBOS = [
  [0,1,2],[3,4,5],[6,7,8], // rows
  [0,3,6],[1,4,7],[2,5,8], // cols
  [0,4,8],[2,4,6]          // diagonals
];

const WIN_QUIPS = {
  win:  ['Magnificent!','Brilliant!','Flawless!','You crushed it!','Unstoppable!'],
  draw: ['So close!','Great minds…','Perfectly balanced!','No winner this time!','Call it a tie!']
};

let state = {
  board:       Array(9).fill(null),   // null | 'X' | 'O'
  current:     'X',
  mode:        'pvp',                 // 'pvp' | 'pva'
  difficulty:  'hard',               // 'easy' | 'medium' | 'hard'
  gameOver:    false,
  scores:      { X:0, O:0, draw:0 },
  totalGames:  0,
  history:     [],                    // [{player, cell, board}]
  nameX:       'Player X',
  nameO:       'Player O',
  timerEnabled:false,
  timerSecs:   15,
  timerHandle: null,
  timerLeft:   15,
};

/* =====================================================
   DOM REFERENCES
   ===================================================== */

const $ = id => document.getElementById(id);

const DOM = {
  board:        $('board'),
  statusText:   $('status-text'),
  statusInd:    $('status-indicator'),
  scoreX:       $('score-x'),
  scoreO:       $('score-o'),
  scoreDraw:    $('score-draw'),
  scoreLabelX:  $('score-label-x'),
  scoreLabelO:  $('score-label-o'),
  themeToggle:  $('theme-toggle'),
  themeIcon:    document.querySelector('.theme-icon'),
  modeSelector: $('mode-selector'),
  diffSelector: $('difficulty-selector'),
  diffBar:      $('difficulty-selector'),
  nameX:        $('name-x'),
  nameO:        $('name-o'),
  moveList:     $('move-list'),
  undoBtn:      $('undo-btn'),
  newGameBtn:   $('new-game-btn'),
  restartBtn:   $('restart-btn'),
  resetScores:  $('reset-scores-btn'),
  statsBtn:     $('stats-btn'),
  statsModal:   $('stats-modal'),
  closeStats:   $('close-stats'),
  clearAll:     $('clear-all-btn'),
  statTotal:    $('stat-total'),
  statWinX:     $('stat-winx'),
  statWinO:     $('stat-wino'),
  statDraw:     $('stat-draw'),
  winOverlay:   $('win-overlay'),
  winEmoji:     $('win-emoji'),
  winTitle:     $('win-title'),
  winSub:       $('win-sub'),
  playAgain:    $('play-again-btn'),
  closeWin:     $('close-win-btn'),
  timerBar:     $('timer-bar'),
  timerFill:    $('timer-fill'),
  timerVal:     $('timer-val'),
  confetti:     $('confetti-canvas'),
  namesRow:     $('names-row'),
};

/* =====================================================
   LOCAL STORAGE HELPERS
   ===================================================== */

function saveToStorage() {
  localStorage.setItem('ttt_scores',     JSON.stringify(state.scores));
  localStorage.setItem('ttt_total',      state.totalGames);
  localStorage.setItem('ttt_mode',       state.mode);
  localStorage.setItem('ttt_difficulty', state.difficulty);
}

function loadFromStorage() {
  try {
    const scores = JSON.parse(localStorage.getItem('ttt_scores'));
    if (scores) state.scores = scores;
    state.totalGames  = parseInt(localStorage.getItem('ttt_total') || '0', 10);
    state.mode        = localStorage.getItem('ttt_mode')       || 'pvp';
    state.difficulty  = localStorage.getItem('ttt_difficulty') || 'hard';
  } catch(e) { /* ignore */ }

  const savedTheme = localStorage.getItem('ttt_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  DOM.themeIcon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
}

/* =====================================================
   BOARD RENDERING
   ===================================================== */

function buildBoard() {
  DOM.board.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('aria-label', `Cell ${i + 1}`);
    cell.dataset.index = i;
    cell.addEventListener('click', handleCellClick);
    DOM.board.appendChild(cell);
  }
}

function renderBoard() {
  const cells = DOM.board.querySelectorAll('.cell');
  cells.forEach((cell, i) => {
    const val = state.board[i];
    cell.className = 'cell' + (val ? ` taken ${val.toLowerCase()}-cell` : '');
    if (val) {
      const span = document.createElement('span');
      span.className = 'symbol';
      span.textContent = val;
      cell.innerHTML = '';
      cell.appendChild(span);
      cell.setAttribute('aria-label', `Cell ${i+1}: ${val}`);
    } else {
      cell.innerHTML = '';
      cell.setAttribute('aria-label', `Cell ${i+1}: empty`);
    }
  });
}

function highlightWinners(combo) {
  const cells = DOM.board.querySelectorAll('.cell');
  combo.forEach(i => cells[i].classList.add('winning'));
}

/* =====================================================
   STATUS & SCORE UI
   ===================================================== */

function updateStatus(msg, turn = null) {
  DOM.statusText.textContent = msg;
  DOM.statusInd.className = 'status-indicator';
  if (turn === 'X')    DOM.statusInd.classList.add('x-turn');
  else if (turn === 'O') DOM.statusInd.classList.add('o-turn');
  else                 DOM.statusInd.classList.add('draw-state');
}

function updateScoreUI() {
  DOM.scoreX.textContent    = state.scores.X;
  DOM.scoreO.textContent    = state.scores.O;
  DOM.scoreDraw.textContent = state.scores.draw;
  DOM.scoreLabelX.textContent = state.nameX;
  DOM.scoreLabelO.textContent = state.nameO;
}

function pulseScore(who) {
  const el = who === 'X' ? DOM.scoreX.parentElement
           : who === 'O' ? DOM.scoreO.parentElement
           : DOM.scoreDraw.parentElement;
  el.classList.remove('pulse');
  void el.offsetWidth; // reflow
  el.classList.add('pulse');
}

/* =====================================================
   MOVE HISTORY
   ===================================================== */

function pushHistory(player, cellIndex) {
  const row = Math.floor(cellIndex / 3) + 1;
  const col = (cellIndex % 3) + 1;
  state.history.push({ player, cell: cellIndex, board: [...state.board] });
  const li = document.createElement('li');
  li.className = `${player.toLowerCase()}-move`;
  li.textContent = `${player}→R${row}C${col}`;
  DOM.moveList.prepend(li);
  DOM.undoBtn.disabled = false;
}

function clearHistory() {
  state.history = [];
  DOM.moveList.innerHTML = '';
  DOM.undoBtn.disabled = true;
}

function undoMove() {
  if (state.history.length === 0 || state.gameOver) return;

  // If PvA, undo 2 moves (AI + player)
  const undoCount = (state.mode === 'pva' && state.history.length >= 2) ? 2 : 1;

  for (let i = 0; i < undoCount; i++) {
    const last = state.history.pop();
    if (!last) break;
    state.board[last.cell] = null;
    DOM.moveList.firstChild?.remove();
  }

  state.current = 'X'; // always back to X after undo in PvA
  if (state.mode === 'pvp') {
    // toggle back
    state.current = undoCount % 2 === 1
      ? (state.current === 'X' ? 'O' : 'X')
      : state.current;
    // simpler: just re-derive from history length
    state.current = state.history.length % 2 === 0 ? 'X' : 'O';
  }

  renderBoard();
  updateStatus(`${playerName(state.current)}'s turn`, state.current);
  DOM.undoBtn.disabled = state.history.length === 0;
  state.gameOver = false;
}

function playerName(p) {
  return p === 'X' ? state.nameX : state.nameO;
}

/* =====================================================
   GAME LOGIC
   ===================================================== */

function checkWinner(board) {
  for (const [a,b,c] of WIN_COMBOS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], combo: [a,b,c] };
    }
  }
  if (board.every(c => c !== null)) return { winner: 'draw', combo: [] };
  return null;
}

function handleCellClick(e) {
  const idx = parseInt(e.currentTarget.dataset.index, 10);
  if (state.board[idx] || state.gameOver) return;
  if (state.mode === 'pva' && state.current === 'O') return; // AI's turn

  playMove(idx);
}

function playMove(idx) {
  stopTimer();
  state.board[idx] = state.current;
  pushHistory(state.current, idx);
  renderBoard();
  playSound('click');

  const result = checkWinner(state.board);
  if (result) {
    endGame(result);
    return;
  }

  // Switch turn
  state.current = state.current === 'X' ? 'O' : 'X';
  updateStatus(`${playerName(state.current)}'s turn`, state.current);

  if (state.mode === 'pva' && state.current === 'O' && !state.gameOver) {
    setTimeout(aiMove, 420);
  } else {
    startTimer();
  }
}

function endGame(result) {
  state.gameOver = true;

  if (result.winner === 'draw') {
    state.scores.draw++;
    state.totalGames++;
    pulseScore('draw');
    playSound('draw');
    updateStatus("It's a draw!", null);
    showWinOverlay('draw');
  } else {
    state.scores[result.winner]++;
    state.totalGames++;
    pulseScore(result.winner);
    playSound('win');
    highlightWinners(result.combo);
    const name = playerName(result.winner);
    updateStatus(`${name} wins! 🎉`, null);
    showWinOverlay(result.winner, name);
    launchConfetti();
  }

  saveToStorage();
  updateScoreUI();
}

/* =====================================================
   TURN TIMER
   ===================================================== */

function startTimer() {
  if (!state.timerEnabled) return;
  state.timerLeft = state.timerSecs;
  DOM.timerBar.classList.remove('hidden');
  updateTimerUI();

  state.timerHandle = setInterval(() => {
    state.timerLeft--;
    updateTimerUI();
    if (state.timerLeft <= 0) {
      stopTimer();
      autoPickCell();
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(state.timerHandle);
  state.timerHandle = null;
}

function updateTimerUI() {
  const pct = (state.timerLeft / state.timerSecs) * 100;
  DOM.timerFill.style.width = pct + '%';
  DOM.timerVal.textContent = state.timerLeft;
  DOM.timerFill.classList.toggle('low', state.timerLeft <= 5);
}

function autoPickCell() {
  const empty = state.board.map((v,i) => v === null ? i : -1).filter(i => i >= 0);
  if (empty.length) playMove(empty[Math.floor(Math.random() * empty.length)]);
}

/* =====================================================
   AI — MINIMAX + DIFFICULTY
   ===================================================== */

function aiMove() {
  if (state.gameOver) return;

  let idx;
  if (state.difficulty === 'easy') {
    idx = randomMove();
  } else if (state.difficulty === 'medium') {
    idx = Math.random() < 0.55 ? minimaxBestMove() : randomMove();
  } else {
    idx = minimaxBestMove();
  }

  playMove(idx);
}

function randomMove() {
  const empty = state.board.map((v,i) => v === null ? i : -1).filter(i => i >= 0);
  return empty[Math.floor(Math.random() * empty.length)];
}

function minimaxBestMove() {
  let bestScore = -Infinity, bestMove = -1;
  for (let i = 0; i < 9; i++) {
    if (state.board[i]) continue;
    state.board[i] = 'O';
    const score = minimax(state.board, 0, false, -Infinity, Infinity);
    state.board[i] = null;
    if (score > bestScore) { bestScore = score; bestMove = i; }
  }
  return bestMove;
}

function minimax(board, depth, isMax, alpha, beta) {
  const result = checkWinner(board);
  if (result) {
    if (result.winner === 'O') return 10 - depth;
    if (result.winner === 'X') return depth - 10;
    return 0;
  }

  if (isMax) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i]) continue;
      board[i] = 'O';
      best = Math.max(best, minimax(board, depth+1, false, alpha, beta));
      board[i] = null;
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i]) continue;
      board[i] = 'X';
      best = Math.min(best, minimax(board, depth+1, true, alpha, beta));
      board[i] = null;
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

/* =====================================================
   GAME FLOW
   ===================================================== */

function newGame(keepScores = true) {
  stopTimer();
  state.board    = Array(9).fill(null);
  state.current  = 'X';
  state.gameOver = false;
  clearHistory();
  DOM.winOverlay.classList.add('hidden');
  buildBoard();
  renderBoard();
  updateStatus(`${playerName('X')}'s turn`, 'X');
  startTimer();
}

function restartGame() {
  newGame(true);
}

function resetScores() {
  state.scores    = { X:0, O:0, draw:0 };
  state.totalGames = 0;
  saveToStorage();
  updateScoreUI();
  newGame();
}

/* =====================================================
   WIN OVERLAY
   ===================================================== */

function showWinOverlay(winner, name = '') {
  const phrases = WIN_QUIPS.win;
  const drawPhrases = WIN_QUIPS.draw;

  if (winner === 'draw') {
    DOM.winEmoji.textContent  = '🤝';
    DOM.winTitle.textContent  = "It's a Draw!";
    DOM.winSub.textContent    = drawPhrases[Math.floor(Math.random() * drawPhrases.length)];
  } else {
    DOM.winEmoji.textContent  = winner === 'X' ? '⭐' : '🔥';
    DOM.winTitle.textContent  = `${name} Wins!`;
    DOM.winSub.textContent    = phrases[Math.floor(Math.random() * phrases.length)];
    DOM.winTitle.style.color  = winner === 'X' ? 'var(--x-color)' : 'var(--o-color)';
  }

  setTimeout(() => DOM.winOverlay.classList.remove('hidden'), 600);
}

/* =====================================================
   CONFETTI
   ===================================================== */

function launchConfetti() {
  const canvas  = DOM.confetti;
  const ctx     = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors  = ['#00F5D4','#FF6B6B','#FFBE0B','#5B5EA6','#fff'];
  const pieces  = Array.from({length:120}, () => ({
    x:    Math.random() * canvas.width,
    y:    -10,
    r:    Math.random() * 6 + 2,
    d:    Math.random() * 3 + 1,
    col:  colors[Math.floor(Math.random() * colors.length)],
    tilt: Math.random() * 360,
    rot:  Math.random() * 6 - 3,
    vx:   Math.random() * 4 - 2,
  }));

  let raf, elapsed = 0;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = p.col;
      ctx.fill();
      p.x   += p.vx;
      p.y   += p.d;
      p.tilt += p.rot;
    });
    elapsed += 16;
    if (elapsed < 3200) raf = requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(draw);
}

/* =====================================================
   SOUND EFFECTS (Web Audio API)
   ===================================================== */

let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playSound(type) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const configs = {
      click: { freq:520, type:'sine',    dur:0.08, vol:0.10 },
      win:   { freq:660, type:'triangle',dur:0.6,  vol:0.14 },
      draw:  { freq:300, type:'sawtooth',dur:0.3,  vol:0.08 },
    };

    const c = configs[type] || configs.click;
    osc.frequency.setValueAtTime(c.freq, ctx.currentTime);
    if (type === 'win') {
      osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.3);
    }
    osc.type = c.type;
    gain.gain.setValueAtTime(c.vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + c.dur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + c.dur + 0.05);
  } catch(e) { /* silent fail on blocked audio */ }
}

/* =====================================================
   THEME
   ===================================================== */

function toggleTheme() {
  const html  = document.documentElement;
  const current = html.getAttribute('data-theme');
  const next  = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  DOM.themeIcon.textContent = next === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('ttt_theme', next);
}

/* =====================================================
   STATS MODAL
   ===================================================== */

function openStats() {
  const { X, O, draw } = state.scores;
  const total = state.totalGames;
  DOM.statTotal.textContent = total;
  DOM.statWinX.textContent  = total ? Math.round(X/total*100)+'%' : '—';
  DOM.statWinO.textContent  = total ? Math.round(O/total*100)+'%' : '—';
  DOM.statDraw.textContent  = total ? Math.round(draw/total*100)+'%' : '—';
  DOM.statsModal.classList.remove('hidden');
}

function closeStats() { DOM.statsModal.classList.add('hidden'); }

/* =====================================================
   MODE / DIFFICULTY SELECTORS
   ===================================================== */

function setupModeSelector() {
  DOM.modeSelector.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      DOM.modeSelector.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.mode = btn.dataset.mode;
      DOM.diffBar.classList.toggle('hidden', state.mode !== 'pva');
      DOM.namesRow.querySelector('#name-o').disabled = state.mode === 'pva';
      if (state.mode === 'pva') {
        state.nameO = 'Computer 🤖';
        DOM.nameO.value = 'Computer 🤖';
      } else {
        state.nameO = DOM.nameO.value || 'Player O';
      }
      saveToStorage();
      newGame();
    });
  });

  DOM.diffSelector.querySelectorAll('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      DOM.diffSelector.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.difficulty = btn.dataset.diff;
      saveToStorage();
      newGame();
    });
  });
}

function restoreSelectors() {
  // Mode
  DOM.modeSelector.querySelectorAll('.seg-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === state.mode);
  });
  DOM.diffBar.classList.toggle('hidden', state.mode !== 'pva');

  // Difficulty
  DOM.diffSelector.querySelectorAll('.seg-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.diff === state.difficulty);
  });

  // AI name
  if (state.mode === 'pva') {
    state.nameO = 'Computer 🤖';
    DOM.nameO.value = 'Computer 🤖';
    DOM.nameO.disabled = true;
  }
}

/* =====================================================
   PLAYER NAMES
   ===================================================== */

function setupNameInputs() {
  DOM.nameX.addEventListener('input', () => {
    state.nameX = DOM.nameX.value.trim() || 'Player X';
    updateScoreUI();
    updateStatus(`${playerName(state.current)}'s turn`, state.current);
  });

  DOM.nameO.addEventListener('input', () => {
    if (state.mode === 'pva') return;
    state.nameO = DOM.nameO.value.trim() || 'Player O';
    updateScoreUI();
  });
}

/* =====================================================
   EVENT BINDINGS
   ===================================================== */

function bindEvents() {
  DOM.themeToggle.addEventListener('click', toggleTheme);
  DOM.statsBtn   .addEventListener('click', openStats);
  DOM.closeStats .addEventListener('click', closeStats);
  DOM.clearAll   .addEventListener('click', () => { resetScores(); closeStats(); });
  DOM.statsModal .addEventListener('click', e => { if (e.target === DOM.statsModal) closeStats(); });

  DOM.newGameBtn   .addEventListener('click', () => newGame());
  DOM.restartBtn   .addEventListener('click', restartGame);
  DOM.resetScores  .addEventListener('click', resetScores);
  DOM.undoBtn      .addEventListener('click', undoMove);
  DOM.playAgain    .addEventListener('click', () => { DOM.winOverlay.classList.add('hidden'); newGame(); });
  DOM.closeWin     .addEventListener('click', () => DOM.winOverlay.classList.add('hidden'));

  // Keyboard accessibility
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeStats();
      DOM.winOverlay.classList.add('hidden');
    }
  });

  // Resize confetti canvas
  window.addEventListener('resize', () => {
    DOM.confetti.width  = window.innerWidth;
    DOM.confetti.height = window.innerHeight;
  });
}

/* =====================================================
   INIT
   ===================================================== */

function init() {
  loadFromStorage();
  setupModeSelector();
  restoreSelectors();
  setupNameInputs();
  bindEvents();
  buildBoard();
  updateScoreUI();
  newGame();
}

document.addEventListener('DOMContentLoaded', init);
