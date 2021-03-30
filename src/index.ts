export * from './Client';
export { Channel, User, Message } from './api/objects';

export const LIBRARY_VERSION = '4.0.0-alpha.15';

export const defaultConfig = {
    apiURL: 'https://api.revolt.chat',
    autoReconnect: true,
    heartbeat: 10,
    debug: false,
};
