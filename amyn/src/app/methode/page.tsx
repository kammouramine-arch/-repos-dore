import { FinalCta } from "@/components/home/Sections";
import { PageHero } from "@/components/layout/PageHero";
import { Container, Heading, Label, Section, delay } from "@/components/ui/Layout";
import { method } from "@/lib/method";
import { pageMetadata } from "@/lib/seo";
import { cta } from "@/lib/site";
import { ButtonLink } from "@/components/ui/Button";

export const metadata = pageMetadata({
  title: "Méthode",
  description:
    "Comprendre, cadrer, concevoir, livrer et accompagner : la méthode AMYN, étape par étape, avec un périmètre et un devis clairs avant tout engagement.",
  path: "/methode",
});

export default function MethodPage() {
  return (
    <>
      <PageHero
        crumbs={[{ name: "Méthode", path: "/methode" }]}
        label="Méthode"
        lines={[{ text: "Un projet clair," }, { accent: "du début à la fin." }]}
        lead="Quatre étapes, toujours dans le même ordre. Vous savez à chaque instant où en est votre projet."
      />

      <Section spacing="none" className="pb-20 sm:pb-28">
        <Container>
          <ol className="border-t border-line">
            {method.map((step, i) => (
              <li
                key={step.number}
                className="grid gap-8 border-b border-line py-14 sm:py-20 lg:grid-cols-12 lg:gap-10"
              >
                <div data-reveal className="lg:col-span-4">
                  <span className="label text-accent">Étape {step.number}</span>
                  <h2 className="display-md mt-5">{step.title}</h2>
                  <p className="mt-4 text-fg-2">{step.summary}</p>
                </div>
                <p data-reveal style={delay(80)} className="lead text-fg-2 lg:col-span-5 lg:col-start-6">
                  {step.detail}
                </p>
                <div data-reveal style={delay(140)} className="lg:col-span-2 lg:col-start-11">
                  <p className="label text-fg-3">Ce qui en sort</p>
                  <ul className="mt-4 space-y-2 text-[0.9375rem] text-fg">
                    {step.outputs.map((o) => (
                      <li key={o}>{o}</li>
                    ))}
                  </ul>
                </div>
                {i === 0 && (
                  <p data-reveal className="text-[0.9375rem] text-fg-3 lg:col-span-7 lg:col-start-6">
                    Selon le projet, cette étape peut commencer par un{" "}
                    <a href={cta.firstLook.href} className="text-fg underline underline-offset-4">
                      premier aperçu
                    </a>{" "}
                    : une piste concrète, avant toute prestation payante.
                  </p>
                )}
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      <Section tone="paper" labelledBy="engagements-titre">
        <Container className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <div data-reveal="fade">
              <Label>Nos engagements</Label>
            </div>
            <Heading
              id="engagements-titre"
              size="md"
              className="mt-8"
              lines={[{ text: "Ce qui ne change pas," }, { accent: "quel que soit le projet." }]}
            />
          </div>
          <ul className="grid gap-x-10 border-t border-line sm:grid-cols-2 lg:col-span-6 lg:col-start-7">
            {[
              ["Rien ne commence sans devis signé", "Le périmètre, le calendrier et le prix sont écrits avant le début du travail."],
              ["Pas de promesse intenable", "Ni classement garanti, ni publication garantie sur les stores, ni chiffres inventés."],
              ["Des validations au bon moment", "Les choix importants vous sont montrés quand ils peuvent encore changer."],
              ["Vos contenus, avec vos droits", "Nous n'utilisons que des textes, photos et marques que vous êtes autorisé à publier."],
            ].map(([title, body], i) => (
              <li key={title} data-reveal style={delay((i % 2) * 80)} className="border-b border-line py-7">
                <p className="title">{title}</p>
                <p className="mt-2 text-[0.9375rem] text-fg-2">{body}</p>
              </li>
            ))}
          </ul>
          <div data-reveal className="lg:col-span-12">
            <ButtonLink href={cta.firstLook.href}>{cta.firstLook.label}</ButtonLink>
          </div>
        </Container>
      </Section>

      <FinalCta />
    </>
  );
}
