const io = require('socket.io-client')
const { Game } = require('./Game.js')
const { Turn } = require('./Turn.js')
const C = require('./constants.js')
const PIXI = require('pixi.js')

function getColor (map_value) {
  let value = map_value % 10
  let team = Math.floor(map_value / 10)
  let color = Math.floor(255 / 4 * (value + 1))
  if (color > 255) color = 255
  switch (team) {
    case 0: return 0xFFFFFF
    case 1: return color * 0x10000
    case 2: return color * 0x100
    case 3: return color
    case 4: return color * 0x100 + color
  }
}

function getNewPlayerPos (x, y) {
  let width = 111 * C.SCALE
  let height = 128 * C.SCALE

  let xshift = width / 2
  let yshift = height / 4
  let xAddedValue = x >= y ? (x - y) * -xshift : (y - x) * xshift
  let yAddedValue = (x + y + 4) * yshift - yshift * 2

  let xMapCenter = C.BOARD_SIZE / 2
  let xcenter = xMapCenter * width
  let newxPosition = xcenter + xAddedValue
  let newyPosition = yAddedValue - height / 2

  return {newxPosition, newyPosition}
}

function getNewPos (x, y) {
  let width = 111 * C.SCALE
  let height = 128 * C.SCALE

  let xshift = width / 2
  let yshift = height / 4
  let xAddedValue = x >= y ? (x - y) * -xshift : (y - x) * xshift
  let yAddedValue = (x + y + 4) * yshift - yshift * 2

  let xMapCenter = C.BOARD_SIZE / 2
  let xcenter = xMapCenter * width
  let newxPosition = xcenter + xAddedValue
  let newyPosition = yAddedValue

  return {newxPosition, newyPosition}
}

class Client {

  constructor () {
    this.game = new Game()
    this.show_hud = true

    // Client vars
    this.socket = undefined
    this.client_lead = undefined
    this.time_sent_ping = undefined

    // Game vars
    this.frames = 0

    // Hud vars
    this.style = {
      fontFamily : 'Lucida Console',
      fontSize: 10,
      fill : 0xffffff
    }

    this.startTime = undefined
    this.ping = undefined
    this.fps = undefined
    this.last_fps_refresh = 0

    this.hud_ping = new PIXI.Text('', this.style)
    this.hud_time = new PIXI.Text('', this.style)
    this.hud_fps = new PIXI.Text('', this.style)
    this.hud_players = new PIXI.Text('', this.style)

    // Renderer
    this.renderer = new PIXI.autoDetectRenderer(C.GAME_WIDTH, C.GAME_WEIGH)
    this.stage = new PIXI.Container()
    this.scene = new PIXI.Container()
    this.hud = new PIXI.Container()

    // Texture
    this.tile_texture = new PIXI.Texture.fromImage('sprites/GameSprites/white_ground.png')
    this.fixed_tile_texture = new PIXI.Texture.fromImage('sprites/GameSprites/final_ground.png')
    this.player_texture = new PIXI.Texture.fromImage('sprites/PNG/Platformer tiles/platformerTile_04.png')

    // Sprites
    this.map_sprites = undefined
    this.player_sprites = undefined
  }

  // Initialize the client
  init () {
    document.getElementById("game").appendChild(this.renderer.view)

    this.socket = io()

    this.init_renderer()
    this.init_socket()
    this.init_dom_listeners()
    this.create_map_sprites()
    this.create_player_sprites()
    this.create_hud()

    this.loop()
  }

  // Initialize the renderer linking the scene and the hud with the stage
  init_renderer () {
    this.stage.addChild(this.scene)
    if(this.show_hud) this.stage.addChild(this.hud)
  }

  // Internal loop of the client
  loop () {
    let self = this
    requestAnimationFrame(() => self.loop())

    this.refresh_logic()
    this.synchronize_renderer()
    this.render()
    this.calculate_fps()
  }

  // Executes the logic
  refresh_logic () {
    if (this.game.state === C.GAME_NOT_STARTED)  return

    while (Date.now() - this.game.lastTurn >= this.game.interval) {
      this.game.tick()
      this.game.lastTurn += this.game.interval
    }
  }

  // Synchronize logic with the renderer
  synchronize_renderer () {
    this.synchronize_map()
    this.synchronize_players()
    this.synchronize_hud()
  }

