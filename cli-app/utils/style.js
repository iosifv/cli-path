import chalk from 'chalk'

export const error = chalk.bold.red
export const warning = chalk.hex('#FFA500') // Orange color

const MAX_NAME_LENGTH = 20

export function line() {
  console.log()
}

export function statement(text) {
  console.log(chalk.bold.yellow(text))
}

export function value(name, value) {
  console.log(
    'ᐧ ' + chalk.gray(name) + ':' + ' '.repeat(MAX_NAME_LENGTH - name.length) + chalk.green(value)
  )
}

export function status(name, state, message) {
  let text = state ? '✅' : '❗️'
  text += ' ' + chalk.bold(name)
  text += ' '.repeat(MAX_NAME_LENGTH - name.length)
  if (message) {
    text += chalk.gray('- ' + message)
  }

  console.log(text)
}
