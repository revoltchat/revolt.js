import { config } from 'dotenv';
import { Client } from '.';
config();

// To run this example, you need to have a local Revolt server running and an existing account.
// Copy and paste `.env.example` to `.env` and edit accordingly.

function user() {
    let client = new Client({
        apiURL: process.env.API_URL
    });

    client.on('ready', async () => {
        console.info(`Logged in as ${client.user!.username}!`);
    });

    client.on('message', async message => {
        if (message.content === 'sus') {
            message.channel!.sendMessage('sus!');
        } else if (message.content === 'bot') {
            let bot = await client.req('POST', '/bots/create', { name: 'basedbot12' });
            message.channel!.sendMessage(JSON.stringify(bot));
        } else if (message.content === 'my bots') {
            message.channel!.sendMessage(JSON.stringify(
                await client.req('GET', '/bots/@me')
            ));
        } else if (message.content === 'join bot') {
            await client.req('POST', `/bots/01FCV7DCMRD9MT3JBYT5VEKVRD/invite` as '/bots/id/invite',
                { group: message.channel_id });
                // { server: '01FATEGMHEE2M1QGPA65NS6V8K' });
        } else if (message.content === 'edit bot name') {
            await client.req('PATCH', `/bots/01FCV7DCMRD9MT3JBYT5VEKVRD` as '/bots/id',
                { name: 'testingbkaka' });
        } else if (message.content === 'make bot public') {
            await client.req('PATCH', `/bots/01FCV7DCMRD9MT3JBYT5VEKVRD` as '/bots/id',
                { public: true });
        } else if (message.content === 'delete bot') {
            await client.req('DELETE', `/bots/01FCV7DCMRD9MT3JBYT5VEKVRD` as '/bots/id');
        }
    });

    client.login({ email: process.env.EMAIL as string, password: process.env.PASSWORD as string })
}

function bot() {
    let client = new Client({
        apiURL: process.env.API_URL
    });

    client.on('ready', async () => {
        console.info(`Logged in as ${client.user!.username}! [${client.user!._id}]`);
    });

    client.on('message', async message => {
        if (message.content === 'sus') {
            message.channel!.sendMessage('sus!');
        }
    });

    client.loginBot(process.env.BOT_TOKEN as string)
}

user();
bot();
