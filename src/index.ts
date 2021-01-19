export * from './Client';

export { default as User } from './objects/User';
export { default as Message } from './objects/Message';
export { default as Channel, SavedMessagesChannel, DirectMessageChannel, GroupChannel } from './objects/Channel';

export const API_VERSION = {
    str: '0.3.1-beta.0',
    major: 0,
    minor: 3,
    patch: 1
};

export const LIBRARY_VERSION = {
    str: '3.0.1',
    major: 3,
    minor: 0,
    patch: 1
};

export const defaultConfig = {
    apiURL: 'https://api.revolt.chat',
    autoReconnect: true,
    debug: true
};
