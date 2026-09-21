import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button, Chip, Meter, PetFrame, Receipt } from "./index";

describe("Button", () => {
  it("wears its tone and size, and sun needs no modifier", () => {
    expect(renderToStaticMarkup(<Button label="Adopt a pet" />)).toContain('class="pk-btn"');
    expect(renderToStaticMarkup(<Button label="Feed" tone="sprout" size="sm" />)).toContain(
      "pk-btn pk-btn--sprout pk-btn--sm",
    );
  });

  it("renders the paper variant with no shelf tone, for Paper surfaces only", () => {
    const html = renderToStaticMarkup(<Button label="Confirm in wallet" tone="paper" />);
    expect(html).toContain("pk-btn--paper");
    expect(html).not.toContain("pk-btn--sun");
  });
});

describe("Meter", () => {
  it("draws one segment per unit and fills exactly value of them", () => {
    const html = renderToStaticMarkup(<Meter label="Fed" value={2} max={3} />);
    expect(html.match(/<span class="pk-meter__seg/g)).toHaveLength(3);
    expect(html.match(/pk-meter__seg--on/g)).toHaveLength(2);
  });

  it("clamps out-of-range values rather than overflowing the track", () => {
    const over = renderToStaticMarkup(<Meter value={99} max={4} />);
    expect(over.match(/pk-meter__seg--on/g)).toHaveLength(4);
    const under = renderToStaticMarkup(<Meter value={-3} max={4} />);
    expect(under.match(/pk-meter__seg--on/g)).toBeNull();
  });

  it("prints its numbers beside it, never a percentage", () => {
    const html = renderToStaticMarkup(<Meter label="Level 7" value={7} max={10} readout="740 / 1000 XP" />);
    expect(html).toContain("740 / 1000 XP");
    expect(html).not.toContain("%");
  });
});

describe("Receipt", () => {
  it("colours only the two tones that exist", () => {
    const html = renderToStaticMarkup(
      <Receipt
        rows={[
          { k: "Price impact", v: "3.4%", tone: "warn" },
          { k: "Traits", v: "Stored on-chain", tone: "ok" },
          { k: "Slippage limit", v: "0.5%" },
        ]}
        total={{ k: "Most you can pay", v: "2.01 SOL" }}
      />,
    );
    expect(html.match(/pk-receipt__warn/g)).toHaveLength(1);
    expect(html.match(/pk-receipt__ok/g)).toHaveLength(1);
    expect(html).toContain("pk-receipt__total");
  });
});

describe("PetFrame", () => {
  it("writes rarity out beside the name as well as banding it", () => {
    const html = renderToStaticMarkup(<PetFrame form="cat" name="Pepper" rarity="foil" level={7} />);
    expect(html).toContain("pk-pet--foil");
    expect(html).toContain("Foil");
  });

  it("keeps rarity readable without a name, for a grid tile", () => {
    expect(renderToStaticMarkup(<PetFrame form="bird" rarity="glass" size="sm" />)).toContain("pk-pet--glass");
  });
});

describe("Chip", () => {
  it("always carries its word, so status never rests on hue alone", () => {
    expect(renderToStaticMarkup(<Chip label="Migration pending" tone="alarm" icon="alert" />)).toContain(
      "Migration pending",
    );
  });
});
