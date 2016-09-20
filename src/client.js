/* global myCanvas, requestAnimationFrame */
const io = require('socket.io-client')
const { Game } = require('./Game.js')
const { Turn } = require('./Turn.js')
const C = require('./constants.js')

var game = new Game()
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

socket.on('game:name', () => {
  let name = prompt('Enter your name')
  socket.emit('game:name', name)
})

socket.on('game:state', (state, turnIndex) => {
  const { board, painters, inputs } = state.turn
  const turn = new Turn(board, painters, inputs)

  game.turn = turn
  game.turns = [turn]
  game.players = state.players
  game.interval = state.interval
  game.teams = state.teams
  game.lastTurn = state.timestamp + clientLead
})

//socket.on('connect', () => { socket.emit('joinGame', prompt('Insert game name:')) })
socket.on('game:start', () => game.start())
socket.on('game:restart', () => {
  reset_renderer()
  game.restart()
})

socket.on('changeDir', (socketId, dir, turnIndex) => {
  if (socketId === `/#${socket.id}`) return
  game.onChangeDir({ id: socketId }, dir, turnIndex)
})

const KEY = {
  W: 87,
  A: 65,
  S: 83,
  D: 68
}

const STATE = {
  UP: 0,
  DOWN: 1
}

const DIR_FOR_KEY = {
  [KEY.W]: C.UP,
  [KEY.A]: C.LEFT,
  [KEY.S]: C.DOWN,
  [KEY.D]: C.RIGHT
}

var key_state = {
  [KEY.W]: STATE.UP,
  [KEY.A]: STATE.UP,
  [KEY.S]: STATE.UP,
  [KEY.D]: STATE.UP
}

document.addEventListener('keydown', function (e) {
  let state = key_state[e.keyCode]
  if (state != null && state === STATE.UP) {
    key_state[e.keyCode] = STATE.DOWN
    const dir = DIR_FOR_KEY[e.keyCode]
    const turnIndex = game.turns.length - 1
    game.onChangeDir({ id: `/#${socket.id}` }, dir, turnIndex)
    socket.emit('changeDir', dir, turnIndex)
  }
})

document.addEventListener('keyup', function (e) {
  let state = key_state[e.keyCode]
  if (state != null && state === STATE.DOWN) key_state[e.keyCode] = STATE.UP
})









const PIXI = require('pixi.js')

var renderer = new PIXI.autoDetectRenderer(C.GAME_WIDTH, C.GAME_HEIGHT)
document.getElementById("game").appendChild(renderer.view)

var container = new PIXI.Container()
var scene = new PIXI.Container()
var hud = new PIXI.Container()

var cellTexture = new PIXI.Texture.fromImage('sprites/GameSprites/white_ground.png')
var finalCellTexture = new PIXI.Texture.fromImage('sprites/GameSprites/final_ground.png')
var playerTexture = new PIXI.Texture.fromImage('sprites/PNG/Platformer tiles/platformerTile_04.png')

container.addChild(scene)
container.addChild(hud)

var spritesMap
var spritesPlayers
var hudData

function initialize_renderer () {
  spritesMap = createMapSprites()
  spritesPlayers = createPlayersSprites()
  hudData = createHUD()
}

function reset_renderer () {
  for (let i = 0; i < C.BOARD_SIZE; ++i) {
    for (let j = 0; j < C.BOARD_SIZE; ++j) {
      spritesMap[i][j].setTexture(cellTexture)
    }
  }
}

initialize_renderer()

requestAnimationFrame(loop)
function loop () {
  requestAnimationFrame(loop)

  const now = Date.now()
  let frames = 1
  while (now - game.lastTurn >= game.interval) {
    game.tick()
    game.lastTurn += game.interval
    ++frames
  }
  let time_passed = (Date.now() - game.lastTurn) / 1000
  if(time_passed > 0.1) fps = Math.round(frames / time_passed)

  refreshMap()
  refreshPlayers()
  refreshHud()
  renderer.render(container)
}

function createMapSprites () {
  let n = C.BOARD_SIZE

  // Generating the sprites map
  let map = new Array(n)
  for (let i = 0; i < n; ++i) {
    map[i] = new Array(n)
    for (let j = 0; j < n; ++j) {
      let sprite = new PIXI.Sprite(cellTexture)
      let {newxPosition, newyPosition} = getNewPos(i, j)
      sprite.position = {x: newxPosition, y: newyPosition}
      sprite.scale = {x: 0.2, y: 0.2}
      map[i][j] = sprite
    }
  }

  // Adding the sprites to the scene
  for (let slice = 0; slice < 2 * n - 1; ++slice) {
    let z = slice < n ? 0 : slice - n + 1
    for (let j = z; j <= slice - z; ++j) {
      let cell = map[j][slice - j]
      scene.addChild(cell)
    }
  }

  return map
}

