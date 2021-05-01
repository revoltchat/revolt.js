export namespace Core {
    export interface RevoltNodeConfiguration {
        revolt: string,
        features: {
            registration: boolean,
            captcha: {
                enabled: boolean,
                key: string,
            },
            email: boolean,
            invite_only: string,
            autumn: {
                enabled: boolean,
                url: string
            },
            voso: {
                enabled: boolean,
                url: string,
                ws: string
            }
        },
        ws: string,
        app: string,
        vapid: string
    }
}

export namespace Auth {
    export interface Session {
        id?: string,
        user_id: string,
        session_token: string
    }
}
export type Metadata = (
    { type: 'File' } |
    { type: 'Text' } |
    { type: 'Audio' } |
    { type: 'Image', width: number, height: number } |
    { type: 'Video', width: number, height: number }
);

export type Attachment = {
    _id: string,
    tag: string,
    size: string,
    filename: string,
    metadata: Metadata,
    content_type: string,
};

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

    export enum Presence {
        Online = "Online",
        Idle = "Idle",
        Busy = "Busy",
        Invisible = "Invisible"
    }

    export type Status = {
        text?: string
        presence?: Presence
    }

    export interface User {
        _id: string,
        username: string,
        avatar?: Attachment,
        relations?: Relationships,

        badges?: number,
        status?: Status,

        relationship?: Relationship,
        online?: boolean
    }

    export interface Profile {
        content?: string,
        background?: Attachment
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
        last_message: LastMessage,
        icon?: Attachment
    }

    export type Channel = (SavedMessagesChannel | DirectMessageChannel | GroupChannel)

    export type Message = {
        _id: string,
        nonce?: string,
        channel: string,
        author: string,

        content: string | SystemMessage,
        attachment?: Attachment,
        edited?: { $date: string }
    }

    export type SystemMessage =
        | { type: "text"; content: string }
        | { type: "user_added"; id: string; by: string }
        | { type: "user_remove"; id: string; by: string }
        | { type: "user_left"; id: string }
        | { type: "channel_renamed"; name: string, by: string };
}

export type User = Users.User;
export type Channel = Channels.Channel;
export type Message = Channels.Message;
