import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getClassrooms, createClassroom } from '../services/api';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { MapPin, Building, Save, X, Undo, PenTool } from 'lucide-react';

function DrawPolygon({ positions, setPositions }) {
  useMapEvents({
    click(e) {
      setPositions(prev => [...prev, [e.latlng.lat, e.latlng.lng]]);
    },
  });

  return positions.length >= 3 ? (
    <Polygon
      positions={positions}
      pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.2, weight: 2 }}
    />
  ) : null;
}

export default function AdminGeofence() {
  const [classrooms, setClassrooms] = useState([]);
  const [drawing, setDrawing] = useState(false);
  const [positions, setPositions] = useState([]);
  const [name, setName] = useState('');
  const [building, setBuilding] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClassrooms();
  }, []);

  const loadClassrooms = async () => {
    try {
      const data = await getClassrooms();
      setClassrooms(data.classrooms || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name) {
      toast.error('Please enter a classroom name');
      return;
    }
    if (positions.length < 3) {
      toast.error('Click at least 3 points on the map to draw a boundary');
      return;
    }

    // Close the polygon and convert to [lng, lat] for PostGIS
    const closedPositions = [...positions, positions[0]];
    const coordinates = closedPositions.map(([lat, lng]) => [lng, lat]);

    try {
      await createClassroom({ name, building, coordinates });
      toast.success('Classroom geofence created!');
      setPositions([]);
      setName('');
      setBuilding('');
      setDrawing(false);
      loadClassrooms();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Default center (University of Colombo area)
  const mapCenter = classrooms.length > 0 && classrooms[0].center_lat
    ? [classrooms[0].center_lat, classrooms[0].center_lng]
    : [6.9027, 79.8587];

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Geofence Manager</h1>
        <p className="text-muted-foreground mt-1">Define classroom boundaries for GPS-verified attendance</p>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-end">
            {drawing ? (
              <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="geofence-name">Classroom Name</Label>
                  <Input
                    id="geofence-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Lecture Hall A"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="geofence-building">Building</Label>
                  <Input
                    id="geofence-building"
                    value={building}
                    onChange={(e) => setBuilding(e.target.value)}
                    placeholder="e.g. Main Building"
                  />
                </div>
                
                <div className="flex items-end gap-2 xl:col-span-2">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSave} id="save-geofence-btn">
                    <Save className="w-4 h-4 mr-2" />
                    Save Geofence
                  </Button>
                  <Button variant="outline" onClick={() => { setDrawing(false); setPositions([]); }}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button variant="secondary" onClick={() => setPositions(prev => prev.slice(0, -1))} disabled={positions.length === 0}>
                    <Undo className="w-4 h-4 mr-2" />
                    Undo
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={() => setDrawing(true)} id="draw-geofence-btn" size="lg">
                <PenTool className="w-4 h-4 mr-2" />
                Draw New Geofence
              </Button>
            )}
          </div>
          
          {drawing && (
            <div className="mt-4 p-3 bg-muted/50 rounded-md flex items-center text-sm text-muted-foreground border">
              <MapPin className="w-4 h-4 mr-2 text-primary" />
              <span>Click on the map to place polygon points. At least 3 points required.</span>
              <span className="ml-auto font-medium text-foreground bg-background px-2 py-0.5 rounded border shadow-sm">
                Points: {positions.length}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Map */}
      <Card className="overflow-hidden border-2">
        <div className="h-[500px] w-full z-0 relative">
          <MapContainer
            center={mapCenter}
            zoom={17}
            style={{ height: '100%', width: '100%' }}
            id="geofence-map"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />

            {/* Existing classrooms */}
            {classrooms.map(room => {
              if (!room.geofence?.coordinates) return null;
              const coords = room.geofence.coordinates[0].map(([lng, lat]) => [lat, lng]);
              return (
                <Polygon
                  key={room.id}
                  positions={coords}
                  pathOptions={{
                    color: '#3b82f6', // blue for existing
                    fillColor: '#3b82f6',
                    fillOpacity: 0.15,
                    weight: 2,
                  }}
                />
              );
            })}

            {/* Drawing polygon */}
            {drawing && <DrawPolygon positions={positions} setPositions={setPositions} />}
          </MapContainer>
        </div>
      </Card>

      {/* Existing Classrooms List */}
      {classrooms.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">Registered Classrooms</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {classrooms.map(room => (
              <Card key={room.id} className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <CardDescription className="text-xs uppercase tracking-wider font-semibold flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5" />
                    {room.building || 'Building'}
                  </CardDescription>
                  <CardTitle className="text-lg">{room.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary/70" />
                    <span className="font-mono">
                      {room.center_lat?.toFixed(5)}, {room.center_lng?.toFixed(5)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
