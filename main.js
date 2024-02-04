const BG_COLOUR = '#231f20';
const SNAKE_COLOUR = '#c2c2c2';
const FOOD_COLOUR = '#f11';
const FOOD_COLOUR2 = '#ee1';
const SCREEN_SIZE = 20;

const socket = io(SOCKET_ADDRESS);

socket.on('error', handleError);
socket.on('playerJoined', handlePlayerJoined);
socket.on('gameStarted', handleGameStarted);
socket.on('playerLost', handlePlayerLost);
socket.on('gameState', handleGameState);
socket.on('gameOver', handleGameOver);


const gameScreen = document.getElementById('gameScreen');
const initialScreen = document.getElementById('initialScreen');
const newGameBtn = document.getElementById('newGameButton');
const joinGameBtn = document.getElementById('joinGameButton');
const gameCodeInput = document.getElementById('gameCodeInput');
const startGameBtn = document.getElementById('startGameBtn');
const gameCodeDisplay = document.getElementById('gameCodeDisplay');
const readyBtn = document.getElementById('readyButton');
const playersList = document.getElementById('playersList');
const gameInfo = document.getElementById('gameInfo');

const userButton = document.getElementById('userButton');
const userNameInput = document.getElementById('userNameInput');
const registerFormDiv = document.getElementById('registerForm');
const welcomeTextDiv = document.getElementById('welcomeText');
const userName = document.getElementById('userName');

const goBackBtn = document.getElementById('backMainBtn');
const scoreText = document.getElementById('scoreText');
const allGamesScreen = document.getElementById('allGamesScreen');
const reloadBtn = document.getElementById('reloadBtn');
const gamesScreen = document.getElementById('gamesScreen');
const lastWinnerDiv = document.getElementById('lastWinnerDiv');
const lastWinnerText = document.getElementById('lastWinnerText');

const logoutBtn = document.getElementById('logoutBtn');

const canvas = document.getElementById('canvas');

const STATE_REG = 2, STATE_HOME = 0, STATE_GAME = 1;
let state = STATE_REG;

let ctx = canvas.getContext('2d');
let playerNumber;
let gameActive = false;
let ready = false;
let code;
let colors = [];
let roomPlayers = [];
let games = [];
let gameId;

document.addEventListener('keydown', keydown);
newGameBtn.addEventListener('click', newGame);
joinGameBtn.addEventListener('click', joinGame);
userButton.addEventListener('click', registerUser);
startGameBtn.addEventListener('click', startGame)
goBackBtn.addEventListener('click', goBackToMain);
logoutBtn.addEventListener('click', logout);
reloadBtn.addEventListener('click', reloadGames);

welcomeTextDiv.hidden = true
initialScreen.hidden = true
gameScreen.hidden = true
startGameBtn.hidden = true;
gameInfo.hidden = true;
// lastWinnerText.hidden = true;
$msgBox.hide()

loadAuth();
conductStates();
reloadGames();



function reloadGames() {
  getAllGames();  
}

function quitAll() {
  if (gameId && userId) {
    socket.emit('exit_game', {gameId, userId});
  }
}

function startGame() {
  socket.emit('start_game', {gameId, userId});
}


function drawPlayerNode(p) {
  const color = p.color;
  let node = document.createElement('div');
  node.classList = 'row border border-primary-subtle rounded-3 p-1 mb-2';
  node.style.width = '100%';  
  let snake = document.createElement('div');
  snake.classList = 'col-3 border-end'
  snake.style.backgroundColor = 'rgb(' + Math.floor(color[0] * 255) + ", " + Math.floor(color[1] * 255) + ", " + Math.floor(color[2] * 255) + ")"
  let playerName = document.createElement('div');
  playerName.classList = 'col-9 fw-bolder fs-4'
  playerName.innerText = p.name
  node.appendChild(snake);
  node.appendChild(playerName);
  playersList.appendChild(node);
}

function handlePlayerJoined(game) {
  playersList.replaceChildren([]);
  for (let p of game.players) {
    drawPlayerNode(p);
  }
  if (game.gameSettings.ownerId === userId) {
    startGameBtn.hidden = false;
  }
  gameId = game.gameId;
  scoreText.innerText = 0;
}

