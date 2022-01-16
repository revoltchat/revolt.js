/* eslint-disable @typescript-eslint/no-explicit-any */
import { Route, RouteMethod, RoutePath } from '../api/routes';
import { Client } from '../Client';

export default class Ratelimiter {
    client: Client;
    method: RouteMethod;
    url: RoutePath;
    retryTimeout = 5000;

    #queueRunning = false;
    #queue: {
        resolve: (res: any) => void,
        reject: (res: any) => void,
        data: any
    }[] = [];

    constructor(client: Client, method: RouteMethod, url: RoutePath, retryTimeout?: number) {
        this.client = client;
        this.method = method;
        this.url = url;
        if (retryTimeout) this.retryTimeout = retryTimeout;
    }

    async #insertQueueItem<M extends RouteMethod, T extends RoutePath>(data: Route<M, T>["data"]): Promise<Route<M, T>["response"]> {
        const p = new Promise<Route<M, T>["response"]>((resolve, reject) => {
            this.#queue.push({ resolve, reject, data });
        });
        if (!this.#queueRunning) this.#nextQueueItem();
        return p;
    }

    async #nextQueueItem() {
        this.#queueRunning = true;

        const queueItem = this.#queue.shift();
        if (!queueItem) {
            this.#queueRunning = false;
            return;
        }
        try {
            const res: any = await this.client.req(this.method, this.url, queueItem.data);
            setTimeout(() => this.#nextQueueItem(), 0);
            queueItem.resolve(res);
        } catch(e: any) {
            if (e?.response?.status == '429') {
                this.#queue.unshift(queueItem);

                // Revolt doesn't return a Retry-After header as of now
                setTimeout(() => this.#nextQueueItem(), this.retryTimeout);
            } else queueItem.reject(e);
        }
    }

    send<M extends RouteMethod, T extends RoutePath>(method: M, path: T, data: Route<M, T>["data"]): Promise<Route<M, T>["response"]> {
        return this.#insertQueueItem(data);
    }
}
