import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileText, Scale } from "lucide-react";
import { apiClient } from "@/lib/api";
import { brandAssets } from "@/lib/brand";
import {
  fallbackLegalPage,
  legalContentBlocks,
  LEGAL_PAGE_LINKS,
  type LegalPageContent,
} from "@/lib/legalContent";

type LegalPageProps = {
  slug?: string;
};

async function fetchLegalPage(slug: string): Promise<LegalPageContent> {
  const response = await apiClient.get<LegalPageContent>(`/legal/pages/${slug}`, {
    params: { locale: "fr" },
  });
  return response.data;
}

export default function LegalPage({ slug: slugOverride }: LegalPageProps) {
  const params = useParams();
  const slug = slugOverride || params.slug || "mentions-legales";
  const fallback = fallbackLegalPage(slug);

  const { data } = useQuery({
    queryKey: ["legal-page", slug],
    queryFn: () => fetchLegalPage(slug),
    retry: 1,
    staleTime: 1000 * 60 * 10,
  });

  const page = data || fallback;
  const blocks = legalContentBlocks(page.content);

  useEffect(() => {
    document.title = `${page.title} | PronoKif`;
  }, [page.title]);

  return (
    <div className="min-h-screen bg-pk-carbon text-pk-piste">
      <header className="border-b border-white/[0.08] bg-pk-carbon/95">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <img
              src={brandAssets.wordmarkWhiteRed}
              alt="PronoKif"
              className="h-6 w-auto max-w-[160px] object-contain"
              draggable={false}
            />
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-md border border-white/[0.08] px-3 py-2 font-body text-xs text-pk-titane transition-colors hover:border-white/[0.15] hover:text-pk-piste"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 md:py-12">
        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-sm border border-pk-red/25 bg-pk-red/10 px-2.5 py-1 font-data text-[10px] uppercase text-pk-red">
            <Scale className="h-3.5 w-3.5" />
            Documents publics
          </div>
          <h1 className="font-heading text-3xl uppercase tracking-tight text-pk-piste md:text-4xl">
            {page.title}
          </h1>
          <p className="mt-3 max-w-2xl font-body text-sm leading-relaxed text-pk-titane">
            {page.summary}
          </p>
          <p className="mt-3 font-data text-[10px] uppercase text-pk-titane/70">
            Version {page.version}
            {page.updated_at
              ? ` · Mise à jour ${new Date(page.updated_at).toLocaleDateString("fr-FR")}`
              : ""}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <nav className="h-fit rounded-md border border-white/[0.08] bg-pk-surface p-3">
            <p className="mb-2 font-data text-[10px] uppercase text-pk-titane">Navigation</p>
            <div className="space-y-1">
              {LEGAL_PAGE_LINKS.map((link) => {
                const active = link.slug === slug;
                return (
                  <Link
                    key={link.slug}
                    to={link.path}
                    className={`flex items-center gap-2 rounded-sm px-2.5 py-2 font-body text-xs transition-colors ${
                      active
                        ? "bg-pk-red/10 text-pk-piste"
                        : "text-pk-titane hover:bg-white/[0.04] hover:text-pk-piste"
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          <article className="rounded-md border border-white/[0.08] bg-pk-surface p-4 md:p-6">
            <div className="space-y-6">
              {blocks.map((block) => (
                <section key={block.title}>
                  <h2 className="mb-2 font-heading text-lg uppercase tracking-tight text-pk-piste">
                    {block.title}
                  </h2>
                  <p className="whitespace-pre-line font-body text-sm leading-7 text-zinc-300">
                    {block.body}
                  </p>
                </section>
              ))}
            </div>
          </article>
        </div>
      </main>
    </div>
  );
}