function handlePlayerLost(msg) {
  if (msg.userId === userId) {
    showInfo("You lost")
    gameActive = false;
  }
}

function handleGameStarted() {
  gameActive = true;
  gameScreen.focus();
  startGameBtn.hidden = true;
}

function handleGameState(msg) {
  const game = msg.game;
  scoreText.innerText = msg.game.players.find(p => p.userId === userId).score;
  requestAnimationFrame(() => paintGame(game));
}

function handleGameOver(msg) {
  init();
  gameActive = false;
  if (!msg.player?.userId) {
    lastWinnerText.innerText = '------';  
    showInfo("Game Over");
  }
  else {
    if (msg.player?.userId === userId) {
      showInfo("You win")
    } else {
      showInfo(msg.player?.name + ' win');
    }
    lastWinnerText.innerText = msg.player.name;  
  }
  if (msg.game.gameSettings.ownerId === userId) {
    startGameBtn.hidden = false;
  }
}

async function registerUser() {
  const name = userNameInput.value.trim();
  if (!name || name.length < 1 || name.length > 15) {
    showError("Name is not valid");
    return;
  }
  const res = await fetch(
    HTTP_ADDRESS + '/auth/create_user',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=utf-8'
      },
      body: JSON.stringify({name})
    }
  );
  if (!res.ok) {
    const err = await res.json();
    handleHttpErrors(res, err);
    return;
  }
  let id = await res.json();
  userId = id;
  userName.textContent = name;  

  state = STATE_HOME;
  conductStates();

  setAuth();
  getAllGames();
}

function goBackToMain() {
  state = STATE_HOME;
  conductStates();
  if (gameId && userId) {
    socket.emit('exit_game', {gameId, userId});
  }
  gameId = null;
  getAllGames();
}

async function newGame() {
  const res = await fetch(HTTP_ADDRESS + '/game/create_game', {
    'method': 'POST',
    'headers': {
      'Content-Type': 'application/json;charset=utf-8'
    },
    "body": JSON.stringify({
      'fieldSettings': {
        "fieldW": 40,
        "fieldH": 40
      },
      'gameSettings': {
        'minPlayers': 1,
        'maxPlayers': 5,
        'ownerId': userId,
        "delayTime": 10000,
        "endPlay": false,
        "maxSpeedPhase": 10,
        "startSpeedPhaze": 18,
        "increasingVelPerScores": 3,
        "numApples": 13
      }
    })
  })
  const body = await res.json();
  if (!res.ok) {
    handleHttpErrors(res, body);
    return;
  }
  gameId = body;
  socket.emit('join_game', {gameId, userId});
  init();
}

async function joinGame() {
  const gameId = +gameCodeInput.value;
  gameCodeInput.value = '';
  if (gameId === '') {
    showError("You must input the name and the code")
    return;
  }

  const res = await fetch(HTTP_ADDRESS + '/game/check_gameId/' + gameId);
  const body = await res.json();
  if (!res.ok) {
    handleHttpErrors(res, body);
    return;
  }
  if (!body) {
    showError("Incorrect game code");
    return;
  }
  
  socket.emit('join_game', {gameId, userId});
  init();
  gameCodeDisplay.textContent = gameId;
  initialScreen.hidden = true;
  gameScreen.hidden = false;
} 

async function getAllGames() {
  const res = await fetch(
    HTTP_ADDRESS + '/game/get_all_games',
  );
  const body = await res.json();

  if (!res.ok) {
    handleHttpErrors(res, body);
    return;
  }
  games = body;
  drawGames(body);
}

