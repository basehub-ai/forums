import { Client } from "typesense";

if (!process.env.TYPESENSE_API_KEY) {
  throw new Error("TYPESENSE_API_KEY is not set");
}

if (!process.env.TYPESENSE_HOST) {
  throw new Error("TYPESENSE_HOST is not set");
}

export const typesense = new Client({
  apiKey: process.env.TYPESENSE_API_KEY,
  nodes: [
    // @ts-expect-error -- missing port, but we need to omit it else it breaks
    { host: process.env.TYPESENSE_HOST, protocol: "https" },
  ],
});
