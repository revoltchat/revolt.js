import { Request, Response, RawChannel } from '.';

export enum Relationship {
	FRIEND = 0,
	OUTGOING = 1,
	INCOMING = 2,
	BLOCKED = 3,
	BLOCKED_OTHER = 4,
	NONE = 5,
	SELF = 6,
}

export namespace Users {
	// GET /@me or /:id
	export interface UserResponse extends Response {
		id: string,
		username: string,
		email?: string,
		verified?: boolean,
	}

	// POST /lookup
	export interface LookupRequest extends Request {
		username?: string,
	}

	export type LookupResponse = UserResponse[];

	// GET /@me/friend
	export type FriendsResponse = {
		id: string,
		status: Relationship,
	}[];

	// GET /@me/dms
	export type DMsResponse = RawChannel[];

	// GET /:id/friend
	export interface FriendResponse {
		id: string,
		status: Relationship,
	}

	// PUT /:id/friend
	export interface AddFriendResponse extends Response {
		status: Relationship,
	}

	// DELETE /:id/friend
	export interface RemoveFriendResponse extends Response { }

	// GET /:id/dm
	export interface OpenDMResponse extends Response {
		id: string
	}
}
