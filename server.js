const { initGame, gameLoop, getUpdatedVelocity, addGamePlayer, 
  setLoosers, nPlayersAlive, getPlayersAlive } = require('./game');
const { FRAME_RATE, ADRESS } = require('./constans');
const { makeid } = require('./utils');

const path = require('path');
const express = require('express');
const app = express();

const http = require('http');
const io = require('socket.io')(http.createServer(), {
  cors: {
    origin: ADRESS + ":8000"
  }
});

const state = {};
const clientRooms = {};

app.use(express.static(path.resolve(__dirname, '..') + "/frontend/"));

app.get("/", (req,res) => {
  res.sendFile(path.resolve(__dirname, '..') + "/index.html");
})

app.listen(8000, ()=>console.log("Listening on http port 8000"));

io.on('connection', client => {
  client.on('keydown', handleKeydown);
  client.on('newGame', handleNewGame);
  client.on('joinGame', handleJoinGame);
  client.on('startGame', handleStartGame);

  function handleJoinGame(roomName, playerName) {
    const room = io.of('/').adapter.rooms.get(roomName);
    if (!room) return;
    if (!state[roomName]) return;    
    let numClients = room.length
    if (numClients === 0 || 
        state[roomName].players.length === state[roomName].playersReady.length) {
      client.emit('unknownCode');
      return;
    } else if (numClients > 10) {
      client.emit('tooManyPlayers');
      return;
    }
    client.emit('gameCode', roomName);

    clientRooms[client.id] = roomName;

    state[roomName] = addGamePlayer(state[roomName], playerName);
    client.number = state[roomName].players.length;
    client.playerName = playerName;
    emitPlayerJoined(roomName, state[roomName].players[client.number - 1]);
    client.join(roomName);
    client.emit('init', client.number, state[roomName].players);
  }

  function handleStartGame(roomName, number) {
    if (!state[roomName]) return;

    if (state[roomName].playersReady.includes(number)) {
      return;
    }

    state[roomName].playersReady.push(number);
    emitPlayerReady(roomName, {player: state[roomName].players[number - 1]});

    if (state[roomName].playersReady.length === state[roomName].players.length) {
      emitGameStart(roomName);
      startGameInterval(roomName);
    }
  }

  function handleNewGame(playerName) {
    let roomName = makeid(1);
    roomName = 'ASS';
    clientRooms[client.id] = roomName;
    client.emit('gameCode', roomName);

    state[roomName] = initGame([playerName]);

    client.join(roomName);
    client.number = 1;
    client.playerName = playerName;
    client.emit('init', 1, state[roomName].players);
  }

  function handleKeydown(keyCode) {
    const roomName = clientRooms[client.id];
    if (!roomName) return;
    
    if (!state[roomName]) return;
    try {	
      keyCode = parseInt(keyCode);
    } catch(e) {
      console.error(e);
      return;
    }
    if (!state[roomName].players[client.number - 1]) return;
    if (!state[roomName].players[client.number - 1].alive) return;

    const vel = getUpdatedVelocity(keyCode);
 
    if (vel) {
      if ((state[roomName].players[client.number - 1].vel.x == vel.x &&
        state[roomName].players[client.number - 1].vel.y == -vel.y) || 
        (state[roomName].players[client.number - 1].vel.x == -vel.x &&
        state[roomName].players[client.number - 1].vel.y == vel.y) )
	    return;	

      state[roomName].players[client.number - 1].vel = vel;
    }
  }
});

function startGameInterval(roomName) {
  let i = 0;  
  const intervalId = setInterval(() => {
    let loosers;
    if (i == 0)    {
      loosers = gameLoop(state[roomName]);
    }
    else {
      i--;
      loosers = false;
    }
    if (!loosers) {
      emitGameState(roomName, state[roomName])
    } else {
      state[roomName] = setLoosers(state[roomName], loosers);
      emitPlayerLost(roomName, loosers);
      if (nPlayersAlive(state[roomName]) < 2) {
        if (state[roomName].length == 0) return;
        emitGameOver(roomName, getPlayersAlive(state[roomName])[0]);
        state[roomName] = null;
        clearInterval(intervalId);
      }
    }
  }, 1000 / FRAME_RATE);
}

function emitPlayerReady(room, player) {
  io.sockets.in(room)
    .emit('playerReady', player);
}

function emitPlayerJoined(room, players) {
  io.sockets.in(room)
    .emit('playerJoined', players);
}

function emitGameStart(room) {
  io.sockets.in(room)
    .emit('gameStart', JSON.stringify({ "game": state[room] }));
}

function emitPlayerLost(room, loosers) {
  io.sockets.in(room)
    .emit('playersLost', JSON.stringify({ loosers }));
}

function emitGameState(room, gameState) {
  io.sockets.in(room)
    .emit('gameState', JSON.stringify(gameState));
}

function emitGameOver(room, winner) {
  io.sockets.in(room)
    .emit('gameOver', JSON.stringify({ winner }));
}

io.listen(process.env.PORT || 3000);