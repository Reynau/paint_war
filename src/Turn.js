'use strict'
const clone = require('clone')
const C = require('./constants.js')

const IncForDir = {
  [C.RIGHT]: {i: 0, j: 1},
  [C.DOWN]: {i: 1, j: 0},
  [C.LEFT]: {i: 0, j: -1},
  [C.UP]: {i: -1, j: 0},
  [C.STOP]: {i: 0, j: 0}
}

function getCell (board, i, j) {
  const row = board[i]
  return row ? row[j] : undefined
}

function cellIsBlocked (board, i, j) {
  return board[i][j] % 10 === 4
}

function isCellFromTeam (board, i, j, team) {
  return board[i][j] / 10 === team
}

function directionsAreOpposite (dir1, dir2) {
  return dir1 !== dir2 && dir1 % 2 === dir2 % 2
}

class Turn {
  constructor (board = [], players = [], inputs = []) {
    this.board = board
    this.players = players
    this.inputs = inputs
  }

  clone () {
    const { board, players, inputs } = this
    return new Turn(clone(board), clone(players), inputs.map(_ => null))
  }

  evolve () {
    const nextTurn = this.clone()
    const { board, players } = nextTurn
    const inputs = this.inputs
    // For each player
    players.forEach ((player, playerId) => {
      //  Calculates movement
      let nextDir = player.dir
      if (input !== null && !directionsAreOpposite(input, player.dir)) {
        nextDir = input
      }
      const dirInc = IncForDir[nextDir]
      //  See if is out of bounds
      if (playerike.i + dirInc.i < 0 || playerike.i + dirInc.i >= board.length ||
          playerike.j + dirInc.j < 0 || playerike.j + dirInc.j >= board[0].length) {
        player.dir = C.STOP
      } else {
        // Updating coords
        player.i += dirInc.i
        player.j += dirInc.j
        player.dir = nextDir
        // Updating board
        let i = player.i
        let j = player.j
        let team = player.team
        if(!cellIsBlocked(board, i, j)) {
          if(isCellFromTeam(board, team)) ++board[i][j]
          else board[i][j] = 10*team
        }
      }
    })
    return nextTurn
  }

  dirForPos (i, j) {
    const width = this.board[0].length
    const height = this.board.length

    // get minimum distance to board border for each axis
    const ci = Math.min(i + 1, height - i)
    const cj = Math.min(j + 1, width - j)

    let dir
    if (ci < cj) {
      // i is closer to edge
      if (i < height / 2) dir = C.DOWN
      else dir = C.UP
    } else {
      // j is closer to edge
      if (j < width / 2) dir = C.RIGHT
      else dir = C.LEFT
    }
    return dir
  }

  addPlayer (playerId) {
    const width = this.board[0].length
    const height = this.board.length

    let i = -1
    let j = -1
    while (getCell(this.board, i, j) !== C.EMPTY_CELL) {
      i = Math.floor(Math.random() * height)
      j = Math.floor(Math.random() * width)
    }

    let dir = this.dirForPos(i, j)

    const player = { i, j, dir}
    this.players[playerId] = player
    this.board[i][j] = playerId + 1
    this.inputs[playerId] = null
  }

  setPlayerInput (playerId, input) {
    this.inputs[playerId] = input
  }
}
exports.Turn = Turn
