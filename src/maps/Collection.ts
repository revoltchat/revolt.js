import { Client } from '../Client';

export default class Collection<T> {
    client: Client;

    constructor(client: Client) {
        this.client = client;
    }
}
