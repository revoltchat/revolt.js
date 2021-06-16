import { Channels, Core, Invites, Servers, Sync, Users } from './objects';

export type RemoveUserField = 'ProfileContent' | 'ProfileBackground' | 'StatusText' | 'Avatar';
export type RemoveChannelField = 'Icon' | 'Description';
export type RemoveServerField = 'Icon' | 'Banner' | 'Description';
export type RemoveMemberField = 'Nickname' | 'Avatar';

type Id = 'id';
type Routes =
    /**
     * Core
     */
    | {
        // Query Revolt node.
        method: 'GET',
        route: `/`,
        data: undefined,
        response: Core.RevoltNodeConfiguration
    }
    /**
     * Auth
     */
    | {
        method: 'POST',
        route: `/auth/create`,
        data: {
            email: string,
            password: string,
            invite?: string,
            captcha?: string
        }
        response: {
            user_id: string
        }
    }
    | {
        method: 'POST',
        route: `/auth/login`,
        data: {
            email: string,
            password: string,
            device_name?: string,
            captcha?: string
        }
        response: {
            id: string,
            user_id: string,
            session_token: string
        }
    }
    | {
        method: 'GET',
        route: `/auth/user`,
        data: undefined
        response: {
            id: string,
            email: string
        }
    }
    | {
        method: 'POST',
        route: `/auth/change/password`,
        data: {
            password: string,
            new_password: string
        },
        response: undefined
    }
    | {
        method: 'POST',
        route: `/auth/change/email`,
        data: {
            password: string,
            new_email: string
        },
        response: undefined
    }
    | {
        method: 'POST',
        route: `/auth/resend`,
        data: {
            email: string,
            captcha?: string
        },
        response: undefined
    }
    | {
        method: 'POST',
        route: `/auth/send_reset`,
        data: {
            email: string,
            captcha?: string
        },
        response: undefined
    }
    | {
        method: 'POST',
        route: `/auth/reset`,
        data: {
            password: string,
            token: string
        },
        response: undefined
    }
    | {
        method: 'POST',
        route: `/auth/check`,
        data: undefined
        response: undefined
    }
    | {
        method: 'DELETE',
        route: `/auth/sessions/${Id}`,
        data: undefined
        response: undefined
    }
    | {
        method: 'GET',
        route: `/auth/sessions`,
        data: undefined
        response: {
            id: string,
            friendly_name: string
        }[]
    }
    | {
        method: 'GET',
        route: `/auth/logout`,
        data: undefined
        response: undefined
    }
    /**
     * Onboarding
     */
    | {
        // Ask server for user status.
        method: 'GET',
        route: `/onboard/hello`,
        data: undefined,
        response: {
            onboarding: boolean
        }
    }
    | {
        // Complete onboarding.
        method: 'POST',
        route: `/onboard/complete`,
        data: {
            username: string
        },
        response: {
            onboarding: boolean
        }
    }
    /**
     * Users
     */
    | {
        // Retrieve a user's information.
        method: 'GET',
        route: `/users/${Id}`,
        data: undefined,
        response: Users.User
    }
    | {
        // Edit user.
        method: 'PATCH',
        route: `/users/${Id}`,
        data: {
            status?: Users.Status,
            profile?: {
                content?: string,
                background?: string
            },
            avatar?: string,
            remove?: RemoveUserField
        },
        response: undefined
    }
    | {
        // Change username.
        method: 'PATCH',
        route: `/users/${Id}/username`,
        data: {
            username?: string,
            password?: string
        },
        response: undefined
    }
    | {
        // Retrieve a user's profile.
        method: 'GET',
        route: `/users/${Id}/profile`,
        data: undefined,
        response: Users.Profile
    }
    | {
        // Fetch all your DM conversations.
        method: 'GET',
        route: `/users/dms`,
        data: undefined,
        response: (Channels.DirectMessageChannel | Channels.GroupChannel)[]
    }
    | {
        // Open a DM with another user.
        method: 'GET',
        route: `/users/${Id}/dm`,
        data: undefined,
        response: Channels.DirectMessageChannel
    }
    | {
        // Fetch all of your relationships with other users.
        method: 'GET',
        route: `/users/relationships`,
        data: undefined,
        response: Users.Relationships
    }
    | {
        // Fetch your relationship with another other user.
        method: 'GET',
        route: `/users/${Id}/relationship`,
        data: undefined,
        response: {
            status: Users.Relationship
        }
    }
    | {
        // Fetch your mutual relationships with another user.
        method: 'GET',
        route: `/users/${Id}/mutual`,
        data: undefined,
        response: {
            users: string[]
        }
    }
    | {
        // Send a friend request / accept a friend request.
        method: 'PUT',
        route: `/users/${Id}/friend`,
        data: undefined,
        response: {
            status: Users.Relationship
        }
    }
    | {
        // Delete a friend request / remove a friend.
        method: 'DELETE',
        route: `/users/${Id}/friend`,
        data: undefined,
        response: {
            status: Users.Relationship
        }
    }
    | {
        // Block a user.
        method: 'PUT',
        route: `/users/${Id}/block`,
        data: undefined,
        response: {
            status: Users.Relationship
        }
    }
    | {
        // Unblock a user.
        method: 'DELETE',
        route: `/users/${Id}/block`,
        data: undefined,
        response: {
            status: Users.Relationship
        }
    }
    | {
        // Fetch a user's avatar.
        method: 'GET',
        route: `/users/${Id}/avatar`,
        data: undefined,
        response: any
    }
    | {
        // Fetch default avatar for user.
        method: 'GET',
        route: `/users/${Id}/default_avatar`,
        data: undefined,
        response: any
    }
    /**
     * Channels
     */
    | {
        // Fetch a channel by ID.
        method: 'GET',
        route: `/channels/${Id}`,
        data: undefined,
        response: Channels.Channel
    }
    | {
        // Fetch a channel's members by ID.
        method: 'GET',
        route: `/channels/${Id}/members`,
        data: undefined,
        response: Users.User[]
    }
    | {
        // Edit a group channel.
        method: 'PATCH',
        route: `/channels/${Id}`,
        data: {
            name?: string,
            description?: string,
            icon?: string,
            remove?: RemoveChannelField
        },
        response: undefined
    }
    | {
        // Close DM channel or leave group channel.
        method: 'DELETE',
        route: `/channels/${Id}`,
        data: undefined,
        response: undefined
    }
    | {
        // Create a group DM.
        method: 'POST',
        route: `/channels/create`,
        data: {
            name: string,
            description?: string,
            nonce: string,
            users: string[]
        },
        response: Channels.GroupChannel
    }
    | {
        // Create an invite to a channel.
        method: 'POST',
        route: `/channels/${Id}/invites`,
        data: undefined,
        response: { code: string }
    }
    | {
        // Add member to group.
        method: 'PUT',
        route: `/channels/${Id}/recipients/${Id}`,
        data: undefined,
        response: undefined
    }
    | {
        // Remove member from group.
        method: 'DELETE',
        route: `/channels/${Id}/recipients/${Id}`,
        data: undefined,
        response: undefined
    }
    | {
        // Mark a channel as read at message.
        method: 'PUT',
        route: `/channels/${Id}/ack/${Id}`,
        data: undefined,
        response: undefined
    }
    /**
     * Messaging
     */
    | {
        // Send message to channel.
        method: 'POST',
        route: `/channels/${Id}/messages`,
        data: {
            content: string,
            nonce: string,
            attachment?: string
        },
        response: Channels.Message
    }
    | {
        // Fetch message from channel.
        method: 'GET',
        route: `/channels/${Id}/messages/${Id}`,
        data: undefined,
        response: Channels.Message
    }
    | {
        // Query messages from channel (optionally include users as well).
        method: 'GET',
        route: `/channels/${Id}/messages`,
        data: {
            limit?: number,
            before?: string,
            after?: string,
            sort?: 'Latest' | 'Oldest',
            include_users?: boolean
        },
        response: Channels.Message[] | {
            messages: Channels.Message[],
            users: Users.User[],
            members?: Servers.Member[]
        }
    }
    | {
        // Query updated messages from channel.
        method: 'POST',
        route: `/channels/${Id}/messages/stale`,
        data: {
            ids: string[]
        },
        response: {
            updated: Channels.Message[],
            deleted: string[]
        }
    }
    | {
        // Edit message.
        method: 'PATCH',
        route: `/channels/${Id}/messages/${Id}`,
        data: {
            content: string
        },
        response: undefined
    }
    | {
        // Delete message.
        method: 'DELETE',
        route: `/channels/${Id}/messages/${Id}`,
        data: undefined,
        response: undefined
    }
    /**
     * Servers
     */
    | {
        // Create a server.
        method: 'POST',
        route: `/servers/create`,
        data: {
            name: string,
            nonce: string
        },
        response: Servers.Server
    }
    | {
        // Fetch a server by ID.
        method: 'GET',
        route: `/servers/${Id}`,
        data: undefined,
        response: Servers.Server
    }
    | {
        // Delete or leave a server.
        method: 'DELETE',
        route: `/servers/${Id}`,
        data: undefined,
        response: undefined
    }
    | {
        // Edit a server.
        method: 'PATCH',
        route: `/servers/${Id}`,
        data: {
            name?: string,
            description?: string,
            icon?: string,
            banner?: string,
            remove?: RemoveServerField
        },
        response: undefined
    }
    | {
        // Fetch a server's members
        method: 'GET',
        route: `/servers/${Id}/members`,
        data: undefined,
        response: {
            members: Servers.Member[],
            users: Users.User[]
        }
    }
    | {
        // Fetch a server member by their ID
        method: 'GET',
        route: `/servers/${Id}/members/${Id}`,
        data: undefined,
        response: Servers.Member
    }
    | {
        // Edit a server member
        method: 'PATCH',
        route: `/servers/${Id}/members/${Id}`,
        data: {
            nickname?: string,
            avatar?: string,
            remove?: RemoveMemberField
        },
        response: undefined
    }
    | {
        // Kick a server member
        method: 'DELETE',
        route: `/servers/${Id}/members/${Id}`,
        data: undefined,
        response: undefined
    }
    | {
        // Ban a user from the server
        method: 'PUT',
        route: `/servers/${Id}/bans/${Id}`,
        data: {
            reason?: string
        },
        response: undefined
    }
    | {
        // Unban a user from the server
        method: 'DELETE',
        route: `/servers/${Id}/bans/${Id}`,
        data: undefined,
        response: undefined
    }
    | {
        // Fetch a server's bans
        method: 'GET',
        route: `/servers/${Id}/bans`,
        data: undefined,
        response: Servers.Ban[]
    }
    | {
        // Create a new text channel for a server
        method: 'POST',
        route: `/servers/${Id}/channels`,
        data: {
            name: string,
            description?: string,
            nonce: string
        },
        response: Channels.TextChannel
    }
    | {
        // Fetch a server's invites
        method: 'GET',
        route: `/servers/${Id}/invites`,
        data: undefined,
        response: Invites.ServerInvite[]
    }
    /**
     * Invites
     */
    | {
        // Fetch information about an invite.
        method: 'GET',
        route: `/invites/${Id}`,
        data: undefined,
        response: Invites.RetrievedInvite
    }
    | {
        // Use an invite.
        method: 'POST',
        route: `/invites/${Id}`,
        data: undefined,
        response: (
            {
                type: 'Server',
                channel: Channels.TextChannel,
                server: Servers.Server
            }
        )
    }
    | {
        // Delete an invite.
        method: 'DELETE',
        route: `/invites/${Id}`,
        data: undefined,
        response: undefined
    }
    /**
     * Sync
     */
    | {
        // Fetch user settings.
        method: 'POST',
        route: `/sync/settings/fetch`,
        data: {
            keys: string[]
        },
        response: Sync.UserSettings
    }
    | {
        // Set user settings.
        method: 'POST',
        route: `/sync/settings/set`,
        data: {
            [key: string]: string
        },
        response: undefined
    }
    | {
        // Fetch unreads.
        method: 'GET',
        route: `/sync/unreads`,
        data: undefined,
        response: Sync.ChannelUnread[]
    }
    /**
     * Push API
     */
    | {
        method: 'POST',
        route: `/push/subscribe`,
        data: {
            endpoint: string,
            p256dh: string,
            auth: string
        },
        response: undefined
    }
    | {
        method: 'POST',
        route: `/push/unsubscribe`,
        data: undefined,
        response: undefined
    }
    /**
     * Voice API
     */
    | {
        // Join voice call for channel.
        method: 'POST',
        route: `/channels/${Id}/join_call`,
        data: undefined,
        response: {
            token: string
        }
    }

// ? Below are Typescript typings for extracting route data from the object above.
// ? https://artsy.github.io/blog/2018/11/21/conditional-types-in-typescript/

export type RoutePath = Routes["route"]
export type RouteMethod = Routes["method"]

type ExcludeRouteKey<K> = K extends "route" ? never : K;
type ExcludeRouteField<A> = { [K in ExcludeRouteKey<keyof A>]: A[K] };
type ExtractRouteParameters<A, T> = A extends { route: T } ? ExcludeRouteField<A> : never;

type ExcludeMethodKey<K> = K extends "method" ? never : K;
type ExcludeMethodField<A> = { [K in ExcludeMethodKey<keyof A>]: A[K] };
type ExtractMethodParameters<A, T> = A extends { method: T } ? ExcludeMethodField<A> : never;

export type Route<M extends RouteMethod, T extends RoutePath> = ExtractMethodParameters<ExtractRouteParameters<Routes, T>, M>;

declare function dispatch<T extends RoutePath>(
    type: T,
    args: ExtractRouteParameters<Routes, T>
): void
