import { createClient, type Client } from "@libsql/client";

export type Database = {
  client: Client;
  path: string;
  close: () => void;
};

export function createDatabase(databasePath: string): Database {
  const client = createClient({
    intMode: "number",
    url: `file:${databasePath}`,
  });

  return {
    client,
    close: () => client.close(),
    path: databasePath,
  };
}
