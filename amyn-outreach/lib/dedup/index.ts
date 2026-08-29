// ---------------------------------------------------------------------------
// DÉDUPLICATION À L'ÉCHELLE NATIONALE
//
// Le problème. Reconnaître un doublon en chargeant toute la base fonctionne à
// 200 prospects et meurt à 200 000 : la mémoire explose et chaque import
// devient plus lent que le précédent. La reconnaissance doit coûter une
// requête indexée, pas un parcours.
//
// Les trois clés, par fiabilité décroissante :
//
//   1. SIRET — identifiant légal d'un établissement. Deux SIRET égaux, c'est
//      le même établissement. Aucune ambiguïté possible.
//   2. Domaine normalisé — deux entreprises ne partagent pas un site web.
//   3. Nom normalisé + code postal — le repli, quand ni SIRET ni site ne sont
//      connus. Volontairement PAS « nom + ville » : deux « Le Bistrot » à
//      Paris sont deux commerces distincts, que nom+ville fusionnait à tort.
//
// Un doublon est un DOUBLON. Jamais un NOT_QUALIFIED : le premier dit « je
// connais déjà cette entreprise », le second dit « cette entreprise ne mérite
// pas d'être contactée ». Les confondre fausse toute lecture des chiffres.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";

/** Formes juridiques retirées du nom : elles ne distinguent pas l'entreprise. */
const FORMES_JURIDIQUES =
  /\b(sarl|sas|sasu|eurl|sa|snc|eirl|ei|scop|sci|scm|selarl|gie|earl|sacv)\b/g;

/**
 * Normalise un nom d'entreprise pour la comparaison.
 *
 * « SARL Boulangerie Dupont » et « boulangerie dupont » désignent la même
 * entreprise : accents, casse, ponctuation et forme juridique sont du bruit.
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(FORMES_JURIDIQUES, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Extrait le domaine d'une URL, sans le `www.` ni la casse.
 *
 * Renvoie null si l'URL est inexploitable : mieux vaut pas de clé qu'une clé
 * fausse, qui fusionnerait deux entreprises sans rapport.
 */
export function normalizeDomain(website: string | null | undefined): string | null {
  if (!website) return null;
  const brut = website.trim();
  if (!brut) return null;
  try {
    const url = new URL(brut.startsWith("http") ? brut : `https://${brut}`);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    // Un hôte sans point n'est pas un domaine (« localhost », « intranet »).
    if (!host.includes(".")) return null;
    return host;
  } catch {
    return null;
  }
}

/** Un SIRET valide : 14 chiffres. Tout le reste est ignoré plutôt que deviné. */
export function normalizeSiret(siret: string | null | undefined): string | null {
  if (!siret) return null;
  const chiffres = siret.replace(/\s/g, "");
  return /^\d{14}$/.test(chiffres) ? chiffres : null;
}

export function normalizePostalCode(cp: string | null | undefined): string | null {
  if (!cp) return null;
  const c = cp.trim().toUpperCase();
  return /^[0-9A-Z]{4,6}$/.test(c) ? c : null;
}

/** Les clés d'identité d'une entreprise, calculées une fois. */
export type Identity = {
  siret: string | null;
  siren: string | null;
  domainKey: string | null;
  nameKey: string | null;
  postalCode: string | null;
};

export function buildIdentity(input: {
  name: string;
  website?: string | null;
  siret?: string | null;
  postalCode?: string | null;
}): Identity {
  const siret = normalizeSiret(input.siret);
  const nameKey = normalizeName(input.name) || null;
  return {
    siret,
    siren: siret ? siret.slice(0, 9) : null,
    domainKey: normalizeDomain(input.website),
    nameKey,
    postalCode: normalizePostalCode(input.postalCode),
  };
}

export type MatchedOn = "SIRET" | "DOMAIN" | "NAME_POSTAL";

export type DuplicateHit = {
  prospectId: string;
  matchedOn: MatchedOn;
  /** La valeur qui a permis le rapprochement — pour pouvoir relire la décision. */
  value: string;
};

/**
 * Deux identités désignent-elles la même entreprise ?
 *
 * Sert à dédupliquer À L'INTÉRIEUR d'un lot, avant même d'interroger la base :
 * une page d'API peut contenir deux fois le même établissement.
 */
export function sameEntity(a: Identity, b: Identity): DuplicateHit | null {
  if (a.siret && b.siret && a.siret === b.siret) {
    return { prospectId: "", matchedOn: "SIRET", value: a.siret };
  }
  if (a.domainKey && b.domainKey && a.domainKey === b.domainKey) {
    return { prospectId: "", matchedOn: "DOMAIN", value: a.domainKey };
  }
  if (a.nameKey && b.nameKey && a.nameKey === b.nameKey && a.postalCode && a.postalCode === b.postalCode) {
    return { prospectId: "", matchedOn: "NAME_POSTAL", value: `${a.nameKey}|${a.postalCode}` };
  }
  return null;
}

/**
 * Cherche un prospect existant correspondant à cette identité.
 *
 * Trois requêtes indexées au maximum, et l'on s'arrête à la première qui
 * répond : le coût ne dépend pas de la taille de la base.
 */
