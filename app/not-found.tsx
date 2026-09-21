import { ButtonLink, EmptyState, Screen } from "@/components/pk";

export default function NotFound() {
  return (
    <Screen>
      <div style={{ paddingTop: "var(--space-7)" }}>
        <EmptyState
          icon="search"
          title="Nothing here"
          body="This page does not exist. Your pets, your progress and everything you own are untouched."
          action={<ButtonLink label="Go home" href="/home" icon="home" />}
        />
      </div>
    </Screen>
  );
}
