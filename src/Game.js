const { Turn } = require('../src/Turn.js')
const C = require('../src/constants.js')

class Game {
  constructor ({ mapSize = 20, interval = 100 } = {}) {
    const board = Array(size).fill().map(() => Array(size).fill(C.EMPTY_CELL))
    this.turn = new Turn(board, [], [])
    this.turns = [this.turn]
    this.players = {}
    this.sockets = []
    this.interval = interval
    this.tickAndSchedule = this.tickAndSchedule.bind(this)
  }

  startInterval () {
    this.lastTurn = Date.now()
    setTimeout(this.tickAndSchedule, this.interval)
  }

  tickAndSchedule () {
    let now = Date.now()

    while (now - this.lastTurn >= this.interval) {
      this.lastTurn += this.interval
      this.tick()
      now = Date.now()
    }

    setTimeout(this.tickAndSchedule,
      this.lastTurn + this.interval - now)
  }

  gameHasStarted () {
    return this.turns.length > 1
  }

  gameCanStart () {
    return sockets.length > 1
  }

  gameShouldRestart () {
    this.turn.board.forEach((row) => {
      row.forEach((col) => {
        if (col % 10 !== 4)
          return true
      })
    })
    return false
  }

  onPlayerJoin (socket) {
    let playerId = 0
    while (this.sockets[playerId] != null) ++playerId
    this.sockets[playerId] = socket
    this.players[socket.id] = playerId
    if (!this.gameHasStarted()) this.turn.addPlayer(playerId)
    this.sendState()
  }

  onPlayerLeave (socket) {
    let playerId = this.players[socket.id]
    this.sockets[playerId] = null
    delete this.players[socket.id]
  }

  onChangeDir (socket, dir, turnIndex) {
    const emitterId = socket.id
    if (typeof window === 'undefined') {
      this.sockets.forEach(socket => socket && socket.emit('changeDir', emitterId, dir, turnIndex))
    }

    if (turnIndex == null) turnIndex = this.turns.length - 1
    const playerId = this.players[socket.id]

    const turn = this.turns[turnIndex]
    if (!turn) return
    turn.setInput(playerId, dir)

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
    this.sendState()
  }

  tick () {
    if (this.gameHasStarted() || this.gameCanStart()) {
      let nextTurn
      if(this.gameShouldRestart()) {
        nextTurn = new Turn()
        nextTurn.board = this.turn.board.map(row => row.map(cell => 0))
        this.sockets.forEach((socket, i) => {
          if (socket) nextTurn.addPlayer(i)
          else nextTurn.players[i] = null
        })
        nextTurn.inputs = nextTurn.players.map(() => null)
        this.turns = []
      } else nextTurn = this.turn.evolve()
    }
    this.turns.push(nextTurn)
    this.turn = nextTurn
    this.sendState()
  }
}
