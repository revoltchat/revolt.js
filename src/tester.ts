import { config } from 'dotenv';
config();

import { Client } from "./Client";
let client = new Client();

(async () => {
    console.log('Start:', new Date());

    await client.connect();
    let onboarding = await client.login({ email: 'mink3@insrt.uk', password: 'password', device_name: 'aaa' });
    if (onboarding) {
        await onboarding("poggers");
    }

    console.log('End:  ', new Date());
})();
