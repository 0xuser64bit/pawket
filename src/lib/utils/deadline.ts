/** A disposable read budget. Pass its signal through every awaited network read. */
export function readDeadline(timeoutMs: number, parent?: AbortSignal) {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const dispose = () => {
    clearTimeout(timer);
    parent?.removeEventListener("abort", cancelled);
  };
  const abort = (reason: unknown = new DOMException("Read cancelled", "AbortError")) => {
    controller.abort(reason);
    dispose();
  };
  const cancelled = () => abort(parent?.reason);
  if (parent?.aborted) cancelled();
  else {
    parent?.addEventListener("abort", cancelled, { once: true });
    timer = setTimeout(() => abort(new DOMException("Read took too long", "TimeoutError")), timeoutMs);
  }
  return { signal: controller.signal, abort, dispose };
}
