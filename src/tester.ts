import { config } from 'dotenv';
config();

import { Client } from "./Client";
let client = new Client();

(async () => {
    await client.connect();
    console.log(client.configuration);
})();
