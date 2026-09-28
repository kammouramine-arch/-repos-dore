import assert from "node:assert/strict";
import net from "node:net";
import { test } from "node:test";
import { buildMime, sendSmtp } from "../src/lib/server/smtp.ts";

/** Faux serveur SMTP : répond comme OVH et enregistre la conversation. */
function fakeServer({ auth = "AUTH LOGIN PLAIN", rejectAuth = false } = {}) {
  const log: string[] = [];
  let data = "";
  const server = net.createServer((socket) => {
    let inData = false;
    let buffer = "";
    socket.write("220 fake.ovh ESMTP\r\n");
    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      let i;
      while ((i = buffer.indexOf("\r\n")) !== -1) {
        const line = buffer.slice(0, i);
        buffer = buffer.slice(i + 2);
        if (inData) {
          if (line === ".") {
            inData = false;
            socket.write("250 2.0.0 Ok: queued\r\n");
          } else data += `${line}\n`;
          continue;
        }
        log.push(line);
        if (line.startsWith("EHLO")) socket.write(`250-fake.ovh\r\n250-${auth}\r\n250 8BITMIME\r\n`);
        else if (line.startsWith("AUTH PLAIN")) socket.write(rejectAuth ? "535 5.7.8 Bad credentials\r\n" : "235 2.7.0 Ok\r\n");
        else if (line === "AUTH LOGIN") socket.write("334 VXNlcm5hbWU6\r\n");
        else if (log.at(-2) === "AUTH LOGIN") socket.write("334 UGFzc3dvcmQ6\r\n");
        else if (log.at(-3) === "AUTH LOGIN") socket.write(rejectAuth ? "535 5.7.8 Bad credentials\r\n" : "235 2.7.0 Ok\r\n");
        else if (line.startsWith("MAIL FROM") || line.startsWith("RCPT TO")) socket.write("250 Ok\r\n");
        else if (line === "DATA") {
          inData = true;
          socket.write("354 End data with <CR><LF>.<CR><LF>\r\n");
        } else if (line === "QUIT") socket.end("221 Bye\r\n");
      }
    });
  });
  return new Promise<{ port: number; log: string[]; data: () => string; close: () => void }>(
    (resolve) =>
      server.listen(0, "127.0.0.1", () =>
        resolve({
          port: (server.address() as net.AddressInfo).port,
          log,
          data: () => data,
          close: () => server.close(),
        }),
      ),
  );
}

const message = {
  from: { name: "Site AMYN", address: "contact@amyn.agency" },
  to: "contact@amyn.agency",
  replyTo: "camille@atelier-exemple.fr",
  subject: "Demande de projet — Atelier Été",
  text: "Bonjour,\n.ligne qui commence par un point\nÀ bientôt",
  html: "<p>Bonjour</p>",
};

const config = (port: number) => ({
  host: "127.0.0.1",
  port,
  secure: true,
  insecureForTests: true,
  user: "contact@amyn.agency",
  pass: "secret-de-test",
});

test("SMTP : authentification PLAIN, expéditeur et destinataire corrects", async () => {
  const server = await fakeServer();
  try {
    await sendSmtp(config(server.port), message);
    assert.ok(server.log.some((l) => l.startsWith("AUTH PLAIN ")));
    const plain = Buffer.from(server.log.find((l) => l.startsWith("AUTH PLAIN "))!.slice(11), "base64").toString();
    assert.equal(plain, "\0contact@amyn.agency\0secret-de-test");
    assert.ok(server.log.includes("MAIL FROM:<contact@amyn.agency>"));
    assert.ok(server.log.includes("RCPT TO:<contact@amyn.agency>"));
    assert.match(server.data(), /Reply-To: <camille@atelier-exemple\.fr>/);
    assert.match(server.data(), /Subject: =\?UTF-8\?B\?/);
  } finally {
    server.close();
  }
});

test("SMTP : repli sur AUTH LOGIN quand PLAIN n'est pas proposé", async () => {
  const server = await fakeServer({ auth: "AUTH LOGIN" });
  try {
    await sendSmtp(config(server.port), message);
    assert.ok(server.log.includes("AUTH LOGIN"));
  } finally {
    server.close();
  }
});

test("SMTP : un refus d'authentification lève une erreur sans le mot de passe", async () => {
  const server = await fakeServer({ rejectAuth: true });
  try {
    await assert.rejects(sendSmtp(config(server.port), message), (error: Error) => {
      assert.match(error.message, /AUTH refusé \(535/);
      assert.ok(!error.message.includes("secret-de-test"));
      return true;
    });
  } finally {
    server.close();
  }
});

test("MIME : sujet et corps encodés, pas d'injection d'en-tête", () => {
  const mime = buildMime({ ...message, subject: "Test\r\nBcc: pirate@exemple.com" });
  assert.ok(!/^Bcc:/m.test(mime));
  const textPart = mime.split("Content-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n")[1].split("\r\n--")[0];
  assert.equal(Buffer.from(textPart.replace(/\r\n/g, ""), "base64").toString(), message.text);
});
