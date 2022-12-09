import {
  KeyManager,
  KEY_NAME_AUTH0_ACCESS_TOKEN,
  KEY_NAME_AUTH0_DEVICE_CODE,
} from '../lib/KeyManager.js'
import { timeout } from '../utils/timeout.js'
import ora from 'ora'
import * as c from '../utils/constants.js'

export async function authenticate() {
  const keyManager = new KeyManager()

  // for some reason, if I use axios, I get back an encoded response...

  await fetch(c.AUTH0_CLIP_URL_DEVICE_CODE, {
    method: 'POST',
    headers: c.AUTH0_CLIP_DEFAULT_HEADERS,
    body: new URLSearchParams({ client_id: c.AUTH0_CLIP_CLIENT_ID }),
  })
    .then((response) => response.json())
    .then((response) => {
      keyManager.set(KEY_NAME_AUTH0_DEVICE_CODE, response.device_code)
      // Todo: change this to a style function
      console.log(
        `\nOpen the following url to authenticate: \n ↪ ${response.verification_uri_complete}\n`
      )
    })
    .catch((err) => console.error(err))

  let spinner = ora().start()
  spinner.spinner = 'bouncingBall'

  let authenticated = false
  const cycleLength = 5
  let cycle = cycleLength

  do {
    if (cycle == 0) {
      const responseToken = await fetch(c.AUTH0_CLIP_URL_TOKEN, {
        method: 'POST',
        headers: c.AUTH0_CLIP_DEFAULT_HEADERS,
        body: new URLSearchParams({
          grant_type: c.AUTH0_CLIP_GRANT_TYPE,
          client_id: c.AUTH0_CLIP_CLIENT_ID,
          device_code: keyManager.get(KEY_NAME_AUTH0_DEVICE_CODE),
        }),
      })
        .then((response) => response.json())
        .then((response) => {
          if (response.error != undefined) {
            // console.log(response)
            spinner.text = `[${response.error}] ${response.error_description}`
            spinner.fail()
            cycle = cycleLength
            spinner.text = `Checking in ${cycle} seconds...`
            spinner.start()
          } else {
            // console.log(response)

            spinner.text = 'Device Authorized!'
            spinner.succeed()
            spinner.stop()

            authenticated = true
            keyManager.set(KEY_NAME_AUTH0_ACCESS_TOKEN, response.access_token)
          }
        })
        .catch((err) => console.error(err))
    } else {
      spinner.text = `Checking in ${cycle} seconds...`
      await timeout(1000)
      cycle--
    }
  } while (!authenticated)

  spinner.text = 'Validating with clip-api...'
  spinner.start()
  await fetch(c.CLIP_SLS_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + keyManager.get(KEY_NAME_AUTH0_ACCESS_TOKEN),
    },
    body: '{}',
  })
    .then((response) => response.json())
    .then((response) => {
      spinner.text = 'Authenticated against our own clip-api!'
      spinner.succeed()
      spinner.stop()
    })
    .catch((err) => {
      spinner.text =
        'Failed to authenticate against our own clip-api (probably is offline)'
      spinner.fail()
      spinner.stop()

      // if (DEBUG) {
      //   console.log()
      //   console.error(err.code)
      // }
    })
}
