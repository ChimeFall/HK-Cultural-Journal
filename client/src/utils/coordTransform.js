import gcoord from 'gcoord'

export function wgs84ToGcj02(lng, lat) {
  const [clng, clat] = gcoord.transform([lng, lat], gcoord.WGS84, gcoord.GCJ02)
  return { lng: clng, lat: clat }
}

export function gcj02ToWgs84(lng, lat) {
  const [clng, clat] = gcoord.transform([lng, lat], gcoord.GCJ02, gcoord.WGS84)
  return { lng: clng, lat: clat }
}
