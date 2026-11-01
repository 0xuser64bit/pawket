import { Screen, ScreenBar, Waiting } from "@/components/pk";

export default function Loading() {
  return (
    <Screen>
      <ScreenBar>
        <div>
          <h1 className="display-l">Park</h1>
          <p className="caption pk-faint">Every pet kept on Solana, read live</p>
        </div>
      </ScreenBar>
      <Waiting label="Reading the park" />
    </Screen>
  );
}
