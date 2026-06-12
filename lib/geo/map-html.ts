/**
 * map-html.ts — v3 的两个 Leaflet 地图（WebView/iframe 内嵌）
 *
 * 1. buildFootprintMapHTML —— 显示/手描建筑轮廓，确认太极点
 * 2. buildExteriorMapHTML —— 宅中心 + 三距离环 + 地物标记
 *
 * 通信：原生 ReactNativeWebView.postMessage + Web window.parent.postMessage 双通道
 */

import type { GeoPoint } from "@/types/fengshui"

const LEAFLET_HEAD = `
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; font-family: -apple-system, system-ui, sans-serif; }
  #map { height: 100%; width: 100%; }
  .banner {
    position: absolute; top: 8px; left: 8px; right: 8px; z-index: 1000;
    background: rgba(42,33,24,0.95); color: #f0d060; padding: 10px 14px;
    border-radius: 10px; font-size: 13px; font-weight: 700; text-align: center;
  }
  .banner.ok { background: rgba(45,106,63,0.95); color: #fff; }
  .ctl-btn {
    position: absolute; z-index: 1000;
    padding: 8px 14px; background: #2a2118; color: #fff;
    border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer;
  }
  .layer-btn { top: 56px; right: 12px; background: rgba(255,255,255,0.95); color: #2a2118; border: 1px solid #d9cbbb; }
  .reset-btn { bottom: 12px; right: 12px; }
</style>`

const POST_MSG = `
function post(data) {
  const s = JSON.stringify(data)
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s)
  if (window.parent && window.parent !== window) window.parent.postMessage(data, '*')
}`

const LAYERS = `
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 22, maxNativeZoom: 19 })
const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 22, maxNativeZoom: 19 })
let cur = 'sat'
sat.addTo(map)
function toggleLayer() {
  if (cur === 'sat') { map.removeLayer(sat); osm.addTo(map); cur = 'osm'; document.getElementById('layerBtn').textContent = '🛰 卫星图' }
  else { map.removeLayer(osm); sat.addTo(map); cur = 'sat'; document.getElementById('layerBtn').textContent = '🗺 街道图' }
}`

