import chalk from 'chalk'
import table from 'cli-table3'

export const error = chalk.bold.red
export const warning = chalk.hex('#FFA500') // Orange color
const MAX_NAME_LENGTH = 25

export function line(text) {
  console.log(text ? text : '')
}

export function statement(text) {
  console.log(chalk.bold.yellow(text))
}

export function value(name, value) {
  console.log(
    '👉 ' + chalk.gray(name) + ' '.repeat(MAX_NAME_LENGTH - name.length) + chalk.green(value)
  )
}

export function status(name, state, message) {
  let text = state ? '✅' : '❗️'
  text += ' ' + chalk(name)
  text += ' '.repeat(MAX_NAME_LENGTH - name.length)
  if (message) {
    text += chalk.gray(message)
  }

  console.log(text)
}

export function locationTable(locationsArray) {
  statement('Currently saved locations:')
  let locationsTable = new table({
    head: ['Name', 'Full Address'],
  })

  // table is an Array, so you can `push`, `unshift`, `splice` and friends
  locationsArray.forEach((element) => {
    locationsTable.push([element.name, element.address])
  })

  console.log(locationsTable.toString())
}
