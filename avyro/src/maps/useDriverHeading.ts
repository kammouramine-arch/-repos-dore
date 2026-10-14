import { useLocationStore } from '@/app/stores/hooks';
import { useEffect, useState } from 'react';

/** Follow the vehicle while moving; follow the phone compass when stationary. */
export const useDriverHeading = () => {
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const position = useLocationStore(state => state.position);
  const compass = useLocationStore(state => state.compass);
  const moving = position?.speed != null && position.speed >= 1.5;
  if (moving && position?.heading != null && position.heading >= 0) return position.heading;
  if (compass && now - compass.timestamp < 5000) return compass.heading;
  return position?.heading != null && position.heading >= 0 ? position.heading : null;
};
