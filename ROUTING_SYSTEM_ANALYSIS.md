# Falles360 Routing System - Comprehensive Analysis

## Executive Summary

The Falles360 application has TWO DISTINCT ROUTING IMPLEMENTATIONS:

1. **Public App** (Mobile/Simple)
   - Location: C:\xampp\htdocs\fallasgo\falles360\public\assets\js\app-map.js (1,112 lines)
   - Uses simple polyline drawing for route visualization
   - Delegates actual navigation to Google Maps via route_url
   - No turn-by-turn guidance

2. **Dashboard App** (Advanced)
   - Location: C:\xampp\htdocs\fallasgo\falles360\dashboard\src/
   - React/TypeScript full-featured routing
   - Uses Leaflet Routing Machine (OSRM-based)
   - Includes turn-by-turn guidance with voice
   - Real-time position tracking
   - Comprehensive route caching

---

## 1. PUBLIC APP ROUTING SYSTEM

### Main Implementation File
- C:\xampp\htdocs\fallasgo\falles360\public\assets\js\app-map.js (1,112 lines)

### Button Implementation
- Button Element: elements.sheetRoute (line 71)
- Event Handler: routePlans click listener (lines 970-980)
- Activation Function: applyRoutePlan() (lines 825-876)

### Route Drawing
- Uses L.polyline() from Leaflet.js
- Color: #3388ff (blue)
- Weight: 4px
- Opacity: 0.9

### State Management
`
state.routeLine = null  // Stores current route geometry
`

### Route URLs
- Generated in: core/public_app_repository.php (lines 103-108)
- Function: app_public_route_url()
- Format: https://www.google.com/maps/dir/?api=1&destination={lat},{lng}

### Route Plans (Lines 403-461)
1. Premios (awarded fallas)
2. Infantil (family-friendly)
3. Cercana (nearby user)
4. Favoritas (user favorites)
5. Principal (main fallas)

### Missing Features in Public App
- No turn-by-turn directions
- No voice guidance
- No live tracking
- No offline support
- External navigation only (Google Maps)

---

## 2. DASHBOARD APP ROUTING SYSTEM

### Key Files
- utils/navigation.ts (425 lines) - route calculation
- hooks/useRouteData.ts (166 lines) - route fetching & caching
- hooks/useNavigationGuidance.ts (227 lines) - turn-by-turn logic
- hooks/useUserLocation.ts (134 lines) - GPS tracking
- components/NavigationMapModal.tsx (999 lines) - main routing UI
- components/RoutingMachineLayer.tsx (303 lines) - OSRM integration
- components/NavigationDirectionsPanel.tsx (371 lines) - directions UI

### Route Calculation Flow
1. User selects destination
2. useRouteData() is called with origin and destination
3. Attempts OSRM first via fetchRouteFromOsrm()
4. Falls back to POST /api/route
5. Returns RouteData with geometry and steps
6. RoutingMachineLayer renders visualization
7. useNavigationGuidance tracks user position
8. Steps auto-advance when user approaches waypoints

### OSRM Configuration
- Service URL: https://router.project-osrm.org/route/v1
- Profile: hardcoded to 'driving' (bug: should use parameter)
- Parameters: overview=full, geometries=geojson, steps=true

### Route Caching
- Max 48 routes cached in-memory
- Cache key: {originLat},{originLng}|{destLat},{destLng}|{profile}
- No persistent storage (lost on refresh)

### Turn-by-Turn Guidance
- Auto-advances when user is within 42 meters of next waypoint
- Voice announcement with Spanish text-to-speech
- Step index displayed (e.g., 3/12)
- Voice rate: 1.02 (slightly faster)

### User Position Tracking
- Uses navigator.geolocation API
- Continuous watchPosition() with 5s max age
- Only updates if moved >= 6 meters from last position
- Timeout: 15 seconds

### Voice Guidance
- Uses Web Speech API (SpeechSynthesis)
- Searches for es-ES voice, falls back to Spanish
- Auto-announces turns when guidance is active
- Can be toggled on/off

### Missing Features in Dashboard
- /api/route endpoint may not be implemented
- Hardcoded driving profile (should be dynamic)
- No voice fallback if es-ES unavailable
- Route cache is in-memory only
- OSRM has rate limits
- Leaflet Routing Machine loaded from CDN (could fail)

