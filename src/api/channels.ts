export namespace Channels {
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

    export type Message = {
        _id: string,
        nonce?: string,
        channel: string,
        author: string,

        content: string,
        edited?: { $date: string }
    }
}
