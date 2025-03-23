import type { BannedUser as APIBannedUser } from "revolt-api";

import type { Client } from "../Client.ts";

import { File } from "./File.ts";

/**
 * Banned User
 */
export class BannedUser {
  readonly id: string;
  readonly avatar?: File;
  readonly username: string;
  readonly discriminator: string;

  /**
   * Construct Banned User
   * @param client Client
   * @param data Data
   */
  constructor(client: Client, data: APIBannedUser) {
    this.id = data._id;
    this.avatar = data.avatar ? new File(client, data.avatar) : undefined;
    this.username = data.username;
    this.discriminator = data.discriminator;
  }
}
