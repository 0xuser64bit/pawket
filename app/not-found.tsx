import { ButtonLink, PetFrame, Row, Screen, Stack } from "@/components/pk";

export default function NotFound() {
  return (
    <Screen width="narrow">
      <Stack gap={5} style={{ paddingTop: "var(--space-7)" }}>
        <div className="pk-portrait">
          <PetFrame form="dog" temper="curious" feeling="lonely" sky="plain" size="lg" seed="lost" />
        </div>
        <div>
          <h1 className="display-m">This page wandered off</h1>
          <p className="body pk-muted" style={{ marginTop: "var(--space-3)" }}>
            There is nothing at this address. Your pets, your progress and everything you own are untouched.
          </p>
        </div>
        <Row gap={3} wrap>
          <ButtonLink label="Go home" href="/home" icon="home" />
          <ButtonLink label="See the park" href="/park" tone="quiet" icon="users" />
        </Row>
      </Stack>
    </Screen>
  );
}
