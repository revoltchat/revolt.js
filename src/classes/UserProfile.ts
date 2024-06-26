import { API, Client, File } from "../index.js";

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
  constructor(client: Client, data: API.UserProfile) {
    this.content = data.content!;
    this.banner = data.background
      ? new File(client, data.background)
      : undefined;
  }

  /**
   * URL to the user's banner
   */
  get bannerURL() {
    return this.banner?.createFileURL({ width: 1000 });
  }

  /**
   * URL to the user's animated banner
   */
  get animatedBannerURL() {
    return this.banner?.createFileURL({ width: 1000 }, true);
  }
}
