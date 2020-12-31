import { config } from 'dotenv';
config();

import { Client } from "./Client";
let client = new Client();

client.on('ready', () => {
    console.log(`Logged in as @${client.user?.username}`);
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

(async () => {
    console.log('Start:', new Date());

    try {
        await client.connect();
        let onboarding = await client.login({ email: 'mink@insrt.uk', password: 'password', device_name: 'aaa' });
        if (onboarding) {
            await onboarding("username");
        }
    } catch (err) {
        console.error(err);
    }

    console.log('End:  ', new Date());
})();
