export * from './Client';
export { Channel, User, Message } from './api/objects';

export const LIBRARY_VERSION = '4.0.0-alpha.1';

export const defaultConfig = {
    apiURL: 'https://api.revolt.chat',
    autoReconnect: true,
    debug: false
};
