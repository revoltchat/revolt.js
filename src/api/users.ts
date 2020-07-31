import { RawChannel } from "./channels";

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
	export interface UserResponse {
		id: string,
		username: string,
		display_name: string,
		email?: string,
        verified?: boolean,
        relationship?: Relationship
	}

	// POST /query
	export interface QueryRequest {
		username: string,
	}

	export type QueryResponse = UserResponse;

	// GET /@me/dms
	export type DMsResponse = RawChannel[];

	// GET /:id/dm
	export interface OpenDMResponse {
		id: string
	}

	// GET /@me/friend
	export type FriendsResponse = FriendResponse[];

	// GET /:id/friend
	export interface FriendResponse {
		id: string,
		status: Relationship,
	}

	// PUT /:id/friend
	export interface AddFriendResponse {
		status: Relationship,
	}

	// DELETE /:id/friend
	export interface RemoveFriendResponse {
		status: Relationship,
	}

	// PUT /:id/block
	export interface BlockUserResponse {
		status: Relationship,
	}

	// DELETE /:id/block
	export interface UnblockUserResponse {
        status: Relationship,
    }
}
