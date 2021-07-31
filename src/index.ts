export * from './Client';
export { UserPermission, ChannelPermission, ServerPermission } from './api/permissions';

export const LIBRARY_VERSION = '5.0.0-alpha.14';

export const defaultConfig = {
    apiURL: 'https://api.revolt.chat',
    autoReconnect: true,
    heartbeat: 30,
    debug: false,
    cache: false
};
