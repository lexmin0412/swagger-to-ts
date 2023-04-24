#! /usr/bin/env node
const { gen } = require('../lib/index')
const args = process.argv

gen(args[2])
