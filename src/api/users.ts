import { Response } from '.';

export namespace Users {
	// /:id or /@me
	export interface UserResponse extends Response {
		id: string,
		username: string,
		email?: string,
		verified?: boolean,
	}
}
