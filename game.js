const { GRID_SIZE } = require('./constans');
const { randInt } = require('./utils');

module.exports = {
  initGame,
  gameLoop,
  getUpdatedVelocity,
  addGamePlayer,
  nPlayersAlive,
  setLoosers,
  getPlayersAlive
}

function getPlayersAlive(state) {
  if (!state) return;

  let res = [];
  for (let i = 0; i < state.players.length; i++) {
    if (state.players[i].alive) res.push(i + 1);
  }

  return res;
}

function setLoosers(state, loosers) {
  if (!state) return;
  for (let i of loosers) {
    state.players[i-1].alive = false;
  }
  return state;
}

function nPlayersAlive(state) {
  if (!state) return;
  let res = 0;
  for (let player of state.players) {
    if (player.alive) {
      res++;
    }
  }
  return res;
}

function initGame(names) {
  const state = createGameState(1, names);
  state.food.push(randomFood(state));
  return state;
}

function addGamePlayer(state, name) {
  if (!state) return;
  state.players.push(createRandomPlayer(state, name));
  for (let i = 0; i < randInt(2, 10); i++)
    state.food.push(randomFood(state));
  return state;
}

function createGameState(n, names) {
  if (n === 0) return null;

  let state = {
    gameDelay: true,
    playersReady: [],
    food: [],
    gridsize: GRID_SIZE,
    players: []
  };

  for (let i = 0; i < n; i++) {
    state.players.push(createRandomPlayer(state, names[i]));
  }

  return state;
}

function createRandomPlayer(state, name) {
  let pos = {
    x: randInt(2, GRID_SIZE - 2),
    y: randInt(2, GRID_SIZE - 2)
  }
  let player = {
    pos: pos,
    vel: {
      x: 0,
      y: 0
    },
    snake: [
      {x: pos.x, y: pos.y - 2},
      {x: pos.x, y: pos.y  - 1},
      {x: pos.x, y: pos.y}
    ],
    name: name,
    alive: true
  };

  return player;
}

function gameLoop(state) {
  if (!state) return;
  let loosers = [];

  for (let player of state.players) {
    if (!player.alive) continue;

    player.pos.x += player.vel.x;
    player.pos.y += player.vel.y;
    if (player.vel.x === 0 && player.vel.y === 0 && !state.gameDelay) player.vel = getRndVel();

    if (player.pos.x < 0 || player.pos.x > GRID_SIZE || player.pos.y < 0 || player.pos.y > GRID_SIZE) {
      loosers.push(state.players.indexOf(player) + 1);
      continue;
    }
    for (let f of state.food) {
      if (f.x === player.pos.x && f.y === player.pos.y) {
        for (let j = 0; j < f.q; j++) {
              player.snake.push({ ...player.pos });
              player.pos.x += player.vel.x;
              player.pos.y += player.vel.y;
        }
        state.gameDelay = false;
        state.food.splice(state.food.indexOf(f), 1);
        state.food.push(randomFood(state));
      }
    }
    if (player.vel.x || player.vel.y) {
      for (let cell of player.snake) {
        if (cell.x === player.pos.x && cell.y === player.pos.y) {
          loosers.push(state.players.indexOf(player) + 1);
          break;
        }
      }
      let f = true;
      for (let p of state.players) {
        if (!p.alive || p === player) continue;
        for (let c of p.snake) {
          if (c.x === player.pos.x && c.y === player.pos.y) {
            f = false;
            loosers.push(state.players.indexOf(player) + 1);
            break;
          }
        }
      }
	    if (!f) continue;
  
      player.snake.push({ ...player.pos });
      player.snake.shift();
    }
  }

  if (loosers.length > 0) return loosers;

  return false;
}

function randomFood(state){

  food = {
    x: Math.floor(Math.random() * GRID_SIZE),
    y: Math.floor(Math.random() * GRID_SIZE),
    }
  if (Math.random() <= 0.609)
    food.q = randInt(4, 20);
  else
    food.q = 1;

  // обработка еды не в змее

  return food;
}

function getUpdatedVelocity(keyCode) {
  switch (keyCode) {
    case 37: { // left
      return { x: -1, y: 0 };
    }
    case 38: { // down
      return { x: 0, y: -1 };
    }
    case 39: { // right
      return { x: 1, y: 0 };
    }
    case 40: { // up
      return { x: 0, y: 1 };
    }
  }
}

function getRndVel(){
  switch (randInt(1, 4)){
    case 1: { // left
      return { x: -1, y: 0 };
    }
    case 2: { // down
      return { x: 0, y: -1 };
    }
    case 3: { // right
      return { x: 1, y: 0 };
    }
    case 4: { // up
      return { x: 0, y: 1 };
    }
  }
}