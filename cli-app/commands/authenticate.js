import { KeyManager } from '../lib/KeyManager.js'
import { timeout } from '../utils/timeout.js'
import ora from 'ora'
import * as c from '../lib/constants.js'

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
      keyManager.setAuthDeviceCode(response.device_code)
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
          device_code: keyManager.getAuthDeviceCode(),
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
            keyManager.setAuthToken(response.access_token)
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
      Authorization: 'Bearer ' + keyManager.getAuthToken(),
    },
    body: '{}',
  })
    .then((response) => response.json())
    .then((response) => {
      spinner.text = 'Authenticated against our own clip-api!'
      spinner.succeed()
      spinner.stop()
    })
    .catch((err) => console.error(err))
}
