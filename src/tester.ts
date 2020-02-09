import { config } from 'dotenv';
config();

import { Client } from '.';

let client = new Client();

client.on('ready', () => {
	console.log(`Logged in as ${client.user?.username}!`);

	client.lookup({ username: 'password' })
		.then(async x => {
			let dm = await x[0].getDM();
			//console.log('Opened DM channel [', dm.id, ']');
			//let messages = await dm.fetchMessages();
			//console.log(messages.map(x => `${x.id}, ${x.author}: ${x.content}`));

			/*let m = await dm.sendMessage('hello from javascript!');
			await m.edit('test');
			await m.delete();*/

			for (let message of await dm.fetchMessages()) {
				if (message.content.includes("javascript")) {
					await message.delete();
				}
			}
		})
});

client.on('message', msg => {
	console.log(`[${msg.user.username}] ${msg.content}`);
});

client.on('message_update', (msg, old) => {
	console.log(`[${msg.user.username}::edited] ${msg.content}`);
});

client.on('message_delete', id => {
	console.log(`[deleted] ${id}`);
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
