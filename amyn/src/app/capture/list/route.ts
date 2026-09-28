import { shots } from "@/lib/visuals";

/** Liste des écrans à capturer — développement uniquement. */
export function GET() {
  if (process.env.NODE_ENV === "production") return new Response(null, { status: 404 });
  return Response.json(shots.map((s) => s.id));
}
