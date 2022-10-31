#!/usr/bin/env node

import inquirer from 'inquirer';
import fs from 'fs'
import { Command } from 'commander';
import { noArgs } from '../utils/validation.js';

const program = new Command();
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
let action;

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
        'Quick Search',
        'New Search',
        'Manage Locations',
        'Manage Token',
      ],
    });

  return answers;
}


// If we have no args, we enter interactive mode
if (noArgs()) {
  // validateToken();
  
  action = await questionInterativeInitial();

  switch (action.desired_action_initial) {
    case 'Quick Search': 

      break;
    case 'New Search': 
      
      break;
    case 'Manage Locations': 

      break;
    case 'Manage Token': 

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