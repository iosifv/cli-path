#!/usr/bin/env node

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

import { Command } from 'commander';
const program = new Command();

program
  .version(packageJson.version)
  .command('key', 'Manage API Key -- Google Maps')
  .parse(process.argv);
