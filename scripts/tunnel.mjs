// Levanta un Quick Tunnel de Cloudflare contra el dev server (:3002) y deja
// la URL pública impresa CLARA en consola, sin tener que buscarla en el log.
//
//   npm run tunnel
//
import { spawn } from "node:child_process";
import { bin } from "cloudflared";

const PORT = process.env.PORT ?? "3002";
const TARGET = `http://localhost:${PORT}`;
const URL_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;

const child = spawn(bin, ["tunnel", "--url", TARGET], { stdio: ["ignore", "pipe", "pipe"] });

let announced = false;

function banner(url) {
  const line = "─".repeat(url.length + 18);
  process.stdout.write(
    `\n\x1b[32m${line}\n` +
      `  Tunnel Cloudflare activo\n` +
      `  ${TARGET}  →  \x1b[1m${url}\x1b[0m\x1b[32m\n` +
      `${line}\x1b[0m\n\n`,
  );
}

function scan(chunk) {
  const text = chunk.toString();
  process.stdout.write(text); // seguimos mostrando el log crudo de cloudflared
  if (announced) return;
  const m = text.match(URL_RE);
  if (m) {
    announced = true;
    banner(m[0]);
  }
}

child.stdout.on("data", scan);
child.stderr.on("data", scan); // cloudflared escribe casi todo por stderr

const stop = () => child.kill("SIGINT");
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
child.on("exit", (code) => process.exit(code ?? 0));
