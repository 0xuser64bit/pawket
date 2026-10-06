import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { activePlace } from "./dock";
import { Button, Card, Chip, Field, Mark, Meter, PAW, Paper, PawArt, PawLoader, PetFrame, Receipt } from "./index";

describe("Field", () => {
  it("gives each unnamed field its own description and honours an explicit id", () => {
    const html = renderToStaticMarkup(<><Field label="First" error="First error" /><Field label="Second" helper="Second help" /><Field label="Third" id="third" error="Third error" /></>);
    const descriptions = Array.from(html.matchAll(/aria-describedby="([^"]+)"/g), (match) => match[1]);
    expect(new Set(descriptions).size).toBe(3);
    for (const id of descriptions) expect(html).toContain(`id="${id}"`);
    expect(descriptions[2]).toBe("third-error");
  });
});

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

describe("Button meta", () => {
  it("sets a figure beside the label apart, so it can be mono", () => {
    const html = renderToStaticMarkup(<Button label="Feed" meta="4:59" />);
    expect(html).toContain('<span>Feed</span><span class="pk-btn__meta">4:59</span>');
  });
});

describe("Card", () => {
  it("becomes one link when it has somewhere to go", () => {
    const html = renderToStaticMarkup(<Card href="/pet/pepper">Pepper</Card>);
    expect(html).toMatch(/^<a [^>]*class="pk-card pk-card--link"[^>]*href="\/pet\/pepper"|^<a [^>]*href="\/pet\/pepper"[^>]*class="pk-card pk-card--link"/);
  });
});

describe("Paper", () => {
  it("hangs a torn edge below the sheet, not inside its rule", () => {
    const html = renderToStaticMarkup(
      <Paper title="Risk" torn foot={<span>Continue</span>}>
        Lines
      </Paper>,
    );
    expect(html).toMatch(/<\/section><div class="pk-tear pk-tear--sunk"/);
    expect(html).toContain("pk-paper pk-paper--torn");
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
    expect(renderToStaticMarkup(<PetFrame form="bun" rarity="glass" size="sm" />)).toContain("pk-pet--glass");
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
  it("is Pawket's paw: four beans over a centre pad that is a heart", () => {
    const html = renderToStaticMarkup(<Mark />);
    for (const d of [...PAW.beans, PAW.heart]) expect(html).toContain(d);
  });

  it("stays two inks at the sizes a bar draws it, so it survives a 16px tab", () => {
    const html = renderToStaticMarkup(<Mark glyphOnly size={24} />);
    expect(new Set(html.match(/var\(--[a-z-]+\)/g))).toEqual(new Set(["var(--sun)", "var(--on-sun)"]));
  });

  it("stands on its shelf and catches the light when drawn large", () => {
    const html = renderToStaticMarkup(<Mark glyphOnly size={96} />);
    expect(html).toContain("var(--sun-edge)");
    for (const d of PAW.shine) expect(html).toContain(d);
  });

  it("names Pawket beside the glyph unless asked not to", () => {
    expect(renderToStaticMarkup(<Mark />)).toContain("Pawket");
    expect(renderToStaticMarkup(<Mark glyphOnly />)).not.toContain("Pawket");
  });

  it("is the same drawing in the favicon", () => {
    const favicon = fs.readFileSync(path.join(process.cwd(), "public/favicon.svg"), "utf8");
    for (const d of [...PAW.beans, PAW.heart]) expect(favicon).toContain(d);
  });
});

describe("PawArt", () => {
  it("draws a different print per paw", () => {
    const drawn = (["cat", "dog", "bun", "heart"] as const).map((form) =>
      renderToStaticMarkup(<PawArt form={form} />),
    );
    expect(new Set(drawn).size).toBe(4);
  });
});

describe("PawLoader", () => {
  it("is the mark itself, come alive", () => {
    const html = renderToStaticMarkup(<PawLoader />);
    for (const d of [...PAW.beans, PAW.heart]) expect(html).toContain(d);
  });

  it("taps the four beans and beats the heart, keyline and face together", () => {
    const html = renderToStaticMarkup(<PawLoader />);
    expect(html.match(/class="pk-paw__tap"/g)).toHaveLength(8);
    expect(html.match(/class="pk-paw__beat"/g)).toHaveLength(2);
  });

  it("grows every shape from its own middle, the beans in order and the heart last", () => {
    const html = renderToStaticMarkup(<PawLoader />);
    const grown = [...html.matchAll(/--i:(\d);transform-origin:([\d.]+)px ([\d.]+)px/g)].slice(0, 5);
    expect(grown.map((m) => Number(m[1]))).toEqual([0, 1, 2, 3, 4]);
    expect(grown.map((m) => [Number(m[2]), Number(m[3])])).toEqual(PAW.centres);
  });

  it("names the wait for anything that cannot see it", () => {
    expect(renderToStaticMarkup(<PawLoader label="Finding a lobby" />)).toContain("Finding a lobby");
  });
});

describe("Dock", () => {
  it("keeps a detail screen lit under the place it belongs to", () => {
    expect(activePlace("/playground")).toBe("playground");
    expect(activePlace("/guilds")).toBe("guilds");
    expect(activePlace("/pet/pepper")).toBe("profile");
    expect(activePlace("/inventory")).toBe("profile");
    expect(activePlace("/profile")).toBe("profile");
    expect(activePlace("/pet/PawkHvXJKfsUfKs8mgLS7FXbLuNZ43fwEFGkzYdeM74")).toBe("park");
    expect(activePlace("/park")).toBe("park");
    expect(activePlace("/pulse")).toBe("park");
    expect(activePlace("/pet/PawkHvXJKfsUfKs8mgLS7FXbLuNZ43fwEFGkzYdeM74/visit")).toBe("park");
    expect(activePlace("/home")).toBe("home");
    expect(activePlace("/market")).toBe("market");
  });

  it("does not light a place whose name merely starts the path", () => {
    expect(activePlace("/marketing")).toBe("home");
  });
});
