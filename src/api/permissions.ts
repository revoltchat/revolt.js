export const UserPermission = {
    Access: 1 << 0,
    ViewProfile: 1 << 1,
    SendMessage: 1 << 2,
    Invite: 1 << 3,
}

export const ChannelPermission = {
    View: 1 << 0,
    SendMessage: 1 << 1,
    ManageMessages: 1 << 2,
    ManageChannel: 1 << 3,
    VoiceCall: 1 << 4,
    InviteOthers: 1 << 5,
    EmbedLinks: 1 << 6,
    UploadFiles: 1 << 7,
}

export const ServerPermission = {
    View: 1 << 0,
    ManageRoles: 1 << 1,
    ManageChannels: 1 << 2,
    ManageServer: 1 << 3,
    KickMembers: 1 << 4,
    BanMembers: 1 << 5,
    ChangeNickname: 1 << 12,
    ManageNicknames: 1 << 13,
    ChangeAvatar: 1 << 14,
    RemoveAvatars: 1 << 15,
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
