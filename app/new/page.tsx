import type { Metadata } from "next";
import { NavLink as Link } from "@/components/pk/nav-link";
import { Icon, Mark, Screen, Stack } from "@/components/pk";
import { NEWS } from "@/config/news";
import { formatUtcDate } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "What's new",
  description: "What changed in Pawket lately, newest first.",
};

export default function NewsPage() {
  const days = [...new Set(NEWS.map((entry) => entry.date))];
  return (
    <Screen width="narrow">
      <div className="pk-screen__bar">
        <Mark href="/" size={26} type={18} />
      </div>
      <Stack gap={6} style={{ paddingTop: "var(--space-4)", paddingBottom: "var(--space-9)" }}>
        <div>
          <h1 className="display-m">What&apos;s new</h1>
          <p className="body pk-muted" style={{ marginTop: "var(--space-3)" }}>
            Pawket is built a little at a time. Here is what changed lately, newest first.
          </p>
        </div>
        {days.map((day) => (
          <section key={day} aria-labelledby={`day-${day}`}>
            <h2 id={`day-${day}`} className="receipt-label pk-faint">
              {formatUtcDate(`${day}T12:00:00Z`)}
            </h2>
            <Stack gap={4} style={{ marginTop: "var(--space-3)" }}>
              {NEWS.filter((entry) => entry.date === day).map((entry) => (
                <article key={entry.title} className="pk-news">
                  <h3 className="title">{entry.title}</h3>
                  <p className="body pk-muted" style={{ marginTop: "var(--space-1)" }}>
                    {entry.body}
                  </p>
                  {entry.href ? (
                    <Link href={entry.href} className="pk-news__see">
                      {entry.see ?? "See it"}
                      <Icon name="right" size={14} />
                    </Link>
                  ) : null}
                </article>
              ))}
            </Stack>
          </section>
        ))}
      </Stack>
    </Screen>
  );
}
