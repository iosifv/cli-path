import inquirer from 'inquirer';
import { KeyManager } from '../lib/KeyManager.js';
import { MapsClient } from '../utils/googleMapsClient.js';
import _, { pluck, where } from 'underscore';

const mapsClient = new MapsClient();

/**
 * Inquiry => Get new origin/destination parameters
 * @returns 
 */
 async function questionQuickDirection() {
  const keyManager = new KeyManager();
  const locations = keyManager.getLocations()

  const locationNames = _.pluck(locations, "name")

  const questions = [{
    name: 'originName',
    type: 'list',
    message: 'What\'s the Origin\n',
    choices: locationNames
  },
  {
    name: 'destinationName',
    type: 'list',
    message: 'What\'s the Destination\n',
    choices: locationNames
  }]


  return await inquirer
    .prompt(questions)
    .then((answers) => {
      // answers.origin      = _.where(locations, {name: answers.originName}).address
      // answers.destination = _.where(locations, {name: answers.destinationName}).address
      
      // console.log(JSON.stringify(answers, null, '  '));
      return {
        origin: _.where(locations, {name: answers.originName})[0].address,
        destination: _.where(locations, {name: answers.destinationName})[0].address
      }
    });

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

export async function quick() {
  const direction = await questionQuickDirection();
  // console.log(direction)
  // process.exit()
  await mapsClient.direction(direction.origin, direction.destination)
}


export async function newDirection() {
  const keyManager = new KeyManager();

  const direction = await questionNewDirection();
  await mapsClient.direction(direction.origin, direction.destination)
}


