#!/usr/bin/env node

import inquirer from 'inquirer';
import fs from 'fs'
import { Command } from 'commander';
import { noArgs } from '../utils/validation.js';

import * as directionCommand from '../commands/direction.js';
import * as locationCommand from '../commands/location.js';
import * as keyCommand from '../commands/key.js';
import path from 'path';

const program = new Command();
const packageJson = JSON.parse(fs.readFileSync(path.resolve('./package.json'), 'utf8'));

/**
 * Inquiry => Check the user's initial desired action when entering interactive mode
 * @returns answer
 */
async function questionInterativeInitial() {
  const answers = await inquirer.prompt(
    {
      name: 'desired_action_initial',
      type: 'list',
      message: 'What would you like to do\n',
      choices: [
        'Quick Path Search',
        'New Path Search',
        'Show Locations',
        'Add Location',
        'Set Google API Token',
      ],
    });

  return answers;
}


// If we have no args, we enter interactive mode
if (noArgs()) {  
  const action = await questionInterativeInitial();

  switch (action.desired_action_initial) {
    case 'Quick Path Search': 
    await directionCommand.quick()
      break;
    case 'New Path Search': 
    await directionCommand.newDirection()
      break;
    case 'Show Locations': 
    await locationCommand.show()
      break;
    case 'Add Location': 
      await locationCommand.add()
      break;
    case 'Set Google API Token': 
      await keyCommand.set()
      break;
  
    default:
      break;
  }
  
  console.log('============================')
  process.exit(1)
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
  ;

program.parse(process.argv);