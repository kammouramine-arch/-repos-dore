import { getDemo, sourcesText } from "@/lib/proofsprint-demo";

/* Fichier de la démonstration fictive, généré au build depuis les mêmes
   données que la page. */
export const dynamic = "force-static";

export function GET() {
  return new Response(sourcesText("fr"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${getDemo("fr").files.sources}"`,
    },
  });
}
