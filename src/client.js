/* global myCanvas, requestAnimationFrame */
const io = require('socket.io-client')
const { Game } = require('./Game.js')
const { Turn } = require('./Turn.js')
const C = require('./constants.js')

const game = new Game()
const socket = io()

let sentPing
let ping = ''
let fps = ''
// client's Date.now() - server's Date.now()
let clientLead = 0

function sendPing () {
  sentPing = Date.now()
  socket.emit('game:ping')
}
sendPing()

socket.on('game:pong', (serverNow) => {
  ping = (Date.now() - sentPing) / 2
  clientLead = Date.now() - (serverNow + ping)
  setTimeout(sendPing, 500)
})

socket.on('game:state', (state, turnIndex) => {
  console.log('Game State received')
  const { board, painters, inputs } = state.turn
  const turn = new Turn(board, painters, inputs)

  game.turn = turn
  game.turns = [turn]
  game.players = state.players
  game.interval = state.interval
  game.lastTurn = state.timestamp + clientLead
})

//socket.on('connect', () => { socket.emit('joinGame', prompt('Insert game name:')) })
socket.on('game:start', () => game.start())
socket.on('game:restart', () => game.restart())

socket.on('changeDir', (socketId, dir, turnIndex) => {
  // don't apply your own input changes, may cause render flicker when
  // multiple input changes were sent in the same turn

  console.log('changeDir received', socketId, dir, turnIndex)
  if (socketId === `/#${socket.id}`) return
  game.onChangeDir({ id: socketId }, dir, turnIndex)
})

myCanvas.width = window.innerWidth
myCanvas.height = window.innerHeight
const ctx = myCanvas.getContext('2d')

requestAnimationFrame(loop)
function loop () {
  requestAnimationFrame(loop)

  const now = Date.now()
  let time_passed = (now - game.lastTurn) / 1000
  let frames = 1
  while (now - game.lastTurn >= game.interval) {
    game.tick()
    game.lastTurn += game.interval
    ++frames
  }
  if(time_passed > 0.1) fps = Math.round(frames / time_passed)

  const turn = game.turn
  for (let i = 0; i < turn.board.length; ++i) {
    const row = turn.board[i]
    for (let j = 0; j < row.length; ++j) {
      paintMapCell(turn.board, i, j)
    }
  }

  game.turn.painters.forEach((painter) => paintPlayer(game.board, painter.i, painter.j, painter.team))

  paintHUD()
}

function paintHUD () {
  paintPing()
  paintFPS()
  paintPlayersInfo()
  paintTime()
}

function paintTime () {
  let startTime = game.startTime
  let time = (Date.now() - startTime) / 1000
  let minutes = Math.floor(time / 60)
  let seconds = Math.floor(time % 60)
  if (seconds < 10) seconds = '0' + seconds
  let game_time = minutes + ':' + seconds
  ctx.fillStyle = 'rgba(255, 255, 255, 1)';
  ctx.fillRect(580, 15, 100, 12)
  ctx.fillStyle = "black";
  ctx.font = "10px Lucida Console";
  ctx.fillText(game_time, 580, 25);
}

function paintPlayersInfo () {
  ctx.fillStyle = 'rgba(255, 255, 255, 1)';
  ctx.fillRect(520, 30, 100, 250)
  ctx.fillStyle = "black";
  ctx.font = "10px Lucida Console";
  ctx.fillText('List of players:', 525, 40);
  let players = game.turn.painters
  for(let i = 0; i < players.length; ++i) {
    let name = players[i].name
    ctx.fillText('- ' + name, 530, 55 + i * 12);
  }
}

function paintFPS () {
  ctx.fillStyle = 'rgba(255, 255, 255, 1)';
  ctx.fillRect(520, 15, 60, 15)
  ctx.fillStyle = "black";
  ctx.font = "10px Lucida Console";
  ctx.fillText('FPS: ' + fps, 525, 25);
}

function paintPing () {
  ctx.fillStyle = 'rgba(255, 255, 255, 1)';
  ctx.fillRect(520, 0, 80, 15)
  ctx.fillStyle = "black";
  ctx.font = "10px Lucida Console";
  ctx.fillText('Ping: ' + ping, 525, 10);
}

function paintPlayer (board, i, j, team) {
  let cw = C.CELL_WIDTH
  let r = cw / 2
  switch (team) {
    case 1:
      ctx.fillStyle = 'rgba(255, 0, 0, 1)'
      break
    case 2:
      ctx.fillStyle = 'rgba(0, 255, 0, 1)'
      break
    case 3:
      ctx.fillStyle = 'rgba(0, 0, 255, 1)'
      break
    case 4:
      ctx.fillStyle = 'rgba(255, 255, 0, 1)'
      break
  }
  ctx.beginPath()
  ctx.arc(j * cw + r, i * cw + r, r, 0, 2 * Math.PI, false)
  ctx.strokeStyle = 'white'
  ctx.fill()
  ctx.stroke()
}

function paintMapCell (map, x, y) {
  var value = map[x][y] % 10
  var team = Math.floor(map[x][y] / 10)
  var color = Math.floor(255 / 4 * (value + 1))
  if (color > 255) color = 255
  switch (team) {
    case 0:
      ctx.fillStyle = 'rgba(127, 127, 127, 1)'
      ctx.strokeStyle = 'white'
      break
    case 1:
      ctx.fillStyle = 'rgba(' + color + ', 0, 0, 1)'
      ctx.strokeStyle = 'white'
      break
    case 2:
      ctx.fillStyle = 'rgba(0, ' + color + ', 0, 1)'
      ctx.strokeStyle = 'white'
      break
    case 3:
      ctx.fillStyle = 'rgba(0, 0, ' + color + ', 1)'
      ctx.strokeStyle = 'white'
      break
    case 4:
      ctx.fillStyle = 'rgba(' + color + ', ' + color + ', 0, 1)'
      ctx.strokeStyle = 'white'
      break
  }
  let cw = C.CELL_WIDTH
  let aux = x
  x = y
  y = aux
  ctx.fillRect(x * cw, y * cw, cw, cw)
  ctx.strokeRect(x * cw, y * cw, cw, cw)
  if (value === 4) {
    ctx.beginPath()
    ctx.moveTo(x * cw, y * cw)
    ctx.lineTo(x * cw + cw, y * cw + cw)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(x * cw + cw, y * cw)
    ctx.lineTo(x * cw, y * cw + cw)
    ctx.stroke()
  }
}

const KEY = {
  W: 87,
  A: 65,
  S: 83,
  D: 68
}

const DIR_FOR_KEY = {
  [KEY.W]: C.UP,
  [KEY.A]: C.LEFT,
  [KEY.S]: C.DOWN,
  [KEY.D]: C.RIGHT
}

document.addEventListener('keydown', function (e) {
  const dir = DIR_FOR_KEY[e.keyCode]
  if (dir == null) return
  const turnIndex = game.turns.length - 1
  game.onChangeDir({ id: `/#${socket.id}` }, dir, turnIndex)
  socket.emit('changeDir', dir, turnIndex)
  console.log('changeDir send', socket.id, dir, turnIndex)
})
