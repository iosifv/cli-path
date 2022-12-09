import inquirer from 'inquirer';
import { KeyManager } from '../lib/KeyManager.js';
import { isRequired } from '../utils/validation.js';

const AUTH0_CLIP_CLIENT_ID = 'CQYXLlHw2nZyrh61Z6srAkDO1Zi21tUS';

export async function authenticate() {
  const keyManager = new KeyManager();

  // for some reason, if I use axios, I get back an encoded response...
  
  const responseVerificationUri = await fetch(
      'https://iosifv.eu.auth0.com/oauth/device/code', 
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: AUTH0_CLIP_CLIENT_ID })
      }
    )
    .then(response => response.json())
    .then(response => {
      keyManager.setAuthDeviceCode(response.device_code)
      return response.verification_uri_complete;
    })
    .catch(err => console.error(err))
  ;

  console.log('Open the following url to authenticate: ' + responseVerificationUri)
  let authenticated = false;
  await inquirer
    .prompt([
      {
        type: 'confirm',
        name: 'authenticated',
        message: 'Continue after you authenticated in browser.',
        validate: isRequired
      }
    ])
    .then((answers) => {
      authenticated = answers.authenticated
    })
    .catch((error) => {
      if (error.isTtyError) {
        // Prompt couldn't be rendered in the current environment
      } else {
        // Something else went wrong
      }
    });

  if (authenticated) {
    const responseToken = await fetch(
        'https://iosifv.eu.auth0.com/oauth/token', 
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
            client_id: AUTH0_CLIP_CLIENT_ID,
            device_code: keyManager.getAuthDeviceCode()
          })
        }
      )
      .then(response => response.json())
      .then(response => {
        if (response.error != undefined) {
          console.log(response)
        } else {
          console.log(response)
          keyManager.setAuthToken(response.access_token)
        }
      })
      .catch(err => console.error(err));
  }
}




