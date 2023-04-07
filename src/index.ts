import { config } from "dotenv";

import { Client } from "./Client";

config();

const client = new Client();
client.connect();
