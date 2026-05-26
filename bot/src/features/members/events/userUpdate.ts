import { Events } from "discord.js";
import { env } from "../../../lib/env.js";
import type { BotEvent } from "../../../lib/types.js";
import { upsertMember } from "../service.js";

// User-Updates feuern auf globale Profil-Änderungen (Username, Avatar,
// Discriminator). Wir interessieren uns nur für User die Mitglied
// unserer Guild sind — sonst syncen wir Random-User aus anderen Servern.
const event: BotEvent<Events.UserUpdate> = {
  name: Events.UserUpdate,
  async execute(_oldUser, newUser) {
    const guild = newUser.client.guilds.cache.get(env.DISCORD_GUILD_ID);
    if (!guild) return;
    const member = guild.members.cache.get(newUser.id);
    if (!member) return;
    await upsertMember(member);
  },
};

export default event;
