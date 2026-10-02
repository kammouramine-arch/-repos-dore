import { getDemo, matrixCsv } from "@/lib/proofsprint-demo";

/* Fichier de la démonstration fictive, généré au build depuis les mêmes
   données que la page. */
export const dynamic = "force-static";

export function GET() {
  return new Response(matrixCsv("en"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${getDemo("en").files.matrix}"`,
    },
  });
}
