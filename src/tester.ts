import { config } from 'dotenv';
import { Client } from '.';
config();

// To run this example, you need to have a local Revolt server running and an existing account.
// Copy and paste `.env.example` to `.env` and edit accordingly.

let client = new Client({
    apiURL: process.env.API_URL
});

let username: string;
client.on('ready', (packet) => {
    let user = packet.users.find(x => client.user_id! === x._id)!;
    username = user.username;
    console.info(`Logged in as ${username}!`);
});

client.on('packet', (packet) => {
    if (packet.type === 'Message') {
        if (packet.content === 'ping') {
            client.channels.sendMessage(packet.channel, 'pong!');
        }

        if (packet.content === 'who are you') {
            client.channels.sendMessage(packet.channel, `<@${packet.author}> I am ${username}`);
        }
    } else if (packet.type === 'UserUpdate') {
        if (packet.id === client.user_id!) {
            if (packet.data.username) {
                username = packet.data.username;
            }
        }
    }
});

client.login({ email: process.env.EMAIL as string, password: process.env.PASSWORD as string })
