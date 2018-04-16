# TxtZ Wallet
TxtZ is a SMS Wallet App for BitcoinZ

## About

This app is the backend server daemon required for the TxtZ service.

Warning: TxtZ is experimental and should be used at your own risk.

## Features of TxtZ

* Ease to use
* No install required for the user
* SMS BTCZ to a friend using a phone number or Address
* Support for both T and Z Addresses
* No smart phone required
* Usable when you can not install an app on to a mobile device

## Requirements

* Twilio.com account
* Node v8.x.x
* Linux (probably)
* BitcoinZ Full Node

## Install
Before moving forward, you will need make sure you have a Twilio account setup and
create an accountSid and token for a SMS phone number.

#### Configure TxtZ
Configure the project by editing config found in `config/default.js`. At the minimum
you will need to update the config with your Twilio accountSid, token, and SMS number.

### Install npm dependencies
Install the npm dependencies using the following command:
```
npm install
```

#### Setup MySQL
This project requires the `txtz` database to be created in MySQL. Create it by
executing the following:

    $ mysqladmin -u root -p create txtz

Create the hubs mysql user and give it permissions to the database from the mysql CLI:

    mysql> CREATE USER 'txtz'@'%' IDENTIFIED BY 'btczftw!';
    mysql> grant all on txtz.* to 'txtz'@'%';

Run the knex migrations

    ./node_modules/.bin/knex migrate:latest

#### Setup BitcoinZ Full Node
Build and setup a BitcoinZ node using the insight patched node repository:
https://github.com/btcz/bitcoinz-insight-patched

## Docker Compose
TxtZ has support for Docker Compose to make it easy to quickly build and launch
the TxtZ service.

Copy the `env-defaults` template to the Docker Compose environment file:

    cp ./docker/env-defaults .env

Edit the `.env` file and add the required Twilio configuration:

    vim .env

Launch the TxtZ service with the following command:

    docker-compose up

## Services
When Twilio receives a message, the Twilio service will send a notification to
the TxtZ webhook. The Twilio webhook runs on the following service:
http://localhost:3838/message

It will probably be necessary to proxy the Twilio webhook using a service like
https://ngrok.com

## Contributing
Contributions are welcome! Feel free to open an issue or create a PR. Our github
repository can be found here: https://github.com/bitcoinz-wallets/txtz

#### Future Goals
* Support for all SMS provider
* Support for Memos
* Support for USD
