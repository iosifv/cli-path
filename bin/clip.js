#!/usr/bin/env node

import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs'
import { Command } from 'commander';
import { noArgs } from '../utils/validation.js';
import { KeyManager, ERROR_MESSAGE_NO_KEY } from '../lib/KeyManager.js';

const program = new Command();
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const keyManager = new KeyManager();
let apiToken;

// If we have no args, we enter interractive mode
if (noArgs()) {
  // Check if we have a token key set and exit if we don't
  try {
    apiToken = keyManager.getToken()
  } catch (error) {
    console.log(error.message)
    if (error.message === ERROR_MESSAGE_NO_KEY) {
      console.log('use "clip set key"')
    }
    process.exit(1)  
  }
  // console.log('Found an API token: ' + apiToken)

  // Load in locations
  console.log(keyManager.set('locations', ))
}


program
  .version(packageJson.version)
  .command('key', 'Manage API Key -- Google Maps')
  .command('localtions', 'Manage Locations -- Google Maps')
  // .parse(process.argv)
  ;


// async function question1() {
//   const answers = await inquirer.prompt({
//     name: 'question_1',
//     type: 'list',
//     message: 'JavaScript was created in 10 days then released on\n',
//     choices: [
//       'May 23rd, 1995',
//       'Nov 24th, 1995',
//       'Dec 4th, 1995',
//       'Dec 17, 1996',
//     ],
//   });

//   return handleAnswer(answers.question_1 === 'Dec 4th, 1995');
// }

// await question1();

program.parse(process.argv);