export async function findDuplicate(identity: Identity): Promise<DuplicateHit | null> {
  if (identity.siret) {
    const hit = await prisma.prospect.findUnique({
      where: { siret: identity.siret },
      select: { id: true },
    });
    if (hit) return { prospectId: hit.id, matchedOn: "SIRET", value: identity.siret };
  }

  if (identity.domainKey) {
    const hit = await prisma.prospect.findUnique({
      where: { domainKey: identity.domainKey },
      select: { id: true },
    });
    if (hit) return { prospectId: hit.id, matchedOn: "DOMAIN", value: identity.domainKey };
  }

  if (identity.nameKey && identity.postalCode) {
    const hit = await prisma.prospect.findFirst({
      where: { nameKey: identity.nameKey, postalCode: identity.postalCode },
      select: { id: true },
    });
    if (hit) {
      return {
        prospectId: hit.id,
        matchedOn: "NAME_POSTAL",
        value: `${identity.nameKey}|${identity.postalCode}`,
      };
    }
  }

  return null;
}

/**
 * Version par lot : résout un ensemble d'identités en trois requêtes au total,
 * quelle que soit la taille du lot.
 *
 * C'est la forme utilisée par le balayage national. Interroger la base une
 * fois par entreprise ferait mille allers-retours pour mille entreprises ;
 * ici il en faut trois, et les `IN (...)` restent bornés par la taille du lot.
 */
export async function findDuplicatesBatch(
  identities: Identity[],
): Promise<Map<number, DuplicateHit>> {
  const resultats = new Map<number, DuplicateHit>();
  if (identities.length === 0) return resultats;

  const sirets = [...new Set(identities.map((i) => i.siret).filter((v): v is string => !!v))];
  const domaines = [...new Set(identities.map((i) => i.domainKey).filter((v): v is string => !!v))];
  const nameKeys = [...new Set(identities.map((i) => i.nameKey).filter((v): v is string => !!v))];

  const [parSiret, parDomaine, parNom] = await Promise.all([
    sirets.length
      ? prisma.prospect.findMany({
          where: { siret: { in: sirets } },
          select: { id: true, siret: true },
        })
      : Promise.resolve([]),
    domaines.length
      ? prisma.prospect.findMany({
          where: { domainKey: { in: domaines } },
          select: { id: true, domainKey: true },
        })
      : Promise.resolve([]),
    nameKeys.length
      ? prisma.prospect.findMany({
          where: { nameKey: { in: nameKeys } },
          select: { id: true, nameKey: true, postalCode: true },
        })
      : Promise.resolve([]),
  ]);

  const indexSiret = new Map(parSiret.map((p) => [p.siret!, p.id]));
  const indexDomaine = new Map(parDomaine.map((p) => [p.domainKey!, p.id]));
  const indexNom = new Map(
    parNom
      .filter((p) => p.nameKey && p.postalCode)
      .map((p) => [`${p.nameKey}|${p.postalCode}`, p.id]),
  );

  identities.forEach((identity, position) => {
    if (identity.siret) {
      const id = indexSiret.get(identity.siret);
      if (id) {
        resultats.set(position, { prospectId: id, matchedOn: "SIRET", value: identity.siret });
        return;
      }
    }
    if (identity.domainKey) {
      const id = indexDomaine.get(identity.domainKey);
      if (id) {
        resultats.set(position, { prospectId: id, matchedOn: "DOMAIN", value: identity.domainKey });
        return;
      }
    }
    if (identity.nameKey && identity.postalCode) {
      const cle = `${identity.nameKey}|${identity.postalCode}`;
      const id = indexNom.get(cle);
      if (id) {
        resultats.set(position, { prospectId: id, matchedOn: "NAME_POSTAL", value: cle });
      }
    }
  });

  return resultats;
}

/**
 * Recalcule les clés des prospects qui n'en ont pas encore.
 *
 * Les prospects créés avant l'introduction de ces clés ont un `nameKey` vide
 * et échapperaient à la déduplication. Le rattrapage se fait par lots — jamais
 * en chargeant toute la base.
 */
export async function backfillIdentities(
  options: { batchSize?: number; max?: number } = {},
): Promise<{ examined: number; updated: number; collisions: number }> {
  const batchSize = options.batchSize ?? 500;
  const max = options.max ?? Number.POSITIVE_INFINITY;

  let examined = 0;
  let updated = 0;
  let collisions = 0;
  let cursor: string | undefined;

  for (;;) {
    const lot = await prisma.prospect.findMany({
      where: { nameKey: null },
      select: { id: true, name: true, website: true, postalCode: true, siret: true },
      take: batchSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
    });
    if (lot.length === 0) break;

    for (const p of lot) {
      examined += 1;
      const identity = buildIdentity({
        name: p.name,
        website: p.website,
        siret: p.siret,
        postalCode: p.postalCode,
      });
      try {
        await prisma.prospect.update({
          where: { id: p.id },
          data: {
            nameKey: identity.nameKey,
            domainKey: identity.domainKey,
            siren: identity.siren,
          },
        });
        updated += 1;
      } catch {
        // Deux prospects historiques portent la même clé : l'un des deux est
        // un doublon préexistant. On le laisse tel quel plutôt que d'en
        // supprimer un — c'est une décision humaine, pas un effet de bord.
        collisions += 1;
      }
      if (examined >= max) return { examined, updated, collisions };
    }

    cursor = lot[lot.length - 1].id;
    if (lot.length < batchSize) break;
  }

  return { examined, updated, collisions };
}
