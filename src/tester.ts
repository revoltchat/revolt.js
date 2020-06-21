import { Client } from "./Client";

let client = new Client();

client.on('ready', async () => {
    console.log(`Logged in as ${client.user?.username}!`);
    console.log(`Users: ${Array.from(client.users.values()).map(x => x.username).join(', ')}`);
    console.log(`Channels: ${Array.from(client.channels.values()).map(x => `[${x.id}:${x.type}]`).join(', ')}`);
    console.log(`Guilds: ${Array.from(client.guilds.values()).map(x => x.name).join(', ')}`);
});

client.on('message', msg => {
    console.log(`${msg.author.username}: ${msg.content}`);
});

client.on('message/edit', msg => {
    console.log(`${msg.author.username} [edited their message]: ${msg.content}`);
});

client.login('paulmakles@gmail.com', 'bruhbruh')
    .catch(err => console.error(err));

//client.login('2u73AmzBwso7DQVfJdey6zSspITbVr5GA1jidck7O4EwXkYhwyhIcL9q9eN8qWRAEGYDTDUhvR3pwKFJ0yLHois9XOTg')
    //.catch(err => console.error(err));
