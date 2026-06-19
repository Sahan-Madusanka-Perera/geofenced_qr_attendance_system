import { useEffect, useRef } from 'react';

/**
 * Animated circular progress ring with SVG gradients.
 * Props: percentage (0-100), size, strokeWidth, label
 */
export default function ProgressRing({ percentage = 0, size = 200, strokeWidth = 12, label = 'Attendance' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const fillRef = useRef(null);

  const status = percentage >= 80 ? 'success' : percentage >= 60 ? 'warning' : 'danger';
  const colorClass = status === 'success' ? 'text-emerald-500' : status === 'warning' ? 'text-amber-500' : 'text-destructive';

  useEffect(() => {
    if (fillRef.current) {
      fillRef.current.style.strokeDashoffset = circumference;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          fillRef.current.style.strokeDashoffset = offset;
        });
      });
    }
  }, [offset, circumference]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <linearGradient id="gradSuccess" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="gradWarning" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="gradDanger" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle
            className="fill-none stroke-muted"
            strokeWidth={strokeWidth}
            cx={size / 2}
            cy={size / 2}
            r={radius}
          />
          <circle
            ref={fillRef}
            className="fill-none stroke-current"
            stroke={`url(#grad${status === 'success' ? 'Success' : status === 'warning' ? 'Warning' : 'Danger'})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            filter="url(#glow)"
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </svg>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <div className={`font-mono text-4xl font-bold leading-none ${colorClass}`}>
            {percentage.toFixed(1)}%
          </div>
          <div className="text-sm text-muted-foreground mt-1">{label}</div>
        </div>
      </div>
    </div>
  );
}
