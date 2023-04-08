import { decodeTime } from "ulid";

import { MessageCollection } from "../collections";

/**
 * Message Class
 */
export class Message {
  readonly collection: MessageCollection;
  readonly id: string;

  /**
   * Construct Message
   * @param collection Collection
   * @param id Message Id
   */
  constructor(collection: MessageCollection, id: string) {
    this.collection = collection;
    this.id = id;
  }

  /**
   * Time when this message was posted
   */
  get createdAt() {
    return new Date(decodeTime(this.id));
  }

  /**
   * Absolute pathname to this message in the client
   */
  get path() {
    return `${this.channel!.path}/${this.id}`;
  }

  /**
   * URL to this message
   */
  get url() {
    return this.collection.client.configuration?.app + this.path;
  }

  /**
   * Nonce value
   */
  get nonce() {
    return this.collection.getUnderlyingObject(this.id).nonce;
  }

  /**
   * Id of channel this message was sent in
   */
  get channelId() {
    return this.collection.getUnderlyingObject(this.id).channelId;
  }

  /**
   * Channel this message was sent in
   */
  get channel() {
    return this.collection.client.channels.get(
      this.collection.getUnderlyingObject(this.id).channelId
    );
  }

  /**
   * Server this message was sent in
   */
  get server() {
    return this.channel!.server;
  }

  /**
   * Member this message was sent by
   */
  get member() {
    return this.collection.client.serverMembers.getByKey({
      server: this.channel!.serverId,
      user: this.authorId!,
    });
  }

  /**
   * Id of user this message was sent by
   */
  get authorId() {
    return this.collection.getUnderlyingObject(this.id).authorId;
  }

  /**
   * User this message was sent by
   */
  get author() {
    return this.collection.client.users.get(
      this.collection.getUnderlyingObject(this.id).authorId!
    );
  }

  /**
   * Content
   */
  get content() {
    return this.collection.getUnderlyingObject(this.id).content;
  }

  /**
   * System message content
   */
  get systemMessage() {
    return this.collection.getUnderlyingObject(this.id).systemMessage;
  }

  /**
   * Attachments
   */
  get attachments() {
    return this.collection.getUnderlyingObject(this.id).attachments;
  }

  /**
   * Time at which this message was edited
   */
  get editedAt() {
    return this.collection.getUnderlyingObject(this.id).editedAt;
  }

  /**
   * Embeds
   */
  get embeds() {
    return this.collection.getUnderlyingObject(this.id).embeds;
  }

  /**
   * IDs of users this message mentions
   */
  get mentionIds() {
    return this.collection.getUnderlyingObject(this.id).mentionIds;
  }

  /**
   * IDs of messages this message replies to
   */
  get replyIds() {
    return this.collection.getUnderlyingObject(this.id).replyIds;
  }

  /**
   * Reactions
   */
  get reactions() {
    return this.collection.getUnderlyingObject(this.id).reactions;
  }

  /**
   * Interactions
   */
  get interactions() {
    return this.collection.getUnderlyingObject(this.id).interactions;
  }

  /**
   * Masquerade
   */
  get masquerade() {
    return this.collection.getUnderlyingObject(this.id).masquerade;
  }

  /**
   * Get the username for this message
   */
  get username() {
    return (
      this.masquerade?.name ?? this.member?.nickname ?? this.author?.username
    );
  }

  /**
   * Get the role colour for this message
   */
  get roleColour() {
    return this.masquerade?.colour ?? this.member?.roleColour;
  }

  /**
   * Get the avatar URL for this message
   */
  get avatarURL() {
    return (
      this.masqueradeAvatarURL ??
      this.member?.avatarURL ??
      this.author?.avatarURL
    );
  }

  /**
   * Get the animated avatar URL for this message
   */
  get animatedAvatarURL() {
    return (
      this.masqueradeAvatarURL ??
      (this.member
        ? this.member?.animatedAvatarURL
        : this.author?.animatedAvatarURL)
    );
  }

  /**
   * Avatar URL from the masquerade
   */
  get masqueradeAvatarURL() {
    const avatar = this.masquerade?.avatar;
    return avatar ? this.collection.client.proxyFile(avatar) : undefined;
  }

  /**
   * Populated system message
   */
  get populatedSystemMessage() {
    const system = this.systemMessage;
    if (!system) return { type: "none" };

    const { type } = system;
    const get = (id: string) => this.collection.client.users.get(id);
    switch (system.type) {
      case "text":
        return system;
      case "user_added":
        return { type, user: get(system.id), by: get(system.by) };
      case "user_remove":
        return { type, user: get(system.id), by: get(system.by) };
      case "user_joined":
        return { type, user: get(system.id) };
      case "user_left":
        return { type, user: get(system.id) };
      case "user_kicked":
        return { type, user: get(system.id) };
      case "user_banned":
        return { type, user: get(system.id) };
      case "channel_renamed":
        return { type, name: system.name, by: get(system.by) };
      case "channel_description_changed":
        return { type, by: get(system.by) };
      case "channel_icon_changed":
        return { type, by: get(system.by) };
      case "channel_ownership_changed":
        return { type, from: get(system.from), to: get(system.to) };
    }
  }
}
