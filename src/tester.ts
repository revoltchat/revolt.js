import { config } from "dotenv";

import { Client } from ".";

config();

// To run this example, you need to have a local Revolt server running and an existing account.
// Copy and paste `.env.example` to `.env` and edit accordingly.

async function user() {
    const client = new Client({
        apiURL: process.env.API_URL,
        debug: true,
    });

    client.on("ready", async () => {
        console.info(`Logged in as ${client.user!.username}!`);

        const group = await client.channels.createGroup({
            name: 'sussy',
            users: []
        });

        const msg = await group.sendMessage({
            content: "embed test",
            embeds: [
                {
                    title: 'We do a little!'
                }
            ]
        });

        await msg.edit({
            embeds: [{ title: 'sus' }]
        });
    });

    client.on("message", async (message) => {
        if (message.content === "sus") {
            message.channel!.sendMessage("sus!");
        } else if (message.content === "bot") {
            const bot = await client.api.post("/bots/create", {
                name: "basedbot12",
            });
            message.channel!.sendMessage(JSON.stringify(bot));
        } else if (message.content === "my bots") {
            message.channel!.sendMessage(
                JSON.stringify(await client.api.get("/bots/@me")),
            );
        } else if (message.content === "join bot") {
            await client.api.post(
                `/bots/${'01FCV7DCMRD9MT3JBYT5VEKVRD'}/invite`,
                { group: message.channel_id },
            );
            // { server: '01FATEGMHEE2M1QGPA65NS6V8K' });
        } else if (message.content === "edit bot name") {
            await client.api.patch(
                `/bots/${'01FCV7DCMRD9MT3JBYT5VEKVRD'}`,
                { name: "testingbkaka" },
            );
        } else if (message.content === "make bot public") {
            await client.api.patch(
                `/bots/${'01FCV7DCMRD9MT3JBYT5VEKVRD'}`,
                { public: true },
            );
        } else if (message.content === "delete bot") {
            await client.api.delete(`/bots/${'01FCV7DCMRD9MT3JBYT5VEKVRD'}`);
        }
    });

    try {
        await client.register({
            email: process.env.EMAIL as string,
            password: process.env.PASSWORD as string,
        });
    } catch (err) {}

    const onboarding = await client.login({
        email: process.env.EMAIL as string,
        password: process.env.PASSWORD as string,
    });

    onboarding?.('sus', true);
}

/*function bot() {
    const client = new Client({
        apiURL: process.env.API_URL,
    });

    client.on("ready", async () => {
        console.info(
            `Logged in as ${client.user!.username}! [${client.user!._id}]`,
        );
    });

    client.on("message", async (message) => {
        if (message.content === "sus") {
            message.channel!.sendMessage("sus!");
        }
    });

    // client.loginBot(process.env.BOT_TOKEN as string)
}*/

user();
// bot();
