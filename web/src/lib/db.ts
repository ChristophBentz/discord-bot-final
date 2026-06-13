// Web-seitiger DB-Zugang. Re-exportiert alles aus @repo/db, ersetzt aber
// getConfig durch eine request-memoisierte Variante: React's cache() dedupliziert
// die Config-Query innerhalb eines Render-Passes, sodass layout.tsx + page.tsx
// sie nicht mehrfach pro Request ausführen.
//
// (cache() lebt in React und darf nicht ins geteilte @repo/db-Paket, das auch
//  der Bot ohne React nutzt — deshalb dieser dünne Wrapper nur fürs Web.)
import { cache } from "react";
import { getConfig as getConfigUncached } from "@repo/db";

export * from "@repo/db";

export const getConfig = cache(getConfigUncached);
