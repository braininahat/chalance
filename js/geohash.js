// Geohash encoding/decoding
// 5-char precision ≈ ±2.4km lat, ±4.9km lon

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export function encode(lat, lon, precision = 5) {
  let idx = 0;
  let bit = 0;
  let evenBit = true;
  let hash = '';
  let latMin = -90, latMax = 90;
  let lonMin = -180, lonMax = 180;

  while (hash.length < precision) {
    if (evenBit) {
      const lonMid = (lonMin + lonMax) / 2;
      if (lon >= lonMid) {
        idx = idx * 2 + 1;
        lonMin = lonMid;
      } else {
        idx = idx * 2;
        lonMax = lonMid;
      }
    } else {
      const latMid = (latMin + latMax) / 2;
      if (lat >= latMid) {
        idx = idx * 2 + 1;
        latMin = latMid;
      } else {
        idx = idx * 2;
        latMax = latMid;
      }
    }
    evenBit = !evenBit;
    if (++bit === 5) {
      hash += BASE32[idx];
      bit = 0;
      idx = 0;
    }
  }
  return hash;
}

export function neighbors(hash) {
  const { lat, lon } = decode(hash);
  const precision = hash.length;
  // Approximate cell dimensions for 5-char geohash
  const latErr = 0.022;
  const lonErr = 0.044;

  return [
    encode(lat + latErr, lon - lonErr, precision), // NW
    encode(lat + latErr, lon, precision),           // N
    encode(lat + latErr, lon + lonErr, precision), // NE
    encode(lat, lon - lonErr, precision),           // W
    hash,                                            // center
    encode(lat, lon + lonErr, precision),           // E
    encode(lat - latErr, lon - lonErr, precision), // SW
    encode(lat - latErr, lon, precision),           // S
    encode(lat - latErr, lon + lonErr, precision), // SE
  ];
}

export function decode(hash) {
  let evenBit = true;
  let latMin = -90, latMax = 90;
  let lonMin = -180, lonMax = 180;

  for (const c of hash) {
    const idx = BASE32.indexOf(c);
    for (let bits = 4; bits >= 0; bits--) {
      const bitN = (idx >> bits) & 1;
      if (evenBit) {
        const lonMid = (lonMin + lonMax) / 2;
        if (bitN === 1) lonMin = lonMid;
        else lonMax = lonMid;
      } else {
        const latMid = (latMin + latMax) / 2;
        if (bitN === 1) latMin = latMid;
        else latMax = latMid;
      }
      evenBit = !evenBit;
    }
  }
  return {
    lat: (latMin + latMax) / 2,
    lon: (lonMin + lonMax) / 2,
  };
}
