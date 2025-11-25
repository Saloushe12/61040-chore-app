import { useContext } from 'react';
import { LocationContext } from '../contexts/LocationContext';

export const useGeolocation = () => {
  return useContext(LocationContext);
};
