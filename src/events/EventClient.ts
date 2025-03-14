import EventEmitter from "eventemitter3";
import { Error } from "revolt-api";

import { ProtocolV1 } from "./v1.js";

/**
 * Available protocols to connect with
 */
export type AvailableProtocols = 1;

/**
 * Protocol mapping
 */
type Protocols = {
  1: ProtocolV1;
};

/**
 * Select a protocol by its key
 */
export type EventProtocol<T extends AvailableProtocols> = Protocols[T];

/**
 * All possible event client states.
 */
export enum ConnectionState {
  Idle,
  Connecting,
  Connected,
  Disconnected,
}

/**
 * Event client options object
 */
export interface EventClientOptions {
  /**
   * Whether to log events
   * @default false
   */
  debug: boolean;

  /**
   * Time in seconds between Ping packets sent to the server
   * @default 30
   */
  heartbeatInterval: number;

  /**
   * Maximum time in seconds between Ping and corresponding Pong
   * @default 10
   */
  pongTimeout: number;

  /**
   * Maximum time in seconds between init and first message
   * @default 10
   */
  connectTimeout: number;
}

/**
 * Events provided by the client.
 */
type Events<T extends AvailableProtocols, P extends EventProtocol<T>> = {
  error: (error: Error) => void;
  event: (event: P["server"]) => void;
  state: (state: ConnectionState) => void;
};

/**
 * Simple wrapper around the Revolt websocket service.
 */
export class EventClient<T extends AvailableProtocols> extends EventEmitter<
  Events<T, EventProtocol<T>>
> {
  readonly options: EventClientOptions;

  #protocolVersion: T;
  #transportFormat: "json" | "msgpack";

  ping = -1;
  state = ConnectionState.Idle;

  #socket: WebSocket | undefined;
  #heartbeatIntervalReference: number | undefined;
  #pongTimeoutReference: number | undefined;
  #connectTimeoutReference: number | undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  #lastError?: { type: "socket"; data: any } | { type: "revolt"; data: Error };

  /**
   * Create a new event client.
   * @param protocolVersion Target protocol version
   * @param transportFormat Communication format
   * @param options Configuration options
   */
  constructor(
    protocolVersion: T,
    transportFormat: "json" = "json",
    options?: Partial<EventClientOptions>,
  ) {
    super();

    this.#protocolVersion = protocolVersion;
    this.#transportFormat = transportFormat;

    this.options = {
      heartbeatInterval: 30,
      pongTimeout: 10,
      connectTimeout: 10,
      debug: false,
      ...options,
    };

    this.disconnect = this.disconnect.bind(this);
  }

  /**
   * Set the current state
   * @param state state
   */
  private setState(state: ConnectionState): void {
    this.state = state;
    this.emit("state", state);
  }

  /**
   * Connect to the websocket service.
   * @param uri WebSocket URI
   * @param token Authentication token
   */
  connect(uri: string, token: string): void {
    this.disconnect();
    this.#lastError = undefined;
    this.setState(ConnectionState.Connecting);

    this.#connectTimeoutReference = setTimeout(
      () => this.disconnect(),
      this.options.pongTimeout * 1e3,
    ) as never;

    this.#socket = new WebSocket(
      `${uri}?version=${this.#protocolVersion}&format=${this.#transportFormat}&token=${token}`,
    );

    this.#socket.onopen = () => {
      this.#heartbeatIntervalReference = setInterval(() => {
        this.send({ type: "Ping", data: +new Date() });
        this.#pongTimeoutReference = setTimeout(
          () => this.disconnect(),
          this.options.pongTimeout * 1e3,
        ) as never;
      }, this.options.heartbeatInterval * 1e3) as never;
    };

    this.#socket.onerror = (error) => {
      this.#lastError = { type: "socket", data: error };
      this.emit("error", error as never);
    };

    this.#socket.onmessage = (event) => {
      clearInterval(this.#connectTimeoutReference);

      if (this.#transportFormat === "json") {
        if (typeof event.data === "string") {
          this.handle(JSON.parse(event.data));
        }
      }
    };

    let closed = false;
    this.#socket.onclose = () => {
      if (closed) return;
      closed = true;
      this.#socket = undefined;
      this.setState(ConnectionState.Disconnected);
      this.disconnect();
    };
  }

  /**
   * Disconnect the websocket client.
   */
  disconnect(): void {
    if (!this.#socket) return;
    clearInterval(this.#heartbeatIntervalReference);
    clearInterval(this.#connectTimeoutReference);
    clearInterval(this.#pongTimeoutReference);
    const socket = this.#socket;
    this.#socket = undefined;
    socket.close();
  }

  /**
   * Send an event to the server.
   * @param event Event
   */
  send(event: EventProtocol<T>["client"]): void {
    if (this.options.debug) console.debug("[C->S]", event);
    if (!this.#socket) throw "Socket closed, trying to send.";
    this.#socket.send(JSON.stringify(event));
  }

  /**
   * Handle events intended for client before passing them along.
   * @param event Event
   */
  handle(event: EventProtocol<T>["server"]): void {
    if (this.options.debug) console.debug("[S->C]", event);
    switch (event.type) {
      case "Ping":
        this.send({
          type: "Pong",
          data: event.data,
        });
        return;
      case "Pong":
        clearTimeout(this.#pongTimeoutReference);
        this.ping = +new Date() - event.data;
        if (this.options.debug) console.debug(`[ping] ${this.ping}ms`);
        return;
      case "Error":
        this.#lastError = {
          type: "revolt",
          data: event.data,
        };
        this.emit("error", event as never);
        this.disconnect();
        return;
    }

    switch (this.state) {
      case ConnectionState.Connecting:
        if (event.type === "Authenticated") {
          // no-op
        } else if (event.type === "Ready") {
          this.emit("event", event);
          this.setState(ConnectionState.Connected);
        } else {
          throw `Unreachable code. Received ${event.type} in Connecting state.`;
        }
        break;
      case ConnectionState.Connected:
        if (event.type === "Authenticated" || event.type === "Ready") {
          throw `Unreachable code. Received ${event.type} in Connected state.`;
        } else {
          this.emit("event", event);
        }
        break;
      default:
        throw `Unreachable code. Received ${event.type} in state ${this.state}.`;
    }
  }

  /**
   * Last error encountered by events client
   */
  get lastError():
    | { type: "socket"; data: unknown }
    | { type: "revolt"; data: Error }
    | undefined {
    return this.#lastError;
  }
}
