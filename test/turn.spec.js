const test = require('tape')
const { Turn } = require('../src/Turn.js')
const { Player } = require('../src/Player.js')
const C = require('../src/constants.js')

test('Turn :: Receiving Inputs', (t) => {
  const board = [
    [0, 0, 0],
    [10, 0, 0],
    [0, 0, 20]
  ]
  const painters = [
    // Player(i, j, dir, team)
    new Player(1, 0, C.STOP, 1),
    new Player(2, 2, C.STOP, 2)
  ]
  const inputs = [null, null]
  const turn = new Turn(board, painters, inputs)

  // turn.setPlayerInput(playerIndex, direction)
  turn.setPlayerInput(0, C.DOWN)
  turn.setPlayerInput(1, C.UP)
  t.equal(turn.inputs[0], C.DOWN, 'setPlayerInput(0, C.DOWN) is not updating turns input')
  t.equal(turn.inputs[1], C.UP, 'setPlayerInput(1, C.UP) is not updating turns input')
  t.end()
})

test('Turn :: Basics of Evolve', (t) => {
  const board = [
    [0, 0, 0],
    [10, 0, 0],
    [0, 0, 20]
  ]
  const boardCopy = board.map(row => row.slice())
  const painters = [
    // Player(i, j, dir, team)
    new Player(1, 0, C.STOP, 1),
    new Player(2, 2, C.STOP, 2)
  ]
  const paintersCopy = Object.assign({}, painters)
  const inputs = [null, null]
  const turn = new Turn(board, painters, inputs)
  turn.setPlayerInput(0, C.UP)

  // Testing Evolve
  const nextTurn = turn.evolve()
  t.deepEqual(turn.board, boardCopy, 'evolve shouldnt modify the board')
  t.deepEqual(turn.painters, paintersCopy, 'evolve shouldnt modify the bikes')
  t.deepEqual(turn.inputs, [C.UP, null], 'evolve shouldnt modify the inputs')
  turn.setPlayerInput(1, C.UP) // shouldnt affect the already evolved turn
  t.equal(nextTurn.inputs[1], null, 'setPlayerInput should not update evolved turn input')

  t.ok(nextTurn instanceof Turn, 'evolve should return an instance of Turn')
  t.notEqual(turn, nextTurn, 'evolve should return a new instance of Turn')
  t.notEqual(turn.board, nextTurn.board, 'turns shouldnt share boards')
  t.notEqual(turn.painters, nextTurn.painters, 'turns shouldnt share bikes')
  t.notEqual(turn.inputs, nextTurn.inputs, 'turns shouldnt share inputs')
  t.end()
})

test('Turn :: Moving painters - Basic', (t) => {
  // Basic moving
  const board = [
    [0, 0, 0],
    [10, 0, 0],
    [0, 0, 20]
  ]
  const painters = [
    // Player(i, j, dir, team)
    new Player(1, 0, C.UP, 1),
    new Player(2, 2, C.UP, 2)
  ]
  const inputs = [null, C.RIGHT]
  const turn = new Turn(board, painters, inputs)
  const nextTurn = turn.evolve()
  t.deepEqual(nextTurn.board, [
    [10, 0, 0],
    [10, 0, 0],
    [0, 0, 20]
  ], 'painters should move and paint in the board')
  t.deepEqual(nextTurn.painters, [
    // Player(i, j, dir, team)
    new Player(0, 0, C.UP, 1),
    new Player(2, 2, C.STOP, 2)
  ], 'Player position and directions should update')
  t.deepEqual(nextTurn.inputs, [null, null], 'The inputs should be null')
  t.end()
})

test('Turn :: Painting', (t) => {
  // Basic moving
  const board = [
    [0, 33, 30],
    [10, 0, 0],
    [10, 14, 20]
  ]
  const painters = [
    // Player(i, j, dir, team)
    new Player(1, 0, C.DOWN, 1),
    new Player(2, 2, C.LEFT, 2),
    new Player(0, 2, C.LEFT, 3)
  ]
  const inputs = [null, null, null]
  const turn = new Turn(board, painters, inputs)
  const nextTurn = turn.evolve()
  t.deepEqual(nextTurn.board, [
    [0, 34, 30],
    [10, 0, 0],
    [11, 14, 20]
  ], 'Painting is not working properly')
  t.deepEqual(nextTurn.painters, [
    // Player(i, j, dir, team)
    new Player(2, 0, C.DOWN, 1),
    new Player(2, 1, C.LEFT, 2),
    new Player(0, 1, C.LEFT, 3)
  ], 'Player position should update')
  t.deepEqual(nextTurn.inputs, [null, null, null], 'The inputs should be null')
  t.end()
})

test('Turn :: Opposite Directions', (t) => {
  const board = [
    [0, 10, 0],
    [0, 0, 0],
    [0, 0, 0]
  ]
  const painters = [
    new Player(0, 1, C.DOWN, 1)
  ]
  const inputs = [C.UP]
  const turn = new Turn(board, painters, inputs)
  const nextTurn = turn.evolve()
  t.deepEqual(nextTurn.board, [
    [0, 10, 0],
    [0, 10, 0],
    [0, 0, 0]
  ], 'Should ignore input in the opposite direction of movement')
  t.deepEqual(nextTurn.painters, [
    new Player(1, 1, C.DOWN, 1)
  ], 'Should ignore input in the opposite direction of movement')
  t.end()
})

test('Turn :: Moving painters - Advanced', (t) => {
  const board = [
    [0, 0, 0],
    [10, 0, 0],
    [0, 0, 20]
  ]
  const painters = [
    // Player(i, j, dir, team)
    new Player(1, 0, C.STOP, 1),
    new Player(2, 2, C.STOP, 2)
  ]
  const inputs = [null, C.RIGHT]
  const turn = new Turn(board, painters, inputs)
  const nextTurn = turn.evolve()
  t.deepEqual(nextTurn.board, [
    [0, 0, 0],
    [10, 0, 0],
    [0, 0, 20]
  ], 'painters should not move and paint if direction is STOP')
  t.deepEqual(nextTurn.painters, [
    // Player(i, j, dir, team)
    new Player(1, 0, C.STOP, 1),
    new Player(2, 2, C.STOP, 2)
  ], 'Player position and directions should not change (STOP direction)')
  t.deepEqual(nextTurn.inputs, [null, null], 'The inputs should be null')
  t.end()
})

test('Turn :: Battles - Simple battle', (t) => {
  const board = [
    [10, 0, 20],
    [30, 40, 0],
    [0, 0, 0]
  ]
  const painters = [
    new Player(0, 0, C.RIGHT, 1),
    new Player(0, 2, C.UP, 2),
    new Player(1, 0, C.STOP, 3),
    new Player(1, 1, C.LEFT, 4)
  ]
  const inputs = [null, C.LEFT, null, null]
  const turn = new Turn(board, painters, inputs)

  const nextTurn = turn.evolve()
  t.deepEqual(nextTurn.board, [
    [10, 10, 20],
    [30, 40, 0],
    [0, 0, 0]
  ])
  t.deepEqual(nextTurn.painters, [
    new Player(0, 1, C.RIGHT, 1),
    new Player(0, 2, C.STOP, 2),
    new Player(1, 0, C.STOP, 3),
    new Player(1, 1, C.STOP, 4)
  ])
  t.end()
})
