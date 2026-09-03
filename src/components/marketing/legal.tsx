import * as React from 'react';

export function LegalPage({
  title,
  updatedAt,
  intro,
  children,
}: {
  title: string;
  updatedAt: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="container-page py-14 sm:py-20">
      <article className="mx-auto max-w-3xl">
        <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.03em] text-ink sm:text-[38px]">
          {title}
        </h1>
        <p className="mt-3 text-[13px] text-subtle">Dernière mise à jour : {updatedAt}</p>
        {intro ? <p className="mt-6 text-[16px] leading-relaxed text-muted">{intro}</p> : null}
        <div className="mt-10 space-y-9">{children}</div>
      </article>
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-[19px] font-semibold tracking-[-0.02em] text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-muted [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-2">
        {children}
      </div>
    </section>
  );
}
