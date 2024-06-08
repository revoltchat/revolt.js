import "dotenv/config";

import { Client } from "./lib/esm/index.js";

const client = new Client({ debug: true });

client.on("ready", () => console.info(`Logged in as ${client.user.username}!`));
client.on("disconnected", () => console.info("Disconnected."));

client.on("messageCreate", (message) => console.info(message.content));

client.loginBot(process.env.TOKEN);
