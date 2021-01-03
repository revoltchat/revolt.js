export enum Relationship {
    None = "None",
    User = "User",
    Friend = "Friend",
    Outgoing = "Outgoing",
    Incoming = "Incoming",
    Blocked = "Blocked",
    BlockedOther = "BlockedOther",
}

export type Relationships = { _id: string, status: Relationship }[];

export namespace Users {
    // GET /:id
    // WebSocket: Ready payload.
    export interface User {
        _id: string,
        username: string,
        relations?: Relationships,
        relationship?: Relationship
    }
}
