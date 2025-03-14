import { SessionInfo } from "revolt-api";

import { Session } from "../classes/Session.js";
import { HydratedSession } from "../hydration/session.js";

import { Collection } from "./Collection.js";

/**
 * Collection of Sessions
 */
export class SessionCollection extends Collection<Session, HydratedSession> {
  /**
   * Fetch active sessions
   * @returns List of sessions
   */
  async fetch(): Promise<Session[]> {
    const data = await this.client.api.get("/auth/session/all");
    return data.map((session) => this.getOrCreate(session._id, session));
  }

  /**
   * Delete all sessions, optionally including self
   * @param revokeSelf Whether to remove current session too
   */
  async deleteAll(revokeSelf = false): Promise<void> {
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
  getOrCreate(id: string, data: SessionInfo): Session {
    if (this.has(id)) {
      return this.get(id)!;
    } else {
      const instance = new Session(this, id);
      this.create(id, "session", instance, this.client, data);
      return instance;
    }
  }
}
