import Image from "next/image";
import { shot, shotSrc } from "@/lib/visuals";

/**
 * Écrans présentés en image : une fenêtre de navigateur ou un téléphone,
 * autour d'une capture de `public/visuals` servie en AVIF/WebP à la bonne
 * taille. Aucun calcul dans le navigateur du visiteur.
 */

export function BrowserShot({
  id,
  sizes = "(min-width: 1024px) 50vw, 100vw",
  eager = false,
  className = "",
  chrome = true,
}: {
  id: string;
  sizes?: string;
  eager?: boolean;
  className?: string;
  chrome?: boolean;
}) {
  const s = shot(id);
  return (
    <div
      className={`overflow-hidden rounded-[var(--radius-md)] border border-[rgb(242_238_230/0.14)] bg-ink-2 shadow-[0_50px_120px_-40px_rgb(0_0_0/0.95),0_0_0_1px_rgb(0_0_0/0.4)] ${className}`}
    >
      {chrome && (
        <div aria-hidden className="flex items-center gap-3 border-b border-[rgb(242_238_230/0.08)] bg-[#131313] px-3.5 py-2.5">
          <span className="flex shrink-0 gap-1.5">
            <span className="size-2 rounded-full bg-[#ff5f57]/70" />
            <span className="size-2 rounded-full bg-[#febc2e]/70" />
            <span className="size-2 rounded-full bg-[#28c840]/70" />
          </span>
          <span className="mx-auto max-w-[70%] truncate rounded-md bg-[rgb(242_238_230/0.06)] px-3 py-1 font-mono text-[0.625rem] tracking-wide text-bone-3">
            {s.url}
          </span>
          <span className="w-[34px] shrink-0" />
        </div>
      )}
      <Image
        src={shotSrc(id)}
        width={s.width}
        height={s.height}
        alt={s.alt}
        sizes={sizes}
        quality={82}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : undefined}
        className="block h-auto w-full"
      />
    </div>
  );
}

export function PhoneShot({
  id,
  sizes = "(min-width: 1024px) 18vw, 45vw",
  eager = false,
  className = "",
}: {
  id: string;
  sizes?: string;
  eager?: boolean;
  className?: string;
}) {
  const s = shot(id);
  /* Rayons, bord et îlot proportionnels à la largeur : le même téléphone
     reste juste qu'il mesure 80 ou 400 pixels. */
  return (
    <div className={`@container ${className}`}>
      <div className="rounded-[15cqw] border border-[rgb(242_238_230/0.18)] bg-[#161616] p-[4.5cqw] shadow-[0_50px_100px_-30px_rgb(0_0_0/0.95),inset_0_0_0_1px_rgb(255_255_255/0.04)]">
        <div className="relative overflow-hidden rounded-[11cqw]">
          <Image
            src={shotSrc(id)}
            width={s.width}
            height={s.height}
            alt={s.alt}
            sizes={sizes}
            quality={82}
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : undefined}
            className="block h-auto w-full"
          />
          {/* Îlot de l'écran, discret. */}
          <span aria-hidden className="absolute left-1/2 top-[2.2cqw] h-[6.5cqw] w-[28%] -translate-x-1/2 rounded-full bg-black" />
        </div>
      </div>
    </div>
  );
}

/** Le bon cadre selon le type d'écran. */
export function Shot(props: { id: string; sizes?: string; eager?: boolean; className?: string }) {
  return shot(props.id).kind === "phone" ? <PhoneShot {...props} /> : <BrowserShot {...props} />;
}
