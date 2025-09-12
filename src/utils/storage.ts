import { User, Passenger, Conductor, Trip, Signature, ConductorCredential } from '../types';
import { generateDefaultPassengers } from './defaultPassengers';
import { generateDefaultConductors } from './defaultConductors';
import { indexedDBService } from '../database/indexeddb';

const STORAGE_KEYS = {
  USERS: 'transport_users',
  PASSENGERS: 'transport_passengers',
  CONDUCTORS: 'transport_conductors',
  TRIPS: 'transport_trips',
  CURRENT_USER: 'transport_current_user',
  SIGNATURES: 'transport_signatures',
  CONDUCTOR_CREDENTIALS: 'transport_conductor_credentials'
};

const initializeDefaultData = async () => {
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    const defaultUsers: User[] = [
      {
        id: '1',
        name: 'Administrador',
        cedula: '12345678',
        role: 'admin',
        createdAt: new Date().toISOString()
      }
    ];
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(defaultUsers));
  }
  
  if (!localStorage.getItem(STORAGE_KEYS.PASSENGERS)) {
    try {
      const defaultPassengers = await generateDefaultPassengers();
      localStorage.setItem(STORAGE_KEYS.PASSENGERS, JSON.stringify(defaultPassengers));
    } catch (error) {
      console.error('Error generando pasajeros por defecto:', error);
    }
  }
  
  if (!localStorage.getItem(STORAGE_KEYS.CONDUCTORS)) {
    const defaultConductors = generateDefaultConductors();
    localStorage.setItem(STORAGE_KEYS.CONDUCTORS, JSON.stringify(defaultConductors));
  }
};

initializeDefaultData().catch(console.error);

export const storage = {
  getUsers: (): User[] => {
    // Try IndexedDB first, fallback to localStorage
    indexedDBService.getUsers().then(users => {
      if (users.length > 0) {
        // Update localStorage as backup
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      }
    }).catch(() => {
      // Fallback to localStorage if IndexedDB fails
    });
    
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : [];
  },
  
  saveUsers: async (users: User[]) => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    try {
      await indexedDBService.saveUsers(users);
    } catch (error) {
      console.error('Failed to save users to IndexedDB:', error);
    }
  },

  getPassengers: (): Passenger[] => {
    // Try IndexedDB first, fallback to localStorage
    indexedDBService.getPassengers().then(passengers => {
      if (passengers.length > 0) {
        // No need to update localStorage as backup since it might exceed quota
      }
    }).catch(error => {
      console.error('Failed to get passengers from IndexedDB:', error);
      // Fallback to localStorage if IndexedDB fails
    });
    
    const data = localStorage.getItem(STORAGE_KEYS.PASSENGERS);
    return data ? JSON.parse(data) : [];
  },
  
  savePassengers: async (passengers: Passenger[]) => {
    try {
      // Try to save to localStorage first (might fail due to quota)
      try {
        localStorage.setItem(STORAGE_KEYS.PASSENGERS, JSON.stringify(passengers));
      } catch (error) {
        console.warn('Failed to save passengers to localStorage (quota exceeded). Using IndexedDB only.');
      }
      
      // Always save to IndexedDB
      await indexedDBService.savePassengers(passengers);
    } catch (error) {
      console.error('Failed to save passengers:', error);
      throw new Error('No se pudieron guardar los pasajeros. El almacenamiento está lleno.');
    }
  },

  getConductors: (): Conductor[] => {
    const data = localStorage.getItem(STORAGE_KEYS.CONDUCTORS);
    return data ? JSON.parse(data) : [];
  },
  
  saveConductors: (conductors: Conductor[]) => {
    localStorage.setItem(STORAGE_KEYS.CONDUCTORS, JSON.stringify(conductors));
  },

  getTrips: (): Trip[] => {
    const data = localStorage.getItem(STORAGE_KEYS.TRIPS);
    return data ? JSON.parse(data) : [];
  },
  
  saveTrips: (trips: Trip[]) => {
    localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(trips));
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  },
  
  setCurrentUser: (user: User | null) => {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  },

  getSignatures: (): Signature[] => {
    const data = localStorage.getItem(STORAGE_KEYS.SIGNATURES);
    return data ? JSON.parse(data) : [];
  },
  
  saveSignatures: (signatures: Signature[]) => {
    localStorage.setItem(STORAGE_KEYS.SIGNATURES, JSON.stringify(signatures));
  },

  getConductorCredentials: (): ConductorCredential[] => {
    const data = localStorage.getItem(STORAGE_KEYS.CONDUCTOR_CREDENTIALS);
    return data ? JSON.parse(data) : [];
  },
  
  saveConductorCredentials: (credentials: ConductorCredential[]) => {
    localStorage.setItem(STORAGE_KEYS.CONDUCTOR_CREDENTIALS, JSON.stringify(credentials));
  },
  
  clearAll: () => {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
};