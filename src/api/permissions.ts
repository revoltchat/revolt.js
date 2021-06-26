import { Client } from '../Client';
import { Users } from './objects';

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
    ChangeAvatar: 0b00000000000000000100000000000000,    // 16392
    RemoveAvatars: 0b00000000000000001000000000000000,   // 32784
}

const U32_MAX = 2**32 - 1; // 4294967295

const DEFAULT_PERMISSION_DM =
    ChannelPermission.View
    + ChannelPermission.SendMessage
    + ChannelPermission.ManageChannel
    + ChannelPermission.VoiceCall
    + ChannelPermission.InviteOthers
    + ChannelPermission.EmbedLinks
    + ChannelPermission.UploadFiles;

export class PermissionCalculator {
    client: Client;

    constructor(client: Client) {
        this.client = client;
    }

    forUser(user_id: string): number {
        let user = this.client.users.get(user_id);
        if (typeof user === 'undefined') return 0;

        let permissions = 0;
        switch (user.relationship) {
            case Users.Relationship.Friend:
            case Users.Relationship.User:
                return U32_MAX;
            case Users.Relationship.Blocked:
            case Users.Relationship.BlockedOther:
                return UserPermission.Access;
            case Users.Relationship.Incoming:
            case Users.Relationship.Outgoing:
                permissions = UserPermission.Access;
        }

        if (this.client.channels.toArray().find(channel =>
            (channel.channel_type === 'Group' || channel.channel_type === 'DirectMessage')
                && channel.recipients.includes(user_id)
        )) {
            permissions |= UserPermission.Access | UserPermission.ViewProfile;
        }

        return permissions;
    }

    forChannel(channel_id: string): number {
        let channel = this.client.channels.get(channel_id);
        if (typeof channel === 'undefined') return 0;

        // This takes assumptions in the fact that
        // by having the channel in the channel map,
        // we are part of the channel, hence have
        // access to it.

        switch (channel.channel_type) {
            case 'SavedMessages': return U32_MAX;
            case 'DirectMessage': {
                let recipient = this.client.channels.getRecipient(channel_id);
                let user_permissions = this.forUser(recipient);

                if (user_permissions & UserPermission.SendMessage) {
                    return DEFAULT_PERMISSION_DM;
                } else {
                    return 0;
                }
            }
            case 'Group': return channel.permissions ?? DEFAULT_PERMISSION_DM;
            case 'TextChannel':
            case 'VoiceChannel': {
                let server = this.client.servers.get(channel.server);
                if (typeof server === 'undefined') return 0;

                if (server.owner === this.client.user?._id) {
                    return U32_MAX;
                } else {
                    let member = this.client.servers.members.get(`${channel.server}${this.client.user!._id}`);
                    if (!member) return 0;

                    let perm = (
                        channel.default_permissions ??
                        server.default_permissions[1]
                    ) >>> 0;

                    if (member.roles) {
                        for (let role of member.roles) {
                            perm |= (channel.role_permissions?.[role] ?? 0) >>> 0;
                            perm |= (server.roles?.[role].permissions[1] ?? 0) >>> 0;
                        }
                    }

                    return perm;
                }
            }
        }
    }

    forServer(server_id: string): number {
        let server = this.client.servers.get(server_id);
        if (typeof server === 'undefined') return 0;

        if (server.owner === this.client.user?._id) {
            return U32_MAX;
        } else {
            let member = this.client.servers.members.get(`${server._id}${this.client.user!._id}`);
            if (!member) return 0;

            let perm = server.default_permissions[0] >>> 0;
            if (member.roles) {
                for (let role of member.roles) {
                    perm |= (server.roles?.[role].permissions[0] ?? 0) >>> 0;
                }
            }

            return perm;
        }
    }
}

