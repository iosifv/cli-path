#!/usr/bin/env node

import { Command } from 'commander';
const program = new Command();
import * as locationCommand from '../commands/location.js';

program
  .command('init')
  .description('Init Location Object')
  .action(locationCommand.init);

program
  .command('add')
  .description('Add new Location')
  .action(locationCommand.add);

program
  .command('show')
  .description('Show all locations')
  .action(locationCommand.show);

// program
//   .command('remove')
//   .description('Remove one location')
//   .action(location.remove);

program.parse(process.argv);