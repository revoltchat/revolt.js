export * from './Client';

export { default as User } from './objects/User';
export { default as Channel } from './objects/Channel';

export const API_VERSION = {
    str: '0.3.0-alpha',
    major: 0,
    minor: 3,
    patch: 0
};

export const LIBRARY_VERSION = {
    str: '3.0.0-beta.4',
    major: 3,
    minor: 0,
    patch: 0
};

export const defaultConfig = {
    apiURL: 'https://api.revolt.chat',
    autoReconnect: true,
    debug: true
};
