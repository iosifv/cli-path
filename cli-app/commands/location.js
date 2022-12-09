import inquirer from 'inquirer'
import { KeyManager } from '../lib/KeyManager.js'
// import { MapsClient } from '../lib/googleMapsClient.js'
import { PathController } from '../lib/PathController.js'

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
  // const mapsClient = new MapsClient()
  // const formattedAddress = await mapsClient.location(newLocation.query)
  const pathController = new PathController()
  const formattedAddress = await pathController.location(newLocation.query)
  console.log(formattedAddress)
  const confirm = await questionConfirmLocation(
    newLocation.name,
    formattedAddress
  )

  if (confirm) {
    keyManager.addLocation(newLocation.name, formattedAddress)
  }
}

export function show() {
  try {
    console.log('Currently saved locations:')
    const locations = keyManager.getLocations()
    locations.forEach((element) => {
      console.log(element.name + ' => ' + element.address)
    })
  } catch (err) {
    console.error(err.message)
  }
}
