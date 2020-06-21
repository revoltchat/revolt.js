export enum ChannelType {
	DM = 0,
	GROUPDM = 1,
	GUILDCHANNEL = 2,
}

export interface LastMessage {
    id: string,
    user_id: string,
    short_content: string
}

export type RawChannel = {
	id: string
} & (
	({
		type: ChannelType.DM | ChannelType.GROUPDM,
        recipients: string[],
        last_message: LastMessage
	} & (
        { type: ChannelType.DM } |
        {
            type: ChannelType.GROUPDM,
            recipients: string[],
            owner: string,
            name: string,
            description: string,
        }
    ))
	|
	{
        type: ChannelType.GUILDCHANNEL,
        guild: string,
        name: string,
        description: string
	}
);

export type RawMessage = {
	id: string,
	nonce?: string,
	author: string,
	content: string,
	edited: number | null,
};

export namespace Channels {
	// GET /:id
    export type ChannelResponse = RawChannel;
    
	// DELETE /:id
	export interface DeleteChannelResponse { };

	// GET /:id/messages
	export type MessagesResponse = RawMessage[];

	// POST /:id/messages
	export interface SendMessageRequest {
		content: string,
		nonce: string,
	}

	export interface SendMessageResponse {
		id: string,
	}

	// GET /:id/messages/:mid
	export type MessageResponse = RawMessage;

	// PATCH /:id/messages/:mid
	export interface EditMessageRequest {
		content: string,
	}

	export interface EditMessageResponse { }

	// DELETE /:id/messages/:mid
    export interface DeleteMessageResponse { }
    
    // POST /create
    export interface CreateGroupRequest {
        name: string,
        nonce: string,
        users: string[]
    }

    export interface CreateGroupResponse { }

    // PUT /:id/recipients/:uid
    export interface AddToGroupResponse { }

    // DELETE /:id/recipients/:uid
    export interface RemoveFromGroupResponse { }
}
