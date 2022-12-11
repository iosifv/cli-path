import inquirer from 'inquirer'
import { KeyManager } from '../lib/KeyManager.js'
import { PathController } from '../lib/PathController.js'
import { locationTable } from '../utils/style.js'

const keyManager = new KeyManager()

async function questionNewLocation() {
  const questions = [
    {
      name: 'name',
      type: 'input',
      message:
        "What's the name you want to save the location with (something simple that you can write fast)\n",
    },
    {
      name: 'query',
      type: 'input',
      message: "What's the location you want to search for\n",
    },
  ]

  return await inquirer.prompt(questions).then((answers) => {
    return answers
  })
}

async function questionConfirmLocation(locationName, formattedAddress) {
  console.log(`${locationName} => ${formattedAddress}`)
  const questions = [
    {
      name: 'name',
      type: 'confirm',
      message: 'Want to save this location?\n',
    },
  ]

  return await inquirer.prompt(questions).then((answers) => {
    return answers
  })
}

export async function init() {
  keyManager.initLocation()
}

export async function add() {
  show()
  console.log()
  const newLocation = await questionNewLocation()

  const pathController = new PathController()
  const formattedAddress = await pathController.location(newLocation.query)
  console.log(formattedAddress)
  const confirm = await questionConfirmLocation(newLocation.name, formattedAddress)

  if (confirm) {
    keyManager.addLocation(newLocation.name, formattedAddress)
  }
}

export async function show() {
  locationTable(keyManager.getLocations())
}
