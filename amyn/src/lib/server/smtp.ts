import { randomBytes } from "node:crypto";
import net from "node:net";
import tls from "node:tls";

/**
 * Client SMTP minimal, sans dépendance.
 *
 * Il sert à une seule chose : déposer un message dans la messagerie
 * existante d'AMYN (OVHcloud, boîte contact@amyn.agency) en s'authentifiant
 * comme cette boîte. Aucun service d'envoi tiers, aucun changement DNS :
 * le domaine publie déjà SPF (include:mx.ovh.com) et une signature DKIM OVH.
 *
 * Protocole couvert : TLS implicite (port 465) ou STARTTLS (port 587),
 * EHLO, AUTH PLAIN puis LOGIN, MAIL FROM, RCPT TO, DATA, QUIT.
 */

export type SmtpConfig = {
  host: string;
  port: number;
  /** `true` : TLS dès la connexion (465). `false` : STARTTLS (587). */
  secure: boolean;
  user: string;
  pass: string;
  /** Réservé aux tests : connexion en clair, sans STARTTLS. */
  insecureForTests?: boolean;
  timeoutMs?: number;
};

export type SmtpMessage = {
  from: { name: string; address: string };
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
  html: string;
};

type Reply = { code: number; lines: string[] };

/** Lit les réponses SMTP ligne par ligne (réponses multi-lignes incluses). */
function createReader(socket: net.Socket | tls.TLSSocket) {
  let buffer = "";
  let current: string[] = [];
  const ready: Reply[] = [];
  let waiting: ((r: Reply) => void) | null = null;
  let failure: Error | null = null;
  let failWaiting: ((e: Error) => void) | null = null;

  const onData = (chunk: Buffer) => {
    buffer += chunk.toString("utf8");
    let index;
    while ((index = buffer.indexOf("\r\n")) !== -1) {
      const line = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      current.push(line.slice(4));
      /* « 250-… » : la réponse continue ; « 250 … » : elle est complète. */
      if (line.length < 4 || line[3] !== "-") {
        const reply = { code: Number(line.slice(0, 3)), lines: current };
        current = [];
        if (waiting) {
          const resolve = waiting;
          waiting = null;
          failWaiting = null;
          resolve(reply);
        } else ready.push(reply);
      }
    }
  };
  const onError = (error: Error) => {
    failure = error;
    if (failWaiting) failWaiting(error);
  };

  socket.on("data", onData);
  socket.on("error", onError);
  socket.on("close", () => onError(new Error("Connexion SMTP fermée.")));

  return {
    next(): Promise<Reply> {
      if (ready.length) return Promise.resolve(ready.shift()!);
      if (failure) return Promise.reject(failure);
      return new Promise((resolve, reject) => {
        waiting = resolve;
        failWaiting = reject;
      });
    },
    detach() {
      socket.off("data", onData);
      socket.off("error", onError);
      socket.removeAllListeners("close");
    },
  };
}

const b64 = (value: string) => Buffer.from(value, "utf8").toString("base64");

/** En-tête encodé (RFC 2047) : accents et tirets typographiques compris. */
const encodeHeader = (value: string) =>
  /^[\x20-\x7e]*$/.test(value) ? value : `=?UTF-8?B?${b64(value)}?=`;

const wrap76 = (value: string) => value.replace(/.{1,76}/g, "$&\r\n").trimEnd();

const cleanHeaderValue = (value: string) => value.replace(/[\r\n]+/g, " ").trim();

/** Construit le message MIME (texte + HTML), prêt pour la commande DATA. */
export function buildMime(message: SmtpMessage, date = new Date()) {
  const boundary = `amyn-${randomBytes(12).toString("hex")}`;
  const domain = message.from.address.split("@")[1] ?? "localhost";
  const headers = [
    `From: ${encodeHeader(cleanHeaderValue(message.from.name))} <${message.from.address}>`,
    `To: <${message.to}>`,
    ...(message.replyTo ? [`Reply-To: <${cleanHeaderValue(message.replyTo)}>`] : []),
    `Subject: ${encodeHeader(cleanHeaderValue(message.subject))}`,
    `Date: ${date.toUTCString().replace("GMT", "+0000")}`,
    `Message-ID: <${randomBytes(16).toString("hex")}@${domain}>`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];
  const part = (type: string, body: string) =>
    [
      `--${boundary}`,
      `Content-Type: ${type}; charset=utf-8`,
      "Content-Transfer-Encoding: base64",
      "",
      wrap76(b64(body)),
    ].join("\r\n");

  return [
    headers.join("\r\n"),
    "",
    part("text/plain", message.text),
    part("text/html", message.html),
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

function connect(config: SmtpConfig): Promise<net.Socket | tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    const options = { host: config.host, port: config.port };
    const socket =
      config.secure && !config.insecureForTests
        ? tls.connect({ ...options, servername: config.host }, () => resolve(socket))
        : net.connect(options, () => resolve(socket));
    socket.once("error", reject);
  });
}

function upgrade(socket: net.Socket, host: string): Promise<tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    const secured = tls.connect({ socket, servername: host }, () => resolve(secured));
    secured.once("error", reject);
  });
}

/**
 * Envoie un message. Lève une erreur explicite (sans jamais y inclure le mot
 * de passe) si le serveur refuse une étape.
 */
export async function sendSmtp(config: SmtpConfig, message: SmtpMessage): Promise<void> {
  let socket = await connect(config);
  socket.setTimeout(config.timeoutMs ?? 12_000, () =>
    socket.destroy(new Error("Délai SMTP dépassé.")),
  );
  let reader = createReader(socket);

  const write = (line: string) => socket.write(`${line}\r\n`);
  const expect = async (step: string, ...codes: number[]) => {
    const reply = await reader.next();
    if (!codes.includes(reply.code)) {
      throw new Error(`SMTP ${step} refusé (${reply.code} ${reply.lines.join(" ").slice(0, 160)})`);
    }
    return reply;
  };
  const command = async (line: string, step: string, ...codes: number[]) => {
    write(line);
    return expect(step, ...codes);
  };

  try {
    await expect("accueil", 220);
    let ehlo = await command("EHLO amyn.agency", "EHLO", 250);

    if (!config.secure && !config.insecureForTests) {
      await command("STARTTLS", "STARTTLS", 220);
      reader.detach();
      socket = await upgrade(socket as net.Socket, config.host);
      reader = createReader(socket);
      ehlo = await command("EHLO amyn.agency", "EHLO", 250);
    }

    const auth = ehlo.lines.find((l) => /^AUTH\b/i.test(l)) ?? "AUTH PLAIN LOGIN";
    if (/\bPLAIN\b/i.test(auth)) {
      await command(`AUTH PLAIN ${b64(`\0${config.user}\0${config.pass}`)}`, "AUTH", 235);
    } else {
      await command("AUTH LOGIN", "AUTH", 334);
      await command(b64(config.user), "AUTH", 334);
      await command(b64(config.pass), "AUTH", 235);
    }

    await command(`MAIL FROM:<${message.from.address}>`, "MAIL FROM", 250);
    await command(`RCPT TO:<${message.to}>`, "RCPT TO", 250, 251);
    await command("DATA", "DATA", 354);

    /* Une ligne qui commence par un point est doublée (RFC 5321, §4.5.2). */
    const body = buildMime(message).replace(/^\./gm, "..");
    await command(`${body}\r\n.`, "DATA", 250);
    write("QUIT");
  } finally {
    socket.end();
  }
}
