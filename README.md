# revolt.js

> [!WARNING]
> revolt.js is currently being rewritten. While it's ready for use for most applications, it is still not entirely feature complete. \
> You can find the [version 6 README here](https://github.com/revoltchat/revolt.js/tree/v6).

![revolt.js](https://img.shields.io/npm/v/revolt.js) ![revolt-api](https://img.shields.io/npm/v/revolt-api?label=Revolt%20API)

**revolt.js** is a JavaScript library for interacting with the entire Revolt API.

## Example Usage

```javascript
// esm / typescript
import { Client } from "revolt.js";
// ...or commonjs
const { Client } = require("revolt.js");

let client = new Client();

client.on("ready", async () =>
  console.info(`Logged in as ${client.user.username}!`)
);

client.on("messageCreate", async (message) => {
  if (message.content === "hello") {
    message.channel.sendMessage("world");
  }
});

client.loginBot("..");
```

## Reactivity with Signals & Solid.js Primitives

All objects have reactivity built-in and can be dropped straight into any Solid.js project.

```tsx
const client = new Client();
// initialise the client

function MyApp() {
  return (
    <h1>Your username is: {client.user?.username ?? "[logging in...]"}</h1>
  );
}
```

## Revolt API Types

> [!WARNING]
> It is advised you do not use this unless necessary. If you find somewhere that isn't covered by the library, please open an issue as this library aims to transform all objects.

All `revolt-api` types are re-exported from this library under `API`.

```typescript
import { API } from "revolt.js";

// API.Channel;
// API.[..];
```
