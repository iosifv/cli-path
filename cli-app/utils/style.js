import chalk from 'chalk'
import table from 'cli-table3'

export const warning = chalk.hex('#FFA500') // Orange color
const MAX_NAME_LENGTH = 25

export function line(text) {
  console.log(text ? text : '')
}

export function statement(text) {
  console.log(chalk.hex('#FFA500').bold(text))
}

export function error(text) {
  console.log(chalk.bold.red(text))
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

export function locationSingle(locationName, address) {
  let locationsTable = new table({
    head: ['Name', 'Full Address'],
  })
  locationsTable.push([locationName, address])
  console.log(locationsTable.toString())
}

export function configMessage(question, currentValue) {
  return `${question}?    ${chalk.reset.dim('currently set as')} [${chalk.yellow(currentValue)}]`
}

export function direction(directionObject) {
  let interfaceWidth = 50
  if (directionObject.start.length > interfaceWidth) {
    interfaceWidth = directionObject.start.length + 5
  }
  if (directionObject.end.length > interfaceWidth) {
    interfaceWidth = directionObject.end.length + 5
  }
  console.log()
  console.log(
    chalk
      .bgRgb(0, 0, 0)
      .underline.yellow(
        '  ' +
          directionObject.start +
          ' '.repeat(interfaceWidth - directionObject.start.length) +
          '    '
      )
  )
  console.log(
    chalk
      .bgRgb(0, 0, 0)
      .yellow(
        chalk.bold('    ↪ ') +
          directionObject.end +
          ' '.repeat(interfaceWidth - directionObject.end.length)
      )
  )

  value('Summary', directionObject.summary)
  value('Distance', directionObject.distance)
  value('Duration', directionObject.duration)
}
