const DEFAULT_REALTIME_URL = "http://112.213.91.235:3005/realtime";

export function resolveRealtimeUrl(...candidates) {
  const configured = candidates.find(Boolean);

  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    if (!configured) return `${window.location.origin}/realtime`;

    try {
      const url = new URL(configured, window.location.origin);
      if (url.protocol === "http:") return `${window.location.origin}/realtime`;
    } catch {
      return `${window.location.origin}/realtime`;
    }
  }

  return configured || DEFAULT_REALTIME_URL;
}
