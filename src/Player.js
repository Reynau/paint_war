const C = require('./constants.js')
const { Entity } = require('./Entity.js')

class Player extends Entity {

  constructor (i = -1, j = -1, dir = C.STOP, team = -1) {
    super(i, j)
    this.dir = dir
    this.team = team
    this.alive = true
    this.timeToRespawn = 0
  }

  die () {
    this.alive = false
    this.secToLive = this.deathTime
  }

  getBaseValue () {
    return 10 * this.team
  }
}
exports.Player = Player
