import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { haptic, inAndroidApp, savePicture, shareLink, sharePicture, useBackCloses, useHaptics } from "./android";

type Request = Record<string, unknown>;

/** The app's injected object, as the page sees it: it keeps what was posted and answers as PawketBridge.kt does. */
function app(answer: (request: Request) => Request = () => ({ ok: true })): Request[] {
  const posted: Request[] = [];
  const listeners: Array<(event: { data: unknown }) => void> = [];
  window.PawketAndroid = {
    postMessage(message) {
      const request = JSON.parse(message) as Request;
      posted.push(request);
      if (!request.id) return;
      const reply = JSON.stringify({ id: request.id, ...answer(request) });
      queueMicrotask(() => listeners.forEach((listener) => listener({ data: reply })));
    },
    addEventListener(_type, listener) {
      listeners.push(listener);
    },
  };
  return posted;
}

afterEach(() => {
  delete window.PawketAndroid;
  delete window.pawketBack;
  window.localStorage.clear();
});

describe("outside the app", () => {
  it("asks nothing and says so", async () => {
    expect(inAndroidApp()).toBe(false);
    await expect(sharePicture("data:image/png;base64,AA==", "pawket", "Pepper")).resolves.toEqual({ ok: false, reason: "no-app" });
    expect(() => haptic("done")).not.toThrow();
  });
});

describe("in the app", () => {
  it("a disconnected bridge cannot fail a care or leave a photo waiting", async () => {
    app();
    window.PawketAndroid!.postMessage = () => { throw new Error("View destroyed"); };
    expect(() => haptic("done")).not.toThrow();
    await expect(savePicture("data:image/png;base64,AA==", "pawket")).resolves.toEqual({ ok: false, reason: "no-answer" });
  });

  it("hands a photo to the share sheet and hears back", async () => {
    const posted = app();
    await expect(sharePicture("data:image/png;base64,AA==", "pawket-pepper", "Pepper and you")).resolves.toEqual({ ok: true });
    expect(posted).toEqual([
      { id: expect.any(String), op: "share-image", data: "data:image/png;base64,AA==", name: "pawket-pepper", title: "Pepper and you" },
    ]);
  });

  it("passes on why the phone said no", async () => {
    app(() => ({ ok: false, reason: "not-saved" }));
    await expect(savePicture("data:image/png;base64,AA==", "pawket")).resolves.toEqual({ ok: false, reason: "not-saved" });
  });

  it("matches each answer to its own request", async () => {
    app((request) => ({ ok: request.op === "share-link" }));
    const [link, picture] = await Promise.all([
      shareLink({ url: "https://pawket-pets.vercel.app/pet/abc", title: "Pepper on Pawket" }),
      savePicture("data:image/png;base64,AA==", "pawket"),
    ]);
    expect(link.ok).toBe(true);
    expect(picture.ok).toBe(false);
  });

  it("feels a moment only while haptics are on", () => {
    const posted = app();
    haptic("done");
    const { result } = renderHook(() => useHaptics());
    act(() => result.current[1](false));
    haptic("cheer");
    expect(result.current[0]).toBe(false);
    expect(posted).toEqual([{ op: "haptic", kind: "done" }]);
  });

  it("closes the newest open sheet on back, and says when there is none", () => {
    app();
    const closed: string[] = [];
    const first = renderHook(() => useBackCloses(() => closed.push("wallet")));
    const second = renderHook(() => useBackCloses(() => closed.push("photo")));
    expect(window.pawketBack?.()).toBe(true);
    second.unmount();
    expect(window.pawketBack?.()).toBe(true);
    first.unmount();
    expect(window.pawketBack?.()).toBe(false);
    expect(closed).toEqual(["photo", "wallet"]);
  });
});
