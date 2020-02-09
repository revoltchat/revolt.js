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

	export interface LookupResponse extends Response {
		[index: number]: {
			id: string,
			username: string,
		}
	}

	// GET /@me/friend
	export interface FriendsResponse extends Response {
		[index: number]: {
			id: string,
			status: Relationship,
		}
	}

	// GET /@me/dms
	export interface DMsResponse extends Response {
		[index: number]: RawChannel,
	}

	// GET /:id/friend
	export interface FriendResponse extends Response {
		id: string,
		status: Relationship,
	}

	// PUT /:id/friend
	export interface AddFriendResponse extends Response { }

	// DELETE /:id/friend
	export interface RemoveFriendResponse extends Response { }

	// GET /:id/dm
	export interface OpenDMResponse extends Response {
		id: string
	}
}
