# revolt.js

![revolt.js](https://img.shields.io/npm/v/revolt.js) ![revolt-api](https://img.shields.io/npm/v/revolt-api?label=Revolt%20API)

**revolt.js** is a direct implementation of the entire Revolt API and provides a way to authenticate and start communicating with Revolt servers.

revolt.js (as of version 0.5) is (for now) bring-your-own-cache ™️, it is entirely up to you to store and keep track of any data you want to keep. This is intentional to reduce the complexity of the project while the web app is still in development, you can either use an old version of revolt.js (`<= 0.4`) but potentially miss out on features or help re-implement caching.

### Example Usage

```typescript
let client = new Client({
    apiURL: process.env.API_URL
});

client.on('ready', (packet) => {
    let user = packet.users.find(x => client.user_id! === x._id)!;
    console.info(`Logged in as ${user.username}!`);
});

client.on('packet', (packet) => {
    if (packet.type === 'Message') {
        if (packet.content === 'ping') {
            client.channels.sendMessage(packet.channel, 'pong!');
        }
    }
});

client.login({ email: process.env.EMAIL as string, password: process.env.PASSWORD as string })
```
