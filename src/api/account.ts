import { Response } from '.';

export namespace Account {
	// /create
	export interface CreateRequest {
		username: string,
		password: string,
		email: string,
	}

	export interface CreateResponse extends Response {
		email_sent?: boolean,
	}

	// /resend
	export interface ResendRequest {
		email: string,
	}

	export interface ResendResponse extends Response { }

	// /login
	export interface LoginRequest {
		email: string,
		password: string,
	}

	export interface LoginResponse extends Response {
		access_token?: string,
		id?: string,
	}
}
