import { Auth, Channels, Users } from '../api/objects';

type WebSocketError = {
    error: 'InternalError' | 'InvalidSession' | 'OnboardingNotFinished' | 'AlreadyAuthenticated'
};

export type ServerboundNotification = (
    { type: 'Ping', time: number } |
    { type: 'Pong', time: number } |
    ({ type: 'Authenticate' } & Auth.Session) |
    ({ type: 'BeginTyping', channel: string }) |
    ({ type: 'EndTyping', channel: string })
);

export type ClientboundNotification = (
    { type: 'Ping', time: number } |
    { type: 'Pong', time: number } |
    ({ type: 'Error' } & WebSocketError) |
    { type: 'Authenticated' } |
    { type: 'Ready', users: Users.User[], channels: Channels.Channel[] } |

    ({ type: 'Message' } & Channels.Message) |
    ({ type: 'MessageUpdate', id: string, data: Partial<Channels.Message> }) |
    ({ type: 'MessageDelete', id: string }) |

    ({ type: 'ChannelCreate' } & Channels.Channel) |
    ({ type: 'ChannelUpdate', id: string, data: Partial<Channels.Channel> }) |
    ({ type: 'ChannelGroupJoin', id: string, user: string }) |
    ({ type: 'ChannelGroupLeave', id: string, user: string }) |
    ({ type: 'ChannelDelete', id: string }) |
    ({ type: 'ChannelStartTyping', id: string, user: string }) |
    ({ type: 'ChannelStopTyping', id: string, user: string }) |

    { type: 'UserUpdate', id: string, data: Partial<Users.User> } |
    { type: 'UserRelationship', user: Users.User, status: Users.Relationship } |
    { type: 'UserPresence', id: string, online: boolean }
)
