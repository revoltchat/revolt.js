import { ObservableMap } from "mobx";

import { Client } from "../Client";

export default class Collection<K, V> extends ObservableMap<K, V> {
    client: Client;

    constructor(client: Client) {
        super();
        this.client = client;
    }
}
