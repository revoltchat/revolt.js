import { batch } from "solid-js";

import { API, Client, File } from "..";
import { ServerFlags } from "../hydration/server";

/**
 * Public Channel Invite
 */
export abstract class PublicChannelInvite {
  protected client?: Client;
  readonly type: API.Invite["type"] | "None";

  /**
   * Construct Channel Invite
   * @param client Client
   * @param type Type
   */
  constructor(client?: Client, type: API.Invite["type"] | "None" = "None") {
    this.client = client;
    this.type = type;
  }

  /**
   * Create an Invite from an API Invite Response
   * @param client Client
   * @param invite Data
   * @returns Invite
   */
  static from(client: Client, invite: API.InviteResponse): PublicChannelInvite {
    switch (invite.type) {
      case "Server":
        return new ServerPublicInvite(client, invite);
      default:
        return new UnknownPublicInvite(client);
    }
  }
}

/**
 * Public invite of unknown type
 */
export class UnknownPublicInvite extends PublicChannelInvite {}

/**
 * Public Server Invite
 */
export class ServerPublicInvite extends PublicChannelInvite {
  readonly code: string;
  readonly userName: string;
  readonly userAvatar?: File;

  readonly serverId: string;
  readonly serverName: string;
  readonly serverIcon?: File;
  readonly serverBanner?: File;
  readonly serverFlags: ServerFlags;
  readonly memberCount: number;

  readonly channelId: string;
  readonly channelName: string;
  readonly channelDescription?: string;

  /**
   * Construct Server Invite
   * @param client Client
   * @param invite Invite
   */
  constructor(client: Client, invite: API.InviteResponse & { type: "Server" }) {
    super(client, "Server");

    this.code = invite.code;
    this.userName = invite.user_name;
    this.userAvatar = invite.user_avatar
      ? new File(client, invite.user_avatar)
      : undefined;

    this.serverId = invite.server_id;
    this.serverName = invite.server_name;
    this.serverIcon = invite.server_icon
      ? new File(client, invite.server_icon)
      : undefined;
    this.serverBanner = invite.server_banner
      ? new File(client, invite.server_banner)
      : undefined;
    this.serverFlags = invite.server_flags ?? 0;
    this.memberCount = invite.member_count;

    this.channelId = invite.channel_id;
    this.channelName = invite.channel_name;
    this.channelDescription = invite.channel_description!;
  }

  /**
   * Join the server
   */
  async join() {
    const existingServer = this.client!.servers.get(this.serverId);
    if (existingServer) return existingServer;

    const { server, channels } = await this.client!.api.post(
      `/invites/${this.code as ""}`
    );

    return batch(() => {
      for (const channel of channels) {
        this.client!.channels.getOrCreate(channel._id, channel);
      }

      return this.client!.servers.getOrCreate(server._id, server, true);
    });
  }
}
