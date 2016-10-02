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

function fixedCellFromTeam (board, i, j, team) {
  return (cellIsBlocked(board, i, j) && isCellFromTeam(board, i, j, team))
}

function directionsAreOpposite (dir1, dir2) {
  return (dir1 + dir2 === C.UP + C.DOWN || dir1 + dir2 === C.LEFT + C.RIGHT)
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
      if (painter != null && painter.i === i && painter.j === j) return true
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
      if (painter == null) return
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

    painters.forEach((painter) => {
      if (painter == null) return
      let i = painter.i
      let j = painter.j
      let team = painter.team
      if (!cellIsBlocked(board, i, j) && painter.dir !== C.STOP) {
        if (isCellFromTeam(board, i, j, team)) {
          ++board[i][j]
          ++painter.points
          if (fixedCellFromTeam(board, i, j, team)) {
            this.searchNearForAreas(board, team, i, j)
          }
        }
        else {
          board[i][j] = 10 * team
        }
      }
    })
    return nextTurn
  }

  paintArea (board, team, i, j) {
    if(this.isOutOfBounds(i, j)) return
    if(cellIsBlocked(board, i, j)) return

    board[i][j] = team * 10 + 4

    this.paintArea (board, team, i + 1, j)
    this.paintArea (board, team, i - 1, j)
    this.paintArea (board, team, i, j + 1)
    this.paintArea (board, team, i, j - 1)
  }

  // Take the position player blocked and search areas in the 4 possible directions
  searchNearForAreas (board, team, i, j) {
    let size = board.length
    let auxBoard = new Array(size).fill().map(() => new Array(size).fill(0))
    let points = 0

    let dirs = []
    dirs[0] = {i: 1, j: 0}
    dirs[1] = {i: 0, j: 1}
    dirs[2] = {i: -1, j: 0}
    dirs[3] = {i: 0, j: -1}

    for (let k = 0; k < 4; ++k) {
      let x = i + dirs[k].i
      let y = j + dirs[k].j
      if(!this.isOutOfBounds(x, y) && auxBoard[x][y] === 0) {
        // Search into an area
        let value = this.searchArea(board, k + 1, auxBoard, team, x, y)
        // If value is bigger than 0 means that is a closen area
        if(value > 0) {
          this.paintArea(board, team, x, y)
          points += 5 * value
        }
      }
    }
    return points
  }

  /* board => Original board with the values of each cell
   * value => Value to represent the actual search
   * auxBoard => Board with the values of the searches done
  */
  searchArea (board, value, auxBoard, team, i, j) {
    if(this.isOutOfBounds(i, j)) return -1 // Out of limits, this is not a geometric form
    if (fixedCellFromTeam(board, i, j, team)) return 0 // Fixed cell of our team, is a wall
    if (auxBoard[i][j] === value) return 1 // Already visited cell, we dont need to revisit it. I THINK THIS SHOULD BE 0
    if (auxBoard[i][j] !== 0) return 0 // If is not 0 and not our value, it means that is an open area. I THINK THIS SHOULD BE -1
    // BUT THIS WORKS, DONT TOUCH IT!

    auxBoard[i][j] = value // We assign the value to the cell

    // We search recursively all the adjacent positions
    let a = this.searchArea(board, value, auxBoard, team, i + 1, j)
    let c = this.searchArea(board, value, auxBoard, team, i, j + 1)
    let b = this.searchArea(board, value, auxBoard, team, i - 1, j)
    let d = this.searchArea(board, value, auxBoard, team, i, j - 1)

    // If any search returns -1 it means that is an open area
    if(a === -1 || b === -1 || c === -1 || d === -1) return -1
    return a + b + c + d // Else we return the sum of the searches
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

  addPlayer (painterId, team, name) {
    const width = this.board[0].length
    const height = this.board.length

    let i = -1
    let j = -1
    while (getCell(this.board, i, j) !== C.EMPTY_CELL) {
      i = Math.floor(Math.random() * height)
      j = Math.floor(Math.random() * width)
    }

    let dir = this.getInitialDir(i, j)

    const painter = new Player(i, j, dir, team, name)

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
