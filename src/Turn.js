'use strict'
const clone = require('clone')
const C = require('./constants.js')
const { Player } = require('./Player.js')

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
  return parseInt(board[i][j] / 10) === team
}

class Turn {
  constructor (board = [], painters = [], inputs = []) {
    this.board = board
    this.painters = painters
    this.inputs = inputs
  }

  clone () {
    const { board, painters, inputs } = this
    return new Turn(clone(board), clone(painters), inputs.map(_ => null))
  }

  isOutOfBounds (i, j) {
    return i < 0 || i >= this.board.length || j < 0 || j >= this.board[0].length
  }

  thereIsAnotherPlayer (i, j) {
    this.painters.forEach((painter) => {
      if (painter.i === i && painter.j === j) return true
    })
    return false
  }

  evolve () {
    const nextTurn = this.clone()
    const { board, painters } = nextTurn
    const inputs = this.inputs

    const battles = {}
    // For each painter
    painters.forEach((painter, painterId) => {
      if(painter == null) return
      //  Calculates movement
      const input = inputs[painterId]
      let nextDir = painter.dir
      if (input !== null) {
        nextDir = input
      }
      const dirInc = IncForDir[nextDir]
      //  See if is out of bounds or there is another painter
      let i = painter.i + dirInc.i
      let j = painter.j + dirInc.j
      if (this.isOutOfBounds(i, j) || this.thereIsAnotherPlayer(i, j)) painter.dir = C.STOP
      else {
        // Updating coords
        painter.i += dirInc.i
        painter.j += dirInc.j
        painter.dir = nextDir

        const posKey = painter.i + 'x' + painter.j
        let battleArr = battles[posKey]
        if (!battleArr) battleArr = battles[posKey] = []
        battleArr.push(painterId)
      }
    })

    for (let pos in battles) {
      const battleArray = battles[pos]
      if (battleArray.length < 2) continue
      // Battle - Winner gets the new position, the rest get the old position and dir C.STOPç
      // The losers get a number of cells back and then stun 2 turns
      // By the moment wins the player with the minor id
      battleArray.shift()
      for (let pl in battleArray) {
        let painterId = battleArray[pl]
        let painter = nextTurn.painters[painterId]
        painter.dir = C.STOP
        painter.i = this.painters[painterId].i
        painter.j = this.painters[painterId].j
      }
    }

    painters.forEach((painter, painterId) => {
      let i = painter.i
      let j = painter.j
      let team = painter.team
      if (!cellIsBlocked(board, i, j) && painter.dir !== C.STOP) {
        if (isCellFromTeam(board, i, j, team)) ++board[i][j]
        else board[i][j] = 10 * team
      }
    })
    return nextTurn
  }

  getInitialDir (i, j) {
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

  addPlayer (painterId, team) {
    const width = this.board[0].length
    const height = this.board.length

    let i = -1
    let j = -1
    while (getCell(this.board, i, j) !== C.EMPTY_CELL) {
      i = Math.floor(Math.random() * height)
      j = Math.floor(Math.random() * width)
    }

    let dir = this.getInitialDir(i, j)

    const painter = new Player(i, j, dir, team)

    console.log('Painter id, baseValue: ', painterId, painter.getBaseValue())

    this.board[i][j] = painter.getBaseValue()
    this.painters[painterId] = painter
    this.inputs[painterId] = null
  }

  removePlayer (painterId) {
    let player = this.painters[painterId]

    this.board[player.i][player.j] = C.EMPTY_CELL
    delete this.painters[painterId]
    delete this.inputs[painterId]
  }

  setPlayerInput (painterId, input) {
    this.inputs[painterId] = input
  }
}
exports.Turn = Turn
