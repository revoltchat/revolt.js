# revolt.js

![revolt.js](https://img.shields.io/npm/v/revolt.js) ![revolt-api](https://img.shields.io/npm/v/revolt-api?label=Revolt%20API)

**revolt.js** is a direct implementation of the entire Revolt API and provides a way to authenticate and start communicating with Revolt servers.

## Example Usage

```typescript
let client = new Client();

client.on("ready", async () =>
    console.info(`Logged in as ${client.user!.username}!`),
);

client.on("message", async (message) => {
    if (message.content === "sus") {
        message.channel!.sendMessage("sus!");
    }
});

client.loginBot("..");
```

## MobX

MobX is used behind the scenes so you can subscribe to any change as you normally would, e.g. with `mobx-react(-lite)` or mobx's utility functions.

```typescript
import { autorun } from 'mobx';

[..]

client.once('ready', () => {
    autorun(() => {
        console.log(`Current username is ${client.user!.username}!`);
    });
});
```
