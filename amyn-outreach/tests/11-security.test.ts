// SECURITE — secrets, verrous d'envoi, donnees DEMO, perimetre du projet.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

async function sourceFiles(): Promise<string[]> {
  const skip = new Set(["node_modules", ".next", ".git", "prisma"]);
  const out: string[] = [];

  async function walk(dir: string) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (/\.(ts|tsx|mjs|json)$/.test(entry.name)) out.push(full);
    }
  }

  await walk(ROOT);
  return out;
}

describe("Secrets", () => {
  test(".env est ignoré par git", async () => {
    const gitignore = await readFile(join(ROOT, ".gitignore"), "utf8");
    assert.ok(/^\.env$/m.test(gitignore), ".env n'est pas dans .gitignore");
  });

  test(".env.example ne contient aucune valeur secrète", async () => {
    const example = await readFile(join(ROOT, ".env.example"), "utf8");
    for (const key of ["SMTP_PASSWORD", "ANTHROPIC_API_KEY", "GOOGLE_PLACES_API_KEY"]) {
      const line = example.split("\n").find((l) => l.trim().startsWith(`${key}=`));
      if (line) {
        const value = line.split("=").slice(1).join("=").trim();
        assert.equal(value, "", `${key} a une valeur dans .env.example`);
      }
    }
  });

  test("aucun secret n'est écrit en dur dans le code", async () => {
    const forbidden: Array<{ re: RegExp; label: string }> = [
      { re: /sk-ant-[A-Za-z0-9_-]{10,}/, label: "clé Anthropic" },
      { re: /AIza[A-Za-z0-9_-]{20,}/, label: "clé Google" },
      { re: /SMTP_PASSWORD\s*=\s*["'][^"'\s]+["']/, label: "mot de passe SMTP en dur" },
      { re: /password\s*:\s*["'](?!.*process\.env)[^"'\s]{6,}["']/i, label: "mot de passe littéral" },
    ];

    for (const file of await sourceFiles()) {
      const content = await readFile(file, "utf8");
      for (const { re, label } of forbidden) {
        assert.ok(!re.test(content), `${label} détecté dans ${file.replace(ROOT, ".")}`);
      }
    }
  });

  test("le transport SMTP lit son mot de passe depuis l'environnement", async () => {
    const source = await readFile(join(ROOT, "lib/mailer/smtp-mailer.ts"), "utf8");
    assert.ok(source.includes("process.env.SMTP_PASSWORD"), "le mot de passe n'est pas lu depuis .env");
  });
});

