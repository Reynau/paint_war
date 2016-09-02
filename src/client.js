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
socket.on('game:restart', () => game.restart())

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
})









const PIXI = require('pixi.js')

var rendererOptions = {
  antialiasing: false,
}

var renderer = new PIXI.autoDetectRenderer(C.GAME_WIDTH, C.GAME_HEIGHT, rendererOptions)

var container = new PIXI.Container()
var scene = new PIXI.Container()
var hud = new PIXI.Container()

var cellTexture = new PIXI.Texture.fromImage('sprites/PNG/Platformer tiles/platformerTile_03.png')
var playerTexture = new PIXI.Texture.fromImage('sprites/PNG/Platformer tiles/platformerTile_04.png')

container.addChild(scene)

document.body.appendChild(renderer.view)

var spritesMap = createMapSprites()
var spritesPlayers = createPlayersSprites()

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

function refreshMap () {
  let n = C.BOARD_SIZE
  let board = game.turn.board
  for (let i = 0; i < n; ++i) {
    for (let j = 0; j < n; ++j) {
      let cell = spritesMap[i][j]
      cell.tint = getColor(board[i][j])
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

function generateHUD () {
  let hudContainer = new PIXI.Container()

  let style = {
      fontFamily : 'Lucida Console',
      fontSize : '15px',
      fill : '#FFFFFF',
  }

  let time = generateTime(style)
  let ping = generatePing(style)
  let fps = generateFPS(style)
  let playersInfo = generatePlayersInfo(style)

  hudContainer.addChild(time)
  hudContainer.addChild(ping)
  hudContainer.addChild(fps)
  hudContainer.addChild(playersInfo)

  return hudContainer
}

function paintHUD () {
  paintPing()
  paintFPS()
  paintPlayersInfo()
  paintTime()
}

function generateTime (style) {
  let startTime = game.startTime
  let time = (Date.now() - startTime) / 1000
  let minutes = Math.floor(time / 60)
  let seconds = Math.floor(time % 60)
  if (seconds < 10) seconds = '0' + seconds
  let game_time = minutes + ':' + seconds

  let timeText = new PIXI.Text(game_time, style)
  timeText.x = 800
  timeText.y = 25

  return timeText
}

function generatePlayersInfo (style) {
  let text = 'List of players:\n'
  let players = game.turn.painters
  for(let i = 0; i < players.length; ++i) {
    let name = players[i].name
    text += ' - ' + name + '\n'
  }
  let playersText = new PIXI.Text(text, style)
  playersText.x = 900
  playersText.y = 25
  return playersText
}

function generateFPS (style) {
  let fpsText = new PIXI.Text('FPS: ' + fps, style)
  fpsText.x = 800
  fpsText.y = 40
  return fpsText
}

function generatePing (style) {
  let pingText = new PIXI.Text('Ping: ' + ping, style)
  pingText.x = 800
  pingText.y = 60
  return pingText
}

function isoTo2D (x, y) {
  let xNewPos = x - y
  let yNewPos = (x + y) / 2
  return {xNewPos, yNewPos}
}

function twoDToIso (x, y) {
  let xNewPos = (2 * y + x) / 2
  let yNewPos = (2 * y - x) / 2
  return {xNewPos, yNewPos}
}

function getNewPos (x, y) {
  let width = 111 * C.SCALE
  let height = 128 * C.SCALE

  let xshift = width / 2
  let yshift = height / 4
  let xAddedValue = x >= y ? (x - y) * -xshift : (y - x) * xshift
  let yAddedValue = (x + y) * yshift - yshift * 2

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
  let yAddedValue = (x + y) * yshift - yshift * 2

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
