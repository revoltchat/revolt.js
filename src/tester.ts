import { config } from 'dotenv';
config();

import { Client } from ".";
let client = new Client({ apiURL: 'https://staging-api.revolt.chat' });

client.channels.on('mutation', console.log);

client.once('ready', async () => {
    console.log(`Logged in as @${client.user?.username}`);

    let channel = client.channels.toArray()[0];
    let user = client.users.get(
        client.users.keys()
            .filter(id => id !== client.user?._id)[0]
    );
    
    if (user) {
        await client.channels.addMember(channel._id, user?._id);
        await client.channels.removeMember(channel._id, user?._id);
    }

    // let channel = client.channels.values().next().value as Channel;
    // console.log(await channel.fetchMessages());
    // let message = await channel.sendMessage({ content: "bruh" });
    // await message.edit("pogger!");
    // await message.delete();

    // console.log(client.user?.online);
    // console.log(Array.from(client.users.values()).map(x => `@${x.username}: ${x.relationship}`));
    // await client.addFriend('poggers');

    // let user = Array.from(client.users.values()).find(x => x.id !== client.user?.id && !(x instanceof SystemUser)) as User;
    // let channel = await client.createGroup({ name: 'le group', nonce: ''+Math.random(), users: [ ] }) as GroupChannel;
    // await channel.addMember(user);
    // await channel.removeMember(user);
});

client.on('connecting', () => {
    console.log(`Connecting to the notifications server.`);
});

client.on('connected', () => {
    console.log(`Connected to notifications server.`);
});

client.on('dropped', () => {
    console.log(`Connection dropped.`);
});

/*client.on('message', (msg) => {
    console.log(`@${msg.author.username}: ${msg.content}`);
});*/

(async () => {
    console.log('Start:', new Date());

    try {
        await client.connect();
        let onboarding = await client.login({ email: 'me@insrt.uk', password: 'password', device_name: 'aaa' });
        if (onboarding) {
            await onboarding("username", false);
        }
    } catch (err) {
        console.error(err);
    }

    console.log('End:  ', new Date());
})();
