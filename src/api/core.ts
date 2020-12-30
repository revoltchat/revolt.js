export namespace Core {
    // GET /
    export interface RevoltNodeConfiguration {
        revolt: string,
        features: {
            registration: boolean,
            captcha: {
                enabled: boolean,
                key: string,
            },
            email: boolean
        }
    }
}
