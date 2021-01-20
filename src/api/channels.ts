export namespace Channels {
    export type SavedMessagesChannel = {
        _id: string,
        channel_type: 'SavedMessages',
        user: string
    }

    export type DirectMessageChannel = {
        _id: string,
        channel_type: 'DirectMessage',
        active: boolean,
        recipients: string[]
    }

    export type GroupChannel = {
        _id: string,
        channel_type: 'Group',
        recipients: string[],
        name: string,
        owner: string,
        description: string
    }

    export type Channel = (SavedMessagesChannel | DirectMessageChannel | GroupChannel)

    export type Message = {
        _id: string,
        nonce?: string,
        channel: string,
        author: string,

        content: string,
        edited?: { $date: string }
    }
    
    export type CreateGroupRequest = {
        name: string,
        nonce: string,
        users: string[]
    }
}
