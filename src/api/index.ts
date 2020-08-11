import { Relationship } from './users';

export * from './account';
export * from './users';
export * from './channels';
export * from './guild';

export namespace WebsocketPackets {
    export interface message_create {
        id: string,
        nonce?: string,
        channel: string,
        author: string,
        content: string
    }

    export interface message_edit {
        id: string,
        channel: string,
        author: string,
        content: string
    }

    export interface message_delete {
        id: string
    }

    export interface group_user_join {
        id: string,
        user: string
    }

    export interface group_user_leave {
        id: string,
        user: string
    }

    export interface guild_user_join {
        id: string,
        user: string
    }

    export interface guild_user_leave {
        id: string,
        user: string
    }

    export interface guild_channel_create {
        id: string,
        channel: string,
        name: string,
        description: string
    }

    export interface guild_channel_delete {
        id: string,
        channel: string
    }

    export interface guild_delete {
        id: string
    }

    export interface user_friend_status {
        id: string,
        user: string,
        status: Relationship
    }
}
