export namespace Auth {
    // POST /auth/login
    export interface LoginRequest {
        email: string,
        password: string,
        device_name: string
    }

    export interface Session {
        id?: string,
        user_id: string,
        session_token: string
    }
}