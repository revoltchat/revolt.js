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
        id: string,
        data: any
    }[] = [];
    #ratelimitBuckets: { [key: string]: { remaining: number, reset: number } } = {}

    constructor(client: Client, method: RouteMethod, url: RoutePath) {
        this.client = client;
        this.method = method;
        this.url = url;
    }

    async #insertQueueItem<M extends RouteMethod, T extends RoutePath>(data: Route<M, T>["data"], id: string): Promise<Route<M, T>["response"]> {
        const p = new Promise<Route<M, T>["response"]>((resolve, reject) => {
            this.#queue.push({ resolve, reject, data, id });
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

        const limit = this.#ratelimitBuckets[queueItem.id];
        if (limit && limit.reset > Date.now() && limit.remaining == 0) {
            await new Promise(r => setTimeout(r, limit.reset - Date.now()));
        }

        try {
            const res = await this.client.reqRaw(this.method, this.url, queueItem.data);

            const remaining = Number(res.headers['x-ratelimit-remaining']);
            const reset = Number(res.headers['x-ratelimit-reset']) * 1000;
            const resetIn = reset - Date.now();

            if (remaining != null && reset)
                this.#ratelimitBuckets[queueItem.id] = { remaining, reset }

            setTimeout(() => this.#nextQueueItem(), remaining === 0 ? resetIn : 0);
            queueItem.resolve(res.data);
        } catch(e: any) {
            if (e?.response?.status == '429') {
                this.#queue.unshift(queueItem);

                const resetTime = this.#ratelimitBuckets[queueItem.id]?.reset;
                setTimeout(() => this.#nextQueueItem(), resetTime ?? 5000);
            } else {
                queueItem.reject(e);
                setTimeout(() => this.#nextQueueItem(), 0);
            }
        }
    }

    /**
     * @param id Channel ID or similar
     */
    send<M extends RouteMethod, T extends RoutePath>(_method: M, _path: T, data: Route<M, T>["data"], id: string): Promise<Route<M, T>["response"]> {
        return this.#insertQueueItem(data, id);
    }
}
