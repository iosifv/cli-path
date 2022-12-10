import inquirer from 'inquirer'
import { KeyManager } from '../lib/KeyManager.js'
import { PathController } from '../lib/PathController.js'
// import { MapsClient } from '../lib/googleMapsClient.js'
// import { ClipClient } from '../lib/clipApiClient.js'
import _, { pluck, where } from 'underscore'

/**
 * Inquiry => Get new origin/destination parameters
 * @returns
 */
async function questionQuickDirection() {
  const keyManager = new KeyManager()
  const locations = keyManager.getLocations()
  const locationNames = _.pluck(locations, 'name')

  const questions = [
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
  ]

  return await inquirer.prompt(questions).then((answers) => {
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
  const questions = [
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
  ]

  return await inquirer.prompt(questions).then((answers) => {
    return answers
  })
}

export async function quick() {
  const direction = await questionQuickDirection()
  const pathController = new PathController()
  pathController.direction(direction.origin, direction.destination)
}

export async function newDirection() {
  const direction = await questionNewDirection()
  const pathController = new PathController()
  const directionResult = await pathController.direction(
    direction.origin,
    direction.destination
  )

  console.log(directionResult)
}
