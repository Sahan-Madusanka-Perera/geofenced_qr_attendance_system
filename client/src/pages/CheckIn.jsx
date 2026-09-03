import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { checkIn } from '../services/api';
import { useGeolocation } from '../hooks/useGeolocation';
import { useFingerprint } from '../hooks/useFingerprint';
import { useAuth } from '../context/AuthContext';
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, AlertCircle, Info, MapPin } from 'lucide-react';

export default function CheckIn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getPosition, error: gpsError } = useGeolocation();
  const { fingerprint } = useFingerprint();

  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading'); // loading | requesting_gps | submitting | success | already | error
  const [message, setMessage] = useState('');
  const [errorDetail, setErrorDetail] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid QR Code');
      setErrorDetail('No token found in the scanned URL.');
      return;
    }

    if (!user) {
      // Redirect to login, preserving the token
      navigate(`/login?redirect=${encodeURIComponent(`/checkin?token=${token}`)}`);
      return;
    }

    // Start check-in process
    performCheckIn();
  }, [token, user]);

  const performCheckIn = async () => {
    try {
      // Step 1: Get GPS
      setStatus('requesting_gps');
      setMessage('Requesting your location...');

      const position = await getPosition();

      // Step 2: Submit check-in
      setStatus('submitting');
      setMessage('Verifying attendance...');

      const result = await checkIn({
        token,
        latitude: position.latitude,
        longitude: position.longitude,
        fingerprint,
      });

      if (result.alreadyCheckedIn) {
        setStatus('already');
        setMessage('Already Checked In');
      } else {
        setStatus('success');
        setMessage('Attendance Recorded!');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Check-in Failed');
      setErrorDetail(err.message);
    }
  };

  const renderIcon = () => {
    switch (status) {
      case 'loading':
      case 'requesting_gps':
      case 'submitting':
        return <Loader2 className="w-20 h-20 text-primary animate-spin" />;
      case 'success':
        return <CheckCircle2 className="w-24 h-24 text-emerald-500 animate-in zoom-in duration-300" />;
      case 'already':
        return <Info className="w-24 h-24 text-blue-500 animate-in zoom-in duration-300" />;
      case 'error':
        return <AlertCircle className="w-24 h-24 text-destructive animate-in zoom-in duration-300" />;
      default:
        return null;
    }
  };

  const getSubtitle = () => {
    switch (status) {
      case 'requesting_gps':
        return 'Please allow location access when prompted';
      case 'submitting':
        return 'Checking token, device, and location...';
      case 'success':
        return 'You have been marked present for this session. You can close this page.';
      case 'already':
        return 'You have already checked in for this session.';
      case 'error':
        return errorDetail;
      default:
        return '';
    }
  };

  const getTextColor = () => {
    switch (status) {
      case 'success': return 'text-emerald-500';
      case 'error': return 'text-destructive';
      case 'already': return 'text-blue-500';
      default: return 'text-foreground';
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center p-6 text-center bg-muted/20">
      <div className="mb-8">{renderIcon()}</div>
      
      <h1 className={`text-3xl font-bold mb-4 tracking-tight ${getTextColor()}`}>
        {message || "Processing..."}
      </h1>
      
      <p className="text-lg text-muted-foreground max-w-md mx-auto mb-8">
        {getSubtitle()}
      </p>

      {status === 'error' && (
        <Button
          size="lg"
          onClick={performCheckIn}
          id="retry-checkin-btn"
          className="mt-4"
        >
          Try Again
        </Button>
      )}

      {(status === 'success' || status === 'already') && (
        <Button
          variant="outline"
          size="lg"
          onClick={() => navigate('/dashboard')}
          id="goto-dashboard-btn"
          className="mt-4"
        >
          Go to Dashboard →
        </Button>
      )}

      {gpsError && status === 'requesting_gps' && (
        <div className="mt-8 p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg max-w-md flex items-start text-left gap-3 animate-in fade-in">
          <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">GPS Error</p>
            <p className="text-sm mt-1">{gpsError}</p>
          </div>
        </div>
      )}
    </div>
  );
}
