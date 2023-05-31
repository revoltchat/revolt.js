import { API, Channel, Client, File, Server } from "..";

/**
 * Public Bot Class
 */
export class PublicBot {
  #client: Client;

  readonly id: string;
  readonly username: string;
  readonly avatar?: File;
  readonly description?: string;

  /**
   * Construct Public Bot
   * @param client Client
   * @param data Data
   */
  constructor(client: Client, data: API.PublicBot) {
    this.#client = client;
    this.id = data._id;
    this.username = data.username;
    this.avatar = data.avatar
      ? new File(client, {
          _id: data.avatar,
          tag: "avatars",
        } as API.File)
      : undefined;
    this.description = data.description!;
  }

  /**
   * Add the bot to a server
   * @param server Server
   */
  addToServer(server: Server | string) {
    this.#client.api.post(`/bots/${this.id as ""}/invite`, {
      server: server instanceof Server ? server.id : server,
    });
  }

  /**
   * Add the bot to a group
   * @param group Group
   */
  addToGroup(group: Channel | string) {
    // TODO: should use GroupChannel once that is added
    this.#client.api.post(`/bots/${this.id as ""}/invite`, {
      group: group instanceof Channel ? group.id : group,
    });
  }
}
