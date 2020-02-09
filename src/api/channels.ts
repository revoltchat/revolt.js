import { Request, Response } from '.';

export enum ChannelType {
	DM = 0,
	GROUPDM = 1,
	GUILDCHANNEL = 2,
}

export type RawChannel = {
	id: string
} & (
	{
		type: ChannelType.DM,
		recipients: string[],
		active: boolean,
	}
	|
	{
		type: ChannelType.GROUPDM,
		recipients: string[],
	}
	|
	{
		type: ChannelType.GUILDCHANNEL
	}
);

export type RawMessage = {
	id: string,
	author: string,
	content: string,
	edited: number | null,
};

export namespace Channels {
	// GET /:id
	export type ChannelResponse = RawChannel;

	// GET /:id/messages
	export type MessagesResponse = RawMessage[];

	// POST /:id/messages
	export interface SendMessageRequest extends Request {
		content: string,
	}

	export interface SendMessageResponse extends Response {
		id: string,
	}

	// PATCH /:id/messages/:mid
	export interface EditMessageRequest extends Request {
		content: string,
	}

	export interface EditMessageResponse extends Response { }

	// DELETE /:id/messages/:mid
	export interface DeleteMessageResponse extends Response { }
}
