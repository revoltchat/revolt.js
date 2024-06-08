import {
  BannedUser as ApiBannedUser,
  ServerBan as ApiServerBan,
  MemberCompositeKey,
} from "revolt-api";

import { BannedUser, Client } from "../index.js";

/**
 * Server Ban
 */
export class ServerBan {
  protected client: Client;
  readonly id: MemberCompositeKey;
  readonly reason?: string;
  readonly user?: BannedUser;

  /**
   * Construct Server Ban
   * @param client Client
   * @param data Data
   */
  constructor(client: Client, data: ApiServerBan, user?: ApiBannedUser) {
    this.client = client;
    this.id = data._id;
    this.reason = data.reason!;
    this.user = user ? new BannedUser(client, user) : undefined;
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
