import { MemberCompositeKey } from "revolt-api";

import { API, Client } from "..";

/**
 * Server Ban
 */
export class ServerBan {
  protected client: Client;
  readonly id: MemberCompositeKey;
  readonly reason?: string;

  /**
   * Construct Server Ban
   * @param client Client
   * @param data Data
   */
  constructor(client: Client, data: API.ServerBan) {
    this.client = client;
    this.id = data._id;
    this.reason = data.reason!;
  }

  /**
   * User
   */
  get user() {
    return this.client.users.get(this.id.user);
  }

  /**
   * Server
   */
  get server() {
    return this.client.servers.get(this.id.server);
  }

  /**
   * Remove this server ban
   */
  async pardon() {
    await this.client.api.delete(
      `/servers/${this.id.server as ""}/bans/${this.id.user as ""}`
    );
  }
}
