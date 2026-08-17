// ---------------------------------------------------------------------------
// NIVEAUX D'AUTONOMIE
//
// AUTOMATIC          : action reversible et sans risque -> executee directement
// APPROVAL_REQUIRED  : action importante ou externe    -> attend validation
//
// Modifiable a chaud via la table Setting, sans redeploiement.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { DEFAULT_AUTONOMY } from "@/lib/constants";

export type Autonomy = "AUTOMATIC" | "APPROVAL_REQUIRED";

const SETTING_PREFIX = "autonomy.";

export async function getAutonomy(actionType: string): Promise<Autonomy> {
  const setting = await prisma.setting.findUnique({ where: { key: `${SETTING_PREFIX}${actionType}` } });
  if (setting?.value === "AUTOMATIC" || setting?.value === "APPROVAL_REQUIRED") return setting.value;
  return DEFAULT_AUTONOMY[actionType] ?? "APPROVAL_REQUIRED";
}

export async function setAutonomy(actionType: string, level: Autonomy) {
  return prisma.setting.upsert({
    where: { key: `${SETTING_PREFIX}${actionType}` },
    update: { value: level },
    create: { key: `${SETTING_PREFIX}${actionType}`, value: level },
  });
}

export async function autonomyMatrix() {
  const overrides = await prisma.setting.findMany({ where: { key: { startsWith: SETTING_PREFIX } } });
  const map = new Map(overrides.map((o) => [o.key.slice(SETTING_PREFIX.length), o.value]));
  return Object.entries(DEFAULT_AUTONOMY).map(([action, defaultLevel]) => ({
    action,
    level: (map.get(action) ?? defaultLevel) as Autonomy,
    overridden: map.has(action),
  }));
}
