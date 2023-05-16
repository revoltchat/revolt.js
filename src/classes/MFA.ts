import { SetStoreFunction, createStore } from "solid-js/store";

import {
  MFAMethod,
  MFAResponse,
  MultiFactorStatus,
  MFATicket as TicketType,
} from "revolt-api";

import { Client } from "..";

/**
 * Multi-Factor Authentication
 */
export class MFA {
  #client: Client;
  #store: [MultiFactorStatus, SetStoreFunction<MultiFactorStatus>];

  /**
   * Construct MFA helper
   * @param client Client
   * @param state State
   */
  constructor(client: Client, state: MultiFactorStatus) {
    this.#client = client;
    this.#store = createStore(state);
  }

  /**
   * Whether authenticator app is enabled
   */
  get authenticatorEnabled() {
    return this.#store[0].totp_mfa;
  }

  /**
   * Whether recovery codes are enabled
   */
  get recoveryEnabled() {
    return this.#store[0].recovery_active;
  }

  /**
   * Available MFA methods for generating tickets
   */
  get availableMethods(): MFAMethod[] {
    return this.authenticatorEnabled
      ? this.recoveryEnabled
        ? ["Totp", "Recovery"]
        : ["Totp"]
      : ["Password"];
  }

  /**
   * Create an MFA ticket
   * @param params
   * @returns Token
   */
  createTicket(params: MFAResponse) {
    return this.#client.api
      .put("/auth/mfa/ticket", params)
      .then((ticket) => new MFATicket(this.#client, ticket, this.#store[1]));
  }

  /**
   * Enable authenticator using token generated from secret found earlier
   * @param token Token
   */
  async enableAuthenticator(token: string) {
    await this.#client.api.put("/auth/mfa/totp", { totp_code: token });
    this.#store[1]("totp_mfa", true);
  }
}

/**
 * MFA Ticket
 */
export class MFATicket {
  #client: Client;
  #ticket: TicketType;
  #mutate: SetStoreFunction<MultiFactorStatus>;
  #used = false;

  /**
   * Construct MFA Ticket
   * @param client Client
   * @param ticket Ticket
   * @param mutate Mutate the store
   */
  constructor(
    client: Client,
    ticket: TicketType,
    mutate: SetStoreFunction<MultiFactorStatus>
  ) {
    this.#client = client;
    this.#ticket = ticket;
    this.#mutate = mutate;
  }

  /**
   * Token
   */
  get token() {
    return this.#ticket.token;
  }

  /**
   * Use the ticket
   */
  #consume() {
    if (this.#used) throw "Already used this ticket!";
    this.#used = true;
  }

  /**
   * Fetch recovery codes
   * @returns List of codes
   */
  fetchRecoveryCodes() {
    this.#consume();
    return this.#client.api.post("/auth/mfa/recovery", undefined, {
      headers: {
        "X-MFA-Ticket": this.token,
      },
    });
  }

  /**
   * Generate new set of recovery codes
   * @returns List of codes
   */
  async generateRecoveryCodes() {
    this.#consume();

    const codes = await this.#client.api.patch(
      "/auth/mfa/recovery",
      undefined,
      {
        headers: {
          "X-MFA-Ticket": this.token,
        },
      }
    );

    this.#mutate("recovery_active", true);
    return codes;
  }

  /**
   * Generate new authenticator secret
   * @returns Secret
   */
  generateAuthenticatorSecret() {
    this.#consume();
    return this.#client.api
      .post("/auth/mfa/totp", undefined, {
        headers: {
          "X-MFA-Ticket": this.token,
        },
      })
      .then((response) => response.secret);
  }

  /**
   * Disable authenticator
   */
  async disableAuthenticator() {
    this.#consume();

    await this.#client.api.delete("/auth/mfa/totp", undefined, {
      headers: {
        "X-MFA-Ticket": this.token,
      },
    });

    this.#mutate("totp_mfa", false);
  }

  /**
   * Disable account
   */
  disableAccount() {
    this.#consume();
    return this.#client.api.post("/auth/account/disable", undefined, {
      headers: {
        "X-MFA-Ticket": this.token,
      },
    });
  }

  /**
   * Delete account
   */
  deleteAccount() {
    this.#consume();
    return this.#client.api.post("/auth/account/delete", undefined, {
      headers: {
        "X-MFA-Ticket": this.token,
      },
    });
  }
}
