const simulatedStoragePrefixes = ['aws-sim-', 'floci-aws-sim-'];

export const REAL_DATA_ONLY = import.meta.env.VITE_REAL_DATA_ONLY !== 'false';

export const isSimulatedStorageKey = (key: string) => {
  return simulatedStoragePrefixes.some(prefix => key.startsWith(prefix));
};

export const clearSimulatedLocalStorage = () => {
  if (typeof window === 'undefined') return 0;

  const keys = Object.keys(window.localStorage).filter(isSimulatedStorageKey);
  keys.forEach(key => window.localStorage.removeItem(key));
  return keys.length;
};
