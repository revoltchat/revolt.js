import { MutableMap, ObjectWithId } from "@insertish/mutable";
import { Client } from '../Client';

export default class Collection<T extends ObjectWithId> extends MutableMap<T> {
    client: Client;

    constructor(client: Client, col: string) {
        super(client.collection(col));
        this.client = client;
    }

    /**
     * Get an object within the collection while throwing an error if it does not exist
     * @param id ID of the object within the collection
     * @returns The item
     * @throws An error if the object does not exist
     */
    getThrow(id: string) {
        let obj = this.getMutable(id);
        if (!obj) throw "Object does not exist.";
        return obj;
    }
}
