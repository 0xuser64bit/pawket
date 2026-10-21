import { ButtonLink, Mark, PetFrame, Screen, Stack } from "@/components/pk";

export default function NotFound() {
  return (
    <Screen width="narrow">
      <div className="pk-screen__bar">
        <Mark href="/" size={26} type={18} />
      </div>
      <Stack gap={5} style={{ paddingTop: "var(--space-4)" }}>
        <div className="pk-portrait">
          <PetFrame form="dog" temper="curious" feeling="lonely" sky="plain" size="lg" seed="lost" />
        </div>
        <div>
          <h1 className="display-m">This page wandered off</h1>
          <p className="body pk-muted" style={{ marginTop: "var(--space-3)" }}>
            There is nothing at this address. Your pets, your progress and your looks are untouched.
          </p>
        </div>
        <div className="pk-acts">
          <ButtonLink label="Go home" href="/home" icon="home" />
          <ButtonLink label="See the park" href="/park" tone="quiet" icon="users" />
        </div>
      </Stack>
    </Screen>
  );
}
