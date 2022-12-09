#!/usr/bin/env node

import { Command } from 'commander'
const program = new Command()
import * as keyCommand from '../commands/key.js'

program // force new line
  .command('set')
  .description('Set Google API Key')
  .action(keyCommand.set)

program
  .command('show')
  .description('Show Google API Key')
  .action(keyCommand.show)

program
  .command('remove')
  .description('Show Google API Key')
  .action(keyCommand.remove)

program.parse(process.argv)
