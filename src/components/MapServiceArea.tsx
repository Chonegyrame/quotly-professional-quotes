import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerIconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';

// Leaflet's default icon class tries to auto-detect URLs which breaks under
// bundlers. Route Vite-resolved asset URLs in instead.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIconRetinaUrl,
  shadowUrl: markerShadowUrl,
});

export interface MapServiceAreaValue {
  address: string;
  lat: number | null;
  lng: number | null;
  radiusKm: number;
}

interface Props {
  value: MapServiceAreaValue;
  onChange: (v: MapServiceAreaValue) => void;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

const SWEDEN_CENTER: [number, number] = [59.3293, 18.0686]; // Stockholm fallback
const DEFAULT_ZOOM = 11;

function RecenterMap({
  center,
  radiusKm,
  fitKey,
}: {
  center: [number, number] | null;
  radiusKm: number;
  fitKey: number;
}) {
  const map = useMap();
  // Refit only when fitKey bumps (new address search or radius change),
  // not when center changes due to the user dragging the marker.
  useEffect(() => {
    if (!center) return;
    const [lat, lng] = center;
    const deltaLat = radiusKm / 111;
    const deltaLng = radiusKm / (111 * Math.cos((lat * Math.PI) / 180) || 1);
    const bounds = L.latLngBounds(
      [lat - deltaLat, lng - deltaLng],
      [lat + deltaLat, lng + deltaLng],
    );
    map.fitBounds(bounds, { padding: [24, 24] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, map]);
  return null;
}

export function MapServiceArea({ value, onChange }: Props) {
  const [query, setQuery] = useState(value.address);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fitKey, setFitKey] = useState(0);
  const searchAbortRef = useRef<AbortController | null>(null);

  // Keep the query field in sync when the parent updates the address externally
  // (hydration from a saved profile, or a Nominatim search). Address changes
  // also trigger a map refit. Drag updates only lat/lng, not address — so
  // dragging will not cause a refit.
  useEffect(() => {
    setQuery(value.address);
    if (value.address && value.lat != null && value.lng != null) {
      setFitKey((k) => k + 1);
    }
  }, [value.address]);

  const center = useMemo<[number, number] | null>(
    () => (value.lat != null && value.lng != null ? [value.lat, value.lng] : null),
    [value.lat, value.lng],
  );

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setError(null);
    searchAbortRef.current?.abort();
    const ac = new AbortController();
    searchAbortRef.current = ac;
    try {
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.set('q', q);
      url.searchParams.set('format', 'json');
      url.searchParams.set('limit', '1');
      url.searchParams.set('countrycodes', 'se');
      const res = await fetch(url.toString(), {
        signal: ac.signal,
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`Sökning misslyckades (${res.status})`);
      const hits = (await res.json()) as NominatimResult[];
      if (!hits.length) {
        setError('Hittade ingen adress. Försök igen eller dra nålen manuellt.');
        return;
      }
      const hit = hits[0];
      onChange({
        ...value,
        address: hit.display_name,
        lat: parseFloat(hit.lat),
        lng: parseFloat(hit.lon),
      });
      // setQuery + fitKey bump happen automatically via the address sync effect.
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      setError(e.message || 'Kunde inte söka adress');
    } finally {
      setSearching(false);
    }
  };

  const handleDragEnd = (e: L.LeafletEvent) => {
    const marker = e.target as L.Marker;
    const pos = marker.getLatLng();
    onChange({ ...value, lat: pos.lat, lng: pos.lng });
  };

  const handleRadiusChange = (values: number[]) => {
    onChange({ ...value, radiusKm: values[0] });
    setFitKey((k) => k + 1);
  };

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="geoSearch">Din adress eller ort</Label>
        <div className="mt-1 flex gap-2">
          <Input
            id="geoSearch"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
              }
            }}
            placeholder="Storgatan 12, Stockholm"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleSearch}
            disabled={searching || !query.trim()}
            aria-label="Sök adress"
          >
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label>Radie (km)</Label>
          <span className="text-sm font-medium">{value.radiusKm} km</span>
        </div>
        <Slider
          value={[value.radiusKm]}
          min={5}
          max={150}
          step={5}
          onValueChange={handleRadiusChange}
          className="mt-2"
        />
      </div>

      <div className="h-64 overflow-hidden rounded-md border border-border">
        <MapContainer
          center={center ?? SWEDEN_CENTER}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {center && (
            <>
              <Marker
                position={center}
                draggable
                eventHandlers={{ dragend: handleDragEnd }}
              />
              <Circle
                center={center}
                radius={value.radiusKm * 1000}
                pathOptions={{
                  color: '#0ea5e9',
                  fillColor: '#0ea5e9',
                  fillOpacity: 0.15,
                  weight: 2,
                }}
              />
              <RecenterMap center={center} radiusKm={value.radiusKm} fitKey={fitKey} />
            </>
          )}
        </MapContainer>
      </div>
      <p className="text-xs text-muted-foreground">
        Sök din adress eller ort. Dra nålen för att justera exakt position. Dra reglaget
        för att ändra hur långt ni är villiga att åka.
      </p>
    </div>
  );
}
