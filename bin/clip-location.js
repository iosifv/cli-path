#!/usr/bin/env node

import { Command } from 'commander';
const program = new Command();
import * as key from '../commands/key.js';

program
  .command('set')
  .description('Set new Location')
  .action(key.set);

program
  .command('show')
  .description('Show all locations')
  .action(key.show);

program
  .command('remove')
  .description('Remove one location')
  .action(key.remove);

program.parse(process.argv);