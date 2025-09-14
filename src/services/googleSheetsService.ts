// Configuración de la hoja de cálculo
const SPREADSHEET_ID = import.meta.env.VITE_GOOGLE_SHEETS_SPREADSHEET_ID || '1aSItYDKmf2YpzJClK8tKnmpcmmFbKlP90hrQDIjJyqo';
const SHEET_NAME = 'Pasajeros';

// Configuración de OAuth 2.0
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '548233310596-900v87vmup30in0g1n22kcd0fovjkv89.apps.googleusercontent.com';
const API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY || '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';
const REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI || 'http://localhost:5173/passengers';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

export interface Passenger {
  id?: string;
  name: string;
  cedula: string;
  gerencia: string;
  qrCode?: string;
  createdAt?: string;
  updatedAt?: string;
}

class GoogleSheetsService {
  private isInitialized = false;
  private gapiInited = false;
  private gisInited = false;
  private tokenClient: any = null;
  private initPromise: Promise<void> | null = null;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise<void>(async (resolve) => {
      // Cargar la API de Google
      await this.loadGoogleApi();
      
      // Esperar a que ambas APIs estén listas
      const checkReady = setInterval(() => {
        if (this.gapiInited && this.gisInited) {
          clearInterval(checkReady);
          this.isInitialized = true;
          resolve();
        }
      }, 100);
    });

    return this.initPromise;
  }

  private loadGoogleApi() {
    return new Promise<void>(async (resolve) => {
      // Verificar si ya están cargados
      if (window.gapi && window.gapi.client) {
        try {
          await this.initializeGapiClient();
          resolve();
        } catch (error) {
          console.error('Error initializing gapi client:', error);
          // Continuar para intentar recargar
        }
      }

      // Cargar gapi si no está cargado
      if (!window.gapi) {
        await new Promise<void>((gapiResolve) => {
          const gapiScript = document.createElement('script');
          gapiScript.src = 'https://apis.google.com/js/api.js';
          gapiScript.async = true;
          gapiScript.defer = true;
          gapiScript.onload = gapiResolve;
          document.head.appendChild(gapiScript);
        });
      }

      // Inicializar gapi.client
      try {
        await new Promise((resolve) => window.gapi.load('client', resolve));
        await this.initializeGapiClient();
      } catch (error) {
        console.error('Error loading gapi client:', error);
        throw error;
      }

      // Cargar gsi si no está cargado
      if (!document.querySelector('script[src*="accounts.google.com/gsi"]')) {
        await new Promise<void>((resolve) => {
          const gsiScript = document.createElement('script');
          gsiScript.src = 'https://accounts.google.com/gsi/client';
          gsiScript.async = true;
          gsiScript.defer = true;
          gsiScript.onload = () => {
            this.gisInited = true;
            resolve();
          };
          document.head.appendChild(gsiScript);
        });
      } else {
        this.gisInited = true;
      }

      resolve();
    });
  }

  private async initializeGapiClient() {
    try {
      // Cargar primero el cliente
      await window.gapi.load('client');
      
      // Inicializar con la configuración correcta
      await window.gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
        scope: SCOPES
      });

      console.log('gapi.client inicializado correctamente');
      this.gapiInited = true;
    } catch (error) {
      console.error('Error al inicializar gapi client:', error);
      throw error;
    }
  }

  private initializeTokenClient() {
    if (!window.google?.accounts) {
      throw new Error('Google Identity Services no está cargado correctamente');
    }

    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      prompt: 'consent',
      callback: (tokenResponse: any) => {
        if (tokenResponse && tokenResponse.access_token) {
          window.gapi.client.setToken({
            access_token: tokenResponse.access_token,
            expires_in: tokenResponse.expires_in,
          });
        }
      },
    });
  }

  async isAuthenticated(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (!this.tokenClient) {
      this.initializeTokenClient();
    }

    const token = window.gapi.client.getToken();
    return !!token;
  }

  async ensureAuth() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.tokenClient) {
      this.initializeTokenClient();
    }

    // Verificar si ya hay un token válido
    const token = window.gapi.client.getToken();
    if (token) {
      const now = new Date();
      const expiry = new Date(token.expires_at);
      if (expiry > now) {
        return; // Token válido
      }
    }

    // Si no hay token o está expirado, solicitar uno nuevo
    return new Promise<void>((resolve, reject) => {
      const handleTokenResponse = (tokenResponse: any) => {
        if (tokenResponse && !tokenResponse.error) {
          window.gapi.client.setToken({
            access_token: tokenResponse.access_token,
            expires_in: tokenResponse.expires_in,
            expires_at: Date.now() + (tokenResponse.expires_in * 1000),
          });
          resolve();
        } else {
          reject(tokenResponse?.error || 'Error de autenticación');
        }
      };

      // Configurar el callback temporal
      const originalCallback = this.tokenClient.callback;
      this.tokenClient.callback = handleTokenResponse;
      
      // Solicitar token
      this.tokenClient.requestAccessToken({ prompt: 'consent' });
      
      // Restaurar el callback original después de un tiempo
      setTimeout(() => {
        this.tokenClient.callback = originalCallback;
      }, 1000);
    });
  }

  async syncFromSheets(): Promise<Passenger[]> {
    await this.ensureAuth();
    
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:Z`,
    });

    const rows = response.result.values || [];
    return rows.map((row: any[], index: number) => ({
      id: `sheet-${index + 2}`,
      name: row[0] || '',
      cedula: row[1] || '',
      gerencia: row[2] || '',
      qrCode: row[3] || `QR-${row[1] || ''}`,
      createdAt: row[4] || new Date().toISOString(),
      updatedAt: row[5] || new Date().toISOString(),
    }));
  }

  startAutoSync(intervalMs: number = 30000) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      try {
        await this.syncFromSheets();
      } catch (error) {
        console.error('Error en sincronización automática:', error);
      }
    }, intervalMs);
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}

export const googleSheetsService = new GoogleSheetsService();
