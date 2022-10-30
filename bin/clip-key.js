#!/usr/bin/env node

import { Command } from 'commander';
const program = new Command();
import * as key from '../commands/key.js';

program
  .command('set')
  .description('Set Google API Key')
  .action(key.set);

program
  .command('show')
  .description('Show Google API Key')
  .action(key.show);


program
  .command('remove')
  .description('Show Google API Key')
  .action(key.remove);

program.parse(process.argv);