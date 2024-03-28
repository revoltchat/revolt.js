import type { ProtocolV1 } from "./v1.js";

export { handleEvent as handleEventV1 } from "./v1.js";

export * from "./EventClient.js";

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
