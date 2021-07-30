import { config } from 'dotenv';
import { Client } from '.';
config();

// To run this example, you need to have a local Revolt server running and an existing account.
// Copy and paste `.env.example` to `.env` and edit accordingly.

let client = new Client({
    apiURL: process.env.API_URL
});

client.on('ready', async () => {
    console.info(`Logged in as ${client.user!.username}!`);

    [...client.users.values()].forEach(x => console.info(`perm against ${x.username} is ${x.permission}`));
    [...client.servers.values()].forEach(x => console.info(`perm against ${x.name} is ${x.permission}`));
    [...client.channels.values()].forEach(x => console.info(`perm against ${x.name} is ${x.permission}`));

    setTimeout(() => {
        client.users.edit({
            remove: 'Avatar'
        });
    }, 10_000);
});

client.on('message', async message => {
    if (message.content === 'sus') {
        message.channel!.sendMessage('sus!');
    }
});

import { autorun } from 'mobx';

autorun(() => {
    console.log(`
BATCH UPDATE
----
srv ids: ${[...client.servers.values()].map(x => x._id).length}
chn ids: ${[...client.channels.values()].map(x => x._id).length}
usr ids: ${[...client.users.values()].map(x => x._id).length}
msg ids: ${[...client.messages.values()].map(x => x._id).length}
mbr ids: ${[...client.members.values()].map(x => x._id).length}
----`);
});

client.once('ready', () => {
    autorun(() => {
        console.log(`Changed username to ${client.user!.username}!`);
    });

    autorun(() => {
        console.log(`Avatar URL: ${client.user!.generateAvatarURL()}!`);
    });

    let server_id = [...client.servers.keys()][0];
    autorun(() => {
        console.log(`

Server
------
Name: ${client.servers.get(server_id)!.name}
`);
    });
});

client.login({ email: process.env.EMAIL as string, password: process.env.PASSWORD as string })
// client.useExistingSession({ user_id: process.env.USER_ID as string, session_token: process.env.SESSION_TOKEN as string });
