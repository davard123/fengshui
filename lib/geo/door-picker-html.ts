/**
 * Leaflet-based door + facing direction picker HTML
 *
 * 用户在地图上：
 *   1. 第一次点击 → 放置「门」图钉（红色 🚪）
 *   2. 第二次点击 → 放置「面」图钉（蓝色 📍，门面朝的方向，如门外的路）
 *   3. 系统自动连线、算朝向角度
 *   4. 任一图钉可拖动，朝向实时更新
 *   5. 通过 postMessage 把 {doorLat, doorLng, facingLat, facingLng, bearing} 传回 RN
 */

export function buildDoorPickerHTML(initLat: number, initLon: number): string {
  return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; height: 100%; font-family: -apple-system, system-ui, sans-serif; }
  #map { height: 100%; width: 100%; }
  .step-banner {
    position: absolute; top: 8px; left: 8px; right: 8px; z-index: 1000;
    background: rgba(42,33,24,0.95); color: #f0d060; padding: 10px 14px;
    border-radius: 10px; font-size: 13px; font-weight: 700; text-align: center;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
  }
  .step-banner.done { background: rgba(45,106,63,0.95); color: #fff; }
  .reset-btn {
    position: absolute; bottom: 12px; right: 12px; z-index: 1000;
    padding: 8px 14px; background: #2a2118; color: #fff;
    border: none; border-radius: 8px; font-size: 13px; font-weight: 700;
    cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  }
  .layer-btn {
    position: absolute; top: 60px; right: 12px; z-index: 1000;
    padding: 6px 12px; background: rgba(255,255,255,0.95);
    border: 1px solid #d9cbbb; border-radius: 8px;
    font-size: 12px; font-weight: 700; color: #2a2118; cursor: pointer;
  }
  .pin-emoji { font-size: 28px; line-height: 28px; text-shadow: 0 1px 3px rgba(0,0,0,0.6); }
</style>
</head>
<body>
<div id="banner" class="step-banner">第①步：点击地图，标记<b>大门位置</b></div>
<button class="layer-btn" onclick="toggleLayer()">🛰 卫星图</button>
<button class="reset-btn" onclick="reset()">↺ 重置</button>
<div id="map"></div>

<script>
  const initLat = ${initLat};
  const initLon = ${initLon};

  const map = L.map('map', { zoomControl: true, attributionControl: false })
    .setView([initLat, initLon], 19);

  const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 22, maxNativeZoom: 19,
  }).addTo(map);

  const satLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 22, maxNativeZoom: 19,
  });

  let currentLayer = 'osm';
  function toggleLayer() {
    if (currentLayer === 'osm') {
      map.removeLayer(osmLayer); satLayer.addTo(map);
      currentLayer = 'sat';
      document.querySelector('.layer-btn').textContent = '🗺 街道图';
    } else {
      map.removeLayer(satLayer); osmLayer.addTo(map);
      currentLayer = 'osm';
      document.querySelector('.layer-btn').textContent = '🛰 卫星图';
    }
  }

  const doorIcon = L.divIcon({
    html: '<div class="pin-emoji">🚪</div>',
    iconSize: [30, 30], iconAnchor: [15, 26], className: '',
  });
  const facingIcon = L.divIcon({
    html: '<div class="pin-emoji" style="color:#3a7af0;">📍</div>',
    iconSize: [30, 30], iconAnchor: [15, 26], className: '',
  });

  let doorPin = null, facingPin = null, line = null, arrow = null;
  let step = 1;

  function bearing(lat1, lon1, lat2, lon2) {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = lat1 * Math.PI / 180;
    const b = lat2 * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(b);
    const x = Math.cos(a) * Math.sin(b) - Math.sin(a) * Math.cos(b) * Math.cos(dLon);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  function bearingToCardinal(b) {
    const dirs = ['N','NE','E','SE','S','SW','W','NW'];
    return dirs[Math.round(b / 45) % 8];
  }
  const CN = { N:'北', NE:'东北', E:'东', SE:'东南', S:'南', SW:'西南', W:'西', NW:'西北' };

  function update() {
    if (line) map.removeLayer(line);
    if (arrow) map.removeLayer(arrow);
    if (!doorPin || !facingPin) return;
    const d = doorPin.getLatLng(), f = facingPin.getLatLng();
    line = L.polyline([d, f], { color: '#cc2200', weight: 3, opacity: 0.85 }).addTo(map);

    const b = bearing(d.lat, d.lng, f.lat, f.lng);
    const card = bearingToCardinal(b);

    document.getElementById('banner').className = 'step-banner done';
    document.getElementById('banner').innerHTML =
      '✓ 朝向 <b>' + Math.round(b) + '°（' + CN[card] + '/' + card + '）</b> · 可拖动 🚪 或 📍 调整';

    const payload = {
      door: { lat: d.lat, lng: d.lng },
      facing: { lat: f.lat, lng: f.lng },
      bearing: b,
      cardinal: card,
    };
    // 原生 WebView 通道
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
    // Web 浏览器 iframe 通道
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(payload, '*');
    }
  }

  function reset() {
    if (doorPin)   { map.removeLayer(doorPin);   doorPin = null; }
    if (facingPin) { map.removeLayer(facingPin); facingPin = null; }
    if (line)      { map.removeLayer(line);      line = null; }
    if (arrow)     { map.removeLayer(arrow);     arrow = null; }
    step = 1;
    document.getElementById('banner').className = 'step-banner';
    document.getElementById('banner').innerHTML = '第①步：点击地图，标记<b>大门位置</b>';
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ reset: true }));
    }
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ reset: true }, '*');
    }
  }

  map.on('click', (e) => {
    if (step === 1) {
      doorPin = L.marker(e.latlng, { icon: doorIcon, draggable: true }).addTo(map);
      doorPin.on('drag', update);
      step = 2;
      document.getElementById('banner').innerHTML =
        '第②步：点击大门<b>面朝的方向</b>（如门外的路、院门、视线尽头）';
    } else if (step === 2) {
      facingPin = L.marker(e.latlng, { icon: facingIcon, draggable: true }).addTo(map);
      facingPin.on('drag', update);
      step = 3;
      update();
    }
  });
</script>
</body>
</html>`;
}