---

## 3.  INICIAR RUTA / START ROUTE FLOW

### Public App
1. User opens falla detail sheet
2. Sees route plan options (premios, infantil, etc)
3. Clicks Activar ruta button (data-route-plan attribute)
4. applyRoutePlan() updates filters
5. Route coordinates extracted from filtered fallas
6. L.polyline() draws route on map
7. map.fitBounds() adjusts viewport
8. User taps sheetRoute link to open Google Maps

### Dashboard App
1. User clicks Iniciar ruta button in NavigationMapModal
2. Route calculation begins
3. useRouteData fetches from OSRM or /api/route
4. RoutingMachineLayer renders visualization
5. NavigationDirectionsPanel shows next turn
6. User can start guidance mode
7. GPS tracking begins
8. Steps auto-advance as user moves
9. Voice announces each turn (optional)

---

## 4. MAP DRAWING & RENDERING

### Public App
- Leaflet.js tile layer: OpenStreetMap
- Polyline: simple L.polyline() for routes
- Markers: L.marker() for fallas
- User position: L.circleMarker() (blue circle)

### Dashboard App
- React-Leaflet components
- TileLayer for basemap
- Custom marker icons for user and destination
- RoutePolylineLayer for route geometry
- RouteDirectionArrowsLayer for direction indicators
- RouteStepMarkersLayer for waypoints
- Theme-aware colors (dark/light mode)

---

## 5. BOTTOM PANEL / ROUTE INFO

### Public App
- mapCount: number of visible fallas
- filterLabel: active filters summary
- mapModeLabel: Nearby, Favorites, Prizes, General
- heroSummary: full summary text
- Featured falla cards
- Route plan cards with preview

### Dashboard App
- NavigationDirectionsPanel shows:
  - Current turn instruction
  - Distance remaining
  - Time remaining
  - Step progress (X/Y)
  - Voice toggle
  - Profile toggle (walking/driving)
  - Guidance status

---

## 6. USER POSITION

### Public App (Lines 1048-1094)
`
navigator.geolocation.getCurrentPosition()
  - One-time request only
  - Draws blue circle marker
  - Does not track continuous movement
`

### Dashboard App (useUserLocation.ts)
`
navigator.geolocation.watchPosition()
  - Continuous tracking
  - Only updates if >= 6 meters movement
  - 5000ms max age
  - 15000ms timeout
`

---

## 7. KEY DIFFERENCES

| Feature | Public App | Dashboard |
|---------|-----------|-----------|
| Routing Engine | Google Maps | OSRM |
| Turn-by-Turn | No | Yes |
| Voice | No | Yes (es-ES) |
| Live Tracking | No | Yes |
| Caching | No | Yes (48 routes) |
| Offline Route | Partial | Partial |
| UI Framework | Vanilla JS | React |
| Map Library | Leaflet JS | React-Leaflet |
| Alternative Routes | No | Yes |

---

## 8. MISSING / BROKEN

### Critical
1. /api/route endpoint incomplete
2. Driving profile hardcoded (should be dynamic)
3. OSRM CDN dependency (no fallback)
4. No retry logic for timeouts

### Important
1. Voice fallback if es-ES unavailable
2. Route cache not persistent
3. GPS accuracy issues in urban canyons
4. Rate limits on OSRM

### Nice to Have
1. Local OSRM instance
2. Route optimization
3. Save/share routes
4. Real-time traffic integration

---

## 9. FILE LOCATIONS SUMMARY

C:\xampp\htdocs\fallasgo\falles360\
  public\assets\js\
    - app-map.js (PUBLIC APP MAIN)
  dashboard\src\
    - utils\navigation.ts (route calculation)
    - hooks\useRouteData.ts (route fetching)
    - hooks\useNavigationGuidance.ts (guidance)
    - hooks\useUserLocation.ts (GPS)
    - components\NavigationMapModal.tsx (MAIN ROUTING UI)
    - components\RoutingMachineLayer.tsx (OSRM integration)
    - components\NavigationDirectionsPanel.tsx (directions UI)
  core\
    - public_app_repository.php (route_url generation)
  api\
    - fallas.php (returns route_url)
    - events.php (returns route_url)