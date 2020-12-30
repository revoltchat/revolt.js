import Axios, { AxiosInstance } from 'axios';
import { defaultsDeep } from 'lodash';
import { EventEmitter } from 'events';

import { Core } from './api/core';
import { Auth } from './api/auth';
import { Onboarding } from './api/onboarding';
import { defaultConfig } from '.';
import { runInThisContext } from 'vm';

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
    
    // Stage 1: Connect to Revolt.
    async connect() {
        this.configuration = (await this.Axios.get('/')).data;
    }

    $checkConfiguration() {
        if (typeof this.configuration === 'undefined')
            throw new Error("No configuration synced from Revolt node yet. Use client.connect();");
    }

    $generateHeaders(session: Auth.Session | undefined = this.session) {
        return {
            'x-user-id': session?.user_id,
            'x-session-token': session?.session_token
        }
    }

    // Login to Revolt.
    async login(details: Auth.LoginRequest) {
        this.session = (await this.Axios.post('/auth/login', details)).data;
        return await this.$connect();
    }

    // Use an existing session to log into Revolt.
    async useExistingSession(session: Auth.Session) {
        await this.Axios.get('/auth/check', { headers: this.$generateHeaders(session) });
        this.session = session;
        return await this.$connect();
    }

    // Check onboarding status and connect to notifications service.
    async $connect() {
        this.Axios.defaults.headers = this.$generateHeaders();
        let { onboarding } = (await this.Axios.get('/onboard/hello')).data;
        if (onboarding) {
            return (username: string) => this.completeOnboarding({ username });
        }

        console.log((await this.Axios.get('/users/' + this.session?.user_id)).data);
    }

    // Complete onboarding if required.
    async completeOnboarding(data: Onboarding.OnboardRequest) {
        await this.Axios.post('/onboard/complete', data);
    }
}