function drawGames(games) {
  gamesScreen.replaceChildren([]);
  if (!games || games.length === 0) {
    gamesScreen.innerText = 'No games available now';
  }
  for (let game of games) {
    let node = document.createElement('div');
    node.classList = 'p-3 rounded-5 border border-primary mb-2 bg-primary-subtle';
    let name = game.players.find(p => p.userId === game.gameSettings.ownerId)?.name;
    node.style.overflowX = 'scroll';
    node.style.width = '100%';  
    node.innerText = `Owner: ${name}. Code: ${game.gameId}. Players now: ${game.players.map(p => p.name).join(',')}`;
    if (game.gameSettings.ownerId === userId) {
      node.style.position = 'relative';
      let cancel = document.createElement('i');
      cancel.addEventListener('click', deleteGame)
      cancel.classList = 'bi bi-x-lg';
      cancel.style.position = 'absolute';
      cancel.style.right = '20px';
      cancel.style.top = '35%'
      cancel.setAttribute('gameCode', game.gameId);
      node.appendChild(cancel);
    }
    gamesScreen.appendChild(node);
  }
}

async function deleteGame(e) {
  console.log(e);
  const res = await fetch(HTTP_ADDRESS + '/game/delete_game', {
    method: 'POST',
    'headers': {
      'Content-Type': 'application/json;charset=utf-8'
    },
    "body": JSON.stringify({gameId: e.target.getAttribute('gameCode'), userId})
  });
  if (!res.ok) {
    const err = await res.json();
    handleHttpErrors(res, err);
  }
  reloadGames();
}

