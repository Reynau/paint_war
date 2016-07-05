const test = require('tape')
const EventEmitter = require('events')
const shortid = require('shortid')
const clone = require('clone')

const { Game } = require('../src/Game.js')
// const { Turn } = require('../src/Turn.js')
const C = require('../src/constants.js')

function fakeSocket () {
  const socket = new EventEmitter()
  socket.id = shortid()

  const _emit = socket.emit
  socket.emit = function () {
    const args = arguments
    setTimeout(function () {
      _emit.apply(socket, args)
    }, 1)
  }

  return socket
}

function boardHasCells (board, cells) {
  const cellsObj = {}
  cells.forEach(cell => { cellsObj[cell] = true })

  for (let i = 0; i < board.length; ++i) {
    const row = board[i]
    for (let j = 0; j < row.length; ++j) {
      const cell = row[j]
      delete cellsObj[cell]
    }
  }

  return Object.keys(cellsObj).length === 0
}

test('Game :: onPlayerJoin', (t) => {
  t.plan(22)

  const game = new Game()
  const { turn, players, sockets } = game
  const { board, painters, inputs } = turn

  const socket = fakeSocket()
  socket.once('game:state', function (state) {
    t.ok(boardHasCells(board, [10]), '1 should place players on the board')
    t.equal(painters.length, 1, "should update turn's painters")
    t.deepEqual(inputs, [null], "should update turn's inputs")
    t.deepEqual(players, {
      [socket.id]: 0
    }, 'should update (socketId => painterId) hash')

    function stateUpdate (state) {
      const { turn, players } = state
      const { board, painters, inputs } = turn

      t.ok(boardHasCells(board, [10, 20]), 'Should place Painters of different teams on the board')
      t.equal(painters.length, 2, "should update turn's painters")
      t.deepEqual(inputs, [null, null], "should update turn's inputs")
      t.deepEqual(players, {
        [socket.id]: 0,
        [socket2.id]: 1
      }, 'should update (socketId => painterId) hash')
    }

    const socket2 = fakeSocket()
    socket.once('game:state', stateUpdate)
    socket2.once('game:state', stateUpdate)

    game.onPlayerJoin(socket2)
    t.ok(boardHasCells(board, [10, 20]), 'Should place Painters of different teams on the board')
    t.equal(painters.length, 2, "should update turn's painters")
    t.deepEqual(inputs, [null, null], "should update turn's inputs")
    t.deepEqual(players, {
      [socket.id]: 0,
      [socket2.id]: 1
    }, 'should update (socketId => painterId) hash')
    t.deepEqual(
      sockets.map(socket => socket.id),
      [socket, socket2].map(socket => socket.id),
      'should store socket in sockets array')
  })

  game.onPlayerJoin(socket)
  t.ok(boardHasCells(board, [10]), 'player should be placed in the board')
  t.equal(painters.length, 1, "should update turn's painters")
  t.equal(inputs.length, 1, "should update turn's inputs")
  t.deepEqual(players, { [socket.id]: 0 }, 'should update (socketId => painterId) hash')
  t.deepEqual(
    sockets.map(socket => socket.id),
    [socket].map(socket => socket.id),
    'should store socket in sockets array')
})

test('Game :: Player joins started game', (t) => {
  const game = new Game()
  const socket = fakeSocket()
  const socket2 = fakeSocket()

  game.onPlayerJoin(socket)
  game.onPlayerJoin(socket2)
  game.tick()

  const socket3 = fakeSocket()
  game.onPlayerJoin(socket3)
  t.notOk(boardHasCells(game.turn.board, [3]), 'if game has started, player shouldnt be placed on the board')
  t.equal(game.turn.painters.length, 2, 'if game has started, a painter should not be created')
  t.equal(game.turn.inputs.length, 2, 'if game has started, player doesnt require an input')
  t.deepEqual(
    game.sockets.map(socket => socket.id),
    [socket, socket2, socket3].map(socket => socket.id),
    'should store socket in sockets array')

  t.end()
})

test('Game :: Player fills free slot in started game', (t) => {
  const game = new Game()
  const socket1 = fakeSocket()
  const socket2 = fakeSocket()
  const socket3 = fakeSocket()

  game.onPlayerJoin(socket1)
  game.onPlayerJoin(socket2)
  game.onPlayerJoin(socket3)

  game.turn.board = [
    [10, 20, 30],
    [0, 0, 0]
  ]

  game.turn.painters.forEach((painter, k) => {
    painter.i = 0
    painter.j = k
    painter.dir = C.DOWN
  })

  game.tick()

  const { turn, players, sockets } = game
  const { board, painters } = turn

  const oldpainter = clone(painters[1])
  game.onPlayerLeave(socket2)
  const socket4 = fakeSocket()
  game.onPlayerJoin(socket4)

  t.deepEqual(players, {
    [socket1.id]: 0,
    [socket4.id]: 1,
    [socket3.id]: 2
  }, 'should fill free slot in players')
  t.deepEqual(
    sockets.map(socket => socket && socket.id),
    [socket1.id, socket4.id, socket3.id],
    'should fill free slot in sockets')
  t.ok(boardHasCells(board, [10, 20, 30]),
    'painter from player who just left should still be there on the map')
  t.deepEqual(painters[1], oldpainter, 'painter shouldnt have been modified')
  t.ok(painters[1].alive, 'painter should still be alive til next tick')
  t.end()
})
