import { DataCreateAccount, WebPushSubscription } from "revolt-api";

import { Client } from "../Client.js";
import { MFA } from "../classes/MFA.js";

/**
 * Utility functions for working with accounts
 */
export class AccountCollection {
  readonly client: Client;

  /**
   * Create generic class collection
   * @param client Client
   */
  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Fetch current account email
   * @returns Email
   */
  async fetchEmail(): Promise<string> {
    return (await this.client.api.get("/auth/account/")).email;
  }

  /**
   * Create a MFA helper
   */
  async mfa(): Promise<MFA> {
    const state = await this.client.api.get("/auth/mfa/");
    return new MFA(this.client, state);
  }

  /**
   * Create a new account
   * @param data Account details
   */
  async create(data: DataCreateAccount): Promise<void> {
    return await this.client.api.post("/auth/account/create", data);
  }

  /**
   * Resend email verification
   * @param email Email
   * @param captcha Captcha if enabled
   */
  async reverify(email: string, captcha?: string): Promise<void> {
    return await this.client.api.post("/auth/account/reverify", {
      email,
      captcha,
    });
  }

  /**
   * Send password reset email
   * @param email Email
   * @param captcha Captcha if enabled
   */
  async resetPassword(email: string, captcha?: string): Promise<void> {
    return await this.client.api.post("/auth/account/reset_password", {
      email,
      captcha,
    });
  }

  /**
   * Verify an account given the code
   * @param code Verification code
   */
  async verify(code: string): Promise<unknown> {
    return await this.client.api.post(`/auth/account/verify/${code}`);
  }

  /**
   * Confirm account deletion
   * @param token Deletion token
   */
  async confirmDelete(token: string): Promise<void> {
    return await this.client.api.put("/auth/account/delete", { token });
  }

  /**
   * Confirm password reset
   * @param token Token
   * @param newPassword New password
   * @param removeSessions Whether to remove existing sessions
   */
  async confirmPasswordReset(
    token: string,
    newPassword: string,
    removeSessions: boolean,
  ): Promise<void> {
    return await this.client.api.patch("/auth/account/reset_password", {
      token,
      password: newPassword,
      remove_sessions: removeSessions,
    });
  }

  /**
   * Change account password
   * @param newPassword New password
   * @param currentPassword Current password
   */
  async changePassword(
    newPassword: string,
    currentPassword: string,
  ): Promise<void> {
    return await this.client.api.patch("/auth/account/change/password", {
      password: newPassword,
      current_password: currentPassword,
    });
  }

  /**
   * Change account email
   * @param newEmail New email
   * @param currentPassword Current password
   */
  async changeEmail(newEmail: string, currentPassword: string): Promise<void> {
    return await this.client.api.patch("/auth/account/change/email", {
      email: newEmail,
      current_password: currentPassword,
    });
  }

  /**
   * Fetch settings
   * @param keys Keys
   * @returns Settings
   */
  async fetchSettings(
    keys: string[],
  ): Promise<Record<string, [number, string]>> {
    return await this.client.api.post("/sync/settings/fetch", { keys });
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  /**
   * Set settings
   * @param settings Settings
   * @param timestamp Timestamp
   */
  async setSettings(
    settings: Record<string, any>,
    timestamp = new Date().getTime(),
  ): Promise<void> {
    return await this.client.api.post("/sync/settings/set", {
      ...settings,
      timestamp,
    });
  }

  /**
   * Create a new Web Push subscription
   * @param subscription Subscription
   */
  async webPushSubscribe(subscription: WebPushSubscription): Promise<void> {
    return await this.client.api.post("/push/subscribe", subscription);
  }

  /**
   * Remove existing Web Push subscription
   */
  async webPushUnsubscribe(): Promise<void> {
    return await this.client.api.post("/push/unsubscribe");
  }
}
