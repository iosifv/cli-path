import {
  KeyManager,
  KEY_NAME_AUTH0_ACCESS_TOKEN,
  KEY_NAME_AUTH0_DEVICE_CODE,
  KEY_NAME_USERINFO,
} from '../lib/KeyManager.js'
import { timeout } from '../utils/timeout.js'
import ora from 'ora'
import * as c from '../utils/constants.js'
import { line, statement, value } from '../utils/style.js'
import { buildClipOptions } from '../lib/clients/ClipApi.js'
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
      data: new URLSearchParams({
        client_id: c.AUTH0_CLIP_CLIENT_ID,
        scope: 'openid profile',
      }),
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
    .request(buildClipOptions('authentication', { payload: 'empty' }))
    .then(function (response) {
      spinner.text = 'Authenticated against our own clip-api!'
      spinner.succeed()
      spinner.stop()
      keyManager.set(KEY_NAME_USERINFO, response.data.data)
    })
    .catch(function (error) {
      spinner.fail()
      spinner.stop()

      console.error(error)
    })

  /**
   * Github:
  {
		"sub": "github|7619809",
		"nickname": "iosifv",
		"name": "Iosif",
		"picture": "https://avatars.githubusercontent.com/u/7619809?v=4",
		"updated_at": "2022-12-18T18:53:05.378Z"
	}
   */
  /**
   * Facebook
   {
		"sub": "facebook|10226560454891130",
		"given_name": "Iosif",
		"family_name": "Vee",
		"nickname": "Iosif Vee",
		"name": "Iosif Vee",
		"picture": "https://platform-lookaside.fbsbx.com/platform/profilepic/?asid=10226560454891130&height=50&width=50&ext=1673985032&hash=AeRZ_C0gwnlYIKb2qp8",
		"updated_at": "2022-12-18T19:50:32.469Z"
	}
   */

  /**
   * Google
   {
		"sub": "google-oauth2|107268393183012825234",
		"given_name": "iosif",
		"family_name": "vigh",
		"nickname": "iosifvigh",
		"name": "iosif vigh",
		"picture": "https://lh3.googleusercontent.com/a/AEdFTp52FzFnDaFXPsRmwcCHlcAjcKxUq2p_ejfpbJFY=s96-c",
		"locale": "en",
		"updated_at": "2022-12-18T19:51:49.138Z"
	}
   */

  /**
   * Linkedin {
		"sub": "linkedin|0AuRjLfLL4",
		"given_name": "Iosif",
		"family_name": "V.",
		"nickname": "Iosif V.",
		"name": "Iosif V.",
		"picture": "https://media.licdn.com/dms/image/C4E03AQFgC6t7PCM1Yw/profile-displayphoto-shrink_800_800/0/1527760716690?e=1677110400&v=beta&t=Ryn2RS-2C8bOWwTAleDnKwtn1vQ1-BIeXrdpCwhI9h0",
		"updated_at": "2022-12-18T19:53:12.210Z"
	}
   */
}
