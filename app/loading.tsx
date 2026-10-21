import { PawLoader } from "@/components/pk";

export default function Loading() {
  return (
    <main className="pk-splash" aria-busy="true">
      <PawLoader label="Opening Pawket" />
      <p className="pk-mark__name pk-splash__name" aria-hidden="true">
        Pawket
      </p>
    </main>
  );
}
