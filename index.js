/* eslint no-console: 0 */
'use strict'
const Gitter = require('node-gitter')
const M = require('most')
const R = require('ramda')
const fetch = require('node-fetch')

const token = require('./gitter-token')

const gitter = new Gitter(token)

//////////////////////////////////////////////////////
// Gitter REST api
//

const gitterLatestMessage = roomId =>
  `https://api.gitter.im/v1/rooms/${roomId}/chatMessages?limit=1`

const gitterApiOptions = { headers: { Authorization: 'Bearer ' + token } }

//////////////////////////////////////////////////////
// Helpers
//

const isPublic = R.propEq('public', true)

const gitterMessageToConsole = ({ text, sent, fromUser: { username } }) => {
  console.log(`${username} @ ${sent}\n${text}\n`)
}

//////////////////////////////////////////////////////
// Streams
//

const room$ = M.fromPromise(gitter.currentUser().then(user => user.rooms()))
  .chain(M.from)
  .filter(isPublic)
  .map(({ id, name }) => ({ id, name }))

/**
 * To get them in time-order...
 * Fetch rooms into array, fetch first message from every room, sort array, make stream
 */
const createHistory$ = roomId =>
  M.fromPromise(
    fetch(gitterLatestMessage(roomId), gitterApiOptions).then(res => res.json())
  ).chain(M.from)

const createMessage$ = roomId =>
  M.fromPromise(
    gitter.rooms.find(roomId).then(room => {
      room.subscribe()
      return room
    })
  ).chain(room => M.fromEvent('chatMessages', room))

//////////////////////////////////////////////////////
// Run stuff
//

const history$ = room$.multicast().chain(room => createHistory$(room.id))

const message$ = room$
  .chain(room => createMessage$(room.id))
  .filter(({ operation }) => operation === 'create')
  .map(R.prop('model'))

const main$ = M.concat(history$, message$)

main$.observe(gitterMessageToConsole).catch(err => console.error(err))