function init() {
  gameCodeDisplay.textContent = gameId;

  state = STATE_GAME;
  conductStates();
  canvas.width = canvas.height = 600;

  ctx.fillStyle = BG_COLOUR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function keydown(e) {
  if (!gameActive) {
    return;
  }
  let move;
  const code = e.keyCode;
  switch (code) {
    case 37:
      move = 0;
      break;
    case 40:
      move = 3;
      break;
    case 39:
      move = 1;
      break;
    case 38:
      move = 2;
      break;
    default:
      return;
  }
  socket.emit('make_move', {userId, gameId, move});
  e.preventDefault();
}

function paintGame2(game) {
  ctx.fillStyle = BG_COLOUR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const gridsizeW = game.fieldSettings.fieldW;
  const gridsizeH = game.fieldSettings.fieldH;
  const sizeW = canvas.width / gridsizeW, sizeH = canvas.height / gridsizeH;
  ctx.strokeStyle = 'green';
  for (let i = 0; i < gridsizeW; i++) {
    for (let j = 0; j < gridsizeH; j++) {
      ctx.strokeRect(i * sizeW, j * sizeH, sizeW, sizeH);
    }
  }
  for (let food of game.foods) {
    if (food.adds != 1)
      ctx.fillStyle = FOOD_COLOUR2;
    else
      ctx.fillStyle = FOOD_COLOUR;
    ctx.fillRect(food.x * sizeW, food.y * sizeH, sizeW, sizeH);
  }

  for (let player of game.players) {
    if (!player.alive) continue;
    paintPlayer(player, sizeW, sizeH);
  }
}

function paintPlayer(player, sizeW, sizeH) {
  const snake = player.snake;
  const color = player.color;
  const colorRgb = `rgb(${Math.floor(color[0] * 255)}, ${Math.floor(color[1] * 255)}, ${Math.floor(color[2] * 255)})`;
  ctx.fillStyle = colorRgb;
  ctx.strokeStyle = 'gray';
  for (let cell of snake.body.slice(0, -1)) {
    ctx.fillStyle = colorRgb;
    ctx.fillRect((cell.x) * sizeW, (cell.y) * sizeH, sizeW, sizeH);
    if (player.started) {
      ctx.lineWidth = 1;
      ctx.strokeRect((cell.x) * sizeW, (cell.y) * sizeH, sizeW, sizeH);
    } else {
      ctx.strokeStyle = 'gold'
      ctx.lineWidth = 3;
      ctx.strokeRect((cell.x) * sizeW, (cell.y) * sizeH, sizeW, sizeH);
    }    
  }
  for (let id = 0; id < snake.body.length - 1; id++) {
    ctx.beginPath(); // Начинает новый путь
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'yellow';
    ctx.moveTo((snake.body[id].x) * sizeW + sizeW/2, (snake.body[id].y) * sizeH + sizeH/2); // Передвигает перо в точку (30, 50)
    ctx.lineTo((snake.body[id + 1].x) * sizeW + sizeW/2, (snake.body[id + 1].y) * sizeH + sizeH/2); // Рисует линию до точки (150, 100)
    ctx.stroke(); // Отображает путь
  }
  if (!player.started) {
    ctx.strokeStyle = 'gold'
    ctx.lineWidth = 3;
    ctx.strokeRect((snake.body.at(-1).x) * sizeW, (snake.body.at(-1).y) * sizeH, sizeW, sizeH);
  }
  ctx.lineWidth = 1;
  ctx.fillStyle = "#def";
  ctx.fillRect((snake.body.at(-1).x) * sizeW, (snake.body.at(-1).y) * sizeH, sizeW, sizeH);
}


function paintGame(game) {
  ctx.fillStyle = BG_COLOUR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const size = canvas.width / SCREEN_SIZE
  ctx.strokeStyle = 'green';
  for (let i = 0; i < SCREEN_SIZE; i++) {
    for (let j = 0; j < SCREEN_SIZE; j++) {
      ctx.strokeRect(i * size, j * size, size, size);
    }
  }
  const player = game.players.find(p => p.userId === userId);
  const minX = player.snake.head.x - SCREEN_SIZE / 2, maxX = player.snake.head.x + SCREEN_SIZE / 2;
  const minY = player.snake.head.y - SCREEN_SIZE / 2, maxY = player.snake.head.y + SCREEN_SIZE / 2;
  if (player.snake.head.x < SCREEN_SIZE / 2) {
    const dif = SCREEN_SIZE / 2 - player.snake.head.x;
    ctx.fillStyle = '#eee';
    for (let i = 0; i < dif; i++) {
      for (let j = 0; j < SCREEN_SIZE; j++) {
        ctx.fillRect(i * size, j * size, size, size);
      }
    }
  }
  if (player.snake.head.x > game.fieldSettings.fieldW - SCREEN_SIZE / 2) {
    const dif = SCREEN_SIZE / 2 - (game.fieldSettings.fieldW - player.snake.head.x);
    ctx.fillStyle = '#eee';
    for (let i = 0; i < dif; i++) {
      for (let j = SCREEN_SIZE - 1; j > SCREEN_SIZE - dif - 1; j--) {
        ctx.fillRect(i * size, j * size, size, size);
      }
    }
  }
  if (player.snake.head.y < SCREEN_SIZE / 2) {
    const dif = SCREEN_SIZE / 2 - player.snake.head.y;
    ctx.fillStyle = '#eee';
    for (let j = 0; j < dif; j++) {
      for (let i = 0; i < SCREEN_SIZE; i++) {
        ctx.fillRect(i * size, j * size, size, size);
      }
    }
  }
  if (player.snake.head.y > game.fieldSettings.fieldH - SCREEN_SIZE / 2) {
    const dif = SCREEN_SIZE / 2 - (game.fieldSettings.fieldH - player.snake.head.y);
    ctx.fillStyle = '#eee';
    for (let j = SCREEN_SIZE - 1; j > SCREEN_SIZE - dif - 1; j--) {
      for (let i = 0; i < SCREEN_SIZE; i++) {
        ctx.fillRect(i * size, j * size, size, size);
      }
    }
  }

  for (let food of game.foods) {
    if (!checkInArea(food.x, food.y, minX, maxX, minY, maxY)) {
      continue;
    }
    if (food.adds != 1)
      ctx.fillStyle = FOOD_COLOUR2;
    else
      ctx.fillStyle = FOOD_COLOUR;
    ctx.fillRect((food.x - minX) * size, (food.y - minY) * size, size, size);
  }

  for (let player of game.players) {
    if (!player.alive) continue;
    paintPlayer2(player, size, minX, maxX, minY, maxY);
  }

  drawMinimap(game);
}

function drawMinimap(game) {
  const gx = canvas.width - 0.15 * canvas.width, gy = 0;
  const sx = 0.15 * canvas.width, sy = 0.15 * canvas.height;
  const sizex = sx / 20, sizey = sy / 20;
  ctx.fillStyle = '#ccc';
  ctx.fillRect(gx, gy, sx, sy);
  for (const p of game.players) {
    const color = p.color;
    const colorRgb = `rgb(${Math.floor(color[0] * 255)}, ${Math.floor(color[1] * 255)}, ${Math.floor(color[2] * 255)})`;
    ctx.fillStyle = colorRgb;
    ctx.fillRect(gx + p.snake.head.x * sx / game.fieldSettings.fieldW, gy + p.snake.head.y * sy / game.fieldSettings.fieldH, sizex, sizey);
  }
}

function checkInArea(x, y, minX, maxX, minY, maxY) {
  return (x >= minX && x <= maxX) && (y >= minY && y <= maxY);
}

function paintPlayer2(player, size, minX, maxX, minY, maxY) {
  const snake = player.snake;
  const color = player.color;
  const colorRgb = `rgb(${Math.floor(color[0] * 255)}, ${Math.floor(color[1] * 255)}, ${Math.floor(color[2] * 255)})`;
  ctx.fillStyle = colorRgb;
  ctx.strokeStyle = 'gray';
  for (let cell of snake.body.slice(0, -1)) {
    if (!checkInArea(cell.x, cell.y, minX, maxX, minY, maxY)) {
      continue;
    }
    cell.x -= minX;
    cell.y -= minY;
    ctx.fillStyle = colorRgb;
    ctx.fillRect((cell.x) * size, (cell.y) * size, size, size);
    if (player.started) {
      ctx.lineWidth = 1;
      ctx.strokeRect((cell.x) * size, (cell.y) * size, size, size);
    } else {
      ctx.strokeStyle = 'gold'
      ctx.lineWidth = 3;
      ctx.strokeRect((cell.x) * size, (cell.y) * size, size, size);
    }    
  }
  // for (let id = 0; id < snake.body.length - 1; id++) {
  //   if (!checkInArea(snake.body[id + 1].x, snake.body[id + 1].y, minX, maxX, minY, maxY)) {
  //     continue;
  //   }
  //   ctx.beginPath(); // Начинает новый путь
  //   ctx.lineWidth = 2;
  //   ctx.strokeStyle = 'yellow';
  //   ctx.moveTo((snake.body[id].x) * size + size/2, (snake.body[id].y) * size + size/2); // Передвигает перо в точку (30, 50)
  //   ctx.lineTo((snake.body[id + 1].x) * size + size/2, (snake.body[id + 1].y) * size + size/2); // Рисует линию до точки (150, 100)
  //   ctx.stroke(); // Отображает путь
  // }
  if (checkInArea(snake.body.at(-1).x, snake.body.at(-1).y, minX, maxX, minY, maxY)) {
    if (!player.started) {
      ctx.strokeStyle = 'gold'
      ctx.lineWidth = 3;
      ctx.strokeRect((snake.body.at(-1).x - minX) * size, (snake.body.at(-1).y - minY) * size, size, size);
    }
    ctx.lineWidth = 1;
    ctx.fillStyle = "#def";
    ctx.fillRect((snake.body.at(-1).x - minX) * size, (snake.body.at(-1).y - minY) * size, size, size);
  }
}

function conductStates() {
  switch (state) {
    case STATE_HOME:
      switchToHome();
      break;
    case STATE_GAME:
      switchToGame();
      break;
    case STATE_REG:
      switchToReg();
      break;
  }
}

function switchToGame() {
  initialScreen.hidden = true;
  gameScreen.hidden = false;
  gameInfo.hidden = false;
  allGamesScreen.hidden = true;
  logoutBtn.hidden = true;
}

function switchToHome() {
  initialScreen.hidden = false;
  gameScreen.hidden = true;
  gameInfo.hidden = true;
  allGamesScreen.hidden = false;
  welcomeTextDiv.hidden = false;
  registerFormDiv.hidden = true;
  logoutBtn.hidden = false;
}

function switchToReg() {
  registerFormDiv.hidden = false;
  welcomeTextDiv.hidden = true;
  initialScreen.hidden = true;
  gameScreen.hidden = true;
  gameInfo.hidden = true;
  logoutBtn.hidden = true;
}
