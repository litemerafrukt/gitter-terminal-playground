/* eslint no-console: 0 */
'use strict'
const Gitter = require('node-gitter')
const M = require('most')
const R = require('ramda')

const token = require('./gitter-token')

const gitter = new Gitter(token)

//////////////////////////////////////////////////////
// Helpers
//

const isPublic = R.propEq('public', true)

const gitterMessageToConsole = ({
  model: { text, sent, fromUser: { username } }
}) => {
  console.log(`${username} @ ${sent}\n${text}\n`)
}

const room$ = M.fromPromise(gitter.currentUser().then(user => user.rooms()))
  .chain(M.from)
  .filter(isPublic)
  .map(({ id, name }) => ({ id, name }))
// .observe(console.log)
// .then(() => console.log('all done!'))

const createMessage$ = roomId =>
  M.fromPromise(
    gitter.rooms.find(roomId).then(room => {
      room.subscribe()
      return room
    })
  ).chain(room => M.fromEvent('chatMessages', room))

// createMessage$('59ca317cd73408ce4f776692').observe(gitterMessageToConsole)

const main$ = room$.chain(room => createMessage$(room.id))

main$
  .tap(console.log)
  .filter(({ operation }) => operation === 'create')
  .observe(gitterMessageToConsole)
  .catch(err => console.error(err))