// ─────────────────────────────────────────────────────────────────────────────
// 1. 轮廓确认/手描地图
//    osmPolygon 非空 → 显示轮廓，用户可"确认"或"重新手描"
//    空 → 直接进入手描模式（点 ≥3 个角，自动闭合）
//    回传: { polygon: [{lat,lng}...], confirmed: true }
// ─────────────────────────────────────────────────────────────────────────────
export function buildFootprintMapHTML(center: GeoPoint, osmPolygon: GeoPoint[] | null): string {
  const polyJson = JSON.stringify(osmPolygon?.map((p) => [p.lat, p.lon]) ?? null)
  return `<!DOCTYPE html><html><head>${LEAFLET_HEAD}</head><body>
<div id="banner" class="banner"></div>
<button id="layerBtn" class="ctl-btn layer-btn" onclick="toggleLayer()">🗺 街道图</button>
<button id="resetBtn" class="ctl-btn reset-btn" onclick="resetDraw()">↺ 重新手描</button>
<div id="map"></div>
<script>
${POST_MSG}
const map = L.map('map', { attributionControl: false }).setView([${center.lat}, ${center.lon}], 19)
${LAYERS}

const osmPoly = ${polyJson}
let polyLayer = null
let drawPts = []
let drawMarkers = []
let mode = osmPoly ? 'confirm' : 'draw'

function setBanner(text, ok) {
  const b = document.getElementById('banner')
  b.textContent = text
  b.className = ok ? 'banner ok' : 'banner'
}

function showPolygon(pts) {
  if (polyLayer) map.removeLayer(polyLayer)
  polyLayer = L.polygon(pts, { color: '#f0d060', weight: 3, fillColor: '#f0d060', fillOpacity: 0.25 }).addTo(map)
  const c = polyLayer.getBounds().getCenter()
  L.circleMarker(c, { radius: 6, color: '#cc2200', fillColor: '#cc2200', fillOpacity: 1 }).addTo(map)
  post({ polygon: pts.map(p => ({ lat: p[0], lng: p[1] })), confirmed: true })
  setBanner('✓ 轮廓已确认（红点=宅中心/太极点）。不准可点右下角重描', true)
}

function resetDraw() {
  if (polyLayer) { map.removeLayer(polyLayer); polyLayer = null }
  drawMarkers.forEach(m => map.removeLayer(m))
  drawMarkers = []; drawPts = []
  mode = 'draw'
  post({ reset: true })
  setBanner('手描模式：沿房屋四角依次点击（至少3点），点回起点附近自动闭合')
}

map.on('click', (e) => {
  if (mode !== 'draw') return
  const pt = [e.latlng.lat, e.latlng.lng]
  // 闭合检测：点回第一点 15m 内
  if (drawPts.length >= 3) {
    const d = map.distance(e.latlng, L.latLng(drawPts[0][0], drawPts[0][1]))
    if (d < 15) { mode = 'confirm'; showPolygon(drawPts); return }
  }
  drawPts.push(pt)
  drawMarkers.push(L.circleMarker(e.latlng, { radius: 5, color: '#cc2200', fillOpacity: 1 }).addTo(map))
  if (drawPts.length >= 2) {
    if (polyLayer) map.removeLayer(polyLayer)
    polyLayer = L.polyline(drawPts, { color: '#f0d060', weight: 2, dashArray: '4,4' }).addTo(map)
  }
  setBanner('已点 ' + drawPts.length + ' 个角，' + (drawPts.length >= 3 ? '点回起点闭合' : '继续点下一个角'))
})

if (osmPoly) {
  showPolygon(osmPoly)
  setBanner('✓ 自动找到建筑轮廓（红点=太极点）。如不是你的房子，点右下角手描', true)
} else {
  resetDraw()
}
</script></body></html>`
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. 外局环带地图：宅中心 + 50/200/1000m 三环 + 自动地物标记
//    features: [{id, kind, lat, lng, distance}]
//    回传: { tapAdd: {lat,lng,bearing,distance} }（用户点图新增地物时）
// ─────────────────────────────────────────────────────────────────────────────
export function buildExteriorMapHTML(
  center: GeoPoint,
  facingDegree: number,
  features: { id: string; kind: string; lat: number; lon: number }[],
): string {
  const fJson = JSON.stringify(features)
  return `<!DOCTYPE html><html><head>${LEAFLET_HEAD}</head><body>
<div id="banner" class="banner">三环=近50m/中200m/远1km · 红箭头=朝向 · 点图可补充地物</div>
<button id="layerBtn" class="ctl-btn layer-btn" onclick="toggleLayer()">🗺 街道图</button>
<div id="map"></div>
<script>
${POST_MSG}
const C = [${center.lat}, ${center.lon}]
const map = L.map('map', { attributionControl: false }).setView(C, 16)
${LAYERS}

// 三距离环
L.circle(C, { radius: 50,  color: '#f0d060', weight: 2, fill: false }).addTo(map)
L.circle(C, { radius: 200, color: '#f0a030', weight: 2, fill: false, dashArray: '6,4' }).addTo(map)
L.circle(C, { radius: 1000, color: '#c87820', weight: 1.5, fill: false, dashArray: '2,6' }).addTo(map)

// 宅中心 + 朝向箭头
L.circleMarker(C, { radius: 7, color: '#cc2200', fillColor: '#cc2200', fillOpacity: 1 }).addTo(map)
const fd = ${facingDegree} * Math.PI / 180
const arrowEnd = [
  C[0] + 0.0009 * Math.cos(fd),
  C[1] + 0.0009 * Math.sin(fd) / Math.cos(C[0] * Math.PI / 180),
]
L.polyline([C, arrowEnd], { color: '#cc2200', weight: 4 }).addTo(map)
  .bindTooltip('朝向', { permanent: false })

// 已识别地物
const feats = ${fJson}
for (const f of feats) {
  L.circleMarker([f.lat, f.lon], { radius: 6, color: '#3a7af0', fillColor: '#3a7af0', fillOpacity: 0.8 })
    .addTo(map).bindTooltip(f.kind)
}

// 点图补充地物（回传方位角+距离，由 RN 侧弹窗选类型）
function bearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = lat1 * Math.PI / 180, b = lat2 * Math.PI / 180
  const y = Math.sin(dLon) * Math.cos(b)
  const x = Math.cos(a) * Math.sin(b) - Math.sin(a) * Math.cos(b) * Math.cos(dLon)
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}
map.on('click', (e) => {
  const d = map.distance(L.latLng(C[0], C[1]), e.latlng)
  if (d > 2000) return
  const b = bearing(C[0], C[1], e.latlng.lat, e.latlng.lng)
  L.circleMarker(e.latlng, { radius: 6, color: '#cc8800', fillColor: '#cc8800', fillOpacity: 0.9 }).addTo(map)
  post({ tapAdd: { lat: e.latlng.lat, lng: e.latlng.lng, bearing: b, distance: Math.round(d) } })
})
</script></body></html>`
}
