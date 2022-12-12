#!/usr/bin/env node

import inquirer from 'inquirer'
import fs from 'fs'
import { Command } from 'commander'
import { noArgs } from '../utils/validation.js'

import * as authenticateCommand from '../commands/authenticate.js'
import * as directionCommand from '../commands/direction.js'
import * as locationCommand from '../commands/location.js'
import * as keyCommand from '../commands/key.js'
import path from 'path'
import {
  KeyManager,
  KEY_NAME_AUTH0_ACCESS_TOKEN,
  KEY_NAME_ENGINE,
  KEY_NAME_GOOGLE_TOKEN,
  KEY_NAME_LOCATIONS,
  KEY_NAME_VERSION,
} from '../lib/KeyManager.js'
import * as print from '../utils/style.js'

const keyManager = new KeyManager()
const program = new Command()
const packageJson = JSON.parse(fs.readFileSync(path.resolve('./package.json'), 'utf8'))

async function printStatus() {
  print.line('🌎')
  print.statement('Startup checks:')
  print.value('Version', 'v' + keyManager.get(KEY_NAME_VERSION))
  print.value('Directions Engine', '{' + keyManager.get(KEY_NAME_ENGINE) + '}')
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

/**
 * Inquiry => Check the user's initial desired action when entering interactive mode
 * @returns answer
 */
async function questionInterativeInitial() {
  let availableChoices = [
    'Quick Path Search',
    'New Path Search',
    'Locations',
    new inquirer.Separator(),
    'Config',
    'Authenticate',
  ]

  const answers = await inquirer.prompt({
    name: 'desired_action_initial',
    type: 'list',
    message: 'What would you like to do\n',
    choices: availableChoices,
  })

  return answers
}

// If we have no args, we enter interactive mode
if (noArgs()) {
  await printStatus()

  const action = await questionInterativeInitial()

  switch (action.desired_action_initial) {
    case 'Quick Path Search':
      await directionCommand.quick()
      break
    case 'New Path Search':
      await directionCommand.newDirection()
      break
    case 'Locations':
      await locationCommand.dialog()
      break
    case 'Config':
      await keyCommand.configAll()
      break
    case 'Authenticate':
      await authenticateCommand.authenticate()
      break

    default:
      break
  }

  console.log('============================')
  process.exit(0)
}

/**
 * We get here if there are arguments provided
 */
program
  .version(packageJson.version)
  .command('key', 'Manage API Key -- Google Maps')
  .command('location', 'Manage Locations')
  .command('direction', 'Query Directions (from saved locations)')
// .parse(process.argv)

program.parse(process.argv)
