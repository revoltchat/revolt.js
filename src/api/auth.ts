export namespace Auth {
    export interface Session {
        id?: string,
        user_id: string,
        session_token: string
    }
}