# MapXV — Angular 18 Aircraft Tracking Application

Real-time aircraft position visualization using **MapLibre GL JS** and the **OpenSky Network API**.

---

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| Angular | 18 | Framework (standalone APIs) |
| MapLibre GL JS | 5.x | Map rendering (WebGL) |
| RxJS | 7.8 | Async streams (polling, HTTP) |
| Angular Signals | 18 | Reactive state management |
| TypeScript | 5.5 | Strict mode |
| `@types/geojson` | 7946 | GeoJSON typings |

---

## Project Structure

```
src/app/
├── domain/aircraft/
│   ├── aircraft.model.ts              # AircraftState, OpenSkyApiResponse, RawAircraftStateArray
│   └── aircraft-geojson.model.ts     # AircraftFeature, AircraftFeatureCollection types
│
├── data/aircraft/
│   ├── aircraft.adapter.ts            # Raw array[] → AircraftState (pure fn, null-safe)
│   ├── aircraft.adapter.spec.ts       # 14 unit tests
│   ├── aircraft.repository.ts         # HTTP + adapter + catchError
│   ├── aircraft.repository.spec.ts    # 5 unit tests
│   ├── aircraft-geojson.mapper.ts     # AircraftState → GeoJSON (pure fn)
│   └── aircraft-geojson.mapper.spec.ts# 4 unit tests
│
├── infrastructure/
│   ├── polling/
│   │   └── polling.service.ts         # Generic timer + switchMap + retry + takeUntil
│   └── visibility/
│       └── visibility.service.ts      # Page Visibility API — pauses polling on hidden tab
│
├── state/aircraft/
│   ├── aircraft.store.ts              # Signals store, normalized Record<icao24, AircraftState>
│   └── aircraft.store.spec.ts         # 12 unit tests
│
├── application/aircraft/
│   └── aircraft.facade.ts             # Orchestration: visibility → polling → store
│
├── shared/map/
│   ├── map.service.ts                 # MapLibre encapsulation (runOutsideAngular)
│   └── map.tokens.ts                  # InjectionToken<MapConfig> (style, center, zoom)
│
└── pages/map-view/
    ├── map-view.component.ts          # Smart component — effects bridge facade → map
    ├── map-view.component.html        # Template
    ├── map-view.component.css         # Styles
    └── map-container/
        └── map-container.component.ts # Dumb — holds the map canvas <div>
```

---

## Data Flow

```
OpenSky Network API  (/api/states/all via dev proxy)
        │
        ▼
AircraftRepository       HTTP GET, delegates to adapter, catchError → []
        │
        ▼
AircraftAdapter          array[17] → AircraftState | null
                         Filters: null lat/lon discarded
                         Defaults: null callsign→'N/A', null velocity→0, etc.
        │
        ▼
PollingService           timer(0, 10s) + switchMap + retry(3) + takeUntil(stop$)
        │
   [VisibilityService]   Pauses stream when document.hidden === true
        │
        ▼
AircraftStore            Normalizes AircraftState[] → Record<icao24, AircraftState>
                         Signals: _aircraftMap, _loading, _error, _selectedIcao24
                         Computed: aircraftCount, aircraftGeoJson, selectedAircraft
        │
        ▼
AircraftFacade           Delegates store selectors + orchestrates polling lifecycle
        │
        ▼
MapViewComponent         effect() watches aircraftGeoJson() + isReady()
                         → mapService.updateAircraftSource(geojson)
        │
        ▼
MapService               source.setData(geojson)  [outside NgZone]
        │
        ▼
MapLibre GL JS           WebGL render — generateId: true enables feature diffing
```

---

## State Management

All state lives in `AircraftStore` as Angular Signals:

| Signal | Type | Description |
|---|---|---|
| `_aircraftMap` | `Record<string, AircraftState>` | Normalized aircraft state |
| `_loading` | `boolean` | True during first fetch |
| `_error` | `string \| null` | Last fetch error message |
| `_selectedIcao24` | `string \| null` | Currently selected aircraft |

Computed signals (auto-invalidated):

| Computed | Depends on | Description |
|---|---|---|
| `aircraftCount` | `_aircraftMap` | Number of tracked aircraft |
| `aircraftGeoJson` | `_aircraftMap` | Full GeoJSON FeatureCollection for map |
| `selectedAircraft` | `_aircraftMap` + `_selectedIcao24` | Full model of selected aircraft |

RxJS is used **only** for:
- `timer()` interval in PollingService
- `HttpClient` in repository
- `Page Visibility API` event stream
- `Subject<string>` for aircraft click events

---

## Map Integration

`MapService` is the **only** class that touches MapLibre. Rules enforced:

- `new MaplibreMap()` → called once, inside `runOutsideAngular()`
- `addSource()` + `addLayer()` → called once on map `load` event
- Updates → `source.setData(geojson)` only, inside `runOutsideAngular()`
- `flyTo()` → inside `runOutsideAngular()` (animation runs at 60fps, no zone)
- Click events → `Subject<string>` (event, not state — not stored in a signal)
- `isReady` → only signal in MapService, legitimately tracks map lifecycle

### GeoJSON Source Configuration

```typescript
map.addSource('aircraft-source', {
  type: 'geojson',
  data: EMPTY_GEOJSON,
  generateId: true,   // enables MapLibre internal feature diffing
});
```

---

## Click Interaction Flow

