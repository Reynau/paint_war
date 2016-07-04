const test = require('tape')
const { Turn } = require('../src/Turn.js')
const { Player } = require('../src/Player.js')
const C = require('../src/constants.js')

test('Turn :: Basics', (t) => {
  const board = [
    [0, 0, 0],
    [10, 0, 0],
    [0, 0, 20]
  ]
  const boardCopy = board.map(row => row.slice())
  const players = [
    // Player(i, j, dir, team)
    new Player(1, 0, C.STOP, 1),
    new Player(2, 2, C.STOP, 2)
  ]
  const playersCopy = Object.assign({}, players)
  const inputs = [null, null]
  const turn = new Turn(board, players, inputs)

  // turn.setPlayerInput(playerIndex, direction)
  turn.setPlayerInput(0, C.DOWN)
  turn.setPlayerInput(0, C.UP)
  t.equal(turn.inputs[0], C.UP, 'setPlayerInput should update turns input')

  const nextTurn = turn.evolve()
  t.deepEqual(turn.board, boardCopy, 'evolve shouldnt modify the board')
  t.deepEqual(turn.players, playersCopy, 'evolve shouldnt modify the bikes')
  t.deepEqual(turn.inputs, [C.UP, null], 'evolve shouldnt modify the inputs')
  turn.setPlayerInput(1, C.UP) // shouldnt affect the already evolved turn
  t.equal(turn.inputs[1], C.UP, 'setPlayerInput should update turns input')

  t.ok(nextTurn instanceof Turn, 'evolve should return an instance of Turn')
  t.notEqual(turn, nextTurn, 'evolve should return a new instance of Turn')
  t.notEqual(turn.board, nextTurn.board, 'turns shouldnt share boards')
  t.notEqual(turn.players, nextTurn.players, 'turns shouldnt share bikes')
  t.notEqual(turn.inputs, nextTurn.inputs, 'turns shouldnt share inputs')

  t.deepEqual(nextTurn.board, [
    [10, 0, 0],
    [10, 0, 0],
    [0, 0, 20]
  ], 'players should move on the board')
  t.deepEqual(nextTurn.players, [
    // Player(i, j, dir, team)
    new Player(0, 0, C.UP, 1),
    new Player(2, 2, C.STOP, 2)
  ], 'player position and direction should update')
  t.deepEqual(nextTurn.inputs, [null, null], 'a new turns inputs should be null')
  t.end()
})
