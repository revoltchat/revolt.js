import { Auth, Channels, Servers, Sync, Users } from '../api/objects';
import { RemoveChannelField, RemoveServerField, RemoveUserField, RemoveMemberField } from '../api/routes';

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
    { type: 'Ready', users: Users.User[], servers: Servers.Server[], channels: Channels.Channel[] } |

    ({ type: 'Message' } & Channels.Message) |
    ({ type: 'MessageUpdate', id: string, data: Partial<Channels.Message> }) |
    ({ type: 'MessageDelete', id: string }) |

    ({ type: 'ChannelCreate' } & Channels.Channel) |
    { type: 'ChannelUpdate', id: string, data: Partial<Channels.Channel>, clear?: RemoveChannelField } |
    { type: 'ChannelDelete', id: string } |
    { type: 'ChannelGroupJoin', id: string, user: string } |
    { type: 'ChannelGroupLeave', id: string, user: string } |
    { type: 'ChannelStartTyping', id: string, user: string } |
    { type: 'ChannelStopTyping', id: string, user: string } |
    { type: 'ChannelAck', id: string, message_id: string } |

    ({ type: 'ServerCreate' } & Servers.Server) |
    ({ type: 'ServerUpdate', id: string, data: Partial<Servers.Server>, clear?: RemoveServerField }) |
    ({ type: 'ServerDelete', id: string }) |
    ({ type: 'ServerMemberUpdate', id: string, data: Partial<Servers.Member>, clear?: RemoveMemberField }) |
    ({ type: 'ServerMemberJoin', id: string, user: string }) |
    ({ type: 'ServerMemberLeave', id: string, user: string }) |

    { type: 'UserUpdate', id: string, data: Partial<Users.User>, clear?: RemoveUserField } |
    { type: 'UserRelationship', user: Users.User, status: Users.Relationship } |
    { type: 'UserPresence', id: string, online: boolean } |
    { type: 'UserSettingsUpdate', id: string, update: Sync.UserSettings }
)
