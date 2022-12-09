
import { KeyManager } from '../lib/KeyManager.js';
import { timeout } from '../utils/timeout.js';
import ora from 'ora';

const AUTH0_CLIP_CLIENT_ID = 'CQYXLlHw2nZyrh61Z6srAkDO1Zi21tUS'
const AUTH0_CLIP_URL_DEVICE_CODE = 'https://iosifv.eu.auth0.com/oauth/device/code'
const AUTH0_CLIP_URL_TOKEN = 'https://iosifv.eu.auth0.com/oauth/token'
const AUTH0_CLIP_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:device_code'
const AUTH0_CLIP_DEFAULT_HEADERS = { 'Content-Type': 'application/x-www-form-urlencoded' }

export async function authenticate() {
  const keyManager = new KeyManager();

  // for some reason, if I use axios, I get back an encoded response...
  
  await fetch(
    AUTH0_CLIP_URL_DEVICE_CODE, 
    {
      method: 'POST',
      headers: AUTH0_CLIP_DEFAULT_HEADERS,
      body: new URLSearchParams({ client_id: AUTH0_CLIP_CLIENT_ID })
    }
  )
  .then(response => response.json())
  .then(response => {
    keyManager.setAuthDeviceCode(response.device_code)
    console.log(`\nOpen the following url to authenticate: \n ↪ ${response.verification_uri_complete}\n`)
  })
  .catch(err => console.error(err))
  ;

  let spinner = ora().start();

  let authenticated = false;
  const cycleLength = 5
  let cycle = cycleLength
  
  do {
    if (cycle == 0) {
      const responseToken = await fetch(
        AUTH0_CLIP_URL_TOKEN, 
        {
          method: 'POST',
          headers: AUTH0_CLIP_DEFAULT_HEADERS,
          body: new URLSearchParams({
            grant_type: AUTH0_CLIP_GRANT_TYPE,
            client_id: AUTH0_CLIP_CLIENT_ID,
            device_code: keyManager.getAuthDeviceCode()
          })
        }
      )
      .then(response => response.json())
      .then(response => {
        if (response.error != undefined) {
          // console.log(response)
          spinner.text = `[${response.error}] ${response.error_description}`
          spinner.fail()
          cycle = cycleLength
          spinner.text = `Checking in ${cycle} seconds...`;
          spinner.start()
        } else {
          // console.log(response)
          
          spinner.text = 'Authorized!'
          spinner.succeed()
          spinner.stop()
          
          authenticated = true
          keyManager.setAuthToken(response.access_token)
        }
      })
      .catch(err => console.error(err));
  
    } else {
      spinner.text = `Checking in ${cycle} seconds...`;
      await timeout(1000);
      cycle--;
    }



  } while (!authenticated);

  console.log('You reached the end...')
}