  // Synchronize the map with the map sprites
  synchronize_map () {
    let board = this.game.turn.board
    for (let i = 0; i < C.BOARD_SIZE; ++i) {
      for (let j = 0; j < C.BOARD_SIZE; ++j) {
        let cell = this.map_sprites[i][j]
        let value = board[i][j]
        cell.tint = getColor(value)
        if (value % 10 === 4) cell.texture = this.fixed_tile_texture
      }
    }
  }

  // Synchronize the players with the player sprites
  synchronize_players () {
    let teams = this.game.teams
    let players = this.game.turn.painters
    for (let team = 0; team < 4; ++team) {
      for(let pl = 0; pl < 4; ++pl) {
        let playerId = teams[team][pl]
        if(playerId == null) continue
        let player = players[playerId]
        let sprite = this.player_sprites[team][pl]
        let {newxPosition, newyPosition} = getNewPlayerPos(player.i, player.j)
        sprite.position = {x : newxPosition, y: newyPosition}
      }
    }
  }

  // Synchronize the hud with the hud vars
  synchronize_hud () {
    if (!this.show_hud) return

    let time = this.getTime()
    let players = this.getPlayers()
    let ping = this.getPing()
    let fps = this.getFps()

    this.hud_time.text = 'Time: ' + time
    this.hud_players.text = players
    this.hud_ping.text = 'Ping: ' + ping
    this.hud_fps.text = 'FPS: ' + fps
  }

  // Renderizes the game
  render () {
    this.renderer.render(this.stage)
  }

  // Calculates fps
  calculate_fps () {
    ++this.frames
    let time_passed = (Date.now() - this.last_fps_refresh) / 1000
    if(time_passed > 1) {
      this.fps = Math.round(this.frames / time_passed)
      this.last_fps_refresh = Date.now()
      this.frames = 0
    }
  }

  // Formats time to be rendered in the hud
  getTime () {
    if (this.game.state === C.GAME_NOT_STARTED) return 'Not started'
    let startTime = this.game.startTime
    let time = (Date.now() - startTime) / 1000
    let minutes = Math.floor(time / 60)
    let seconds = Math.floor(time % 60)
    if (seconds < 10) seconds = '0' + seconds
    return minutes + ':' + seconds
  }

  // Formats a list of players to be rendered in the hud
  getPlayers () {
    let text = 'List of players:\n'
    let players = this.game.turn.painters
    for(let i = 0; i < players.length; ++i) {
      if(players[i] == null) continue
      let name = players[i].name
      text += ' - ' + name + '\n'
    }
    return text
  }

  // Formats ping to be rendered in the hud
  getPing () {
    return this.ping
  }

  // Formats fps to be rendered in the hud
  getFps () {
    return this.fps
  }

  // Sends ping to the server to calculate the ping
  sendPing () {
    this.time_sent_ping = Date.now()
    this.socket.emit('game:ping')
  }

/******* SOCKET CALLBACKS *******/
  socket_pong (server_now) {
    let self = this
    this.ping = (Date.now() - this.time_sent_ping) / 2
    this.client_lead = Date.now() - (server_now + this.ping)
    setTimeout(function () { self.sendPing() }, 500)
  }
  socket_name () {
    let name = prompt('Enter your name')
    this.socket.emit('game:name', name)
  }
  socket_state (state) {
    const { board, painters, inputs } = state.turn
    const turn = new Turn(board, painters, inputs)

    this.game.turn = turn
    this.game.turns = [turn]
    this.game.players = state.players
    this.game.interval = state.interval
    this.game.teams = state.teams
    this.game.lastTurn = state.timestamp + this.client_lead
  }
  socket_start () {
    this.startTime = Date.now()
    this.game.start()
  }
  socket_restart () {
    this.game.restart()
    this.synchronize_renderer()
  }
  socket_change_dir (socketId, dir, turnIndex) {
    if (socketId === `/#${this.socket.id}`) return
    this.game.onChangeDir({ id: socketId }, dir, turnIndex)
  }


/******* DOM CALLBACKS *******/
  dom_keydown (e) {
    let state = key_state[e.keyCode]
    if (state != null && state === STATE.UP) {
      key_state[e.keyCode] = STATE.DOWN
      const dir = DIR_FOR_KEY[e.keyCode]
      const turnIndex = this.game.turns.length - 1
      this.game.onChangeDir({ id: `/#${this.socket.id}` }, dir, turnIndex)
      this.socket.emit('changeDir', dir, turnIndex)
    }
  }
  dom_keyup (e) {
    let state = key_state[e.keyCode]
    if (state != null && state === STATE.DOWN) key_state[e.keyCode] = STATE.UP
  }


/******* ONLY EXECUTES ONCE *******/

