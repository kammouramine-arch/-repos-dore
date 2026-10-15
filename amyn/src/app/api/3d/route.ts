import { sanitizeThree, validateThree } from "@/lib/forms/three";
import { renderRequestEmail, receivedAt } from "@/lib/server/email";
import { handleForm } from "@/lib/server/handle-form";
export async function POST(request: Request) {
  return handleForm(request, { sanitize: sanitizeThree, validate: validateThree, compose: v => {
    const {html,text}=renderRequestEmail({title:"Nouvelle demande AMYN 3D",rows:[["Nom",v.name],["Entreprise",v.company],["E-mail",v.email],["Langue",v.lang],["Reçue le",receivedAt()]],message:v.description,messageLabel:"Projet 3D",footer:"Demande AMYN 3D. Aucun prix, droit ou délai accepté à ce stade."});
    return {subject:`AMYN 3D — ${v.company}`,html,text};
  }});
}
