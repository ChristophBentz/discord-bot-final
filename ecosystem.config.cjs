// pm2-Konfiguration: Bot + Web in einer Datei.
// Start: pm2 start ecosystem.config.cjs
// Logs:  pm2 logs
module.exports = {
  apps: [
    {
      name: "discord-bot",
      cwd: __dirname,
      script: "npm",
      args: "--workspace bot run start",
      autorestart: true,
      max_memory_restart: "500M",
    },
    {
      name: "discord-web",
      cwd: __dirname + "/web",
      script: "npm",
      args: "run start",
      autorestart: true,
      max_memory_restart: "500M",
    },
  ],
};