  init_dom_listeners () {
    let self = this
    document.addEventListener('keydown', (e) => self.dom_keydown(e))
    document.addEventListener('keyup', (e) => self.dom_keyup(e))

    document.getElementById('start').onclick = function () {
      self.socket.emit('start')
    }

    document.getElementById('restart').onclick = function () {
      self.socket.emit('restart')
    }
  }

  // Initialize the socket
  init_socket () {
    let self = this
    this.socket.on('game:pong', (server_now) => self.socket_pong(server_now))
    this.socket.on('game:name', () => self.socket_name())
    this.socket.on('game:state', (state, turnIndex) => self.socket_state(state, turnIndex))
    this.socket.on('game:start', () => self.socket_start())
    this.socket.on('game:restart', () => self.socket_restart())
    this.socket.on('changeDir', (socketId, dir, turnIndex) => self.socket_change_dir(socketId, dir, turnIndex))

    this.sendPing()
  }

  // Initialize the map sprites
  create_map_sprites () {
    this.generate_map_sprites()
    this.scene_load_map()
  }

  // Initialize the player sprites
  create_player_sprites () {
    this.player_sprites = new Array(4) // There are 4 teams
    for (let team = 0; team < 4; ++team) {
      this.player_sprites[team] = new Array(4) // There are maximum 4 players for each team
      for (let player = 0; player < 4; ++player) {
        let sprite = new PIXI.Sprite(this.player_texture)
        sprite.scale = {x: 0.2, y: 0.2}
        switch (team) {
          case 0: sprite.tint = 0xFF0000; break;
          case 1: sprite.tint = 0x00FF00; break;
          case 2: sprite.tint = 0x0000FF; break;
          case 3: sprite.tint = 0xFFFF00; break;
        }
        this.player_sprites[team][player] = sprite
        this.scene.addChild(sprite)
      }
    }
  }

  // Initialize the hud variables
  create_hud () {
    if (!this.show_hud) return

    this.hud_time.position.set(800, 25)
    this.hud_players.position.set(500, 25)
    this.hud_ping.position.set(800, 40)
    this.hud_fps.position.set(800, 55)

    this.hud.addChild(this.hud_time)
    this.hud.addChild(this.hud_players)
    this.hud.addChild(this.hud_ping)
    this.hud.addChild(this.hud_fps)
  }

  // Initialize the map_sprites with the map sprites
  generate_map_sprites () {
    let n = C.BOARD_SIZE
    // Generating the sprites map
    this.map_sprites = new Array(n)
    for (let i = 0; i < n; ++i) {
      this.map_sprites[i] = new Array(n)
      for (let j = 0; j < n; ++j) {
        let sprite = new PIXI.Sprite(this.tile_texture)
        let {newxPosition, newyPosition} = getNewPos(i, j)
        sprite.position = {x: newxPosition, y: newyPosition}
        sprite.scale = {x: 0.2, y: 0.2}
        this.map_sprites[i][j] = sprite
      }
    }
  }

  // Loads diagonally the sprites in order to get the correct depth
  scene_load_map () {
    let n = C.BOARD_SIZE
    // Adding the sprites to the scene
    for (let slice = 0; slice < 2 * n - 1; ++slice) {
      let z = slice < n ? 0 : slice - n + 1
      for (let j = z; j <= slice - z; ++j) {
        let cell = this.map_sprites[j][slice - j]
        this.scene.addChild(cell)
      }
    }
  }
}

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

const key_state = {
  [KEY.W]: STATE.UP,
  [KEY.A]: STATE.UP,
  [KEY.S]: STATE.UP,
  [KEY.D]: STATE.UP
}

let client = new Client()
client.init()
