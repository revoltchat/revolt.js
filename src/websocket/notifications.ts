
import type { Session } from 'revolt-api/types/Auth';
import type { UserSettings } from 'revolt-api/types/Sync';
import type { Channel, Message } from 'revolt-api/types/Channels';
import type { RelationshipStatus, User } from 'revolt-api/types/Users';
import type { Member, MemberCompositeKey, Role, Server } from 'revolt-api/types/Servers';
import type { RemoveChannelField, RemoveServerField, RemoveUserField, RemoveMemberField } from '../api/routes';

type WebSocketError = {
    error: 'InternalError' | 'InvalidSession' | 'OnboardingNotFinished' | 'AlreadyAuthenticated'
};

export type ServerboundNotification = (
    { type: 'Ping', time: number } |
    { type: 'Pong', time: number } |
    ({ type: 'Authenticate' } & Session) |
    ({ type: 'Authenticate', token: string }) |
    ({ type: 'BeginTyping', channel: string }) |
    ({ type: 'EndTyping', channel: string })
);

export type ReadyPacket = {
    type: 'Ready',
    users: User[],
    servers: Server[],
    channels: Channel[],
    members: Member[]
}

export type ClientboundNotification = (
    { type: 'Ping', time: number } |
    { type: 'Pong', time: number } |
    ({ type: 'Error' } & WebSocketError) |
    { type: 'Authenticated' } |
    ReadyPacket |

    ({ type: 'Message' } & Message) |
    ({ type: 'MessageUpdate', id: string, data: Partial<Message> }) |
    ({ type: 'MessageDelete', id: string }) |

    ({ type: 'ChannelCreate' } & Channel) |
    { type: 'ChannelUpdate', id: string, data: Partial<Channel>, clear?: RemoveChannelField } |
    { type: 'ChannelDelete', id: string } |
    { type: 'ChannelGroupJoin', id: string, user: string } |
    { type: 'ChannelGroupLeave', id: string, user: string } |
    { type: 'ChannelStartTyping', id: string, user: string } |
    { type: 'ChannelStopTyping', id: string, user: string } |
    { type: 'ChannelAck', id: string, user: string, message_id: string } |

    ({ type: 'ServerUpdate', id: string, data: Partial<Server>, clear?: RemoveServerField }) |
    ({ type: 'ServerDelete', id: string }) |
    ({ type: 'ServerMemberUpdate', id: MemberCompositeKey, data: Partial<Member>, clear?: RemoveMemberField }) |
    ({ type: 'ServerMemberJoin', id: string, user: string }) |
    ({ type: 'ServerMemberLeave', id: string, user: string }) |
    ({ type: 'ServerRoleUpdate', id: string, role_id: string, data: Partial<Role> }) |
    ({ type: 'ServerRoleDelete', id: string, role_id: string }) |

    { type: 'UserUpdate', id: string, data: Partial<User>, clear?: RemoveUserField } |
    { type: 'UserRelationship', user: User, status: RelationshipStatus } |
    { type: 'UserPresence', id: string, online: boolean } |
    { type: 'UserSettingsUpdate', id: string, update: UserSettings }
)
