import {
  KeyManager,
  KEY_NAME_AUTH0_ACCESS_TOKEN,
  KEY_NAME_AUTH0_DEVICE_CODE,
} from '../lib/KeyManager.js'
import { timeout } from '../utils/timeout.js'
import ora from 'ora'
import * as c from '../utils/constants.js'
import { line, statement, value } from '../utils/style.js'
import { getClipUrl } from '../lib/clients/ClipApi.js'
import axios from 'axios'

export async function dialog() {
  const keyManager = new KeyManager()

  /**
   * Show the user the verification url and code
   */
  await axios
    .request({
      method: 'POST',
      url: c.AUTH0_CLIP_URL_DEVICE_CODE,
      headers: c.AUTH0_CLIP_DEFAULT_HEADERS,
      data: new URLSearchParams({ client_id: c.AUTH0_CLIP_CLIENT_ID }),
    })
    .then((response) => {
      keyManager.set(KEY_NAME_AUTH0_DEVICE_CODE, response.data.device_code)

      line()
      value('Verification CODE:', response.data.user_code)
      statement('Open to authenticate')
      line(` ↪ ${response.data.verification_uri_complete}\n`)
    })
    .catch((err) => console.error(err))

  let spinner = ora().start()
  spinner.spinner = 'bouncingBall'

  let authenticated = false
  const cycleLength = 5
  let cycle = cycleLength

  /**
   * With the verification url printed on the terminal,
   * Cycle through 5 second loops and check if the user has done the authentication
   */
  do {
    if (cycle == 0) {
      await axios
        .request({
          method: 'POST',
          url: c.AUTH0_CLIP_URL_TOKEN,
          headers: c.AUTH0_CLIP_DEFAULT_HEADERS,
          data: new URLSearchParams({
            grant_type: c.AUTH0_CLIP_GRANT_TYPE,
            client_id: c.AUTH0_CLIP_CLIENT_ID,
            device_code: keyManager.get(KEY_NAME_AUTH0_DEVICE_CODE),
          }),
        })
        .then((response) => {
          // console.log(response.data)
          spinner.text = 'Device Authorized!'
          spinner.succeed()
          spinner.stop()

          authenticated = true
          keyManager.set(KEY_NAME_AUTH0_ACCESS_TOKEN, response.data.access_token)
        })
        .catch((err) => {
          // console.error(err.response.data)
          spinner.text = `[${err.response.data.error}] ${err.response.data.error_description}`
          spinner.fail()
          cycle = cycleLength
          spinner.text = `Checking in ${cycle} seconds...`
          spinner.start()
        })
    } else {
      spinner.text = `Checking in ${cycle} seconds...`
      await timeout(1000)
      cycle--
    }
  } while (!authenticated)

  /**
   * After the device was fully authenticated with Auth0,
   * Simply pefrorm a request to our API with the new bearer token
   */
  spinner.text = 'Validating with clip-api...'
  spinner.start()

  await axios
    .request({
      method: 'POST',
      url: getClipUrl('authentication'),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + keyManager.get(KEY_NAME_AUTH0_ACCESS_TOKEN),
      },
      data: {},
    })
    .then(function (response) {
      console.log(response.data)
      spinner.text = 'Authenticated against our own clip-api!'
      spinner.succeed()
      spinner.stop()
    })
    .catch(function (error) {
      spinner.fail()
      spinner.stop()

      console.error(error)
    })
}
