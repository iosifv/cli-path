import inquirer from 'inquirer'
import {
  KeyManager,
  KEY_NAME_ENGINE,
  KEY_NAME_ENVIRONMENT,
  KEY_NAME_GOOGLE_TOKEN,
} from '../lib/KeyManager.js'
import { isRequired } from '../utils/validation.js'
import * as print from '../utils/style.js'

const keyManager = new KeyManager()

export async function dialog() {
  await inquirer
    .prompt([
      {
        type: 'list',
        name: 'environment',
        message: print.configMessage(
          'Switch Enviroment',
          keyManager.getOrNull(KEY_NAME_ENVIRONMENT)
        ),
        choices: ['Skip', new inquirer.Separator(), 'localhost', 'slsdev'],
        filter(val) {
          return val.toLowerCase()
        },
      },
      {
        type: 'list',
        name: 'engine',
        message: print.configMessage(
          'Switch search engine ',
          keyManager.getOrNull(KEY_NAME_ENGINE)
        ),
        choices: ['Skip', new inquirer.Separator(), 'clip', 'google'],
        filter(val) {
          return val.toLowerCase()
        },
      },
      {
        type: 'list',
        name: 'googleToken',
        message: print.configMessage(
          'Change Google API Token',
          keyManager.getOrNull(KEY_NAME_GOOGLE_TOKEN)
        ),
        choices: ['Skip', new inquirer.Separator(), 'replace', 'delete'],
        filter(val) {
          return val.toLowerCase()
        },
      },
    ])
    .then(async (answers) => {
      if (answers.environment != 'skip') {
        keyManager.set(KEY_NAME_ENVIRONMENT, answers.environment)
      }
      if (answers.engine != 'skip') {
        keyManager.set(KEY_NAME_ENGINE, answers.engine)
      }
      if (answers.googleToken == 'replace') {
        await setGoogleToken()
      }
      if (answers.googleToken == 'delete') {
        deleteGoogleToken
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

export async function setGoogleToken() {
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

export function deleteGoogleToken() {
  try {
    const keyManager = new KeyManager()
    keyManager.delete(KEY_NAME_GOOGLE_TOKEN)

    console.log('Key Removed')

    return
  } catch (err) {
    console.error(err.message)
  }
}
