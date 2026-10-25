const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export const GOOGLE_MAPS_BROWSER_KEY = KEY;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GoogleMapsApi = any;

let loader: Promise<GoogleMapsApi> | null = null;

/** One script tag for the whole app. Two maps on /traffic would otherwise race. */
export function loadGoogleMaps(): Promise<GoogleMapsApi> {
  if (typeof window === "undefined") return Promise.reject(new Error("Google Maps is browser-only"));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w.google?.maps?.Map) return Promise.resolve(w.google.maps);
  if (!KEY) return Promise.reject(new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set"));
  loader ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}&v=weekly`;
    s.async = true;
    s.onload = () => resolve(w.google.maps);
    s.onerror = () => {
      loader = null;
      reject(new Error("Google Maps failed to load"));
    };
    document.head.appendChild(s);
  });
  return loader;
}
