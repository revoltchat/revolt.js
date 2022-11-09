/**
 * Permission against User
 */
export const UserPermission = {
    Access: 1 << 0,
    ViewProfile: 1 << 1,
    SendMessage: 1 << 2,
    Invite: 1 << 3,
};

/**
 * Permission against Server / Channel
 */
export const Permission = {
    // * Generic permissions
    /// Manage the channel or channels on the server
    ManageChannel: 2 ** 0,
    /// Manage the server
    ManageServer: 2 ** 1,
    /// Manage permissions on servers or channels
    ManagePermissions: 2 ** 2,
    /// Manage roles on server
    ManageRole: 2 ** 3,
    /// Manage server customisation (includes emoji)
    ManageCustomisation: 2 ** 4,

    // % 1 bits reserved

    // * Member permissions
    /// Kick other members below their ranking
    KickMembers: 2 ** 6,
    /// Ban other members below their ranking
    BanMembers: 2 ** 7,
    /// Timeout other members below their ranking
    TimeoutMembers: 2 ** 8,
    /// Assign roles to members below their ranking
    AssignRoles: 2 ** 9,
    /// Change own nickname
    ChangeNickname: 2 ** 10,
    /// Change or remove other's nicknames below their ranking
    ManageNicknames: 2 ** 11,
    /// Change own avatar
    ChangeAvatar: 2 ** 12,
    /// Remove other's avatars below their ranking
    RemoveAvatars: 2 ** 13,

    // % 7 bits reserved

    // * Channel permissions
    /// View a channel
    ViewChannel: 2 ** 20,
    /// Read a channel's past message history
    ReadMessageHistory: 2 ** 21,
    /// Send a message in a channel
    SendMessage: 2 ** 22,
    /// Delete messages in a channel
    ManageMessages: 2 ** 23,
    /// Manage webhook entries on a channel
    ManageWebhooks: 2 ** 24,
    /// Create invites to this channel
    InviteOthers: 2 ** 25,
    /// Send embedded content in this channel
    SendEmbeds: 2 ** 26,
    /// Send attachments and media in this channel
    UploadFiles: 2 ** 27,
    /// Masquerade messages using custom nickname and avatar
    Masquerade: 2 ** 28,
    /// React to messages with emoji
    React: 2 ** 29,

    // * Voice permissions
    /// Connect to a voice channel
    Connect: 2 ** 30,
    /// Speak in a voice call
    Speak: 2 ** 31,
    /// Share video in a voice call
    Video: 2 ** 32,
    /// Mute other members with lower ranking in a voice call
    MuteMembers: 2 ** 33,
    /// Deafen other members with lower ranking in a voice call
    DeafenMembers: 2 ** 34,
    /// Move members between voice channels
    MoveMembers: 2 ** 35,

    // * Misc. permissions
    // % Bits 36 to 52: free area
    // % Bits 53 to 64: do not use

    // * Grant all permissions
    /// Safely grant all permissions
    GrantAllSafe: 0x000f_ffff_ffff_ffff,
};

/**
 * Maximum safe value
 */
export const U32_MAX = 2 ** 32 - 1; // 4294967295

/**
 * Permissions allowed for a user while in timeout
 */
export const ALLOW_IN_TIMEOUT =
    Permission.ViewChannel + Permission.ReadMessageHistory;

/**
 * Default permissions if we can only view
 */
export const DEFAULT_PERMISSION_VIEW_ONLY =
    Permission.ViewChannel + Permission.ReadMessageHistory;

/**
 * Default base permissions for channels
 */
export const DEFAULT_PERMISSION =
    DEFAULT_PERMISSION_VIEW_ONLY +
    Permission.SendMessage +
    Permission.InviteOthers +
    Permission.SendEmbeds +
    Permission.UploadFiles +
    Permission.Connect +
    Permission.Speak;

/**
 * Permissions in saved messages channel
 */
export const DEFAULT_PERMISSION_SAVED_MESSAGES = Permission.GrantAllSafe;

/**
 * Permissions in direct message channels / default permissions for group DMs
 */
export const DEFAULT_PERMISSION_DIRECT_MESSAGE =
    DEFAULT_PERMISSION + Permission.React + Permission.ManageChannel;

/**
 * Permissions in server text / voice channel
 */
export const DEFAULT_PERMISSION_SERVER =
    DEFAULT_PERMISSION + Permission.React + Permission.ChangeNickname + Permission.ChangeAvatar;
