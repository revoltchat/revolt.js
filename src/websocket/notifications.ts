import { Auth } from '../api/auth';
import { Channels } from '../api/channels';
import { Relationship, Users } from '../api/users';

type WebSocketError = {
    error: 'InternalError' | 'InvalidSession' | 'OnboardingNotFinished' | 'AlreadyAuthenticated'
};

export type ServerboundNotification = (
    ({ type: 'Authenticate' } & Auth.Session)
);

export type ClientboundNotification = (
    ({ type: 'Error' } & WebSocketError) |
    { type: 'Authenticated' } |
    { type: 'Ready', users: Users.User[], channels: Channels.Channel[] } |

    ({ type: 'Message' } & Channels.Message) |
    ({ type: 'MessageUpdate' } & Partial<Channels.Message>) |
    ({ type: 'MessageDelete', id: string }) |

    ({ type: 'ChannelCreate' } & Channels.Channel) |
    ({ type: 'ChannelUpdate' } & Partial<Channels.Channel>) |
    ({ type: 'ChannelGroupJoin', id: string, user: string }) |
    ({ type: 'ChannelGroupLeave', id: string, user: string }) |
    ({ type: 'ChannelDelete', id: string }) |

    { type: 'UserRelationship', user: string, status: Relationship } |
    { type: 'UserPresence', id: string, online: boolean }
)
