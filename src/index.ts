export * from './Client';
export { Channel, User, Message } from './api/objects';
export { PermissionCalculator } from './api/permissions';

export const LIBRARY_VERSION = '4.3.3-alpha.19';

export const defaultConfig = {
    apiURL: 'https://api.revolt.chat',
    autoReconnect: true,
    heartbeat: 30,
    debug: false,
};
