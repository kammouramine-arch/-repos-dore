import { PageHeader } from "@/components/PageHeader";
import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { mailerStatus } from "@/lib/mailer";
import { imapStatus } from "@/lib/imap/config";
import { sourceStatus } from "@/lib/research";
import { claudeAvailability } from "@/lib/email/claude";
import { autonomyMatrix } from "@/lib/agent/autonomy";
import { ALL_RULES } from "@/lib/audit/rules";
import { OFFERS } from "@/lib/constants";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const mail = mailerStatus();
  const imap = imapStatus();
  const dbPath = (process.env.DATABASE_URL ?? "non défini").replace(/^file:/, "prisma/");
  const sources = sourceStatus();
  const claude = claudeAvailability();
  const [matrix, counts] = await Promise.all([
    autonomyMatrix(),
    Promise.all([
      prisma.prospect.count(),
      prisma.prospect.count({ where: { isDemo: true } }),
      prisma.auditCheck.count(),
      prisma.issue.count(),
      prisma.contact.count(),
      prisma.emailDraft.count(),
      prisma.sendLog.count(),
      prisma.sendLog.count({ where: { status: "SENT" } }),
      prisma.suppression.count(),
      prisma.reply.count(),
      prisma.reply.count({ where: { source: "IMAP" } }),
      prisma.client.count(),
      prisma.activityLog.count(),
    ]),
  ]);

  const [
    prospects,
    demoProspects,
    checks,
    issues,
    contacts,
    drafts,
    sends,
    realSends,
    suppressions,
    replies,
    imapReplies,
    clients,
    logs,
  ] = counts;

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Configuration"
        title="Ce qui fonctionne, ce qu'il faut brancher"
        description="Cette page dit la vérité sur l'état du système. Une capacité qui dépend d'une clé absente est affichée comme indisponible — jamais comme fonctionnelle."
      />

      {/* --- ENVOI ------------------------------------------------------- */}
      <Block
        title="Envoi d'emails"
        subtitle="Le verrou principal. Tant que DRY_RUN vaut true, aucun email ne peut sortir."
      >
        <Line
          label="Mode"
          value={mail.dryRun ? "DRY RUN — envois simulés" : "ENVOI RÉEL ACTIF"}
          state={mail.dryRun ? "ok" : "warn"}
        />
        <Line label="Transport" value={mail.transport} state={mail.canDeliver ? "ok" : "todo"} />
        <Line label="Expéditeur" value={mail.from} />
        <Line
          label="SMTP"
          value={
            mail.smtpConfigured
              ? `configuré (${mail.smtpHost})`
              : `incomplet — manquant : ${mail.smtpMissing.join(", ")}`
          }
          state={mail.smtpConfigured ? "ok" : "todo"}
        />
        <Line
          label="Cadence"
          value={`${mail.dailyLimit} envois/jour maximum · ${mail.minDelaySeconds} s minimum entre deux envois`}
        />
        {!mail.smtpConfigured && (
          <Note>
            Pour activer l&apos;envoi réel depuis <code>contact@amyn.agency</code> (OVHcloud
            MX&nbsp;Plan / Zimbra), renseignez dans <code>.env</code> :{" "}
            <code>SMTP_HOST=ssl0.ovh.net</code>, <code>SMTP_PORT=465</code>,{" "}
            <code>SMTP_SECURE=true</code>, <code>SMTP_USER=contact@amyn.agency</code>,{" "}
            <code>SMTP_PASSWORD=…</code>, puis <code>MAIL_TRANSPORT=smtp</code>. Vérifiez ensuite
            la connexion sans rien envoyer avec <code>npm run amyn -- smtp-check</code> — et
            seulement si elle réussit, passez <code>DRY_RUN=false</code>. Le mot de passe
            n&apos;est jamais écrit dans le code ni versionné.
          </Note>
        )}
      </Block>

      {/* --- LECTURE DES REPONSES ---------------------------------------- */}
      <Block
        title="Lecture des réponses"
        subtitle="La boîte contact@amyn.agency est lue en lecture seule : aucun message n'est supprimé, déplacé, ni marqué comme lu."
      >
        <Line
          label="Connexion IMAP"
          value={
            imap.configured
              ? `configurée (${imap.host}:${imap.port}, ${imap.secure ? "SSL/TLS" : "STARTTLS"})`
              : `incomplète — manquant : ${imap.missing.join(", ")}`
          }
          state={imap.configured ? "ok" : "todo"}
        />
        <Line label="Boîte lue" value={imap.user ? `${imap.user} · dossier ${imap.folder}` : "—"} />
        <Line
          label="Mot de passe"
          value={
            imap.passwordPresent
              ? "présent dans .env — jamais affiché ni journalisé"
              : "absent de .env"
          }
          state={imap.passwordPresent ? "ok" : "todo"}
        />
        <Line
          label="Réponse automatique"
          value="Aucune. L'agent propose une action pour chaque réponse, il n'en exécute aucune."
          state="ok"
        />
        {!imap.configured && (
          <Note>
            Pour connecter la boîte (OVHcloud MX&nbsp;Plan / Zimbra), renseignez dans{" "}
            <code>.env</code> : <code>IMAP_HOST=ssl0.ovh.net</code>, <code>IMAP_PORT=993</code>,{" "}
            <code>IMAP_SECURE=true</code>, <code>IMAP_USER=contact@amyn.agency</code>,{" "}
            <code>IMAP_PASSWORD=…</code>. Vérifiez ensuite sans rien lire avec{" "}
            <code>npm run amyn -- imap-check</code>, puis lisez les réponses avec{" "}
            <code>npm run amyn -- sync-replies</code>.
          </Note>
        )}
      </Block>

      {/* --- SOURCES ----------------------------------------------------- */}
      <Block
        title="Sources de prospects"
        subtitle="La première source disponible est utilisée. Aucune entreprise n'est inventée : chaque prospect provient d'une source identifiée et horodatée."
      >
        {sources.map((s) => (
          <Line
            key={s.id}
            label={s.label}
            value={s.available ? s.note : `${s.note}${s.missing ? ` — manquant : ${s.missing}` : ""}`}
            state={s.available ? "ok" : "todo"}
          />
        ))}
        <Note>
          Aucune de ces sources ne fournit d&apos;adresse email. Les emails sont trouvés
          uniquement sur les pages que l&apos;entreprise publie elle-même (contact, mentions
          légales). Sans email fiable, le prospect reste bloqué : l&apos;agent ne devine jamais
          une adresse.
        </Note>
      </Block>

      {/* --- REDACTION --------------------------------------------------- */}
      <Block
        title="Rédaction des emails"
        subtitle="Deux moteurs, mêmes garde-fous : un email ne peut citer qu'un problème prouvé par une vérification."
      >
        <Line
          label="Claude"
          value={claude.available ? claude.note : `${claude.note}`}
          state={claude.available ? "ok" : "todo"}
        />
        <Line
          label="Moteur template"
          value="Disponible en permanence. Déterministe, sans appel réseau. Utilisé automatiquement si Claude échoue."
          state="ok"
        />
        <Line
          label="Vérification avant envoi"
          value="Chaque email est relu par un vérificateur : promesses interdites, chiffres non justifiés, problèmes non prouvés, lien de désinscription, identité AMYN."
          state="ok"
        />
      </Block>

      {/* --- AUTONOMIE --------------------------------------------------- */}
      <Block
        title="Niveaux d'autonomie"
        subtitle="Ce que l'agent fait seul, et ce qui vous est soumis. Modifiable en base (table Setting, clé autonomy.<ACTION>) sans redéploiement."
      >
        <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
          {matrix.map((row) => (
            <div
              key={row.action}
              className="flex items-center justify-between gap-3 border-b border-line/60 py-1.5"
            >
              <span className="min-w-0 truncate text-[12.5px] text-zinc-400">{row.action}</span>
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${
                  row.level === "AUTOMATIC"
                    ? "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20"
                    : "bg-gold-500/10 text-gold-300 ring-gold-500/25"
                }`}
              >
                {row.level === "AUTOMATIC" ? "automatique" : "validation requise"}
              </span>
            </div>
          ))}
        </div>
        <Note>
          Deux actions ne seront jamais automatisées, quel que soit ce réglage : signer un contrat
          et effectuer un paiement.
        </Note>
      </Block>

      {/* --- OFFRES ------------------------------------------------------ */}
      <Block title="Offres AMYN" subtitle="Tarifs de référence utilisés par la recommandation et la facturation.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(OFFERS).map(([key, offer]) => (
            <div key={key} className="rounded-lg border border-line bg-ink-950 p-3">
              <div className="label-xs text-zinc-500">{offer.label}</div>
              <div className="mt-1.5 text-xl font-light text-gold-300">
                {formatPrice(offer.price)}
                {key === "CARE" && <span className="text-sm text-zinc-500">/mois</span>}
              </div>
            </div>
          ))}
        </div>
      </Block>

      {/* --- BASE -------------------------------------------------------- */}
      <Block
        title="Base de données"
        subtitle={`SQLite locale (${dbPath}). Contenu réel à cet instant.`}
      >
        <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          <Count label="Prospects" value={prospects} hint={`dont ${demoProspects} DEMO`} />
          <Count label="Vérifications d'audit" value={checks} />
          <Count label="Problèmes prouvés" value={issues} />
          <Count label="Contacts trouvés" value={contacts} />
          <Count label="Emails rédigés" value={drafts} />
          <Count label="Tentatives d'envoi" value={sends} hint={`dont ${realSends} réels`} />
          <Count label="Réponses reçues" value={replies} hint={`dont ${imapReplies} par la boîte`} />
          <Count label="Oppositions" value={suppressions} />
          <Count label="Clients" value={clients} />
          <Count label="Entrées de journal" value={logs} />
          <Count label="Règles d'audit actives" value={ALL_RULES.length} />
        </div>
      </Block>

      <p className="text-[11px] leading-relaxed text-zinc-700">
        Environnement : DRY_RUN={String(config.dryRun)} · MAIL_TRANSPORT={config.mailTransport}.
        Les secrets sont lus depuis <code>.env</code>, qui n&apos;est pas versionné.
      </p>
    </div>
  );
}

function Block({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-[15px] text-zinc-100">{title}</h2>
        {subtitle && <p className="mt-1 max-w-3xl text-[12.5px] leading-relaxed text-zinc-500">{subtitle}</p>}
      </div>
      <div className="panel space-y-0 p-4">{children}</div>
    </section>
  );
}

function Line({
  label,
  value,
  state,
}: {
  label: string;
  value: string;
  state?: "ok" | "todo" | "warn";
}) {
  const dot =
    state === "ok"
      ? "bg-emerald-400"
      : state === "warn"
        ? "bg-rose-400"
        : state === "todo"
          ? "bg-amber-400"
          : "bg-zinc-700";
  return (
    <div className="flex gap-3 border-b border-line/60 py-2.5 last:border-0">
      <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${dot}`} />
      <div className="min-w-0 flex-1 sm:flex sm:gap-4">
        <span className="block shrink-0 text-[12px] text-zinc-600 sm:w-40">{label}</span>
        <span className="block text-[13px] leading-relaxed text-zinc-300">{value}</span>
      </div>
    </div>
  );
}

function Count({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line/60 py-1.5">
      <span className="text-[12.5px] text-zinc-500">
        {label}
        {hint && <span className="ml-1.5 text-[11px] text-zinc-700">{hint}</span>}
      </span>
      <span className="shrink-0 text-[13px] tabular-nums text-zinc-200">{value}</span>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-lg border border-line bg-ink-950 px-3 py-2.5 text-[12px] leading-relaxed text-zinc-500 [&_code]:rounded [&_code]:bg-ink-900 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[11.5px] [&_code]:text-gold-300">
      {children}
    </div>
  );
}
