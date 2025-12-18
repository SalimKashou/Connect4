// =====================
// Connect 4 – Browser Game
// Board: 6 rows x 7 cols
// Players: 1 = Red, 2 = Yellow
// =====================

const ROWS = 6;
const COLS = 7;

const gridEl = document.getElementById('grid');
const hoverRowEl = document.getElementById('hoverRow');
const turnTextEl = document.getElementById('turnText');
const turnDotEl = document.getElementById('turnDot');
const subHeaderEl = document.getElementById('subHeader');

const modeEl = document.getElementById('mode');
const difficultyEl = document.getElementById('difficulty');
const firstEl = document.getElementById('first');

const newGameBtn = document.getElementById('newGame');
const undoBtn = document.getElementById('undo');
const resetBtn = document.getElementById('reset');

const toastEl = document.getElementById('toast');
const dropLayerEl = document.getElementById('dropLayer');

let board;                 // 2D array [ROWS][COLS] of 0/1/2
let currentPlayer = 1;     // 1 or 2
let gameOver = false;
let hoverCol = 3;
let moveHistory = [];      // stack of {col, row, player}

let isThinking = false;
let isDropping = false;

// ---------- UI build ----------
function buildBoardUI(){
  gridEl.innerHTML = '';
  for(let r=0; r<ROWS; r++){
    for(let c=0; c<COLS; c++){
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.r = r;
      cell.dataset.c = c;
      cell.addEventListener('click', () => handleColumnClick(c));
      cell.addEventListener('mouseenter', () => setHoverCol(c));
      gridEl.appendChild(cell);
    }
  }

  hoverRowEl.innerHTML = '';
  for(let c=0; c<COLS; c++){
    const pip = document.createElement('div');
    pip.className = 'hoverPip';
    pip.dataset.c = c;
    pip.addEventListener('mouseenter', () => setHoverCol(c));
    pip.addEventListener('click', () => handleColumnClick(c));
    hoverRowEl.appendChild(pip);
  }
  setHoverCol(hoverCol);
}

function setHoverCol(c){
  hoverCol = c;
  for(const pip of hoverRowEl.children){
    pip.classList.toggle('active', Number(pip.dataset.c) === c);
  }
}

function renderBoard(){
  for(const cell of gridEl.children){
    const r = Number(cell.dataset.r);
    const c = Number(cell.dataset.c);
    const v = board[r][c];

    let disc = cell.querySelector('.disc');
    if(!disc){
      disc = document.createElement('div');
      disc.className = 'disc';
      cell.appendChild(disc);
    }

    disc.classList.remove('p1','p2');
    if(v === 1) disc.classList.add('p1');
    if(v === 2) disc.classList.add('p2');
  }

  updateTurnUI();
  undoBtn.disabled = moveHistory.length === 0 || isThinking || isDropping;
}

function updateTurnUI(){
  if(gameOver) return;

  const mode = modeEl.value;
  const isAI = (mode === 'hva' && currentPlayer === 2);

  turnTextEl.textContent = isAI ? 'AI (Yellow)' : (currentPlayer === 1 ? 'Player 1 (Red)' : 'Player 2 (Yellow)');
  turnDotEl.classList.remove('p1','p2','ai');
  if(isAI){
    turnDotEl.classList.add('ai');
  } else {
    turnDotEl.classList.add(currentPlayer === 1 ? 'p1' : 'p2');
  }

  subHeaderEl.textContent = isThinking ? 'AI is thinking…' : 'Drop discs. Connect 4 to win.';
}

function toast(msg){
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => toastEl.classList.remove('show'), 1800);
}

// ---------- Drop animation (gravity-ish) ----------
function px(n){ return `${Math.round(n)}px`; }

function calcDropDurationMs(distancePx){
  // Physics-inspired: t = sqrt(2h/g)
  const g = 3200; // px/s^2 (slower, more realistic gravity)
  const t = Math.sqrt((2 * Math.max(0, distancePx)) / g);
  const ms = t * 1000;
  return Math.max(140, Math.min(650, ms));
}

function getCellEl(row, col){
  return gridEl.querySelector(`.cell[data-r="${row}"][data-c="${col}"]`);
}

