// Registriert alle Slash-Commands bei Discord (guild-scoped — Updates sind sofort sichtbar).
// Aufruf:  npm run register  (im bot/-Ordner)

import { syncAllCommands } from "../features/customCommands/register.js";
import { logger } from "../lib/logger.js";

const result = await syncAllCommands();
logger.info({ ...result }, "Registrierung fertig.");
