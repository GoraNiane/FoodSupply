import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { buttonVariants, Card } from "@/components/ui";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-muted px-4 py-16">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <SearchX className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-ink-900">Page introuvable</h1>
        <p className="mt-2 text-sm text-slate-600">
          La page que vous recherchez n&apos;existe pas ou a été déplacée.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/" className={buttonVariants({ variant: "primary" })}>
            <ArrowLeft className="h-4 w-4" />
            Retour à l&apos;accueil
          </Link>
          <Link href="/catalogue" className={buttonVariants({ variant: "outline" })}>
            Voir le catalogue
          </Link>
        </div>
      </Card>
    </main>
  );
}
