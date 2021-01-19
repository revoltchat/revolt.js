import { config } from 'dotenv';
config();

import { Client } from ".";
let client = new Client();

client.once('ready', async () => {
    console.log(`Logged in as @${client.user?.username}`);

    console.log(client.channels.values());

    // console.log(client.user?.online);
    // console.log(Array.from(client.users.values()).map(x => `@${x.username}: ${x.relationship}`));
    // await client.addFriend('poggers');
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
