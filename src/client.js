/* global myCanvas, requestAnimationFrame */
const io = require('socket.io-client')
const { Game } = require('./Game.js')
const { Turn } = require('./Turn.js')
const C = require('./constants.js')

const game = new Game()
const socket = io()

let debug = 0

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
  if (debug) console.log('Game State received')
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
  if (debug) console.log('changeDir received', socketId, dir, turnIndex)
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
  if (debug) console.log('changeDir send', socket.id, dir, turnIndex)
})









const PIXI = require('pixi.js')

var rendererOptions = {
  antialiasing: false,
  transparent: false,
  resolution: window.devicePixelRatio,
  autoResize: true,
}

var renderer = new PIXI.autoDetectRenderer(C.GAME_WIDTH, C.GAME_HEIGHT, rendererOptions)

renderer.view.style.position = "absolute";
renderer.view.style.top = "0px";
renderer.view.style.left = "0px";

document.body.appendChild(renderer.view)

var container = new PIXI.Container()

var imgResources = [
  'sprites/PNG/Platformer tiles/platformerTile_01.png',
  'sprites/PNG/Platformer tiles/platformerTile_02.png',
  'sprites/PNG/Platformer tiles/platformerTile_03.png',
  'sprites/PNG/Platformer tiles/platformerTile_04.png',
  'sprites/PNG/Platformer tiles/platformerTile_05.png',
  'sprites/PNG/Platformer tiles/platformerTile_06.png',
  'sprites/PNG/Platformer tiles/platformerTile_07.png',
  'sprites/PNG/Platformer tiles/platformerTile_08.png',
  'sprites/PNG/Platformer tiles/platformerTile_09.png',
  'sprites/PNG/Platformer tiles/platformerTile_10.png',
  'sprites/PNG/Platformer tiles/platformerTile_11.png',
  'sprites/PNG/Platformer tiles/platformerTile_12.png',
  'sprites/PNG/Platformer tiles/platformerTile_13.png',
  'sprites/PNG/Platformer tiles/platformerTile_14.png',
  'sprites/PNG/Platformer tiles/platformerTile_15.png',
  'sprites/PNG/Platformer tiles/platformerTile_16.png',
  'sprites/PNG/Platformer tiles/platformerTile_17.png',
  'sprites/PNG/Platformer tiles/platformerTile_18.png',
  'sprites/PNG/Platformer tiles/platformerTile_19.png',
  'sprites/PNG/Platformer tiles/platformerTile_20.png',

]

var testTexture = PIXI.Texture.fromImage(imgResources[2])
var playerTexture = PIXI.Texture.fromImage(imgResources[3])

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

  let mapContainer = generateMap()
  let hudContainer = generateHUD()
  container.addChild(mapContainer)
  container.addChild(hudContainer)

  renderer.render(container)
}

function generateMap () {
  const turn = game.turn

  let mapContainer = new PIXI.Container()
  let n = turn.board.length

  for (let slice = 0; slice < 2 * n - 1; ++slice) {
    let z = slice < n ? 0 : slice - n + 1
    for (let j = z; j <= slice - z; ++j) {
      let cell = paintMapCell(turn.board, j, slice - j, 0.2)
      mapContainer.addChild(cell)
    }
  }

  game.turn.painters.forEach((painter) => {
    let player = paintPlayer(turn.board, painter.i, painter.j, painter.team, 0.2)
    mapContainer.addChild(player)
  })

  return mapContainer
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

function paintPlayer (map, x, y, team, scale) {
  const {xNewPos, yNewPos} = isoTo2D(map, x, y)
  let width = playerTexture.width * scale
  let height = playerTexture.height * scale
  let xshift = width / 2
  let yshift = height / 4
  let xAddedValue = x >= y ? (x - y) * -xshift : (y - x) * xshift
  let yAddedValue = (x + y) * yshift - yshift * 2

  let xMapCenter = map.length / 2
  let yMapCenter = map[0].length / 2
  let xcenter = xMapCenter * width
  let ycenter = yMapCenter * (height / 2)
  let newxPosition = xcenter + xAddedValue
  let newyPosition = yAddedValue

  var cell = new PIXI.Sprite(playerTexture)
  cell.position.x = newxPosition
  cell.position.y = newyPosition
  cell.scale.x = scale
  cell.scale.y = scale
  switch (team) {
    case 1: cell.tint = 0xFF0000; break;
    case 2: cell.tint = 0x00FF00; break;
    case 3: cell.tint = 0x0000FF; break;
    case 4: cell.tint = 0xFFFF00; break;
  }
  return cell
}

function paintMapCell (map, x, y, scale) {
  const {xNewPos, yNewPos} = isoTo2D(map, x, y)
  let width = testTexture.width * scale
  let height = testTexture.height * scale
  let xshift = width / 2
  let yshift = height / 4
  let xAddedValue = x >= y ? (x - y) * -xshift : (y - x) * xshift
  let yAddedValue = (x + y) * yshift

  let xMapCenter = map.length / 2
  let yMapCenter = map[0].length / 2
  let xcenter = xMapCenter * width
  let ycenter = yMapCenter * (height / 2)
  let newxPosition = xcenter + xAddedValue
  let newyPosition = yAddedValue

  var cell = new PIXI.Sprite(testTexture)
  cell.position.x = newxPosition
  cell.position.y = newyPosition
  cell.scale.x = scale
  cell.scale.y = scale

  var value = map[x][y] % 10
  var team = Math.floor(map[x][y] / 10)
  var color = Math.floor(255 / 4 * (value + 1))
  if (color > 255) color = 255
  switch (team) {
    case 1: cell.tint = color * 0x10000; break
    case 2: cell.tint = color * 0x100; break;
    case 3: cell.tint = color * 0x1; break;
    case 4: cell.tint = color * 0x100 + color; break;
  }

  return cell
}
