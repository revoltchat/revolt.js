export * from './Client';

export { default as User } from './objects/User';
export { default as Message } from './objects/Message';
export { default as Channel, SavedMessagesChannel, DirectMessageChannel, GroupChannel } from './objects/Channel';

export const LIBRARY_VERSION = '3.0.3-alpha.7';

export const defaultConfig = {
    apiURL: 'https://api.revolt.chat',
    autoReconnect: true,
    debug: true
};
