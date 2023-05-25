const BG_COLOUR = '#231f20';
const SNAKE_COLOUR = '#c2c2c2';
const FOOD_COLOUR = '#f11';
const FOOD_COLOUR2 = '#ee1';
const ADRESS = "https://snakec.onrender.com";

const socket = io(ADRESS + ":3000");

socket.on('init', handleInit);
socket.on('gameState', handleGameState);
socket.on('gameOver', handleGameOver);
socket.on('gameStart', handleGameStart);
socket.on('playersLost', handlePlayersLost);
socket.on('playerJoined', handlePlayerJoined);
socket.on('playerReady', handlePlayerReady);
socket.on('gameCode', handleGameCode);
socket.on('unknownCode', handleUnknownCode);
socket.on('tooManyPlayers', handleTooManyPlayers);

const gameScreen = document.getElementById('gameScreen');
const initialScreen = document.getElementById('initialScreen');
const newGameBtn = document.getElementById('newGameButton');
const joinGameBtn = document.getElementById('joinGameButton');
const gameCodeInput = document.getElementById('gameCodeInput');
const playerNameInput = document.getElementById('playerNameInput');
const gameCodeDisplay = document.getElementById('gameCodeDisplay');
const readyBtn = document.getElementById('readyButton');
const playersList = document.getElementById('playersList');

let canvas, ctx;
let playerNumber;
let gameActive = false;
let ready = false;
let code;
let colors = [];
let roomPlayers = [];

newGameBtn.addEventListener('click', newGame);
joinGameBtn.addEventListener('click', joinGame);
readyBtn.addEventListener('click', readyToPlay);

function readyToPlay() {
  socket.emit('startGame', code, playerNumber);
  ready = true;
  gameActive = true;
  readyBtn.style.backgroundColor = "#eee";
}

function newGame() {
  const name = playerNameInput.value;

  if (name === '') {
    alert("You must input the name");
    return;
  }
  if (name.length > 20) {
    alert("To many symbols");
    return;
  }
  socket.emit('newGame', name);
  init();
}

function joinGame() {
  const code = gameCodeInput.value;
  const name = playerNameInput.value;
  if (name === '' || code === '') {
    alert("You must input the name and the code");
    return;
  }

	if (name.length > 20) {
    alert("To many symbols");
    return;
  }

  socket.emit('joinGame', code, name);
  init();
} 

function init() {
  initialScreen.style.display = "none";
  gameScreen.style.display = "block";

  canvas = document.getElementById('canvas');
  ctx = canvas.getContext('2d');

  canvas.width = canvas.height = 600;

  ctx.fillStyle = BG_COLOUR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  document.addEventListener('keydown', keydown);
}

function keydown(e) {
  socket.emit('keydown', e.keyCode);
}

function paintGame(state) {
  ctx.fillStyle = BG_COLOUR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const food = state.food;
  const gridsize = state.gridsize;
  const size = canvas.width / gridsize;

  
  for (let f of food) {
    if (f.q != 1)
      ctx.fillStyle = FOOD_COLOUR2;
    else
      ctx.fillStyle = FOOD_COLOUR;
    ctx.fillRect(f.x * size, f.y * size, size, size);
  }

  for (let i = 0; i < state.players.length; i++) {
    if (!state.players[i].alive) continue;
    paintPlayer(state.players[i], size, colors[i]);
  }

}

function paintPlayer(playerState, size, colour) {
  const snake = playerState.snake;

  ctx.fillStyle = colour;
  for (let cell of snake) {
    ctx.fillRect(cell.x * size, cell.y * size, size, size);
  }
  ctx.fillStyle = "#fff";
  ctx.fillRect(playerState.pos.x * size, playerState.pos.y * size, size, size);
}

function handleInit(number, players) {
  playerNumber = number;
  roomPlayers = players;
  roomPlayers.forEach(e => {
    let node = document.createElement('div');
    node.innerText = e.name;
    playersList.appendChild(node);
  });
}

function handleGameState(gameState) {
  if (!gameActive) {
    return;
  }
  gameState = JSON.parse(gameState);
  requestAnimationFrame(() => paintGame(gameState));
}

function handleGameOver(data) {
  if (!gameActive) {
    return;
  }
  data = JSON.parse(data);

  if (data.winner === playerNumber) {
    gameActive = false;
    alert('You Win!');
  }
}

function handleGameCode(gameCode) {
  gameCodeDisplay.innerText = gameCode;
  code = gameCode;
}

function handleUnknownCode() {
  reset();
  alert('Unknown Game Code')
}

function handleTooManyPlayers() {
  reset();
  alert('This game is already in progress');
}

function handlePlayersLost(data) {
  let loosers = JSON.parse(data).loosers;
  for (let i of loosers) {
    if (i === playerNumber) {
      gameActive = false;
      alert("You lost");
    }
  }
}

function handleGameStart(data) {
  let state = JSON.parse(data)["game"];
  colors = [];
  for (let i = 0; i < state.players.length; i++) {
    colors[i] = getRndColor();
    playersList.childNodes[i + 1].style.backgroundColor = colors[i];
  }
  gameActive = true;
}

function handlePlayerJoined(player) {
  let node = document.createElement('div');
  node.innerText = player.name
  playersList.appendChild(node);
}

function handlePlayerReady(player) {
  
}

function reset() {
  playerNumber = null;
  colors = [];
  roomPlayers = [];
  gameActive = false;
  gameCodeInput.value = '';
  initialScreen.style.display = "block";
  gameScreen.style.display = "none";
}

function getRndColor() {
  return '#' + randInt(0, 9) + randInt(0, 9) + randInt(0, 9);
}

function randInt(min, max) {
  return Math.floor(min + Math.random() * (max + 1 - min));
}
