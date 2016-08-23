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
  'sprites/PNG/Abstract tiles/abstractTile_01.png',
  'sprites/PNG/Abstract tiles/abstractTile_02.png',
  'sprites/PNG/Abstract tiles/abstractTile_03.png',
  'sprites/PNG/Abstract tiles/abstractTile_04.png',
  'sprites/PNG/Abstract tiles/abstractTile_05.png',
  'sprites/PNG/Abstract tiles/abstractTile_06.png',
  'sprites/PNG/Abstract tiles/abstractTile_07.png',
  'sprites/PNG/Abstract tiles/abstractTile_08.png',
  'sprites/PNG/Abstract tiles/abstractTile_09.png',
  'sprites/PNG/Abstract tiles/abstractTile_10.png',
  'sprites/PNG/Abstract tiles/abstractTile_11.png',
  'sprites/PNG/Abstract tiles/abstractTile_12.png',
  'sprites/PNG/Abstract tiles/abstractTile_13.png',
  'sprites/PNG/Abstract tiles/abstractTile_14.png',
  'sprites/PNG/Abstract tiles/abstractTile_15.png',
  'sprites/PNG/Abstract tiles/abstractTile_16.png',
  'sprites/PNG/Abstract tiles/abstractTile_17.png',
  'sprites/PNG/Abstract tiles/abstractTile_18.png',
  'sprites/PNG/Abstract tiles/abstractTile_19.png',
  'sprites/PNG/Abstract tiles/abstractTile_20.png',

]

var testTexture = PIXI.Texture.fromImage(imgResources[0])
var playerTexture = PIXI.Texture.fromImage(imgResources[9])

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
  //container.addChild(hudContainer)


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
  let time = generateTime()

  hudContainer.addChild(time)

  return hudContainer
}

function paintHUD () {
  paintPing()
  paintFPS()
  paintPlayersInfo()
  paintTime()
}

function generateTime () {
  let startTime = game.startTime
  let time = (Date.now() - startTime) / 1000
  let minutes = Math.floor(time / 60)
  let seconds = Math.floor(time % 60)
  if (seconds < 10) seconds = '0' + seconds
  let game_time = minutes + ':' + seconds

  var style = {
      font : '15px Lucida Console',
      fill : '#FFFFFF',
  };

  let timeText = new PIXI.Text(game_time, style)
  timeText.x = 800
  timeText.y = 25

  return timeText
  /*
  ctx.fillStyle = 'rgba(255, 255, 255, 1)';
  ctx.fillRect(580, 15, 100, 12)
  ctx.fillStyle = "black";
  ctx.font = "10px Lucida Console";
  ctx.fillText(game_time, 580, 25);
  */
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

function getRotatedPos (map, x, y) {
  let xMapCenter = map.length
  let yMapCenter = map[0].length
  let xTranslated = x - xMapCenter
  let yTranslated = y - yMapCenter
  let xRotated = xTranslated * Math.cos(-45) - yTranslated * Math.cos(-45)
  let yRotated = yTranslated * Math.sin(-45) + yTranslated * Math.cos(-45)
  let xNewPos = xRotated + xMapCenter
  let yNewPos = yRotated + yMapCenter
  return {xNewPos, yNewPos}
}

function paintPlayer (map, x, y, team, scale) {
  const {xNewPos, yNewPos} = getRotatedPos(map, x, y)
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
  return cell

  /*
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
  ctx.stroke()*/
}

function paintMapCell (map, x, y, scale) {
  const {xNewPos, yNewPos} = getRotatedPos(map, x, y)
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
  return cell
/*
  var value = map[x][y] % 10
  var team = Math.floor(map[x][y] / 10)
  var finalColor = 0x0
  var color = Math.floor(255 / 4 * (value + 1))
  if (color > 255) color = 255
  switch (team) {
    case 1:
      finalColor += color * 0x10000
      break
    case 2:
      finalColor += color * 0x100
      break
    case 3:
      finalColor += color * 0x1
      break
    case 4:
      finalColor += color * 0x100 + color
      break
  }
  cell.tint = finalColor
*/
}
