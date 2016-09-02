const { Turn } = require('../src/Turn.js')
const C = require('../src/constants.js')

class Game {

  constructor () {
    const board = Array(C.BOARD_SIZE).fill().map(() => Array(C.BOARD_SIZE).fill(C.EMPTY_CELL))
    this.state = C.GAME_NOT_STARTED
    this.turn = new Turn(board, [], [])
    this.turns = [this.turn]
    this.players = {}
    this.sockets = []
    this.interval = C.INTERVAL
    this.gameLoop = this.gameLoop.bind(this)
    this.teams = new Array(4)
    for (let i = 0; i < 4; ++i) this.teams[i] = new Array(4)
  }

  startInterval () {
    this.startTime = Date.now()
    this.lastTurn = Date.now()
    setTimeout(this.gameLoop, this.interval)
  }

  gameLoop () {
    let now = Date.now()
    if(this.startTime - now >= C.TIME_TO_RESTART) {
      this.restart()
      return
    }
    while (now - this.lastTurn >= this.interval) {
      this.lastTurn += this.interval
      this.tick()
      now = Date.now()
    }

    let timeout_time = this.lastTurn + this.interval - now
    setTimeout(this.gameLoop,timeout_time)
  }

  gameHasStarted () {
    return this.state
    //return this.turns.length > 1
  }

  gameShouldRestart () {
    let startTime = this.startTime
    let time = (Date.now() - startTime) / 1000
    let minutes = Math.floor(time / 60)
    if (minutes >= C.TIME_TO_RESTART) return true
    return false
  }

  getNewPlayerId () {
    // Generates the playerId with the team and position into that team
    let playerId = 0
    for (let j = 0; j < 4; ++j) {
      for (let i = 0; i < 4; ++i) {
        if (this.teams[i][j] == null) {
          let playerId = i * 10 + j
          return playerId
        }
      }
    }
  }

  onPlayerJoin (socket) {
    let playerId = this.getNewPlayerId()
    let playerTeam = Math.floor(playerId / 10)
    let playerName = 'Player ' + playerId
    let teamPos = playerId % 10

    this.sockets[playerId] = socket
    if (!this.gameHasStarted() && playerTeam != null) {
      this.players[socket.id] = playerId
      this.teams[playerTeam][teamPos] = playerId
console.log(this.teams, playerTeam, teamPos, playerId)
      this.turn.addPlayer(playerId, playerTeam + 1, playerName)
      this.sendState()
    }
    this.sendState()
  }

  onPlayerLeave (socket) {
    // Socket = null, delete player from players, update turn.removePlayer

    // Trying to get the playerId => only if player is on the game
    let playerId = this.players[socket.id]

    if (playerId != null) {
      let team = playerId / 10
      let teamPos = playerId % 10

      this.sockets[playerId] = null
      this.turn.removePlayer(playerId)
      this.teams[team][teamPos] = null
      delete this.players[socket.id]
    } else {
      this.sockets.forEach((psocket) => {
        if (psocket != null && psocket.id === socket.id) {
          psocket = null
        }
      })
    }
  }

  onChangeDir (socket, dir, turnIndex) {
    const playerId = this.players[socket.id]
    if (playerId == null) return

    const emitterId = socket.id
    if (turnIndex == null) turnIndex = this.turns.length - 1

    const turn = this.turns[turnIndex]

    if (!turn) return
    turn.setPlayerInput(playerId, dir)

    let currTurn = turn
    for (let i = turnIndex + 1; i < this.turns.length; ++i) {
      let nextTurn = this.turns[i]
      const nextInputs = nextTurn.inputs
      nextTurn = currTurn.evolve()
      nextTurn.inputs = nextInputs
      this.turns[i] = nextTurn
      currTurn = nextTurn
    }
    this.turn = currTurn
  }

  tick () {
    if (this.gameHasStarted()) {
      if (this.gameShouldRestart()) this.restart()
      else {
        let nextTurn = this.turn.evolve()
        this.turns.push(nextTurn)
        this.turn = nextTurn
        let turns = this.turns.length
        //if (this.imServer() && turns % C.TURNS_TO_REFRESH === 0) this.sendState()
      }
    }
  }

  start () {
    this.state = C.GAME_STARTED
    this.startTime = Date.now()
  }

  restart () {
    this.teams = new Array(4)
    for (let i = 0; i < 4; ++i) this.teams[i] = new Array(4)
    this.startTime = Date.now()
    let firstTurn = new Turn()
    firstTurn.board = this.turn.board.map(row => row.map(cell => C.EMPTY_CELL))
    this.sockets.forEach((socket, playerId) => {
      let team = playerId / 10
      let teamPos = playerId % 10
      if (socket && team != null) {
        this.players[socket.id] = playerId
        this.teams[team][teamPos] = playerId
        let playerName = 'Player ' + playerId
        firstTurn.addPlayer(playerId, team + 1, playerName)
      }
    })
    this.turns = [firstTurn]
    this.turn = firstTurn
    this.sendState()
  }

  sendState () {
    const turnIndex = this.turns.length - 1

    const state = {
      turn: this.turn,
      players: this.players,
      teams: this.teams,
      interval: this.interval,
      timestamp: Date.now()
    }

    this.sockets.forEach((socket) => {
      if (socket) socket.emit('game:state', state, turnIndex)
    })
  }

  imServer () {
    return (typeof window === 'undefined')
  }
}
exports.Game = Game
