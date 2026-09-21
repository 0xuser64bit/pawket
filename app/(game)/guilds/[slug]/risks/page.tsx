import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink, Paper, Screen, Stack } from "@/components/pk";
import { RiskAcknowledge } from "@/components/risk-acknowledge";
import { RISK_LINES, findDemoGuild } from "@/lib/demo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guild = findDemoGuild(slug);
  return { title: `Before you buy ${guild?.token?.symbol ?? "a guild token"}` };
}

/**
 * The whole flow is Paper. From here to the wallet handoff there is not one
 * rounded card, one hue fill, or one persuasive word — the Playroom does not
 * follow a player in here.
 */
export default async function RisksPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guild = findDemoGuild(slug);
  if (!guild?.token) notFound();

  return (
    <Screen>
      <BackLink label={guild.name} href={`/guilds/${guild.slug}`} />

      <Stack gap={4}>
        <div>
          <h1 className="display-m">Before you buy {guild.token.symbol}</h1>
          <p className="body pk-muted" style={{ marginTop: "var(--space-2)" }}>
            Read this once. You can open it again any time from the guild page.
          </p>
        </div>

        <Paper title="Plain-language risk" meta="Required" torn>
          <ul className="pk-numbered body-sm" style={{ color: "var(--ink)" }}>
            {RISK_LINES.map((line, index) => (
              <li key={line}>
                <span className="amount-sm pk-faint">{index + 1}</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </Paper>

        <RiskAcknowledge
          backHref={`/guilds/${guild.slug}`}
          continueHref={`/guilds/${guild.slug}/swap`}
        />
      </Stack>
    </Screen>
  );
}
