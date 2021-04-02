import { Channels, Core, Users } from './objects';

type Routes =
    /**
     * Core
     */
    | {
        // Query Revolt node.
        method: 'GET',
        route: '/',
        data: undefined,
        response: Core.RevoltNodeConfiguration
    }
    /**
     * Auth
     * ! Temp.
     */
    | {
        method: 'POST',
        route: '/auth/create',
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
        route: '/auth/login',
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
        route: '/auth/user',
        data: undefined
        response: {
            id: string,
            email: string
        }
    }
    | {
        method: 'POST',
        route: '/auth/change/password',
        data: {
            password: string,
            new_password: string
        },
        response: undefined
    }
    | {
        method: 'POST',
        route: '/auth/change/email',
        data: {
            password: string,
            new_email: string
        },
        response: undefined
    }
    | {
        method: 'POST',
        route: '/auth/resend',
        data: {
            email: string,
            captcha?: string
        },
        response: undefined
    }
    | {
        method: 'POST',
        route: '/auth/send_reset',
        data: {
            email: string,
            captcha?: string
        },
        response: undefined
    }
    | {
        method: 'POST',
        route: '/auth/reset',
        data: {
            password: string,
            token: string
        },
        response: undefined
    }
    | {
        method: 'POST',
        route: '/auth/check',
        data: undefined
        response: undefined
    }
    | {
        method: 'DELETE',
        route: '/auth/sessions/:id',
        data: undefined
        response: undefined
    }
    | {
        method: 'GET',
        route: '/auth/sessions',
        data: undefined
        response: {
            id: string,
            friendly_name: string
        }[]
    }
    | {
        method: 'GET',
        route: '/auth/logout',
        data: undefined
        response: undefined
    }
    /**
     * Onboarding
     */
    | {
        // Ask server for user status.
        method: 'GET',
        route: '/onboard/hello',
        data: undefined,
        response: {
            onboarding: boolean
        }
    }
    | {
        // Complete onboarding.
        method: 'POST',
        route: '/onboard/complete',
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
        route: '/users/:id',
        data: undefined,
        response: Users.User
    }
    | {
        // Retrieve a user's profile.
        method: 'GET',
        route: '/users/:id/profile',
        data: undefined,
        response: {
            profile?: string
        }
    }
    | {
        // Fetch all your DM conversations.
        method: 'GET',
        route: '/users/dms',
        data: undefined,
        response: (Channels.DirectMessageChannel | Channels.GroupChannel)[]
    }
    | {
        // Open a DM with another user.
        method: 'GET',
        route: '/users/:id/dm',
        data: undefined,
        response: Channels.DirectMessageChannel
    }
    | {
        // Fetch all of your relationships with other users.
        method: 'GET',
        route: '/users/relationships',
        data: undefined,
        response: Users.Relationships
    }
    | {
        // Fetch your relationship with another other user.
        method: 'GET',
        route: '/users/:id/relationship',
        data: undefined,
        response: {
            status: Users.Relationship
        }
    }
    | {
        // Fetch your mutual relationships with another user.
        method: 'GET',
        route: '/users/:id/mutual',
        data: undefined,
        response: {
            users: string[]
        }
    }
    | {
        // Send a friend request / accept a friend request.
        method: 'PUT',
        route: '/users/:id/friend',
        data: undefined,
        response: {
            status: Users.Relationship
        }
    }
    | {
        // Delete a friend request / remove a friend.
        method: 'DELETE',
        route: '/users/:id/friend',
        data: undefined,
        response: {
            status: Users.Relationship
        }
    }
    | {
        // Block a user.
        method: 'PUT',
        route: '/users/:id/block',
        data: undefined,
        response: {
            status: Users.Relationship
        }
    }
    | {
        // Unblock a user.
        method: 'DELETE',
        route: '/users/:id/block',
        data: undefined,
        response: {
            status: Users.Relationship
        }
    }
    | {
        // Fetch a user's avatar.
        method: 'GET',
        route: '/users/:id/avatar',
        data: undefined,
        response: any
    }
    | {
        // Fetch default avatar for user.
        method: 'GET',
        route: '/users/:id/default_avatar',
        data: undefined,
        response: any
    }
    /**
     * Channels
     */
    | {
        // Fetch a channel by ID.
        method: 'GET',
        route: '/channels/:id',
        data: undefined,
        response: Channels.Channel
    }
    | {
        // Edit a group channel.
        method: 'PATCH',
        route: '/channels/:id',
        data: {
            name?: string,
            description?: string
        },
        response: undefined
    }
    | {
        // Close DM channel or leave group channel.
        method: 'DELETE',
        route: '/channels/:id',
        data: undefined,
        response: undefined
    }
    | {
        // Close DM channel or leave group channel.
        method: 'POST',
        route: '/channels/create',
        data: {
            name: string,
            description?: string,
            nonce: string,
            users: string[]
        },
        response: Channels.GroupChannel
    }
    | {
        // Add member to group.
        method: 'PUT',
        route: '/channels/:id/recipients/:id',
        data: undefined,
        response: undefined
    }
    | {
        // Remove member from group.
        method: 'DELETE',
        route: '/channels/:id/recipients/:id',
        data: undefined,
        response: undefined
    }
    /**
     * Messaging
     */
    | {
        // Send message to channel.
        method: 'POST',
        route: '/channels/:id/messages',
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
        route: '/channels/:id/messages/:id',
        data: undefined,
        response: Channels.Message
    }
    | {
        // Query messages from channel.
        method: 'GET',
        route: '/channels/:id/messages',
        data: {
            limit?: number,
            before?: string,
            after?: string
        },
        response: Channels.Message[]
    }
    | {
        // Query updated messages from channel.
        method: 'POST',
        route: '/channels/:id/messages/stale',
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
        route: '/channels/:id/messages/:id',
        data: {
            content: string
        },
        response: undefined
    }
    | {
        // Delete message.
        method: 'DELETE',
        route: '/channels/:id/messages/:id',
        data: undefined,
        response: undefined
    } |
    /**
     * Push API
     */
    {
        method: 'POST',
        route: '/push/subscribe',
        data: {
            endpoint: string,
            p256dh: string,
            auth: string
        },
        response: undefined
    } |
    {
        method: 'POST',
        route: '/push/unsubscribe',
        data: undefined,
        response: undefined
    } |
    /**
     * Voice API
     */
    {
        // Join voice call for channel.
        method: 'POST',
        route: '/channels/:id/join_call',
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
