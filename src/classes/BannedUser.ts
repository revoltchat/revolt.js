import { BannedUser as ApiBannedUser } from "revolt-api";

import { Client, File } from "../index.js";

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
  constructor(client: Client, data: ApiBannedUser) {
    this.id = data._id;
    this.avatar = data.avatar ? new File(client, data.avatar) : undefined;
    this.username = data.username;
    this.discriminator = data.discriminator;
  }
}
