import inquirer from 'inquirer'
import _ from 'underscore'
import { KeyManager } from '../lib/KeyManager.js'
import { PathController } from '../lib/PathController.js'
import * as print from '../utils/style.js'

const keyManager = new KeyManager()

async function questionNew() {
  const questions = [
    {
      name: 'name',
      type: 'input',
      message: "What's the name you want to save the location with (something short and simple)\n",
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

async function questionDelete() {
  const question = [
    {
      name: 'name',
      type: 'input',
      message: "What's the name you want to save the location with (something short and simple)\n",
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

async function questionConfirm(locationName, formattedAddress) {
  print.locationSingle(locationName, formattedAddress)
  const questions = [
    {
      name: 'confirmation',
      type: 'confirm',
      message: 'Want to save this location?\n',
    },
  ]

  return await inquirer.prompt(questions).then((answers) => {
    return answers.confirmation
  })
}

// export async function init() {
//   keyManager.initLocation()
// }

export async function show() {
  print.locationTable(keyManager.getLocations())
}

export async function add() {
  const newLocation = await questionNew()

  const pathController = new PathController()
  const formattedAddress = await pathController.location(newLocation.query)

  const confirm = await questionConfirm(newLocation.name, formattedAddress)

  if (confirm) {
    keyManager.addLocation(newLocation.name, formattedAddress)
  }
}

export async function del() {
  await inquirer
    .prompt([
      {
        type: 'list',
        name: 'key',
        message: 'Which location to delete?',
        choices: _.pluck(keyManager.getLocations(), 'name'),
      },
    ])
    .then(async (answer) => {
      keyManager.deleteLocation(answer.key)
      print.statement('Deleted sucessfully.')
    })
}

export async function dialog() {
  print.line()
  show()
  print.line()

  await inquirer
    .prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What do you want to do?',
        choices: ['Add location', 'Delete Location', new inquirer.Separator(), 'Exit'],
        filter(val) {
          return val.toLowerCase().replace(' location', '')
        },
      },
    ])
    .then(async (answer) => {
      switch (answer.action) {
        case 'add':
          await add()
          break
        case 'delete':
          await del()
          break
        case 'exit':
          process.exit(0)
          break

        default:
          print.error('Invalid choice')
          process.exit(1)
          break
      }
    })
}
