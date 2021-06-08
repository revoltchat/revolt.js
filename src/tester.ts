import { config } from 'dotenv';
config();

global.indexedDB = require('fake-indexeddb');
global.IDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');

import { Db } from '@insertish/zangodb';
let db = new Db('state', 1, [ 'channels', 'users', 'servers', 'members' ]);

import { Client } from ".";
let client = new Client({ apiURL: 'http://local.revolt.chat:8000', db, debug: false });

// client2
let client2 = new Client({ apiURL: 'http://local.revolt.chat:8000', debug: false });
client2.connect().then(() => client2.login({ email: '2@example.com', password: 'nBeNaSsukrCCYhVMKQEM', device_name: 'r.js' }))
client2.once('ready', async () => console.log('Client 2 logged in.'))

// client.channels.on('mutation', console.log);

client.once('ready', async () => {
    console.log(`Logged in as @${client.user?.username}`);

    let servers = client.servers.toArray();
    for (let server of servers) {
        await client.servers.delete(server._id);
    }

    function dothing() {
        (async () => {
            let server = await client.servers.createServer({ name: 'sus amongus', nonce: ''+Math.random() });
    
            let invite: string;
            let tasks = [
                async () => await client.servers.createChannel(server._id, { name: 'based!', nonce: ''+Math.random() }),
                async () => await client.channels.delete(server.channels[0]),
                // async () => await client.servers.edit(server._id, { name: ''+Math.random()*100, description: 'henlo' }),
                // async () => await client.channels.edit(server.channels[0], { name: 'edited!', description: 'haha yes' }),
                async () => invite = await client.channels.createInvite(server.channels[0]),
                async () => await client.fetchInvite(invite),
                async () => await client2.joinInvite(invite),
                async () => await client2.channels.sendMessage(server.channels[0], 'message 2'),
                async () => await client.servers.members.fetchMembers(server._id),
                async () => await client2.servers.members.fetchMembers(server._id),
                async () => await client.servers.members.editMember(server._id, client.user?._id as string, { nickname: 'gamer' }),
                async () => await client.servers.members.fetchMember(server._id, client.user?._id as string),

                async () => console.log(client.servers.members.toArray()),

                async () => await client.servers.members.kickMember(server._id, client2.user!._id),           
                async () => await client2.joinInvite(invite),                                                 
                async () => await client.servers.banUser(server._id, client2.user!._id, { reason: 'bad' }),  
                async () => await client2.joinInvite(invite).catch(() => console.log('Failed succesfully.')),

                // async () => console.log(await client.servers.fetchBans(server._id)),

                async () => await client.servers.unbanUser(server._id, client2.user!._id),                    
                async () => await client2.joinInvite(invite),
                async () => await client2.servers.delete(server._id),      

                () => new Promise(r => setTimeout(r, 200)),
                async () => console.log('c1', client.servers.members.toArray()),
                async () => console.log('c2', client2.servers.members.toArray()),

                () => new Promise(r => setTimeout(r, 1000)),
                async () => await client.channels.sendMessage(server.channels[0], 'message 1'),
                async () => await client.deleteInvite(invite),
                async () => await client.servers.fetchInvites(server._id),
                // async () => await client.servers.delete(server._id)
            ];

            for (let task of tasks) {
                await task();
            }
        })()
    }

    dothing();
});

client.on('connecting', () => {
    console.log(`Connecting to the notifications server.`);
});

client.on('connected', () => {
    console.log(`Connected to notifications server.`);
});
6
client.on('dropped', () => {
    console.log(`Connection dropped.`);
});

client.on('message', (msg) => {
    let user = client.users.get(msg.author);
    console.log(`[client1] @${user?.username}: ${msg.content}`);
});

client2.on('message', (msg) => {
    let user = client.users.get(msg.author);
    console.log(`[client2] @${user?.username}: ${msg.content}`);
});

(async () => {
    await client.connect();
    let onboarding = await client.login({ email: '1@example.com', password: 'nBeNaSsukrCCYhVMKQEM', device_name: 'r.js' });
    if (onboarding) {
        await onboarding("username", false);
    }
})();
