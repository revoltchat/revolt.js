export namespace Auth {
    // POST /auth/login
    export interface LoginRequest {
        email: string,
        password: string,
        device_name: string
    }

    // POST /auth/create
    export interface CreateRequest {
        email: string,
        password: string
    }

    export interface CreateResponse {
        user_id: string
    }

    export interface Session {
        id?: string,
        user_id: string,
        session_token: string
    }
}