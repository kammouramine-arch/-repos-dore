/**
 * Données structurées. Le `<` est échappé pour qu'aucune chaîne ne puisse
 * refermer la balise script.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
