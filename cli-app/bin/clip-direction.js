#!/usr/bin/env node

import { Command } from 'commander'
const program = new Command()
import * as directionCommand from '../commands/direction.js'

program
  .command('quick')
  .description('Quick search from saved locations')
  .action(directionCommand.quick)

program
  .command('new')
  .description('New direction search from runtime queries')
  .action(directionCommand.newDirection)

program.parse(process.argv)
