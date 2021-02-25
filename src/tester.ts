import { config } from 'dotenv';
config();

global.indexedDB = require('fake-indexeddb');
global.IDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');

import { Db } from '@insertish/zangodb';
let db = new Db('state', 1, [ 'channels', 'users' ]);

import { Client } from ".";
import { Users } from './api/objects';
let client = new Client({ apiURL: 'https://staging-api.revolt.chat', db, debug: true });

client.channels.on('mutation', console.log);

client.once('ready', async () => {
    console.log(`Logged in as @${client.user?.username}`);

    let channel = client.channels.toArray()[0];
    let user = client.users.toArray()
        .filter(user => user._id !== client.user?._id)
        .find(user => user.relationship === Users.Relationship.Friend);
    
    if (user) {
        await client.channels.addMember(channel._id, user?._id);
        await client.channels.removeMember(channel._id, user?._id);
    }

    // let channel = client.channels.values().next().value as Channel;
    // console.log(await channel.fetchMessages());
    // let message = await channel.sendMessage({ content: "bruh" });
    // await message.edit("pogger!");
    // await message.delete();

    // console.log(client.user?.online);
    // console.log(Array.from(client.users.values()).map(x => `@${x.username}: ${x.relationship}`));
    // await client.addFriend('poggers');

    // let user = Array.from(client.users.values()).find(x => x.id !== client.user?.id && !(x instanceof SystemUser)) as User;
    // let channel = await client.createGroup({ name: 'le group', nonce: ''+Math.random(), users: [ ] }) as GroupChannel;
    // await channel.addMember(user);
    // await channel.removeMember(user);
});

client.on('connecting', () => {
    console.log(`Connecting to the notifications server.`);
});

client.on('connected', () => {
    console.log(`Connected to notifications server.`);
});

client.on('dropped', () => {
    console.log(`Connection dropped.`);
});

client.on('message', (msg) => {
    let user = client.users.get(msg.author);
    console.log(`@${user?.username}: ${msg.content}`);
});

(async () => {
    console.log('Start:', new Date());

    try {
        await client.connect();
        let onboarding = await client.login({ email: 'me@insrt.uk', password: 'password', device_name: 'aaa' });
        if (onboarding) {
            await onboarding("username", false);
        }
    } catch (err) {
        console.error(err);
    }

    console.log('End:  ', new Date());
})();
