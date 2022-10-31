#!/usr/bin/env node

import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs'
import { Command } from 'commander';
import { noArgs } from '../utils/validation.js';
import { KeyManager, ERROR_MESSAGE_NO_KEY } from '../lib/KeyManager.js';
import { Client } from "@googlemaps/google-maps-services-js";

const program = new Command();
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const keyManager = new KeyManager();
let apiToken, action, direction;

/**
 * Check if we have a valid token.
 * Save it in local variables if we do, or exit program if we don't
 */
function validateToken() {
  try {
    apiToken = keyManager.getToken()
  } catch (error) {
    console.log(error.message)
    if (error.message === ERROR_MESSAGE_NO_KEY) {
      console.log('use "clip set key"')
    }
    process.exit(1)  
  }
}

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

/**
 * Inquiry => Get new origin/destination parameters
 * @returns 
 */
async function questionNewDirection() {
  const questions = [{
    name: 'origin',
    type: 'input',
    message: 'What\'s the Origin\n',
    
  },
  {
    name: 'destination',
    type: 'input',
    message: 'What\'s the Destination\n',
    
  }]

  return await inquirer
    .prompt(questions)
    .then((answers) => {
      // console.log('\nOrder receipt:');
      // console.log(JSON.stringify(answers, null, '  '));
      return answers
    });

}

/**
 * Execute a new interrogation to Google API
 */
async function executeNewSearch(origin, destination) {
  const client = new Client({});
  await client
    .directions({
      params: {
        origin: origin,
        destination: destination,
        key: apiToken
      },
      timeout: 1000, // milliseconds
    })
    .then((res) => {
      console.log('Start:    ' + res.data.routes[0].legs[0].start_address)
      console.log('End:      ' + res.data.routes[0].legs[0].end_address)
      console.log('')
      console.log('Summary:  ' + res.data.routes[0].summary)
      console.log('Distance: ' + res.data.routes[0].legs[0].distance.text)
      console.log('Duration: ' + res.data.routes[0].legs[0].duration.text)
    })
    .catch((e) => {
      console.log(e)
      // console.log(e.response.data.error_message);
    });
}

// If we have no args, we enter interactive mode
if (noArgs()) {
  validateToken();
  
  action = await questionInterativeInitial();

  switch (action.desired_action_initial) {
    case 'Quick Search': 

      break;
    case 'New Search': 
      direction = await questionNewDirection();
      await executeNewSearch(direction.origin, direction.destination)
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
  // .parse(process.argv)
  ;

program.parse(process.argv);