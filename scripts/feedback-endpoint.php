<?php
/**
 * Feedback-Empfänger für das Bot-Dashboard.
 *
 * Auf den Webspace hochladen (z.B. https://moser-dev.com/bot-feedback.php) —
 * alle Bot-Installationen schicken ihr Feedback hierher, das Skript mailt es
 * per PHP mail() weiter. So braucht keine Installation SMTP-Zugangsdaten.
 *
 * Anpassen: $RECIPIENT unten.
 */

$RECIPIENT = "info@moser-dev.com";
$MAX_LENGTH = 1500;
$RATE_LIMIT_SECONDS = 60; // pro IP höchstens 1 Feedback pro Minute

header("Content-Type: application/json; charset=utf-8");

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["ok" => false, "error" => "Nur POST"]);
    exit;
}

$raw = file_get_contents("php://input");
$data = json_decode($raw, true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(["ok" => false, "error" => "Ungültiges JSON"]);
    exit;
}

// Honeypot: echte Clients lassen das Feld leer — Bots füllen es aus.
if (!empty($data["website"])) {
    echo json_encode(["ok" => true]); // Bots nicht schlau machen
    exit;
}

$text = trim((string)($data["text"] ?? ""));
if ($text === "" || mb_strlen($text) > $MAX_LENGTH) {
    http_response_code(400);
    echo json_encode(["ok" => false, "error" => "Text fehlt oder zu lang"]);
    exit;
}

// Simple IP-Rate-Limit über Tempdatei
$ip = $_SERVER["REMOTE_ADDR"] ?? "unknown";
$lockFile = sys_get_temp_dir() . "/bot-feedback-" . md5($ip);
if (file_exists($lockFile) && time() - filemtime($lockFile) < $RATE_LIMIT_SECONDS) {
    http_response_code(429);
    echo json_encode(["ok" => false, "error" => "Zu viele Anfragen — kurz warten"]);
    exit;
}
touch($lockFile);

$sender = mb_substr(trim((string)($data["senderName"] ?? "Unbekannt")), 0, 100);
$discordId = preg_replace("/[^0-9]/", "", (string)($data["discordId"] ?? ""));
$guild = mb_substr(trim((string)($data["guildName"] ?? "")), 0, 100);

$body = "Von: $sender" . ($discordId ? " (Discord-ID: $discordId)" : "") . "\n"
      . ($guild ? "Server: $guild\n" : "")
      . "IP: $ip\n\n"
      . $text;

$ok = mail(
    $RECIPIENT,
    "=?UTF-8?B?" . base64_encode("Feedback zum Discord-Bot — von $sender") . "?=",
    $body,
    "Content-Type: text/plain; charset=utf-8\r\nFrom: $RECIPIENT"
);

if (!$ok) {
    http_response_code(500);
    echo json_encode(["ok" => false, "error" => "Mail-Versand fehlgeschlagen"]);
    exit;
}

echo json_encode(["ok" => true]);