```
User clicks aircraft marker
  → MapLibre 'click' event fires on 'aircraft-layer'
    → MapService extracts icao24 from feature.properties
      → ngZone.run(() => _aircraftClick$.next(icao24))
        → MapViewComponent subscription (takeUntilDestroyed)
          → facade.selectAircraft(icao24)
            → store._selectedIcao24.set(icao24)
              → selectedAircraft computed() re-evaluates
                → info panel renders in template
                → flyTo effect() fires (guarded by lastCenteredIcao)
                  → mapService.flyTo(lon, lat)  [outside zone]
```

### flyTo Guard (prevents repeated centering)

```typescript
let lastCenteredIcao: string | null = null;

effect(() => {
  const icao24 = this.facade.selectedIcao24();     // primitive — stable between polls
  const aircraft = this.facade.selectedAircraft();  // full model for coordinates

  if (!aircraft || icao24 === lastCenteredIcao) return;

  lastCenteredIcao = icao24;
  this.mapService.flyTo(aircraft.longitude, aircraft.latitude);
});
```

Uses `selectedIcao24` (primitive string, stable) not `selectedAircraft` (object, recreated each poll).

---

## Performance

### Zone Strategy

| Operation | Zone | Reason |
|---|---|---|
| `new MaplibreMap()` | Outside | Prevents zone from intercepting internal events |
| `source.setData()` | Outside | No CD needed — WebGL render |
| `map.flyTo()` | Outside | Runs at 60fps — never touch zone |
| `isReady.set(true)` | Inside | Must trigger effects / template update |
| `_aircraftClick$.next()` | Inside | Must trigger subscription in component |
| Visibility listener | Outside | No UI side effects |

### Update Efficiency per 10s Poll

| Step | Cost |
|---|---|
| HTTP request | 1 |
| Adapter (filter + map) | O(n) — single pass |
| Store normalization | O(n) — single pass |
| GeoJSON `computed()` | O(n) — only if `_aircraftMap` changed |
| `setData()` to MapLibre | 1 call, GPU handles diff |
| Change detection cycles | 0 (all map ops outside zone) |
| `flyTo()` calls | 0 (guarded) |

### Polling Cancellation

```
switchMap     → cancels stale in-flight HTTP requests
takeUntil     → stops timer when stopPolling() called
switchMap(EMPTY) → halts entire stream when tab hidden
takeUntilDestroyed → cleans component subscription on destroy
```

---

## CORS — Dev Proxy

OpenSky's API blocks cross-origin requests from localhost. Solved via Angular dev proxy:

```
Browser → GET http://localhost:4200/api/states/all
               ↓ (Angular dev server, server-side)
OpenSky ← GET https://opensky-network.org/api/states/all
               ↓
Browser ← response (same origin — no CORS check)
```

**Files:** `proxy.conf.json` + `angular.json` `proxyConfig` (development only).

> For production: configure nginx `proxy_pass` or a backend API gateway.

---

## Error Handling

| Layer | Mechanism | Behavior |
|---|---|---|
| Adapter | `?? default` / `null` filter | Invalid aircraft never reach store |
| Repository | `catchError(() => of([]))` | HTTP errors → empty array, polling continues |
| Polling | `retry({ count: 3, resetOnSuccess: true })` | Transient failures retried automatically |
| Store | `_error` signal | Error message surfaced to UI |
| UI | `@if (facade.error())` | Error overlay displayed |
| UI | `@else if (facade.selectedIcao24())` | Stale selection shown with visual indicator |

---

## Edge Cases Handled

| Scenario | Handling |
|---|---|
| Aircraft with null lat/lon | Filtered in adapter — never reaches store |
| Null callsign / squawk | Defaulted to `'N/A'` |
| Null altitude / velocity | Defaulted to `0` |
| API returns `states: null` | `response.states ?? []` in repository |
| HTTP 5xx / network error | `catchError(() => of([]))` — last state preserved |
| Tab hidden | Polling paused via `switchMap(EMPTY)` |
| Selected aircraft disappears from API | `selectedAircraft` returns `null` — stale panel shown |
| Repeated click on same aircraft | `lastCenteredIcao` guard — no duplicate `flyTo()` |
| Polling update re-triggers flyTo | `selectedIcao24` primitive comparison — no re-center |
| `initialize()` called twice | `if (this.map) this.destroy()` guard |

---

## Bundle Size (Production)

| Chunk | Raw | Transferred | Notes |
|---|---|---|---|
| Initial total | 398 kB | **88 kB** | Well under 500 kB budget |
| `main.js` | 80 kB | 20 kB | App code |
| `styles.css` | 141 kB | 15 kB | Material + MapLibre CSS |
| `polyfills.js` | 35 kB | 11 kB | zone.js |
| **Lazy: map-view** | **1.05 MB** | **233 kB** | MapLibre GL JS (loaded on route) |

MapLibre's ~1 MB is fully **lazy loaded** — does not affect initial paint.

---

## Unit Tests

| File | Tests | Coverage |
|---|---|---|
| `aircraft.adapter.spec.ts` | 14 | All null fields, coordinate filtering, trimming |
| `aircraft.repository.spec.ts` | 5 | HTTP success, null states, HTTP errors, network errors |
| `aircraft-geojson.mapper.spec.ts` | 4 | Feature mapping, coordinate order, empty collection |
| `aircraft.store.spec.ts` | 12 | Normalization, computed signals, reset, deduplication |

**Not tested (by design):**
- `MapService` — MapLibre has no DOM in jsdom
- Component rendering — belongs in E2E (Playwright/Cypress)
- Signal reactivity itself — Angular framework handles this
