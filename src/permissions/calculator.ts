import Long from "long";
import { Channel, Server, Member } from "..";
import {
    ALLOW_IN_TIMEOUT,
    DEFAULT_PERMISSION_DIRECT_MESSAGE,
    DEFAULT_PERMISSION_VIEW_ONLY,
    Permission,
    UserPermission,
} from "./definitions";

/**
 * Check whether `b` is present in `a`
 * @param a Input A
 * @param b Inputs (OR'd together)
 */
export function bitwiseAndEq(a: number, ...b: number[]) {
    const value = b.reduce((prev, cur) => prev.or(cur), Long.fromNumber(0));
    return value.and(a).eq(value);
}

/**
 * Calculate permissions against a given object
 * @param target Target object to check permissions against
 * @param options Additional options to use when calculating
 */
export function calculatePermission(
    target: Channel | Server,
    options?: {
        /**
         * Pretend to be another member
         */
        member?: Member;
    },
): number {
    const user = options?.member ? options?.member.user : target.client.user;
    if (user?.privileged) {
        return Permission.GrantAllSafe;
    }

    if (target instanceof Server) {
        // 1. Check if owner.
        if (target.owner === user?._id) {
            return Permission.GrantAllSafe;
        } else {
            // 2. Get member.
            const member = options?.member ??
                target.client.members.getKey({
                    user: user!._id,
                    server: target._id,
                }) ?? { roles: null, timeout: null };

            if (!member) return 0;

            // 3. Apply allows from default_permissions.
            let perm = Long.fromNumber(target.default_permissions);

            // 4. If user has roles, iterate in order.
            if (member.roles && target.roles) {
                // 5. Apply allows and denies from roles.
                const permissions = member.orderedRoles.map(
                    ([, role]) => role.permissions,
                );

                for (const permission of permissions) {
                    perm = perm
                        .or(permission.a)
                        .and(Long.fromNumber(permission.d).not());
                }
            }

            // 5. Revoke permissions if member is timed out.
            if (member.timeout && member.timeout > new Date()) {
                perm = perm.and(ALLOW_IN_TIMEOUT);
            }

            return perm.toNumber();
        }
    } else {
        // 1. Check channel type.
        switch (target.channel_type) {
            case "SavedMessages":
                return Permission.GrantAllSafe;
            case "DirectMessage": {
                // 2. Determine user permissions.
                const user_permissions = target.recipient?.permission || 0;

                // 3. Check if the user can send messages.
                if (user_permissions & UserPermission.SendMessage) {
                    return DEFAULT_PERMISSION_DIRECT_MESSAGE;
                } else {
                    return DEFAULT_PERMISSION_VIEW_ONLY;
                }
            }
            case "Group": {
                // 2. Check if user is owner.
                if (target.owner_id === user!._id) {
                    return DEFAULT_PERMISSION_DIRECT_MESSAGE;
                } else {
                    // 3. Pull out group permissions.
                    return (
                        target.permissions ?? DEFAULT_PERMISSION_DIRECT_MESSAGE
                    );
                }
            }
            case "TextChannel":
            case "VoiceChannel": {
                // 2. Get server.
                const server = target.server;
                if (typeof server === "undefined") return 0;

                // 3. If server owner, just grant all permissions.
                if (server.owner === user?._id) {
                    return Permission.GrantAllSafe;
                } else {
                    // 4. Get member.
                    const member = options?.member ??
                        target.client.members.getKey({
                            user: user!._id,
                            server: server._id,
                        }) ?? { roles: null, timeout: null };

                    if (!member) return 0;

                    // 5. Calculate server base permissions.
                    let perm = Long.fromNumber(
                        calculatePermission(server, options),
                    );

                    // 6. Apply default allows and denies for channel.
                    if (target.default_permissions) {
                        perm = perm
                            .or(target.default_permissions.a)
                            .and(
                                Long.fromNumber(
                                    target.default_permissions.d,
                                ).not(),
                            );
                    }

                    // 7. If user has roles, iterate in order.
                    if (
                        member.roles &&
                        target.role_permissions &&
                        server.roles
                    ) {
                        // 5. Apply allows and denies from roles.
                        const roles = member.orderedRoles.map(([id]) => id);

                        for (const id of roles) {
                            const override = target.role_permissions[id];
                            if (override) {
                                perm = perm
                                    .or(override.a)
                                    .and(Long.fromNumber(override.d).not());
                            }
                        }
                    }

                    // 8. Revoke permissions if member is timed out.
                    if (member.timeout && member.timeout > new Date()) {
                        perm = perm.and(ALLOW_IN_TIMEOUT);
                    }

                    return perm.toNumber();
                }
            }
        }
    }
}
