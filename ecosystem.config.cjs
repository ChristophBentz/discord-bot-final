// pm2-Konfiguration: Bot + Web in einer Datei.
// Start: pm2 start ecosystem.config.cjs
// Logs:  pm2 logs
// Gemeinsame Restart-Härtung: Crasht ein Prozess (z.B. weil nach einem
// abgebrochenen Build dist/index.js fehlt), wartet PM2 exponentiell länger
// statt hunderte Male pro Minute neu zu starten — sonst sättigt die enge
// Crash-Schleife die CPU und legt auch das Dashboard lahm.
const restartHardening = {
  autorestart: true,
  exp_backoff_restart_delay: 250, // 250ms → 500 → 1s … bis ~15s zwischen Versuchen
  min_uptime: "10s", // erst nach 10s Laufzeit gilt der Prozess als „stabil"
  max_restarts: 15, // danach: stoppen statt endlos zu loopen (manueller Restart nötig)
  max_memory_restart: "600M",
};

module.exports = {
  apps: [
    {
      name: "discord-bot",
      cwd: __dirname,
      script: "npm",
      args: "--workspace bot run start",
      ...restartHardening,
    },
    {
      name: "discord-web",
      cwd: __dirname + "/web",
      script: "npm",
      args: "run start",
      ...restartHardening,
    },
  ],
};
