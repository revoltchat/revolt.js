import { SessionInfo as ApiSession } from "revolt-api";

import { Hydrate } from "./index.js";

export type HydratedSession = {
  id: string;
  name: string;
};

export const sessionHydration: Hydrate<ApiSession, HydratedSession> = {
  keyMapping: {
    _id: "id",
  },
  functions: {
    id: (server) => server._id,
    name: (server) => server.name,
  },
  initialHydration: () => ({}),
};
