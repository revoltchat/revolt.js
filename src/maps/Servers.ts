import { Server, Servers as ServersNS } from '../api/objects';
import { Route } from '../api/routes';
import Collection from './Collection';
import { Client } from '..';

export default class Servers extends Collection<Server> {
    constructor(client: Client) {
        super(client, 'servers');
    }

    /**
     * Fetch a server, but do not make the return value read-only
     * @param id Server ID
     * @returns The server
     */
    async fetchMutable(id: string): Promise<Server> {
        throw "unimplemented"
    }

    /**
     * Fetch a server and make the return value read-only
     * @param id Server ID
     * @returns The server in read-only state 
     */
    async fetch(id: string) {
        throw "unimplemented"
    }

    /**
     * Edit a server
     * @param id ID of the target server
     * @param data Server editing route data
     */
    async edit(id: string, data: Route<'PATCH', '/channels/id'>["data"]) {
        throw "unimplemented"
    }

    /**
     * Delete a guild
     * @param id ID of the target guild
     */
    async delete(id: string, avoidRequest?: boolean) {
        if (avoidRequest) {
            return super.delete(id);
        }

        throw "unimplemented"
    }
}
