import { Logo } from "@/brand";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/i18n";
import { LanguageSwitcher } from "../language-switcher";

/** AuthFlow frame (PRD-01 §8.1): Card on bg-muted, one primary button per screen, heading-xl title. */
export function AuthFrame({ locale, title, description, children }: { locale: Locale; title: string; description?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-muted">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-12">
        <Logo height={28} className="self-center" />
        <Card>
          <CardHeader>
            <CardTitle as="h1" className="type-heading-xl">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
          <CardContent className="grid gap-6">{children}</CardContent>
        </Card>
      </main>
      <footer className="mx-auto flex w-full max-w-md justify-center px-4 py-6">
        <LanguageSwitcher locale={locale} />
      </footer>
    </div>
  );
}
