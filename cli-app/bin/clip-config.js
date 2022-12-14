#!/usr/bin/env node

import { Command } from 'commander'
const program = new Command()
import * as configCommand from '../commands/config.js'
import * as authenticateCommand from '../commands/authenticate.js'

program
  .command('interactive')
  .description('Interactive dialog for general configs')
  .action(configCommand.dialog)
program
  .command('authenticate')
  .description('Interactive dialog for authentication')
  .action(authenticateCommand.dialog)
program.command('set').description('Set Google API Key').action(configCommand.setGoogleToken)
program.command('remove').description('Show Google API Key').action(configCommand.deleteGoogleToken)

program.parse(process.argv)
