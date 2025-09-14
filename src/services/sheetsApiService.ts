// Configuración
const API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
const SPREADSHEET_ID = import.meta.env.VITE_GOOGLE_SHEETS_SPREADSHEET_ID;
const SHEET_NAME = 'Pasajeros';

// Almacenamiento local para el token
const TOKEN_STORAGE_KEY = 'google_auth_token';

interface Passenger {
  id?: string;
  name: string;
  cedula: string;
  gerencia: string;
  qrCode?: string;
  createdAt?: string;
  updatedAt?: string;
}

class SheetsApiService {
  private accessToken: string | null = null;

  constructor() {
    // Intentar cargar el token del almacenamiento local al inicializar
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (storedToken) {
      this.accessToken = storedToken;
    }
  }

  setAccessToken(token: string) {
    this.accessToken = token;
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }

  clearAccessToken() {
    this.accessToken = null;
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  private async fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    if (!this.accessToken) {
      throw new Error('No hay token de autenticación disponible');
    }

    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${this.accessToken}`);
    headers.set('Content-Type', 'application/json');

    const response = await fetch(`https://sheets.googleapis.com/v4/${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Token inválido o expirado
      this.clearAccessToken();
      throw new Error('La sesión ha expirado. Por favor, inicia sesión nuevamente.');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || 'Error al realizar la solicitud');
    }

    return response.json();
  }

  async getPassengers(): Promise<Passenger[]> {
    try {
      const response = await this.fetchWithAuth(
        `spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A2:Z`
      );

      const rows = response.values || [];
      return rows.map((row: any[], index: number) => ({
        id: `sheet-${index + 2}`,
        name: row[0] || '',
        cedula: row[1] || '',
        gerencia: row[2] || '',
        qrCode: row[3] || `QR-${row[1] || ''}`,
        createdAt: row[4] || new Date().toISOString(),
        updatedAt: row[5] || new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Error al obtener pasajeros:', error);
      throw error;
    }
  }

  async addPassenger(passenger: Omit<Passenger, 'id'>): Promise<void> {
    try {
      const values = [
        passenger.name,
        passenger.cedula,
        passenger.gerencia,
        passenger.qrCode || `QR-${passenger.cedula}`,
        new Date().toISOString(),
        new Date().toISOString()
      ];

      await this.fetchWithAuth(
        `spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A2:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        {
          method: 'POST',
          body: JSON.stringify({
            range: `${SHEET_NAME}!A2:F2`,
            majorDimension: 'ROWS',
            values: [values],
          }),
        }
      );
    } catch (error) {
      console.error('Error al agregar pasajero:', error);
      throw error;
    }
  }

  async clearSheet() {
    try {
      await this.fetchWithAuth(
        `spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A2:Z:clear`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        }
      );
    } catch (error) {
      console.error('Error al limpiar la hoja:', error);
      throw error;
    }
  }

  async syncFromSheets(): Promise<Passenger[]> {
    try {
      // Obtener datos actualizados de la hoja de cálculo
      const remotePassengers = await this.getPassengers();
      
      // Guardar localmente
      if (remotePassengers.length > 0) {
        await storage.savePassengers(remotePassengers);
      }
      
      return remotePassengers;
    } catch (error) {
      console.error('Error al sincronizar desde Google Sheets:', error);
      throw error;
    }
  }

  async syncToSheets(passengers: Passenger[]): Promise<void> {
    try {
      // Primero limpiar la hoja
      await this.clearSheet();
      
      // Luego agregar todos los pasajeros
      if (passengers.length > 0) {
        await Promise.all(passengers.map(passenger => 
          this.addPassenger({
            name: passenger.name,
            cedula: passenger.cedula,
            gerencia: passenger.gerencia,
            qrCode: passenger.qrCode
          })
        ));
      }
    } catch (error) {
      console.error('Error al sincronizar con Google Sheets:', error);
      throw error;
    }
  }
}

export const sheetsApiService = new SheetsApiService();
