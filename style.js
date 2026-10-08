// Maalam map style (brand direction B, ADR 0002): a calm light map with a strict road
// hierarchy and highways in signal blue. Written from scratch for the OpenMapTiles schema
// that Planetiler builds; colours come from the brand palette.

export const PALETTE = {
  paper: "#F3F4F1", // ground
  graphite: "#1E2522", // text
  signal: "#2443A8", // highways, brand blue
  signalDark: "#18307E",
  marker: "#F7C948", // brand yellow
  primary: "#FFF1BF", // primary roads: marker yellow, softened
  primaryCase: "#D8C47A",
  mist: "#D6DCE8",
  street: "#FFFFFF",
  streetCase: "#C9CDC6",
  residential: "#ECEEEA",
  commercial: "#ECEDF3",
  industrial: "#E7E8EB",
  park: "#D6E7D3",
  wood: "#CDE0C8",
  sand: "#F0ECE1",
  water: "#A9C9E6",
  waterText: "#2F5F91",
  building: "#E1E2DD",
  buildingLine: "#D1D3CD",
  rail: "#9AA0A6",
  muted: "#59625E",
};

// glyph fontstacks built by pipeline/glyphs.py from IBM Plex Sans Arabic (OFL; renamed, see there)
export const FONT = { regular: ["maalam-ar-regular"], medium: ["maalam-ar-medium"], bold: ["maalam-ar-semibold"] };

// English mode shows a real English name, else the name as written. Never name:latin:
// Planetiler fills it with an ISO-233-style transliteration (ạ ẗ ẖ ʿ …) whose letters our font
// does not have, and MapLibre drops missing letters silently ("msẖrạq" showed as "msrq").
export const LABEL_KEYS = { ar: ["name:ar", "name"], en: ["name:en", "name"] };

export function label(lang) {
  return ["coalesce", ...LABEL_KEYS[lang].map((k) => ["get", k])];
}

const MAJOR = ["motorway", "trunk"];
// line width in px at z10 and z17 per road class; extra adds the casing
function width(extra) {
  const at = (z10, z17) => [z10 + (z10 ? extra : 0), z17 + extra];
  const w = { motorway: at(2, 20), trunk: at(1.8, 18), primary: at(1.2, 15), secondary: at(0.8, 12),
              tertiary: at(0.6, 10), minor: at(0, 7), service: at(0, 4) };
  const pick = (i) => ["match", ["get", "class"], ...Object.entries(w).flatMap(([k, v]) => [k, v[i]]), 0];
  return ["interpolate", ["exponential", 1.5], ["zoom"], 10, pick(0), 17, pick(1)];
}