describe("Verrou d'envoi", () => {
  test("DRY_RUN vaut true par défaut, même sans variable d'environnement", async () => {
    const source = await readFile(join(ROOT, "lib/config.ts"), "utf8");
    assert.match(source, /dryRun:\s*bool\(process\.env\.DRY_RUN,\s*true\)/);
  });

  test("le pipeline d'envoi passe toujours par les contrôles de conformité", async () => {
    const source = await readFile(join(ROOT, "lib/campaign/send.ts"), "utf8");
    assert.ok(source.includes("runComplianceChecks"), "l'envoi n'appelle pas les contrôles");
    const sendIndex = source.indexOf("mailer.send(");
    const checkIndex = source.indexOf("runComplianceChecks(");
    assert.ok(checkIndex >= 0 && checkIndex < sendIndex, "les contrôles ne précèdent pas l'envoi");
  });

  test("aucun code n'envoie un email en contournant le pipeline", async () => {
    for (const file of await sourceFiles()) {
      if (file.includes("lib/mailer")) continue;
      const content = await readFile(file, "utf8");
      assert.ok(
        !/createTransport\s*\(/.test(content),
        `transport SMTP créé hors de lib/mailer : ${file.replace(ROOT, ".")}`,
      );
    }
  });
});

describe("Données de démonstration", () => {
  test("les données DEMO utilisent des domaines .invalid", async () => {
    const seed = await readFile(join(ROOT, "prisma/seed.ts"), "utf8");
    const emails = seed.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi) ?? [];
    for (const email of emails) {
      if (email.endsWith("amyn.agency")) continue; // expéditeur AMYN
      assert.ok(email.endsWith(".invalid"), `email DEMO non neutralisé : ${email}`);
    }
  });

  test("le garde-fou DEMO est le premier contrôle de conformité", async () => {
    const source = await readFile(join(ROOT, "lib/campaign/compliance.ts"), "utf8");
    const demo = source.indexOf('name: "DEMO_GUARD"');
    const others = source.indexOf('name: "CHECK_EMAIL_PRESENT"');
    assert.ok(demo >= 0 && demo < others, "DEMO_GUARD n'est pas prioritaire");
  });

  test("le seed adosse une preuve à chaque problème de démonstration", async () => {
    const seed = await readFile(join(ROOT, "prisma/seed.ts"), "utf8");
    assert.ok(seed.includes("attachProofs"), "le seed ne crée pas de vérification pour ses problèmes");
    assert.ok(
      seed.includes("auditCheckId: check.id"),
      "les problèmes de démonstration ne sont pas reliés à leur vérification",
    );
    assert.ok(
      seed.includes("auditCheckId: null"),
      "le seed ne vérifie pas qu'aucun problème ne reste sans preuve",
    );
  });

  test("le seed ne supprime que les données DEMO", async () => {
    const seed = await readFile(join(ROOT, "prisma/seed.ts"), "utf8");
    const deletions = seed.match(/deleteMany\([^)]*\)/gs) ?? [];
    for (const deletion of deletions) {
      assert.ok(
        deletion.includes("isDemo") || deletion.includes("prospect"),
        `suppression non restreinte aux données DEMO : ${deletion.slice(0, 80)}`,
      );
    }
  });
});

describe("Périmètre du projet", () => {
  test("aucun code ne référence le site vitrine AMYN.agency", async () => {
    for (const file of await sourceFiles()) {
      const content = await readFile(file, "utf8");
      // L'adresse email de contact est autorisee ; un chemin de fichier
      // vers le site vitrine ne l'est pas.
      assert.ok(
        !/(\.\.\/){2,}(reva|amyn\.agency|site|vitrine)/i.test(content),
        `référence hors du projet dans ${file.replace(ROOT, ".")}`,
      );
    }
  });

  test("tout le code du projet vit dans amyn-outreach/", async () => {
    const info = await stat(join(ROOT, "package.json"));
    assert.ok(info.isFile());
    const pkg = JSON.parse(await readFile(join(ROOT, "package.json"), "utf8"));
    assert.equal(pkg.name, "amyn-outreach");
  });
});

describe("Respect des sites audités", () => {
  test("le robot s'identifie avec un contact", async () => {
    const source = await readFile(join(ROOT, "lib/audit/http.ts"), "utf8");
    assert.match(source, /AmynOutreachBot/, "aucun user-agent identifiable");
    assert.match(source, /contact@amyn\.agency/, "le user-agent ne donne pas de contact");
  });

  test("robots.txt est lu et respecté", async () => {
    const http = await readFile(join(ROOT, "lib/audit/http.ts"), "utf8");
    const engine = await readFile(join(ROOT, "lib/audit/engine.ts"), "utf8");
    assert.ok(http.includes("fetchRobots"), "robots.txt n'est pas récupéré");
    assert.ok(engine.includes("BLOCKED_BY_ROBOTS"), "un refus robots.txt n'arrête pas l'audit");
  });

  test("des limites de volume et un délai de politesse sont définis", async () => {
    const { LIMITS } = await import("@/lib/audit/http");
    assert.ok(LIMITS.maxPages > 0 && LIMITS.maxPages <= 20, "limite de pages absente ou trop haute");
    assert.ok(LIMITS.maxBytes > 0, "limite d'octets absente");
    assert.ok(LIMITS.politenessDelayMs > 0, "aucun délai entre deux requêtes");
    assert.ok(LIMITS.timeoutMs > 0, "aucun délai maximum de requête");
  });
});
