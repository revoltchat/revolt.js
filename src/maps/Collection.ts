import { Client } from '../Client';
import { ObservableMap } from 'mobx';

export default class Collection<K, V> extends ObservableMap<K, V> {
    client: Client;

    constructor(client: Client) {
        super();
        this.client = client;
    }
}
