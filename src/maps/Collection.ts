import { MutableMap, ObjectWithId } from "@insertish/mutable";
import { Client } from '../Client';

export default class Collection<T extends ObjectWithId> extends MutableMap<T> {
    client: Client;

    constructor(client: Client) {
        super();
        this.client = client;
    }

    getThrow(id: string) {
        let obj = this.getMutable(id);
        if (!obj) throw "Object does not exist.";
        return obj;
    }
}
