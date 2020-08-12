import { RawChannel } from "./channels";

export interface CoreGuild {
    id: string,
    name: string,
    description: string,
    owner: string,
    channels: RawChannel[]
}

export namespace Guild {
	// GET /@me
    export type GuildsResponse = CoreGuild[];

	// GET /:id
    export type GuildResponse = CoreGuild;

    // DELETE /:id
    export interface GuildDeleteResponse { }

    // POST /create
    export interface CreateGuildRequest {
        name: string,
        description?: string,
        nonce: string
    }

    export interface CreateGuildResponse {
        id: string
    }

    // POST /:id/channels
    export interface CreateChannelRequest {
        name: string,
        description?: string,
        nonce: string
    }

    export interface CreateChannelResponse {
        id: string
    }

    // GET /:id/members
    export type MembersResponse = MemberResponse[];

    // GET /:id/members/:uid
    export interface MemberResponse {
        id: string,
        nickname?: string
    }

    // DELETE /:id/members/:uid
    export interface KickMemberResponse { }

    // PUT /:id/members/:uid/ban
    export interface BanMemberResponse { }

    // DELETE /:id/members/:uid/ban
    export interface UnbanMemberResponse { }

    // POST /:id/channels/:cid/invite
    export interface CreateInviteRequest { }

    export interface CreateInviteResponse {
        code: string
    }

    // GET /join/:code
    export interface InvitePreviewResponse {
        guild: {
            id: string,
            name: string
        },
        channel: {
            id: string,
            name: string
        }
    }

    // POST /join/:code
    export interface AcceptInviteResponse {
        guild: string,
        channel: string
    }

    // GET /:id/invites
    export type InvitesResponse = {
        code: string,
        creator: string,
        channel: string
    }[]

    // DELETE /:id/invites/:code
    export interface DeleteInviteResponse { }
}