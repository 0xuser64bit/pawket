import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { haptic, inAndroidApp, savePicture, setCareReminder, shareLink, sharePicture, useBackCloses, useCareReminders, useHaptics, shareCard } from "./android";

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

  it("hands a record's card to the share sheet with its link", async () => {
    const posted = app();
    const card = { data: "data:image/png;base64,AA==", name: "mango-on-pawket", title: "Mango on Pawket", url: "https://pawket.world/pet/abc", text: "Mango, kept on Solana." };
    await expect(shareCard(card)).resolves.toEqual({ ok: true });
    expect(posted).toEqual([{ id: expect.any(String), op: "share-card", ...card }]);
  });

  it("passes on why the phone said no", async () => {
    app(() => ({ ok: false, reason: "not-saved" }));
    await expect(savePicture("data:image/png;base64,AA==", "pawket")).resolves.toEqual({ ok: false, reason: "not-saved" });
  });

  it("matches each answer to its own request", async () => {
    app((request) => ({ ok: request.op === "share-link" }));
    const [link, picture] = await Promise.all([
      shareLink({ url: "https://pawket.world/pet/abc", title: "Pepper on Pawket" }),
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

describe("care reminders", () => {
  const reminder = { at: new Date("2026-10-19T09:00:00.000Z"), title: "Mango is hungry. A meal would help.", text: "An estimate of time away." };

  it("stay off unless the phone agrees, and turning them off clears the one waiting", async () => {
    let allow = false;
    const posted = app((request) => (request.op === "allow-reminders" ? { ok: allow, reason: allow ? undefined : "denied" } : { ok: true }));
    const { result } = renderHook(() => useCareReminders());
    await act(async () => {
      await expect(result.current[1](true)).resolves.toEqual({ ok: false, reason: "denied" });
    });
    expect(result.current[0]).toBe(false);
    allow = true;
    await act(async () => {
      await result.current[1](true);
    });
    expect(result.current[0]).toBe(true);
    await act(async () => {
      await result.current[1](false);
    });
    expect(result.current[0]).toBe(false);
    expect(posted.map(({ op, on }) => [op, on])).toEqual([
      ["allow-reminders", undefined],
      ["allow-reminders", undefined],
      ["care-reminder", false],
    ]);
  });

  it("are set only while on, and turn off when the phone takes its permission back", async () => {
    let allowed = true;
    const posted = app((request) => (request.op === "care-reminder" && !allowed ? { ok: false, reason: "not-allowed" } : { ok: true }));
    await setCareReminder(reminder);
    expect(posted).toEqual([]);
    const { result } = renderHook(() => useCareReminders());
    await act(async () => {
      await result.current[1](true);
    });
    await setCareReminder(reminder);
    expect(posted.at(-1)).toEqual({ id: expect.any(String), op: "care-reminder", on: true, at: reminder.at.getTime(), title: reminder.title, text: reminder.text });
    allowed = false;
    await act(async () => {
      await setCareReminder(null);
    });
    expect(posted.at(-1)).toMatchObject({ op: "care-reminder", on: false });
    expect(result.current[0]).toBe(false);
  });
});
