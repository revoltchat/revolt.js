export const UserPermission = {
    Access: 0b00000000000000000000000000000001,      // 1
    ViewProfile: 0b00000000000000000000000000000010, // 2
    SendMessage: 0b00000000000000000000000000000100, // 4
    Invite: 0b00000000000000000000000000001000,      // 8
}

export const ChannelPermission = {
    View: 0b00000000000000000000000000000001,           // 1
    SendMessage: 0b00000000000000000000000000000010,    // 2
    ManageMessages: 0b00000000000000000000000000000100, // 4
    ManageChannel: 0b00000000000000000000000000001000,  // 8
    VoiceCall: 0b00000000000000000000000000010000,      // 16
    InviteOthers: 0b00000000000000000000000000100000,   // 32
    EmbedLinks: 0b00000000000000000000000001000000,   // 64
    UploadFiles: 0b00000000000000000000000010000000,   // 128
}

export const ServerPermission = {
    View: 0b00000000000000000000000000000001,            // 1
    ManageRoles: 0b00000000000000000000000000000010,   // 2
    ManageChannels: 0b00000000000000000000000000000100,  // 4
    ManageServer: 0b00000000000000000000000000001000,    // 8
    KickMembers: 0b00000000000000000000000000010000,     // 16
    BanMembers: 0b00000000000000000000000000100000,      // 32
    ChangeNickname: 0b00000000000000000001000000000000,  // 4096
    ManageNicknames: 0b00000000000000000010000000000000, // 8192
    ChangeAvatar: 0b00000000000000000100000000000000,    // 16382
    RemoveAvatars: 0b00000000000000001000000000000000,   // 32768
}

export const U32_MAX = 2**32 - 1; // 4294967295

export const DEFAULT_PERMISSION_DM =
    ChannelPermission.View
    + ChannelPermission.SendMessage
    + ChannelPermission.ManageChannel
    + ChannelPermission.VoiceCall
    + ChannelPermission.InviteOthers
    + ChannelPermission.EmbedLinks
    + ChannelPermission.UploadFiles;
