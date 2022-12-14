// System stuff
import fs from 'fs'
import path from 'path'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

// Local files
import {
  KeyManager,
  KEY_NAME_AUTH0_ACCESS_TOKEN,
  KEY_NAME_ENGINE,
  KEY_NAME_ENVIRONMENT,
  KEY_NAME_GOOGLE_TOKEN,
  KEY_NAME_LOCATIONS,
} from '../lib/KeyManager.js'
import * as print from '../utils/style.js'

// Inits
const keyManager = new KeyManager()

export async function printStatus() {
  print.line('🌎')
  print.statement('Startup checks:')
  try {
    let pj
    let locationDescription = ''
    // Try to find the package.json file if we're in the development git folder
    const pjLocationDevelopment = path.resolve('./package.json')
    if (fs.existsSync(pjLocationDevelopment)) {
      pj = JSON.parse(fs.readFileSync(pjLocationDevelopment, 'utf8'))
      locationDescription = ' (Git folder)'
    }

    // Try to find the package.json file if the app is installed and started as a binary
    if (pj == undefined) {
      const __dirname = dirname(fileURLToPath(import.meta.url))
      const pjLocationPackage = path.join(__dirname, '..', 'package.json')
      if (fs.existsSync(pjLocationPackage)) {
        pj = JSON.parse(fs.readFileSync(pjLocationPackage, 'utf8'))
        locationDescription = ' (NPM folder)'
      }
    }
    if (pj == undefined) {
      throw new Error('Could not find project.json on this machine')
    }
    print.value('Version', pj.version + locationDescription)
  } catch (error) {
    console.log(error)
    print.value('Version', `unknown (${error.message})`)
  }
  print.value('Directions Engine', '{' + keyManager.get(KEY_NAME_ENGINE) + '}')
  print.value('Environment', '{' + keyManager.get(KEY_NAME_ENVIRONMENT) + '}')
  print.value('Saved Locations', keyManager.get(KEY_NAME_LOCATIONS).length)
  print.status(
    'Clip API Token',
    keyManager.exists(KEY_NAME_AUTH0_ACCESS_TOKEN),
    'Use Authenticate options to get or refresh'
  )
  print.status(
    'Google API Token',
    keyManager.exists(KEY_NAME_GOOGLE_TOKEN),
    'Needed in case you want to bypass our API'
  )
  print.line()
}
