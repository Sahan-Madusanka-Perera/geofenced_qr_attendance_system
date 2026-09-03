import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Polygon, CircleMarker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getClassrooms, createClassroom } from '../services/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Masthead from '../components/board/Masthead';
import Board, { BoardEmpty } from '../components/board/Board';
import StatusFlag from '../components/board/StatusFlag';
import { Save, X, Undo2, PenLine } from 'lucide-react';

const AMBER = '#F5A81C';
const IVORY = '#EEE7DA';

function DrawLayer({ points, setPoints }) {
  useMapEvents({
    click(e) {
      setPoints(prev => [...prev, [e.latlng.lat, e.latlng.lng]]);
    },
  });

  return (
    <>
      {points.length >= 3 && (
        <Polygon
          positions={points}
          pathOptions={{ color: AMBER, fillColor: AMBER, fillOpacity: 0.14, weight: 2 }}
        />
      )}
      {points.map((p, i) => (
        <CircleMarker
          key={i}
          center={p}
          radius={4}
          pathOptions={{ color: AMBER, fillColor: AMBER, fillOpacity: 1, weight: 1 }}
        />
      ))}
    </>
  );
}

export default function AdminGeofence() {
  const [classrooms, setClassrooms] = useState([]);
  const [drawing, setDrawing] = useState(false);
  const [points, setPoints] = useState([]);
  const [name, setName] = useState('');
  const [building, setBuilding] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() =>
    getClassrooms()
      .then(data => setClassrooms(data.classrooms || []))
      .catch(err => toast.error(err.message)), []);

  useEffect(() => {
    let live = true;
    getClassrooms()
      .then(data => { if (live) setClassrooms(data.classrooms || []); })
      .catch(() => { /* the empty state already says the board is bare */ });
    return () => { live = false; };
  }, []);

  const cancel = () => { setDrawing(false); setPoints([]); setName(''); setBuilding(''); };

  const save = async () => {
    if (!name.trim()) return toast.error('Name the room before saving.');
    if (points.length < 3) return toast.error('A boundary needs at least three points.');

    setSaving(true);
    // Close the ring, then flip to [lng, lat] — the order PostGIS expects.
    const ring = [...points, points[0]].map(([lat, lng]) => [lng, lat]);
    try {
      await createClassroom({ name: name.trim(), building: building.trim(), coordinates: ring });
      toast.success(`${name.trim()} is now a gate.`);
      cancel();
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const center = classrooms.length > 0 && classrooms[0].center_lat
    ? [classrooms[0].center_lat, classrooms[0].center_lng]
    : [6.9027, 79.8587];

  return (
    <div className="mx-auto max-w-[1400px] space-y-8 px-4 py-10 sm:px-6 sm:py-12">
      <Masthead
        title="Gates"
        detail="A gate is the polygon a room occupies. Check-in tests GPS containment against it inside the database, so a student cannot move the boundary by lying about where they are."
        aside={
          !drawing ? (
            <Button size="lg" onClick={() => setDrawing(true)} id="draw-geofence-btn">
              <PenLine className="size-3.5" strokeWidth={2.5} />
              Draw a gate
            </Button>
          ) : (
            <StatusFlag tone="now" size="md" live>Drawing</StatusFlag>
          )
        }
      />

      {drawing && (
        <section className="border border-[hsl(var(--amber)/0.3)] bg-slat p-5 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
            <div className="space-y-2.5">
              <Label htmlFor="geofence-name">Room name</Label>
              <Input id="geofence-name" value={name} onChange={e => setName(e.target.value)} placeholder="Lecture Hall A" />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="geofence-building">Building</Label>
              <Input id="geofence-building" value={building} onChange={e => setBuilding(e.target.value)} placeholder="Main Building" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="confirm" size="lg" onClick={save} disabled={saving || points.length < 3} id="save-geofence-btn">
                <Save className="size-3.5" strokeWidth={2.5} />
                {saving ? 'Saving' : 'Save gate'}
              </Button>
              <Button variant="secondary" size="lg" onClick={() => setPoints(p => p.slice(0, -1))} disabled={!points.length}>
                <Undo2 className="size-3.5" strokeWidth={2.5} />
                Undo
              </Button>
              <Button variant="ghost" size="lg" onClick={cancel}>
                <X className="size-3.5" strokeWidth={2.5} />
                Cancel
              </Button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slat-edge pt-4">
            <p className="text-[13px] leading-relaxed text-char-dim">
              Click the map to drop corners, tracing the walls of the room.
              The ring closes itself when you save.
            </p>
            <span className="font-board text-[10px] uppercase tracking-board text-char-faint">
              {points.length} {points.length === 1 ? 'point' : 'points'}
              {points.length < 3 && ` · ${3 - points.length} more needed`}
            </span>
          </div>
        </section>
      )}

      <div className="border border-slat-edge">
        <div className="relative z-0 h-[clamp(320px,52vh,560px)] w-full">
          <MapContainer center={center} zoom={17} style={{ height: '100%', width: '100%' }} id="geofence-map">
            {/* CARTO now stamps "API KEY REQUIRED" across every keyless
                basemap, Voyager included. OpenStreetMap's own tiles are
                keyless; the .leaflet-tile filter turns them into the board. */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />

            {classrooms.map(room => {
              if (!room.geofence?.coordinates) return null;
              const ring = room.geofence.coordinates[0].map(([lng, lat]) => [lat, lng]);
              return (
                <Polygon
                  key={room.id}
                  positions={ring}
                  pathOptions={{ color: IVORY, fillColor: IVORY, fillOpacity: 0.08, weight: 1.5 }}
                />
              );
            })}

            {drawing && <DrawLayer points={points} setPoints={setPoints} />}
          </MapContainer>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="font-board text-[11px] font-semibold uppercase tracking-gate text-char-dim">
          Registered gates
        </h2>
        <Board
          columns={[
            {
              key: 'name', label: 'Room', width: 'minmax(0,1.6fr)',
              render: r => <span className="truncate font-board text-[12px] font-bold uppercase tracking-tight text-char">{r.name}</span>,
            },
            {
              key: 'building', label: 'Building', width: 'minmax(0,1.4fr)',
              render: r => <span className="truncate text-[13px] text-char-dim">{r.building || '—'}</span>,
            },
            {
              key: 'centre', label: 'Centre', width: 'minmax(0,1.4fr)', align: 'right', hideBelow: 'sm',
              render: r => (
                <span className="font-board text-[11px] text-char-dim">
                  {r.center_lat != null ? `${r.center_lat.toFixed(5)}, ${r.center_lng.toFixed(5)}` : '—'}
                </span>
              ),
            },
            {
              key: 'radius', label: 'Radius', width: '86px', align: 'right', hideBelow: 'md',
              render: r => (
                <span className="font-board text-[11px] text-char-dim">
                  {r.radius_meters != null ? `${r.radius_meters} m` : '—'}
                </span>
              ),
            },
          ]}
          rows={classrooms}
          rowKey={r => r.id}
          empty={
            <BoardEmpty note="Draw one on the map above. Until a room has a boundary, no session in it can verify position.">
              No gates yet
            </BoardEmpty>
          }
        />
      </section>
    </div>
  );
}
