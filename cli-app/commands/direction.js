import inquirer from 'inquirer'
import { KeyManager } from '../lib/KeyManager.js'
import { PathController } from '../lib/PathController.js'
import _ from 'underscore'
import * as print from '../utils/style.js'

/**
 * Inquiry => Get new origin/destination parameters
 * @returns
 */
async function questionQuickDirection() {
  const keyManager = new KeyManager()
  const locations = keyManager.getLocations()
  const locationNames = _.pluck(locations, 'name')

  return await inquirer
    .prompt([
      {
        name: 'originName',
        type: 'list',
        message: "What's the Origin\n",
        choices: locationNames,
      },
      {
        name: 'destinationName',
        type: 'list',
        message: "What's the Destination\n",
        choices: locationNames,
      },
    ])
    .then((answers) => {
      return {
        origin: _.where(locations, { name: answers.originName })[0].address,
        destination: _.where(locations, {
          name: answers.destinationName,
        })[0].address,
      }
    })
}

/**
 * Inquiry => Get new origin/destination parameters
 * @returns
 */
async function questionNewDirection() {
  return await inquirer
    .prompt([
      {
        name: 'origin',
        type: 'input',
        message: "What's the Origin\n",
      },
      {
        name: 'destination',
        type: 'input',
        message: "What's the Destination\n",
      },
    ])
    .then((answers) => {
      return answers
    })
}

export async function quick() {
  const direction = await questionQuickDirection()
  const pathController = new PathController()
  const directionResult = await pathController.direction(direction.origin, direction.destination)

  if (directionResult.error) {
    print.error('Failed with the following message')
    console.log(directionResult.error)
    process.exit()
  }

  print.direction(directionResult)
}

export async function newDirection() {
  const direction = await questionNewDirection()
  const pathController = new PathController()
  const directionResult = await pathController.direction(direction.origin, direction.destination)

  // console.log(directionResult)

  if (directionResult.error) {
    print.error('Failed with the following message:')
    console.log(directionResult.error)
    process.exit()
  }

  print.direction(directionResult)
}