function createPlayersSprites () {
  // There are 4 teams
  let playersArray = new Array(4)
  for (let team = 0; team < 4; ++team) {
    // There are maximum 4 players for each team
    playersArray[team] = new Array(4)
    for (let player = 0; player < 4; ++player) {
      let sprite = new PIXI.Sprite(playerTexture)
      sprite.scale = {x: 0.2, y: 0.2}
      switch (team) {
        case 0: sprite.tint = 0xFF0000; break;
        case 1: sprite.tint = 0x00FF00; break;
        case 2: sprite.tint = 0x0000FF; break;
        case 3: sprite.tint = 0xFFFF00; break;
      }
      playersArray[team][player] = sprite
      scene.addChild(sprite)
    }
  }
  return playersArray
}

function createHUD () {
  let style = {fontFamily : 'Lucida Console', fontSize: 10, fill : 0xffffff}

  let hud_map = {}

  hud_map.time = new PIXI.Text('', style)
  hud_map.players = new PIXI.Text('', style)
  hud_map.ping = new PIXI.Text('', style)
  hud_map.fps = new PIXI.Text('', style)

  hud_map.time.position.set(800, 25)
  hud_map.players.position.set(500, 25)
  hud_map.ping.position.set(800, 40)
  hud_map.fps.position.set(800, 55)

  hud.addChild(hud_map.time)
  hud.addChild(hud_map.players)
  hud.addChild(hud_map.ping)
  hud.addChild(hud_map.fps)

  return hud_map
}

function refreshMap () {
  let n = C.BOARD_SIZE
  let board = game.turn.board
  for (let i = 0; i < n; ++i) {
    for (let j = 0; j < n; ++j) {
      let cell = spritesMap[i][j]
      let value = board[i][j]
      cell.tint = getColor(value)
      if (value % 10 === 4) cell.texture = finalCellTexture
    }
  }
}

function refreshPlayers () {
  let teams = game.teams
  let players = game.turn.painters
  for (let team = 0; team < 4; ++team) {
    for(let pl = 0; pl < 4; ++pl) {
      let playerId = teams[team][pl]
      if(playerId == null) continue
      let player = players[playerId]
      let sprite = spritesPlayers[team][pl]
      let {newxPosition, newyPosition} = getNewPlayerPos(player.i, player.j)
      sprite.position = {x : newxPosition, y: newyPosition}
    }
  }
}

function refreshHud () {
  let time = getTime()
  let players = getPlayers()
  let ping = getPing()
  let fps = getFps()

  hudData.time.text = 'Time: ' + time
  hudData.players.text = players
  hudData.ping.text = 'Ping: ' + ping
  hudData.fps.text = 'FPS: ' + fps
}

function getNewPos (x, y) {
  let width = 111 * C.SCALE
  let height = 128 * C.SCALE

  let xshift = width / 2
  let yshift = height / 4
  let xAddedValue = x >= y ? (x - y) * -xshift : (y - x) * xshift
  let yAddedValue = (x + y + 4) * yshift - yshift * 2

  let xMapCenter = C.BOARD_SIZE / 2
  let yMapCenter = C.BOARD_SIZE / 2
  let xcenter = xMapCenter * width
  let ycenter = yMapCenter * (height / 2)
  let newxPosition = xcenter + xAddedValue
  let newyPosition = yAddedValue

  return {newxPosition, newyPosition}
}

function getNewPlayerPos (x, y) {
  let width = 111 * C.SCALE
  let height = 128 * C.SCALE

  let xshift = width / 2
  let yshift = height / 4
  let xAddedValue = x >= y ? (x - y) * -xshift : (y - x) * xshift
  let yAddedValue = (x + y + 4) * yshift - yshift * 2

  let xMapCenter = C.BOARD_SIZE / 2
  let yMapCenter = C.BOARD_SIZE / 2
  let xcenter = xMapCenter * width
  let ycenter = yMapCenter * (height / 2)
  let newxPosition = xcenter + xAddedValue
  let newyPosition = yAddedValue - height / 2

  return {newxPosition, newyPosition}
}

function getColor (map_value) {
  var value = map_value % 10
  var team = Math.floor(map_value / 10)
  var color = Math.floor(255 / 4 * (value + 1))
  if (color > 255) color = 255
  switch (team) {
    case 0: return 0xFFFFFF
    case 1: return color * 0x10000
    case 2: return color * 0x100
    case 3: return color * 0x1
    case 4: return color * 0x100 + color
  }
}

function getTime () {
  if (game.state === C.GAME_NOT_STARTED) return 'Not started'
  let startTime = game.startTime
  let time = (Date.now() - startTime) / 1000
  let minutes = Math.floor(time / 60)
  let seconds = Math.floor(time % 60)
  if (seconds < 10) seconds = '0' + seconds
  let game_time = minutes + ':' + seconds
  return game_time
}

function getPlayers () {
  let text = 'List of players:\n'
  let players = game.turn.painters
  for(let i = 0; i < players.length; ++i) {
    if(players[i] == null) continue
    let name = players[i].name
    text += ' - ' + name + '\n'
  }
  return text
}

function getPing () {
  return ping
}

function getFps () {
  return fps
}
