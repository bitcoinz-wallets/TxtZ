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
* Nodejs v8.x.x
* MySQL (or MariaDB)
* Linux (probably)
* BitcoinZ Full Node

## Install
Before moving forward, you will need make sure you have a Twilio account setup
and create an accountSid and token for a SMS phone number. TxtZ can be installed
using two different methods using either a `docker` and `docker-compose` install
or TxtZ can be installed manually. Before moving forward with the `docker` and
`docker-compose` install method,  please make sure you have docker installed
before continuing as these instructions do not cover how to install and setup
docker.

### Install Using Docker Compose
The fastest and easiest way to get TxtZ up and running is to use `docker` and
`docker-compose`. The `docker-compose` command will download, setup, and install
the Nodejs app, MySQL, and the BitcoinZ Full node. This makes it easier to jump
into TxtZ without having to worry about all of the dependencies.

To get started, checkout TxtZ from git and change to the project directory:

    git clone https://github.com/bitcoinz-wallets/TxtZ.git
    cd TxtZ

Next, copy the `env-defaults` template to the `docker-compose` environment file:

    cp ./docker/env-defaults .env

The `.env` file is where the Twilio configuration will go for the `docker-compose`
environment. Next, you will want to edit the `.env` file and add the required
Twilio configuration:

    vim .env

Finally, launch the TxtZ service with the following command:

    docker-compose up

#### Other Docker Compose Commands

To launch TxtZ as a daemon and run in the background, you can use the following
command:

    docker-compose up -d

The `docker-compose` command should show you a log output, however, if it does
not or you are running as a daemon you can use the following command to see the
logs:

    docker-compose logs -f -t


### Manually Installing TxtZ
If not using docker and docker-compose, follow these instructions to Manually
setup TxtZ

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
Build and setup a BitcoinZ node using the full node repository:
https://github.com/btcz/bitcoinz

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
