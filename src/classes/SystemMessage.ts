import { API, Client } from "../index.js";

/**
 * System Message
 */
export abstract class SystemMessage {
  protected client?: Client;
  readonly type: API.SystemMessage["type"];

  /**
   * Construct System Message
   * @param client Client
   * @param type Type
   */
  constructor(client: Client, type: API.SystemMessage["type"]) {
    this.client = client;
    this.type = type;
  }

  /**
   * Create an System Message from an API System Message
   * @param client Client
   * @param embed Data
   * @returns System Message
   */
  static from(client: Client, message: API.SystemMessage): SystemMessage {
    switch (message.type) {
      case "text":
        return new TextSystemMessage(client, message);
      case "user_added":
      case "user_remove":
        return new UserModeratedSystemMessage(client, message);
      case "user_joined":
      case "user_left":
      case "user_kicked":
      case "user_banned":
        return new UserSystemMessage(client, message);
      case "channel_renamed":
        return new ChannelRenamedSystemMessage(client, message);
      case "channel_description_changed":
      case "channel_icon_changed":
        return new ChannelEditSystemMessage(client, message);
      case "channel_ownership_changed":
        return new ChannelOwnershipChangeSystemMessage(client, message);
      default:
        return new TextSystemMessage(client, {
          type: "text",
          content: `${(message as { type: string }).type} is not supported.`,
        });
    }
  }
}

/**
 * Text System Message
 */
export class TextSystemMessage extends SystemMessage {
  readonly content: string;

  /**
   * Construct System Message
   * @param client Client
   * @param systemMessage System Message
   */
  constructor(
    client: Client,
    systemMessage: API.SystemMessage & { type: "text" }
  ) {
    super(client, systemMessage.type);
    this.content = systemMessage.content;
  }
}

/**
 * User System Message
 */
export class UserSystemMessage extends SystemMessage {
  readonly userId: string;

  /**
   * Construct System Message
   * @param client Client
   * @param systemMessage System Message
   */
  constructor(
    client: Client,
    systemMessage: API.SystemMessage & {
      type:
        | "user_added"
        | "user_remove"
        | "user_joined"
        | "user_left"
        | "user_kicked"
        | "user_banned";
    }
  ) {
    super(client, systemMessage.type);
    this.userId = systemMessage.id;
  }

  /**
   * User this message concerns
   */
  get user() {
    return this.client!.users.get(this.userId);
  }
}

/**
 * User Moderated System Message
 */
export class UserModeratedSystemMessage extends UserSystemMessage {
  readonly byId: string;

  /**
   * Construct System Message
   * @param client Client
   * @param systemMessage System Message
   */
  constructor(
    client: Client,
    systemMessage: API.SystemMessage & {
      type: "user_added" | "user_remove";
    }
  ) {
    super(client, systemMessage);
    this.byId = systemMessage.by;
  }

  /**
   * User this action was performed by
   */
  get by() {
    console.info("deez!", this.byId);
    return this.client!.users.get(this.byId);
  }
}

/**
 * Channel Edit System Message
 */
export class ChannelEditSystemMessage extends SystemMessage {
  readonly byId: string;

  /**
   * Construct System Message
   * @param client Client
   * @param systemMessage System Message
   */
  constructor(
    client: Client,
    systemMessage: API.SystemMessage & {
      type:
        | "channel_renamed"
        | "channel_description_changed"
        | "channel_icon_changed";
    }
  ) {
    super(client, systemMessage.type);
    this.byId = systemMessage.by;
  }

  /**
   * User this action was performed by
   */
  get by() {
    return this.client!.users.get(this.byId);
  }
}

/**
 * Channel Renamed System Message
 */
export class ChannelRenamedSystemMessage extends ChannelEditSystemMessage {
  readonly name: string;

  /**
   * Construct System Message
   * @param client Client
   * @param systemMessage System Message
   */
  constructor(
    client: Client,
    systemMessage: API.SystemMessage & {
      type: "channel_renamed";
    }
  ) {
    super(client, systemMessage);
    this.name = systemMessage.name;
  }
}

/**
 * Channel Ownership Change System Message
 */
export class ChannelOwnershipChangeSystemMessage extends SystemMessage {
  readonly fromId: string;
  readonly toId: string;

  /**
   * Construct System Message
   * @param client Client
   * @param systemMessage System Message
   */
  constructor(
    client: Client,
    systemMessage: API.SystemMessage & {
      type: "channel_ownership_changed";
    }
  ) {
    super(client, systemMessage.type);
    this.fromId = systemMessage.from;
    this.toId = systemMessage.to;
  }

  /**
   * User giving away channel ownership
   */
  get from() {
    return this.client!.users.get(this.fromId);
  }

  /**
   * User receiving channel ownership
   */
  get to() {
    return this.client!.users.get(this.toId);
  }
}
