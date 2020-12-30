export namespace Account {
	// POST /create
	export interface CreateRequest {
		username: string,
		password: string,
		email: string,
		captcha?: string,
	}

	export interface CreateResponse {
		email_sent?: boolean,
    }

	// POST /login
	export interface LoginRequest {
		email: string,
		password: string,
		captcha?: string,
	}

	export interface LoginResponse {
		access_token: string,
		id: string,
	}
    
	// POST /resend
	export interface ResendRequest {
		email: string,
		captcha?: string,
	}

	export interface ResendResponse { }

	// POST /token
	export interface TokenRequest {
		token: string,
	}

	export interface TokenResponse {
		id: string,
	}
}
