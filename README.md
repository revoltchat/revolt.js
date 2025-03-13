# revolt.js

![revolt.js](https://img.shields.io/npm/v/revolt.js)
![revolt-api](https://img.shields.io/npm/v/revolt-api?label=Revolt%20API)

**revolt.js** is a JavaScript library for interacting with the entire Revolt
API.

## Example Usage

```javascript
// esm / typescript
import { Client } from "revolt.js";
// ...or commonjs
const { Client } = require("revolt.js");

let client = new Client();

client.on(
  "ready",
  async () => console.info(`Logged in as ${client.user.username}!`),
);

client.on("messageCreate", async (message) => {
  if (message.content === "hello") {
    message.channel.sendMessage("world");
  }
});

client.loginBot("..");
```
