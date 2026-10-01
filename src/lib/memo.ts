/**
 * Per-instance memo for slow-changing global reads (the question bank only changes on a content deploy).
 * ponytail: each server instance keeps its own copy; move to a shared cache if the bank becomes live-editable.
 */
export function memo<T>(ttlMs: number, load: () => Promise<T>): () => Promise<T> {
  let hit: { at: number; value: Promise<T> } | null = null;
  return () => {
    if (!hit || Date.now() - hit.at > ttlMs) {
      const value = load();
      value.catch(() => { hit = null; });
      hit = { at: Date.now(), value };
    }
    return hit.value;
  };
}
