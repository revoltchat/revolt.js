import { UserProfile as APIUserProfile } from "revolt-api";

import { Client } from "../Client.js";

import { File } from "./File.js";

/**
 * User Profile Class
 */
export class UserProfile {
  readonly content?: string;
  readonly banner?: File;

  /**
   * Construct Public Bot
   * @param client Client
   * @param data Data
   */
  constructor(client: Client, data: APIUserProfile) {
    this.content = data.content!;
    this.banner = data.background
      ? new File(client, data.background)
      : undefined;
  }

  /**
   * URL to the user's banner
   */
  get bannerURL() {
    return this.banner?.createFileURL();
  }

  /**
   * URL to the user's animated banner
   */
  get animatedBannerURL() {
    return this.banner?.createFileURL(true);
  }
}
