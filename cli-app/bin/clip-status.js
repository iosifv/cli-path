#!/usr/bin/env node

import { Command } from 'commander'
const program = new Command()
import * as statusCommand from '../commands/status.js'

statusCommand.printStatus()

program.parse(process.argv)
