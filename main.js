const BG_COLOUR = '#231f20';
const SNAKE_COLOUR = '#c2c2c2';
const FOOD_COLOUR = '#f11';
const FOOD_COLOUR2 = '#ee1';
const ADDRESS = "https://snake-bdj8.onrender.com";
const SOCKET_ADDRESS = ADDRESS
const HTTP_ADDRESS = ADDRESS

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

const msgBox = document.getElementById('msgBox');
const $msgBox = $('#msgBox');

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
let userId, gameId;

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

reloadGames()
// setInterval(() => reloadGames(), 10000);
loadAuth();
conductStates();


function setAuth() {
  if (!userId) {
    showError("You are not logged in");
    return;
  }
  localStorage.setItem('auth', userId);
}

async function loadAuth() {
  let ui = localStorage.getItem('auth');
  if (ui) {
    const res = await fetch(HTTP_ADDRESS + '/auth/get_user/' + ui);
    const body = await res.json();
    if (!res.ok) {
      if (res.status === 404) {
        removeAuth();
        return;
      }
      handleHttpErrors(res, body);
      return;
    }
    userName.textContent = body.name;  
    userId = +ui;
    state = STATE_HOME;
    conductStates();
  }
}

function removeAuth() {
  localStorage.removeItem('auth');
}

async function logout() {
  if (!userId) {
    showError("You are not logged in");
    return;
  }
  const res = await fetch(
    HTTP_ADDRESS + '/auth/logout',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=utf-8'
      },
      body: JSON.stringify({userId})
    }
  );
  if (!res.ok) {
    const err = await res.json();
    handleHttpErrors(res, err);
    return;
  }
  userId = null;
  state = STATE_REG;
  conductStates();
  removeAuth();
}

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

function handleError(msg) {
  console.log(msg);
  showError(msg.message);
}

function hideMsgSlowly() {
  $msgBox.fadeOut(2000);
}

function showInfo(msg) {
  $msgBox.show();
  if (!$msgBox.hasClass('alert-primary')) {
    $msgBox.addClass('alert-primary');
  }
  $msgBox.removeClass('alert-danger');
  $msgBox.text(msg);
  hideMsgSlowly();
}

function showError(err) {
  $msgBox.show();
  if (!$msgBox.hasClass('alert-danger')) {
    $msgBox.addClass('alert-danger');
  }
  $msgBox.removeClass('alert-primary');
  $msgBox.text(err);
  hideMsgSlowly();
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
        "fieldW": 20,
        "fieldH": 20
      },
      'gameSettings': {
        'minPlayers': 1,
        'maxPlayers': 5,
        'ownerId': userId,
        "delayTime": 10000,
        "endPlay": false,
        "maxSpeedPhase": 10,
        "startSpeedPhaze": 18,
        "increasingVelPerScores": 2,
        "numApples": 5
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
      node.appendChild(cancel);
    }
    gamesScreen.appendChild(node);
  }
}

async function deleteGame(e) {
  console.log(e);
  // const res = await fetch(HTTP_ADDRESS + '/game/delete_game', {
  //   method: 'POST',
  //   'headers': {
  //     'Content-Type': 'application/json;charset=utf-8'
  //   },
  //   "body": JSON.stringify({userId, e})
  // });
}

function init() {
  gameCodeDisplay.textContent = gameId;

  state = STATE_GAME;
  conductStates();
  canvas.width = canvas.height = 600;

  ctx.fillStyle = BG_COLOUR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  console.log("Init");
}

function keydown(e) {
  if (!gameActive) {
    return;
  }
  let move;
  const code = e.keyCode;
  switch (code) {
    case 37:
      move = 1;
      break;
    case 40:
      move = 2;
      break;
    case 39:
      move = 0;
      break;
    case 38:
      move = 3;
      break;
    default:
      return;
  }
  socket.emit('make_move', {userId, gameId, move});
  e.preventDefault();
}

function paintGame(game) {
  ctx.fillStyle = BG_COLOUR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const gridsize = game.fieldSettings.fieldW;
  const size = canvas.width / gridsize;
  ctx.strokeStyle = 'green';
  for (let i = 0; i < gridsize; i++) {
    for (let j = 0; j < gridsize; j++) {
      ctx.strokeRect(i * size, j * size, size, size);
    }
  }
  for (let food of game.foods) {
    if (food.adds != 1)
      ctx.fillStyle = FOOD_COLOUR2;
    else
      ctx.fillStyle = FOOD_COLOUR;
    ctx.fillRect(food.x * size, food.y * size, size, size);
  }

  for (let player of game.players) {
    if (!player.alive) continue;
    paintPlayer(player, size);
  }
  ctx.moveTo(90, 90);
  ctx.lineTo(170, 170);
  ctx.moveTo(170, 90);
  ctx.lineTo(90, 170);
  ctx.lineWidth = 15;
  ctx.stroke();
}

function paintPlayer(player, size) {
  const snake = player.snake;
  const color = player.color;
  const colorRgb = `rgb(${Math.floor(color[0] * 255)}, ${Math.floor(color[1] * 255)}, ${Math.floor(color[2] * 255)})`;
  ctx.fillStyle = colorRgb;
  ctx.strokeStyle = 'gray';
  for (let cell of snake.body.slice(0, -1)) {
    ctx.fillRect(Math.ceil(cell.x) * size, Math.ceil(cell.y) * size, size, size);
    if (player.started) {
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.ceil(cell.x) * size, Math.ceil(cell.y) * size, size, size);
    } else {
      ctx.strokeStyle = 'gold'
      ctx.lineWidth = 3;
      ctx.strokeRect(Math.ceil(cell.x) * size, Math.ceil(cell.y) * size, size, size);
    }
  }
  ctx.lineWidth = 1;
  ctx.fillStyle = "#def";
  ctx.fillRect(Math.ceil(snake.body.at(-1).x) * size, Math.ceil(snake.body.at(-1).y) * size, size, size);
}

function handleHttpErrors(res, err) {
  if (res.status < 500) {
    showError(err.message);
  } else {
    showError("Server error");
    console.log(err.message);
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
