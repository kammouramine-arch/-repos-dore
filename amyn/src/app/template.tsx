/**
 * Transition de page : à chaque navigation, le contenu arrive en fondu et
 * un trait laiton balaie le haut de l'écran. Court (0,5 s), sans écran de
 * chargement, et absent si le visiteur a demandé moins d'animations.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div aria-hidden className="page-sweep" />
      <div className="page-enter">{children}</div>
    </>
  );
}
