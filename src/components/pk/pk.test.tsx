import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { activePlace } from "./dock";
import { Button, Chip, Mark, Meter, PawArt, PawLoader, PetFrame, Receipt } from "./index";

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

describe("Mark", () => {
  it("never appears without the pocket", () => {
    const html = renderToStaticMarkup(<Mark />);
    // The pocket is the filled, rounded body; the pads alone are not the mark.
    expect(html).toMatch(/<rect[^>]+rx="[\d.]+"[^>]+fill="var\(--sun\)"/);
    expect(html.match(/<circle/g)).toHaveLength(4);
  });

  it("hangs a heart tag from the collar, where a paw keeps its centre pad", () => {
    const html = renderToStaticMarkup(<Mark />);
    expect(html).toContain("M16 27.4c-3.3-2.4");
    expect(html).toContain("M5.6 14.4q10.4 2.6 20.8 0");
  });

  it("stays two inks, so it survives a 16px favicon", () => {
    const html = renderToStaticMarkup(<Mark glyphOnly />);
    const tokens = new Set(html.match(/var\(--[a-z-]+\)/g));
    expect(tokens).toEqual(new Set(["var(--sun)", "var(--on-sun)"]));
  });
});

describe("PawArt", () => {
  it("draws a different silhouette per species", () => {
    const drawn = (["cat", "dog", "bird", "bun"] as const).map((form) =>
      renderToStaticMarkup(<PawArt form={form} />),
    );
    expect(new Set(drawn).size).toBe(4);
  });
});

describe("PawLoader", () => {
  it("cycles all four species, one step apart", () => {
    const html = renderToStaticMarkup(<PawLoader />);
    expect(html.match(/pk-paw-loader__paw/g)).toHaveLength(5); // 4 paws, one also first
    for (const delay of ["0.00s", "1.12s", "2.24s", "3.36s"]) {
      expect(html).toContain(`animation-delay:${delay}`);
    }
  });

  it("marks one paw to stand still under reduced motion", () => {
    expect(renderToStaticMarkup(<PawLoader />)).toContain("pk-paw-loader__paw--first");
  });

  it("names the wait for anything that cannot see it", () => {
    expect(renderToStaticMarkup(<PawLoader label="Finding a lobby" />)).toContain("Finding a lobby");
  });
});

describe("Dock", () => {
  it("keeps a detail screen lit under the place it belongs to", () => {
    expect(activePlace("/market")).toBe("market");
    expect(activePlace("/market/sesame/adopt")).toBe("market");
    expect(activePlace("/guilds/clover/swap")).toBe("guilds");
    expect(activePlace("/pet/pepper/ownership")).toBe("inventory");
    expect(activePlace("/home")).toBe("home");
  });

  it("does not light a place whose name merely starts the path", () => {
    expect(activePlace("/marketing")).toBe("home");
  });
});
