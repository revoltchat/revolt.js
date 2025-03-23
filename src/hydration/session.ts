import type { SessionInfo } from "revolt-api";

import type { Hydrate } from "./index.ts";

export type HydratedSession = {
  id: string;
  name: string;
};

export const sessionHydration: Hydrate<SessionInfo, HydratedSession> = {
  keyMapping: {
    _id: "id",
  },
  functions: {
    id: (server) => server._id,
    name: (server) => server.name,
  },
  initialHydration: () => ({}),
};
