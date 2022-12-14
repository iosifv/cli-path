#!/usr/bin/env node

// System stuff
import inquirer from 'inquirer'
import { Command } from 'commander'

// Local files
import { noArgs } from '../utils/validation.js'
import * as authenticateCommand from '../commands/authenticate.js'
import * as directionCommand from '../commands/direction.js'
import * as locationCommand from '../commands/location.js'
import * as configCommand from '../commands/config.js'

const program = new Command()

/**
 * Inquiry => Check the user's initial desired action when entering interactive mode
 * @returns answer
 */
async function questionInterativeInitial() {
  let availableChoices = [
    'Search with saved locations',
    'Search a blank new path',
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
  const action = await questionInterativeInitial()

  switch (action.desired_action_initial) {
    case 'Search with saved locations':
      await directionCommand.quick()
      break
    case 'Search a blank new path':
      await directionCommand.newDirection()
      break
    case 'Locations':
      await locationCommand.dialog()
      break
    case 'Config':
      await configCommand.dialog()
      break
    case 'Authenticate':
      await authenticateCommand.dialog()
      break

    default:
      break
  }

  process.exit(0)
}

/**
 * We get here if there are arguments provided
 */
program
  .version('use status command')
  .command('direction', 'Query Directions')
  .command('location', 'Manage Locations')
  .command('config', 'Manage configurations')
  .command('status', 'Show status information')

program.parse(process.argv)
