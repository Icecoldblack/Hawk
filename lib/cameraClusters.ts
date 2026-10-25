import type { GdotCameraOption } from "./gdot511";

export const MAX_CAMERA_PINS = 70;

export type CameraCluster = { lat: number; lon: number; cameras: GdotCameraOption[] };

/** True when every camera in the cluster sits on essentially the same pin. */
export function clusterIsTight(cluster: CameraCluster) {
  return cluster.cameras.every(
    (c) => Math.abs(c.lat - cluster.lat) < 0.00035 && Math.abs(c.lon - cluster.lon) < 0.00035,
  );
}

/**
 * Grid-cluster cameras in the current view. Caps pin count so a statewide
 * list never becomes thousands of Google markers.
 */
export function clusterCameras(
  cameras: GdotCameraOption[],
  bounds: { south: number; north: number; west: number; east: number },
  zoom: number,
): CameraCluster[] {
  const padLat = (bounds.north - bounds.south) * 0.08;
  const padLng = (bounds.east - bounds.west) * 0.08;
  const south = bounds.south - padLat;
  const north = bounds.north + padLat;
  const west = bounds.west - padLng;
  const east = bounds.east + padLng;

  const visible: GdotCameraOption[] = [];
  for (const c of cameras) {
    if (c.lat >= south && c.lat <= north && c.lon >= west && c.lon <= east) visible.push(c);
  }
  if (visible.length === 0) return [];

  let cell = Math.max(0.0003, 48 / 2 ** Math.max(1, zoom));
  let clusters: CameraCluster[] = [];
  for (let i = 0; i < 8; i++) {
    const buckets = new Map<string, GdotCameraOption[]>();
    for (const c of visible) {
      const key = `${Math.floor(c.lat / cell)}:${Math.floor(c.lon / cell)}`;
      const arr = buckets.get(key);
      if (arr) arr.push(c);
      else buckets.set(key, [c]);
    }
    clusters = [];
    for (const cams of buckets.values()) {
      if (cams.length === 1) {
        clusters.push({ lat: cams[0].lat, lon: cams[0].lon, cameras: cams });
      } else {
        let lat = 0;
        let lon = 0;
        for (const cam of cams) {
          lat += cam.lat;
          lon += cam.lon;
        }
        clusters.push({ lat: lat / cams.length, lon: lon / cams.length, cameras: cams });
      }
    }
    if (clusters.length <= MAX_CAMERA_PINS) break;
    cell *= 1.7;
  }
  return clusters;
}
