import { DataCreateAccount, WebPushSubscription } from "revolt-api";

import { Client } from "..";
import { MFA } from "../classes/MFA";

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
  fetchEmail() {
    return this.client.api
      .get("/auth/account/")
      .then((account) => account.email);
  }

  /**
   * Create a MFA helper
   */
  async mfa() {
    const state = await this.client.api.get("/auth/mfa/");
    return new MFA(this.client, state);
  }

  /**
   * Create a new account
   * @param data Account details
   */
  create(data: DataCreateAccount) {
    return this.client.api.post("/auth/account/create", data);
  }

  /**
   * Resend email verification
   * @param email Email
   * @param captcha Captcha if enabled
   */
  reverify(email: string, captcha?: string) {
    return this.client.api.post("/auth/account/reverify", { email, captcha });
  }

  /**
   * Send password reset email
   * @param email Email
   * @param captcha Captcha if enabled
   */
  resetPassword(email: string, captcha?: string) {
    return this.client.api.post("/auth/account/reset_password", {
      email,
      captcha,
    });
  }

  /**
   * Verify an account given the code
   * @param code Verification code
   */
  verify(code: string) {
    return this.client.api.post(`/auth/account/verify/${code}`);
  }

  /**
   * Confirm account deletion
   * @param token Deletion token
   */
  confirmDelete(token: string) {
    return this.client.api.put("/auth/account/delete", { token });
  }

  /**
   * Confirm password reset
   * @param token Token
   * @param newPassword New password
   * @param removeSessions Whether to remove existing sessions
   */
  confirmPasswordReset(
    token: string,
    newPassword: string,
    removeSessions: boolean
  ) {
    return this.client.api.patch("/auth/account/reset_password", {
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
  changePassword(newPassword: string, currentPassword: string) {
    return this.client.api.patch("/auth/account/change/password", {
      password: newPassword,
      current_password: currentPassword,
    });
  }

  /**
   * Change account email
   * @param newEmail New email
   * @param currentPassword Current password
   */
  changeEmail(newEmail: string, currentPassword: string) {
    return this.client.api.patch("/auth/account/change/email", {
      email: newEmail,
      current_password: currentPassword,
    });
  }

  /**
   * Fetch settings
   * @param keys Keys
   * @returns Settings
   */
  fetchSettings(keys: string[]) {
    return this.client.api.post("/sync/settings/fetch", { keys }) as Promise<
      Record<string, [number, string]>
    >;
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  /**
   * Set settings
   * @param settings Settings
   * @param timestamp Timestamp
   */
  setSettings(settings: Record<string, any>, timestamp = +new Date()) {
    return this.client.api.post("/sync/settings/set", {
      ...settings,
      timestamp,
    });
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  /**
   * Create a new Web Push subscription
   * @param subscription Subscription
   */
  webPushSubscribe(subscription: WebPushSubscription) {
    return this.client.api.post("/push/subscribe", subscription);
  }

  /**
   * Remove existing Web Push subscription
   */
  webPushUnsubscribe() {
    return this.client.api.post("/push/unsubscribe");
  }
}
