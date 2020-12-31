import { Auth } from '../api/auth';
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
    { type: 'Ready', user: Users.User } |
    { type: 'UserRelationship', user: string, status: Relationship }
)
