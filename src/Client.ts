import Axios, { AxiosInstance } from 'axios';
import { defaultsDeep } from 'lodash';
import { EventEmitter } from 'events';

import { Core } from './api/core';
import { Auth } from './api/auth';
import { defaultConfig } from '.';

export interface ClientOptions {
    apiURL: string,
    wsURL: string
}

export declare interface Client {
	// WebSocket related events.
	on(event: 'connected', listener: () => void): this;
    on(event: 'dropped', listener: () => void): this;
	on(event: 'ready', listener: () => void): this;
}

export class Client extends EventEmitter {
    Axios: AxiosInstance;
    options: ClientOptions;
    configuration?: Core.RevoltNodeConfiguration;
    session?: Auth.Session;

    constructor(options: Partial<ClientOptions> = {}) {
        super();
        this.options = defaultsDeep(options, defaultConfig);
        this.Axios = Axios.create({ baseURL: this.options.apiURL });
    }
    
    async connect() {
        this.configuration = (await this.Axios.get('/')).data;
    }
}