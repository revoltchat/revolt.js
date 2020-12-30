export namespace Core {
    // GET /onboard/hello
    export interface HelloResponse {
        onboarding: boolean
    }

    // POST /onboard/complete
    export interface OnboardRequest {
        username: string
    }
}