async function animateDropToCell(col, row, player){
  const cellEl = getCellEl(row, col);
  if(!cellEl) return;

  const layerRect = dropLayerEl.getBoundingClientRect();
  const cellRect = cellEl.getBoundingClientRect();

  // Match disc size to the hole (cell uses inset: 6px)
  const discSize = Math.max(8, cellRect.width - 12);

  const targetX = (cellRect.left - layerRect.left) + (cellRect.width / 2) - (discSize / 2);
  const targetY = (cellRect.top - layerRect.top) + (cellRect.height / 2) - (discSize / 2);

  const startY = -discSize * 1.35;

  const disc = document.createElement('div');
  disc.className = `dropDisc ${player === 1 ? 'p1' : 'p2'}`;
  disc.style.width = px(discSize);
  disc.style.height = px(discSize);
  disc.style.left = px(targetX);
  disc.style.top = px(startY);
  dropLayerEl.appendChild(disc);

  const distance = targetY - startY;
  const duration = calcDropDurationMs(distance);

  const settle = Math.min(10, discSize * 0.12);
  const anim = disc.animate([
    { transform: 'translateY(0px)', offset: 0 },
    { transform: `translateY(${targetY - startY + settle}px)`, offset: 0.92 },
    { transform: `translateY(${targetY - startY}px)`, offset: 1 }
  ], {
    duration,
    easing: 'cubic-bezier(0.15, 0.75, 0.20, 1.0)',
    fill: 'forwards'
  });

  try { await anim.finished; } catch {}
  disc.remove();
}

// ---------- Game logic ----------
function newEmptyBoard(){
  return Array.from({length: ROWS}, () => Array(COLS).fill(0));
}

function resetGame(){
  board = newEmptyBoard();
  moveHistory = [];
  gameOver = false;
  isThinking = false;
  isDropping = false;

  document.body.classList.remove('won-p1','won-p2','won-draw');

  currentPlayer = (firstEl.value === 'p1') ? 1 : 2;

  renderBoard();
  maybeAIMove();
}

function getAvailableRow(b, col){
  for(let r=ROWS-1; r>=0; r--){
    if(b[r][col] === 0) return r;
  }
  return -1;
}

function validMoves(b){
  const moves = [];
  for(let c=0; c<COLS; c++){
    if(b[0][c] === 0) moves.push(c);
  }
  return moves;
}

function checkWinner(b){
  for(let r=0; r<ROWS; r++){
    for(let c=0; c<COLS-3; c++){
      const v = b[r][c];
      if(v && v===b[r][c+1] && v===b[r][c+2] && v===b[r][c+3]) return v;
    }
  }
  for(let c=0; c<COLS; c++){
    for(let r=0; r<ROWS-3; r++){
      const v = b[r][c];
      if(v && v===b[r+1][c] && v===b[r+2][c] && v===b[r+3][c]) return v;
    }
  }
  for(let r=0; r<ROWS-3; r++){
    for(let c=0; c<COLS-3; c++){
      const v = b[r][c];
      if(v && v===b[r+1][c+1] && v===b[r+2][c+2] && v===b[r+3][c+3]) return v;
    }
  }
  for(let r=3; r<ROWS; r++){
    for(let c=0; c<COLS-3; c++){
      const v = b[r][c];
      if(v && v===b[r-1][c+1] && v===b[r-2][c+2] && v===b[r-3][c+3]) return v;
    }
  }
  return 0;
}

function isDraw(b){
  return validMoves(b).length === 0 && checkWinner(b) === 0;
}

function endGame(result){
  gameOver = true;
  isThinking = false;
  isDropping = false;
  undoBtn.disabled = moveHistory.length === 0;

  document.body.classList.remove('won-p1','won-p2','won-draw');

  if(result === 'draw'){
    document.body.classList.add('won-draw');
    subHeaderEl.textContent = '🤝 Draw!';
    toast('Draw!');
    return;
  }

  if(result === 1){
    document.body.classList.add('won-p1');
    subHeaderEl.textContent = '🎉 Player 1 (Red) wins!';
    toast('Player 1 wins!');
    return;
  }

  if(result === 2){
    document.body.classList.add('won-p2');
    const mode = modeEl.value;
    if(mode === 'hva'){
      subHeaderEl.textContent = '🤖✨ AI (Yellow) wins!';
      toast('AI wins!');
    } else {
      subHeaderEl.textContent = '🎉 Player 2 (Yellow) wins!';
      toast('Player 2 wins!');
    }
  }
}

function nextTurn(){
  currentPlayer = (currentPlayer === 1) ? 2 : 1;
  renderBoard();
  maybeAIMove();
}

async function performMove(col, player, {showFullToast=true} = {}){
  if(gameOver || isDropping) return false;
  if(isThinking && player !== 2) return false;

  const row = getAvailableRow(board, col);
  if(row === -1){
    if(showFullToast) toast('That column is full.');
    return false;
  }

  isDropping = true;
  renderBoard();

  await animateDropToCell(col, row, player);

  board[row][col] = player;
  moveHistory.push({row, col, player});

  isDropping = false;
  renderBoard();
  return true;
}

async function handleColumnClick(col){
  if(gameOver || isThinking || isDropping) return;

  const mode = modeEl.value;
  const aiTurn = (mode === 'hva' && currentPlayer === 2);
  if(aiTurn) return;

  const moved = await performMove(col, currentPlayer);
  if(!moved) return;

  const winner = checkWinner(board);
  if(winner) return endGame(winner);
  if(isDraw(board)) return endGame('draw');

  nextTurn();
}