export function maalamStyle({ tiles, glyphs, lang = "ar" }) {
  const P = PALETTE, s = "osm";
  const fill = (id, layer, color, extra = {}) => ({ id, type: "fill", source: s, "source-layer": layer, paint: { "fill-color": color }, ...extra });
  const roadFill = ["match", ["get", "class"], MAJOR, P.signal, "primary", P.primary, P.street];
  const roadCase = ["match", ["get", "class"], MAJOR, P.signalDark, "primary", P.primaryCase, P.streetCase];
  const drivable = ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary", "secondary", "tertiary", "minor", "service"]]];
  const tunnel = ["==", ["get", "brunnel"], "tunnel"];
  return {
    version: 8,
    name: "Maalam",
    glyphs,
    sources: { [s]: { type: "vector", url: tiles, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' } },
    layers: [
      { id: "ground", type: "background", paint: { "background-color": P.paper } },
      fill("landcover-sand", "landcover", P.sand, { filter: ["==", ["get", "class"], "sand"] }),
      fill("landuse", "landuse", ["match", ["get", "class"], "residential", P.residential, ["commercial", "retail"], P.commercial, "industrial", P.industrial, P.residential]),
      fill("landcover-green", "landcover", ["match", ["get", "class"], "wood", P.wood, P.park], { filter: ["in", ["get", "class"], ["literal", ["grass", "wood", "farmland"]]] }),
      fill("park", "park", P.park),
      fill("water", "water", P.water),
      { id: "waterway", type: "line", source: s, "source-layer": "waterway", paint: { "line-color": P.water, "line-width": 1.2 } },
      { id: "aeroway", type: "line", source: s, "source-layer": "aeroway", minzoom: 11, filter: ["in", ["get", "class"], ["literal", ["runway", "taxiway"]]],
        paint: { "line-color": P.mist, "line-width": ["interpolate", ["linear"], ["zoom"], 11, 2, 16, ["match", ["get", "class"], "runway", 40, 12]] } },
      fill("building", "building", P.building, { minzoom: 14, paint: { "fill-color": P.building, "fill-outline-color": P.buildingLine } }),
      // tunnels drawn faint and dashed, below the surface roads
      { id: "tunnel", type: "line", source: s, "source-layer": "transportation", minzoom: 12, filter: ["all", tunnel, drivable],
        paint: { "line-color": roadCase, "line-width": width(0), "line-opacity": 0.45, "line-dasharray": [2, 1.5] } },
      { id: "path", type: "line", source: s, "source-layer": "transportation", minzoom: 15, filter: ["in", ["get", "class"], ["literal", ["path", "track"]]],
        paint: { "line-color": P.streetCase, "line-width": 1, "line-dasharray": [2, 2] } },
      { id: "rail", type: "line", source: s, "source-layer": "transportation", minzoom: 11, filter: ["in", ["get", "class"], ["literal", ["rail", "transit"]]],
        paint: { "line-color": P.rail, "line-width": 1.6, "line-dasharray": [4, 3] } },
      { id: "road-case", type: "line", source: s, "source-layer": "transportation", minzoom: 11, filter: ["all", ["!", tunnel], drivable],
        layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": roadCase, "line-width": width(1.6) } },
      { id: "road", type: "line", source: s, "source-layer": "transportation", filter: ["all", ["!", tunnel], drivable],
        layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": roadFill, "line-width": width(0) } },
      { id: "district-line", type: "line", source: s, "source-layer": "boundary", minzoom: 12, filter: [">=", ["get", "admin_level"], 9],
        paint: { "line-color": P.mist, "line-width": 1.2, "line-dasharray": [3, 2] } },
      { id: "water-name", type: "symbol", source: s, "source-layer": "water_name", layout: { "text-field": label(lang), "text-font": FONT.regular, "text-size": 12 },
        paint: { "text-color": P.waterText, "text-halo-color": P.paper, "text-halo-width": 1.2 } },
      { id: "road-name", type: "symbol", source: s, "source-layer": "transportation_name", minzoom: 13,
        layout: { "symbol-placement": "line", "text-field": label(lang), "text-font": FONT.regular,
                  "text-size": ["interpolate", ["linear"], ["zoom"], 13, 10.5, 17, 13.5], "text-max-angle": 30 },
        // on a blue highway the name is white on blue, elsewhere graphite on white
        paint: { "text-color": ["match", ["get", "class"], MAJOR, "#FFFFFF", P.graphite],
                 "text-halo-color": ["match", ["get", "class"], MAJOR, P.signalDark, "#FFFFFF"], "text-halo-width": 1.6 } },
      { id: "poi", type: "symbol", source: s, "source-layer": "poi", minzoom: 15, filter: ["<=", ["get", "rank"], 25],
        layout: { "text-field": label(lang), "text-font": FONT.regular, "text-size": 11.5, "text-max-width": 8,
                  "text-anchor": "top", "text-offset": [0, 0.5] },
        paint: { "text-color": P.muted, "text-halo-color": P.paper, "text-halo-width": 1.4 } },
      { id: "poi-dot", type: "circle", source: s, "source-layer": "poi", minzoom: 15, filter: ["<=", ["get", "rank"], 25],
        paint: { "circle-radius": 3.2, "circle-color": P.marker, "circle-stroke-color": P.graphite, "circle-stroke-width": 1 } },
      { id: "place", type: "symbol", source: s, "source-layer": "place", filter: ["in", ["get", "class"], ["literal", ["suburb", "neighbourhood", "quarter", "village", "town", "city"]]],
        layout: { "text-field": label(lang), "text-font": ["match", ["get", "class"], "city", ["literal", FONT.bold], ["literal", FONT.medium]],
                  "text-size": ["match", ["get", "class"], "city", 20, "town", 16, "suburb", 14, 12.5], "text-max-width": 7,
                  "text-letter-spacing": lang === "en" ? 0.04 : 0 },
        paint: { "text-color": ["match", ["get", "class"], "city", P.graphite, P.muted], "text-halo-color": P.paper, "text-halo-width": 2 } },
    ],
  };
}
