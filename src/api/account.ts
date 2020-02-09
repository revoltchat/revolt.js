import { Request, Response } from '.';

export namespace Account {
	// /create
	export interface CreateRequest extends Request {
		username: string,
		password: string,
		email: string,
	}

	export interface CreateResponse extends Response {
		email_sent?: boolean,
	}

	// /resend
	export interface ResendRequest extends Request {
		email: string,
	}

	export interface ResendResponse extends Response { }

	// /login
	export interface LoginRequest extends Request {
		email: string,
		password: string,
	}

	export interface LoginResponse extends Response {
		access_token?: string,
		id?: string,
	}
}
