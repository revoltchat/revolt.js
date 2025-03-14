import type {
  BannedUser as APIBannedUser,
  MemberCompositeKey,
  ServerBan as APIServerBan,
} from "revolt-api";

import type { Client } from "../Client.ts";

import { BannedUser } from "./BannedUser.ts";
import type { Server } from "./Server.ts";

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
  constructor(client: Client, data: APIServerBan, user?: APIBannedUser) {
    this.client = client;
    this.id = data._id;
    this.reason = data.reason!;
    this.user = user ? new BannedUser(client, user) : undefined;
  }

  /**
   * Server
   */
  get server(): Server | undefined {
    return this.client.servers.get(this.id.server);
  }

  /**
   * Remove this server ban
   */
  async pardon(): Promise<void> {
    await this.client.api.delete(
      `/servers/${this.id.server as ""}/bans/${this.id.user as ""}`,
    );
  }
}
