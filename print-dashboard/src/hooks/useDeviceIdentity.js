import { useEffect, useState } from 'react';
import { api } from '../api/client';

export function useDeviceIdentity() {
  const [deviceIdentity, setDeviceIdentity] = useState(null);

  useEffect(() => {
    let active = true;
    api.deviceIdentity()
      .then(identity => {
        if (active) setDeviceIdentity(identity);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  return deviceIdentity;
}
