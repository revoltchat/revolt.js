import { config } from "dotenv";

import { createEventClient } from "./events/client";

config();

const ws = createEventClient(1);

ws.on("event", (event) =>
  console.info("[EVENT]", JSON.stringify(event).substring(0, 32))
);
ws.on("state", (state) => console.info("STATE =", state));
ws.on("error", (error) => console.error("ERROR =", error));

ws.connect("wss://ws.revolt.chat", process.env.TOKEN!);
