#!/bin/bash

# Wait for mysql
./bin/wait-for-it.sh -t 300 mysql.:3306

# Wait for bitcoinZ node
./bin/wait-for-it.sh -t 86400 bitcoinz-node.:1979

# Run the knex migrations
./node_modules/.bin/knex migrate:latest

# Launch node
node ./index.js
