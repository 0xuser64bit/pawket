"use client";

import { useRef } from "react";
import { PawArt, PetArt } from "@/components/pk";
import { useEyesFollow } from "@/lib/utils/use-eyes-follow";

export function HeroPets() {
  const scope = useRef<HTMLDivElement>(null);
  useEyesFollow(scope);
  return (
    <div className="pk-heroscene" ref={scope} aria-hidden="true">
      <svg className="pk-heroscene__land" viewBox="0 0 600 520" preserveAspectRatio="xMidYMax slice">
        <g stroke="var(--edge)" strokeWidth="4" strokeLinejoin="round">
          <circle cx="470" cy="112" r="50" fill="var(--sun)" stroke="none" style={{ opacity: "var(--pk-day)" }} />
          <path d="M482 66a50 50 0 1 0 34 72 38 38 0 0 1-34-72z" fill="var(--pet-cream)" stroke="none" style={{ opacity: "var(--pk-night)" }} />
          <g fill="var(--surface)" stroke="none" opacity="0.85">
            <path d="M90 140c0-18 16-28 32-24 6-16 30-20 42-6 16-4 30 8 28 22 12 2 16 12 14 20H102c-14 0-16-12-12-12z" />
          </g>
          <path d="M-20 360C80 300 200 286 300 300s220 0 320-40v280H-20z" fill="var(--sprout-soft)" />
          <path d="M-20 420c120-40 260-50 360-34s200 8 280-20v174H-20z" fill="var(--sprout)" />
        </g>
      </svg>
      <div className="pk-heroscene__trail">
        {(["heart", "cat", "dog", "bun"] as const).map((print, i) => (
          <span key={print} style={{ left: `${8 + i * 11}%`, bottom: `${6 + (i % 2) * 5}%`, rotate: `${-20 + i * 8}deg` }}>
            <PawArt form={print} />
          </span>
        ))}
      </div>
      <div className="pk-heroscene__pet pk-heroscene__pet--bun" data-eyes>
        <PetArt form="bun" temper="cozy" feeling="happy" wearing="nap-ribbon" pose="full" seed="Tuesday" />
      </div>
      <div className="pk-heroscene__pet pk-heroscene__pet--dog" data-eyes>
        <PetArt form="dog" temper="brave" feeling="happy" wearing="wool-scarf" pose="full" seed="Biscuit" />
      </div>
      <div className="pk-heroscene__pet pk-heroscene__pet--cat" data-eyes>
        <PetArt form="cat" temper="curious" feeling="radiant" pose="full" seed="Pepper" />
      </div>
    </div>
  );
}
