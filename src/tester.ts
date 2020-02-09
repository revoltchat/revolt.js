import { config } from 'dotenv';
config();

import { Client } from '.';

let client = new Client();

client.on('ready', () => {
	console.log(`Logged in as ${client.user?.username}!`);

	client.lookup({ username: 'password' })
		.then(async x => {
			
		})
});

client.on('connected', () => {
	console.error('Connected.');
});

client.on('dropped', () => {
	console.error('Disconnected.');
});

client.on('error', err => {
	console.error('Encountered an error!', err);
});

client.login(process.env.email as string, process.env.password as string);
