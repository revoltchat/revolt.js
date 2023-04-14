import { API, ServerMember } from "..";
import { HydratedServerMember } from "../hydration";

import { ClassCollection } from ".";

/**
 * Collection of Server Members
 */
export class ServerMemberCollection extends ClassCollection<
  ServerMember,
  HydratedServerMember
> {
  /**
   * Check if member exists by composite key
   * @param id Id
   * @returns Whether it exists
   */
  hasByKey(id: API.MemberCompositeKey) {
    return super.has(id.server + id.user);
  }

  /**
   * Get member by composite key
   * @param id Id
   * @returns Member
   */
  getByKey(id: API.MemberCompositeKey) {
    return super.get(id.server + id.user);
  }

  /**
   * Fetch server member by Id
   * @param serverId Server Id
   * @param userId User Id
   * @returns Message
   */
  async fetch(serverId: string, userId: string): Promise<ServerMember> {
    const member = this.get(serverId + userId);
    if (member) return member;

    const data = await this.client.api.get(
      `/servers/${serverId as ""}/members/${userId as ""}`
    );

    return this.getOrCreate(data._id, data);
  }

  /**
   * Get or create
   * @param id Id
   * @param data Data
   */
  getOrCreate(id: API.MemberCompositeKey, data: API.Member) {
    if (this.hasByKey(id)) {
      return this.getByKey(id)!;
    } else {
      const instance = new ServerMember(this, id);
      this.create(
        id.server + id.user,
        "serverMember",
        instance,
        this.client,
        data
      );
      return instance;
    }
  }

  /**
   * Get or return partial
   * @param id Id
   */
  getOrPartial(id: API.MemberCompositeKey) {
    if (this.hasByKey(id)) {
      return this.getByKey(id)!;
    } else if (this.client.options.partials) {
      const instance = new ServerMember(this, id);
      this.create(id.server + id.user, "serverMember", instance, this.client, {
        id,
        partial: true,
      });
      return instance;
    }
  }
}
