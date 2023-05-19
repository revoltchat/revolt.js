import { batch } from "solid-js";

import { API } from "..";
import { Session } from "../classes";
import { HydratedSession } from "../hydration/session";

import { ClassCollection } from ".";

/**
 * Collection of Sessions
 */
export class SessionCollection extends ClassCollection<
  Session,
  HydratedSession
> {
  /**
   * Fetch active sessions
   * @returns List of sessions
   */
  async fetch(): Promise<Session[]> {
    const data = await this.client.api.get("/auth/session/all");
    return batch(() =>
      data.map((session) => this.getOrCreate(session._id, session))
    );
  }

  /**
   * Delete all sessions, optionally including self
   * @param revokeSelf Whether to remove current session too
   */
  async deleteAll(revokeSelf = false) {
    await this.client.api.delete("/auth/session/all", {
      revoke_self: revokeSelf,
    });

    for (const entry of this.toList()) {
      if (!revokeSelf && entry.current) continue;
      this.delete(entry.id);
    }
  }

  /**
   * Get or create
   * @param id Id
   * @param data Data
   * @returns Session
   */
  getOrCreate(id: string, data: API.SessionInfo) {
    if (this.has(id)) {
      return this.get(id)!;
    } else {
      const instance = new Session(this, id);
      this.create(id, "session", instance, this.client, data);
      return instance;
    }
  }
}
