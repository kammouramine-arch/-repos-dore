import { useLocationStore } from '@/app/stores/hooks';
import { useEffect, useState } from 'react';

/** Vehicle course only. The puck retains its last course when stopped. */
export const useDriverHeading = () => {
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const position = useLocationStore(state => state.position);
  const moving = position?.speed != null && position.speed >= 1.5 && position.timestamp <= now + 1000 && now - position.timestamp < 10000 && position.accuracy != null && position.accuracy <= 30;
  return moving && position?.heading != null && Number.isFinite(position.heading) && position.heading >= 0 ? position.heading : null;
};
