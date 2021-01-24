export namespace Channels {
    export type LastMessage = {
        _id: string,
        author: string,
        short: string
    }

    export type SavedMessagesChannel = {
        _id: string,
        channel_type: 'SavedMessages',
        user: string
    }

    export type DirectMessageChannel = {
        _id: string,
        channel_type: 'DirectMessage',
        active: boolean,
        recipients: string[],
        last_message: LastMessage
    }

    export type GroupChannel = {
        _id: string,
        channel_type: 'Group',
        recipients: string[],
        name: string,
        owner: string,
        description: string,
        last_message: LastMessage
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

    export type FetchMessagesRequest = {
        limit?: number,
        before?: string,
        after?: string
    }
}
