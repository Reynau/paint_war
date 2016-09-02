const PIXI = require('pixi.js')

class Renderer {

  constructor (width = C.GAME_WIDTH, height = C.GAME_HEIGHT, length = C.BOARD_SIZE) {
    this.renderer = new PIXI.autoDetectRenderer(width, height)
    this.scene = new PIXI.Container()
    this.hud = new PIXI.Container()

    this.renderer.addChild(this.scene)
    //this.renderer.addChild(this.hud)

    document.body.appendChild(this.renderer.view)
  }

  render (turn) {
    renderMap(turn.board)
    renderPlayers(turn.board, turn.painters)
  }

  renderPlayers (board, players) {
    players.forEach((player) => this.renderPlayer(player, board, 0.2))
  }

  renderMap (board) {
    let n = board.length
    for (let slice = 0; slice < 2 * n - 1; ++slice) {
      let z = slice < n ? 0 : slice - n + 1
      for (let j = z; j <= slice - z; ++j) {
        this.renderMapCell(board, j, slice - j, 0.2)
      }
    }
  }

  renderPlayer (player, board, scale) {
    let {x, y} = player.position
    let width = player.texture.width * scale
    let height = player.texture.height * scale
    let xshift = width / 2
    let yshift = height / 4
    let xAddedValue = x >= y ? (x - y) * -xshift : (y - x) * xshift
    let yAddedValue = (x + y) * yshift - yshift * 2

    let xMapCenter = board.length / 2
    let yMapCenter = board.length / 2
    let xcenter = xMapCenter * width
    let ycenter = yMapCenter * (height / 2)
    let newxPosition = xcenter + xAddedValue
    let newyPosition = yAddedValue

    var cell = player.sprite
    cell.position = {x: newxPosition, y: newyPosition}
    cell.scale = {x: scale, y: scale}

    switch (team) {
      case 1: cell.tint = 0xFF0000; break;
      case 2: cell.tint = 0x00FF00; break;
      case 3: cell.tint = 0x0000FF; break;
      case 4: cell.tint = 0xFFFF00; break;
    }

    this.scene.addChild(cell)
  }

  renderMapCell (map, x, y, scale) {
    //const {xNewPos, yNewPos} = isoTo2D(map, x, y)
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

    var cell = this.spriteMap[x][y]
    cell.position = {x: newxPosition, y: newyPosition}
    cell.scale = {x: scale, y:scale}

    var team = Math.floor(map[x][y] / 10)
    var value = map[x][y] % 10
    var color = Math.floor(255 / 4 * (value + 1))
    if (color > 255) color = 255
    switch (team) {
      case 1: cell.tint = color * 0x10000; break
      case 2: cell.tint = color * 0x100; break;
      case 3: cell.tint = color * 0x1; break;
      case 4: cell.tint = color * 0x100 + color; break;
    }

    this.scene.addChild(cell)
  }
}