function undoMove(b, col){
  for(let r=0; r<ROWS; r++){
    if(b[r][col] !== 0){
      b[r][col] = 0;
      return;
    }
  }
}

function undo(){
  if(isThinking || isDropping) return;
  if(moveHistory.length === 0) return;

  const mode = modeEl.value;

  if(mode === 'hva'){
    gameOver = false;

    const last = moveHistory.pop();
    if(last) undoMove(board, last.col);

    if(last && last.player === 2 && moveHistory.length > 0){
      const prev = moveHistory.pop();
      if(prev) undoMove(board, prev.col);
    }

    currentPlayer = 1;
    renderBoard();
  } else {
    gameOver = false;
    const last = moveHistory.pop();
    if(!last) return;
    undoMove(board, last.col);
    currentPlayer = last.player;
    renderBoard();
  }
}

// ---------- AI ----------
function chooseAIMove(b, diff){
  const moves = validMoves(b);
  if(moves.length === 0) return 0;

  if(diff === 'easy'){
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const depth = diff === 'medium' ? 3 : diff === 'hard' ? 5 : 7;
  const useOrdering = (diff === 'extreme');

  for(const c of moves){
    const bb = cloneBoard(b);
    applyMove(bb, c, 2);
    if(checkWinner(bb) === 2) return c;
  }
  for(const c of moves){
    const bb = cloneBoard(b);
    applyMove(bb, c, 1);
    if(checkWinner(bb) === 1) return c;
  }

  const {bestMove} = minimaxRoot(b, depth, useOrdering);
  return (bestMove ?? moves[0]);
}

function maybeAIMove(){
  const mode = modeEl.value;
  if(gameOver) return;
  if(mode !== 'hva') return;
  if(currentPlayer !== 2) return;
  if(isDropping) return;

  isThinking = true;
  renderBoard();

  setTimeout(async () => {
    const aiCol = chooseAIMove(board, difficultyEl.value);

    const moved = await performMove(aiCol, 2, {showFullToast:false});
    isThinking = false;
    renderBoard();

    if(!moved) return;

    const winner = checkWinner(board);
    if(winner) return endGame(winner);
    if(isDraw(board)) return endGame('draw');

    nextTurn();
  }, 60);
}

function cloneBoard(b){
  return b.map(row => row.slice());
}

function applyMove(b, col, player){
  const row = getAvailableRow(b, col);
  if(row === -1) return null;
  b[row][col] = player;
  return {row, col, player};
}

function evaluateBoard(b){
  const WIN = 100000;
  const winner = checkWinner(b);
  if(winner === 2) return WIN;
  if(winner === 1) return -WIN;

  let score = 0;

  const centerCol = Math.floor(COLS/2);
  let centerAI = 0, centerHU = 0;
  for(let r=0; r<ROWS; r++){
    if(b[r][centerCol] === 2) centerAI++;
    if(b[r][centerCol] === 1) centerHU++;
  }
  score += centerAI * 6;
  score -= centerHU * 6;

  const scoreWindow = (w) => {
    const ai = w.filter(v => v===2).length;
    const hu = w.filter(v => v===1).length;
    const em = w.filter(v => v===0).length;

    if(ai === 4) return 1000;
    if(ai === 3 && em === 1) return 16;
    if(ai === 2 && em === 2) return 5;

    if(hu === 4) return -1000;
    if(hu === 3 && em === 1) return -18;
    if(hu === 2 && em === 2) return -6;

    return 0;
  };

  for(let r=0; r<ROWS; r++){
    for(let c=0; c<COLS-3; c++) score += scoreWindow([b[r][c], b[r][c+1], b[r][c+2], b[r][c+3]]);
  }
  for(let c=0; c<COLS; c++){
    for(let r=0; r<ROWS-3; r++) score += scoreWindow([b[r][c], b[r+1][c], b[r+2][c], b[r+3][c]]);
  }
  for(let r=0; r<ROWS-3; r++){
    for(let c=0; c<COLS-3; c++) score += scoreWindow([b[r][c], b[r+1][c+1], b[r+2][c+2], b[r+3][c+3]]);
  }
  for(let r=3; r<ROWS; r++){
    for(let c=0; c<COLS-3; c++) score += scoreWindow([b[r][c], b[r-1][c+1], b[r-2][c+2], b[r-3][c+3]]);
  }

  return score;
}

function orderedMoves(moves){
  const center = Math.floor(COLS/2);
  return moves.slice().sort((a,b) => Math.abs(a-center) - Math.abs(b-center));
}

function minimaxRoot(b, depth, useOrdering){
  let bestScore = -Infinity;
  let bestMove = null;

  let moves = validMoves(b);
  if(useOrdering) moves = orderedMoves(moves);
  if(!useOrdering) moves = moves.slice().sort(() => Math.random() - 0.5);

  let alpha = -Infinity;
  let beta = Infinity;

  for(const c of moves){
    const bb = cloneBoard(b);
    applyMove(bb, c, 2);
    const score = minimax(bb, depth-1, alpha, beta, false, useOrdering);
    if(score > bestScore){ bestScore = score; bestMove = c; }
    alpha = Math.max(alpha, bestScore);
    if(alpha >= beta) break;
  }

  return {bestScore, bestMove};
}

function minimax(b, depth, alpha, beta, maximizing, useOrdering){
  const winner = checkWinner(b);
  if(winner === 2) return 100000 - (7-depth);
  if(winner === 1) return -100000 + (7-depth);
  if(depth === 0 || validMoves(b).length === 0) return evaluateBoard(b);

  let moves = validMoves(b);
  if(useOrdering) moves = orderedMoves(moves);

  if(maximizing){
    let value = -Infinity;
    for(const c of moves){
      const bb = cloneBoard(b);
      applyMove(bb, c, 2);
      value = Math.max(value, minimax(bb, depth-1, alpha, beta, false, useOrdering));
      alpha = Math.max(alpha, value);
      if(alpha >= beta) break;
    }
    return value;
  } else {
    let value = Infinity;
    for(const c of moves){
      const bb = cloneBoard(b);
      applyMove(bb, c, 1);
      value = Math.min(value, minimax(bb, depth-1, alpha, beta, true, useOrdering));
      beta = Math.min(beta, value);
      if(alpha >= beta) break;
    }
    return value;
  }
}

// ---------- Lightweight self-tests (run with ?test=1) ----------
function runSelfTests(){
  const assert = (cond, msg) => console.assert(cond, msg);
  console.group('Connect 4 self-tests');

  // Horizontal win
  {
    const b = newEmptyBoard();
    b[5][0]=1; b[5][1]=1; b[5][2]=1; b[5][3]=1;
    assert(checkWinner(b) === 1, 'Horizontal win (P1)');
  }

  // Vertical win
  {
    const b = newEmptyBoard();
    b[5][6]=2; b[4][6]=2; b[3][6]=2; b[2][6]=2;
    assert(checkWinner(b) === 2, 'Vertical win (P2)');
  }

  // Diagonal down-right win
  {
    const b = newEmptyBoard();
    b[2][0]=2; b[3][1]=2; b[4][2]=2; b[5][3]=2;
    assert(checkWinner(b) === 2, 'Diagonal down-right win (P2)');
  }

  // Diagonal up-right win
  {
    const b = newEmptyBoard();
    b[5][0]=1; b[4][1]=1; b[3][2]=1; b[2][3]=1;
    assert(checkWinner(b) === 1, 'Diagonal up-right win (P1)');
  }

  // AI can move even while isThinking=true (regression test)
  {
    const b = newEmptyBoard();
    board = b;
    isThinking = true;
    isDropping = false;
    gameOver = false;

    performMove(3, 2, {showFullToast:false}).then((ok) => {
      assert(ok === true, 'AI performMove succeeds while thinking');
      isThinking = false;
    }).catch(() => {
      assert(false, 'AI performMove threw unexpectedly');
      isThinking = false;
    });
  }

  console.groupEnd();
}

// ---------- Events ----------
newGameBtn.addEventListener('click', () => resetGame());
undoBtn.addEventListener('click', undo);

resetBtn.addEventListener('click', () => {
  modeEl.value = 'hva';
  difficultyEl.value = 'medium';
  firstEl.value = 'p1';

  resetGame();
  toast('Settings reset.');
});

modeEl.addEventListener('change', () => {
  difficultyEl.disabled = (modeEl.value === 'hvh');
  resetGame();
});

difficultyEl.addEventListener('change', () => resetGame());
firstEl.addEventListener('change', () => resetGame());

window.addEventListener('keydown', (e) => {
  if(e.key >= '1' && e.key <= '7'){
    const col = Number(e.key) - 1;
    setHoverCol(col);
    handleColumnClick(col);
  }
  if(e.key.toLowerCase() === 'u') undo();
  if(e.key.toLowerCase() === 'n') resetGame();
});

gridEl.addEventListener('mousemove', (e) => {
  const cell = e.target.closest('.cell');
  if(!cell) return;
  setHoverCol(Number(cell.dataset.c));
});

// ---------- Init ----------
buildBoardUI();
difficultyEl.disabled = (modeEl.value === 'hvh');
resetGame();

if(new URLSearchParams(location.search).get('test') === '1'){
  setTimeout(runSelfTests, 0);
}
