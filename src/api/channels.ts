export namespace Channels {
    // GET /:id
    export type Channel = (
        {
            _id: string,
            type: 'SavedMessages',
            user: string
        } | {
            _id: string,
            type: 'DirectMessage',
            recipients: string[]
        } | {
            _id: string,
            type: 'Group',
            recipients: string[],
            name: string,
            owner: string,
            description: string
        }
    )
}
