export * from './Client';

export const API_VERSION = {
    str: '0.3.0-alpha',
    major: 0,
    minor: 3,
    patch: 0
};

export const LIBRARY_VERSION = {
    str: '3.0.0',
    major: 3,
    minor: 0,
    patch: 0
};

export const defaultConfig = {
    apiURL: 'https://api.revolt.chat',
    wsURL:  'wss://api.revolt.chat/ws'
};
