import { config } from 'dotenv';
config();

import { Client } from ".";
let client = new Client();

client.once('ready', async () => {
    console.log(`Logged in as @${client.user?.username}`);

    // let channel = client.channels.values().next().value as Channel;
    // console.log(await channel.fetchMessages());
    // let message = await channel.sendMessage("epic!");
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

client.once('user/relationship_changed', user => user.removeFriend());

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
    console.log(`@${msg.author.username}: ${msg.content}`);
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
