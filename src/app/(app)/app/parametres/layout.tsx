import { SettingsNav } from './settings-nav';

/**
 * Paramètres : navigation à gauche, section à droite. Chaque page garde
 * son en-tête ; la colonne donne toujours la vue d'ensemble.
 */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
      <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <SettingsNav />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
