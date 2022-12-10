import chalk from 'chalk'

export const error = chalk.bold.red
export const warning = chalk.hex('#FFA500') // Orange color

const MAX_NAME_LENGTH = 20

export function statement(text) {
  console.log(chalk.bold.yellow(text))
}

export function status(name, state, message) {
  let text = state ? '✅' : '❗️'
  text += ' ' + chalk.bold(name)
  text += ' '.repeat(MAX_NAME_LENGTH - name.length)
  if (message) {
    text += '- ' + message
  }

  console.log(text)
}
