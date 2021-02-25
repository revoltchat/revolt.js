export * from './Client';
export { Channel, User, Message } from './api/objects';

export const LIBRARY_VERSION = '3.0.3-alpha.9-patch.1';

export const defaultConfig = {
    apiURL: 'https://api.revolt.chat',
    autoReconnect: true,
    debug: false
};
