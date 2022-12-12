import inquirer from 'inquirer'
import { KeyManager, KEY_NAME_GOOGLE_TOKEN } from '../lib/KeyManager.js'
import { isRequired } from '../utils/validation.js'

export async function configAll() {}

/** @deprecated */
export async function set() {
  const keyManager = new KeyManager()

  await inquirer
    .prompt([
      {
        type: 'input',
        name: 'key',
        message: 'Enter Google Maps API Key',
        validate: isRequired,
      },
    ])
    .then((answers) => {
      const key = keyManager.set(KEY_NAME_GOOGLE_TOKEN, answers.key)

      if (key) {
        console.log('API Key Set')
      }
    })
    .catch((error) => {
      if (error.isTtyError) {
        // Prompt couldn't be rendered in the current environment
      } else {
        // Something else went wrong
      }
    })
}

export function show() {
  try {
    const keyManager = new KeyManager()
    const key = keyManager.get(KEY_NAME_GOOGLE_TOKEN)

    console.log('Current API Key: ', key)

    return key
  } catch (err) {
    console.error(err.message)
  }
}

export function remove() {
  try {
    const keyManager = new KeyManager()
    keyManager.deleteToken()

    console.log('Key Removed')

    return
  } catch (err) {
    console.error(err.message)
  }
}
