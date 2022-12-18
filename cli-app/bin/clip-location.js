#!/usr/bin/env node

import { Command } from 'commander'
const program = new Command()
import * as locationCommand from '../commands/location.js'

program.command('interactive').description('Interactive dialog').action(locationCommand.dialog)
program.command('show').description('Show all locations').action(locationCommand.show)
program.command('add').description('Add new Location').action(locationCommand.add)
program.command('remove').description('Remove one location').action(locationCommand.del)
program.command('purge').description('Purge all location').action(locationCommand.purge)

program.parse(process.argv)
