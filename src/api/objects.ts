export namespace Core {
    export interface RevoltNodeConfiguration {
        revolt: string,
        features: {
            registration: boolean,
            captcha: {
                enabled: boolean,
                key: string,
            },
            email: boolean
        },
        ws: string
    }
}

export namespace Auth {
    export interface Session {
        id?: string,
        user_id: string,
        session_token: string
    }
}

export namespace Users {
    export enum Relationship {
        None = "None",
        User = "User",
        Friend = "Friend",
        Outgoing = "Outgoing",
        Incoming = "Incoming",
        Blocked = "Blocked",
        BlockedOther = "BlockedOther",
    }
    
    export type Relationships = { _id: string, status: Relationship }[];

    export interface User {
        _id: string,
        username: string,
        relations?: Relationships,
        relationship?: Relationship,
        online?: boolean
    }
}

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
    
    /* export type CreateGroupRequest = {
        name: string,
        nonce: string,
        users: string[]
    }

    export type FetchMessagesRequest = {
        limit?: number,
        before?: string,
        after?: string
    } */
}

