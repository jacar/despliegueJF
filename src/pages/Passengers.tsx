import React, { useState, useEffect } from 'react';
import { applySEO } from '../utils/seo';
import { Plus, Search, QrCode, Edit, Trash2, RefreshCw } from 'lucide-react';
import { Passenger } from '../types';
import { storage } from '../utils/storage';
import { generateQRCode, QRData } from '../utils/qr';
import QRViewer from '../components/QRViewer/QRViewer';
import { sheetsApiService } from '../services/sheetsApiService';
import GoogleAuth from '../components/Auth/GoogleAuth';

const Passengers: React.FC = () => {
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [filteredPassengers, setFilteredPassengers] = useState<Passenger[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showQRViewer, setShowQRViewer] = useState(false);

  const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null);
  const [editingPassenger, setEditingPassenger] = useState<Passenger | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    cedula: '',
    gerencia: ''
  });

  useEffect(() => {
    applySEO({
      title: 'Pasajeros | Sistema de Reportes JF',
      description: 'Gestione y busque pasajeros con cédula y genere códigos QR en el Sistema de Reportes JF.',
      keywords: 'pasajeros, cédula, QR, transporte, gestión de pasajeros',
      canonicalPath: '/passengers',
    });
    
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        // Cargar datos locales primero
        const localPassengers = await storage.getPassengers();
        setPassengers(localPassengers);
        
        // Intentar cargar datos remotos si estamos autenticados
        if (isAuthenticated) {
          try {
            const remotePassengers = await sheetsApiService.getPassengers();
            if (remotePassengers.length > 0) {
              setPassengers(remotePassengers);
              await storage.savePassengers(remotePassengers);
            }
          } catch (error) {
            console.error('Error al cargar datos remotos:', error);
            // Continuar con los datos locales si hay un error
          }
        }
      } catch (error) {
        console.error('Error al cargar pasajeros:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const checkAuth = () => {
      const isAuth = sheetsApiService.isAuthenticated();
      setIsAuthenticated(isAuth);
      if (isAuth) {
        loadInitialData();
      }
    };

    checkAuth();
  }, [isAuthenticated]);

  useEffect(() => {
    filterPassengers();
  }, [passengers, searchTerm]);

  const handleAuthSuccess = async (token: string) => {
    try {
      sheetsApiService.setAccessToken(token);
      setIsAuthenticated(true);
      setAuthError(null);
      await loadInitialData();
    } catch (error) {
      console.error('Error en la autenticación:', error);
      setAuthError('Error al autenticar con Google. Por favor, inténtalo de nuevo.');
    }
  };

  const handleAuthError = (error: string) => {
    console.error('Error de autenticación:', error);
    setAuthError(error);
  };

  const handleLogout = () => {
    sheetsApiService.clearAccessToken();
    setIsAuthenticated(false);
    setPassengers([]);
    setFilteredPassengers([]);
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      setSyncStatus('syncing');
      
      // Obtener datos actualizados de la hoja de cálculo
      const updatedPassengers = await sheetsApiService.getPassengers();
      
      // Actualizar el estado local
      setPassengers(updatedPassengers);
      setFilteredPassengers(updatedPassengers);
      
      // Guardar localmente
      await storage.savePassengers(updatedPassengers);
      
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (error) {
      console.error('Error al sincronizar:', error);
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  const savePassengers = async (updatedPassengers: Passenger[]) => {
    try {
      // Guardar localmente
      await storage.savePassengers(updatedPassengers);
      
      // Sincronizar con Google Sheets en segundo plano
      if (updatedPassengers.length > 0) {
        // Primero limpiar la hoja
        // Luego agregar todos los pasajeros
        await Promise.all(updatedPassengers.map(p => sheetsApiService.addPassenger(p)));
      }
      
      return updatedPassengers;
    } catch (error) {
      console.error('Error al guardar pasajeros:', error);
      throw error;
    }
  };

  const filterPassengers = () => {
    if (!Array.isArray(passengers)) {
      setFilteredPassengers([]);
      return;
    }

    if (!searchTerm.trim()) {
      setFilteredPassengers(passengers);
      return;
    }

    const searchTermLower = searchTerm.toLowerCase();
    const filtered = passengers.filter(p => 
      (p.name?.toLowerCase().includes(searchTermLower) ||
      p.cedula?.includes(searchTerm) ||
      p.gerencia?.toLowerCase().includes(searchTermLower))
    );
    
    setFilteredPassengers(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verificar si ya existe un pasajero con la misma cédula
    const existingPassenger = passengers.find(p => p.cedula === formData.cedula && (!editingPassenger || p.id !== editingPassenger.id));
    if (existingPassenger) {
      alert('Ya existe un pasajero con esta cédula');
      return;
    }
    
    if (editingPassenger) {
      // Update existing passenger
      const updatedPassengers = passengers.map(p => 
        p.id === editingPassenger.id 
          ? { ...p, ...formData }
          : p
      );
      await savePassengers(updatedPassengers);
      setPassengers(updatedPassengers);
    } else {
      // Create new passenger
      const qrData: QRData = {
        cedula: formData.cedula,
        name: formData.name,
        gerencia: formData.gerencia,
        timestamp: new Date().toISOString()
      };
      
      const qrCode = await generateQRCode(qrData);
      
      const newPassenger: Passenger = {
        id: Date.now().toString(),
        ...formData,
        qrCode,
        createdAt: new Date().toISOString()
      };
      
      const updatedPassengers = [...passengers, newPassenger];
      await savePassengers(updatedPassengers);
      setPassengers(updatedPassengers);
    }
    
    resetForm();
  };

  const regenerateQR = async (passenger: Passenger) => {
    try {
      const qrData: QRData = {
        cedula: passenger.cedula,
        name: passenger.name,
        gerencia: passenger.gerencia,
        timestamp: new Date().toISOString()
      };
      
      const newQrCode = await generateQRCode(qrData);
      
      const updatedPassengers = passengers.map(p => 
        p.id === passenger.id 
          ? { ...p, qrCode: newQrCode }
          : p
      );
      
      await savePassengers(updatedPassengers);
      setPassengers(updatedPassengers);
    } catch (error) {
      alert('Error regenerando código QR');
    }
  };

  const handleEdit = (passenger: Passenger) => {
    setEditingPassenger(passenger);
    setFormData({
      name: passenger.name,
      cedula: passenger.cedula,
      gerencia: passenger.gerencia
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Está seguro de eliminar este pasajero?')) {
      const updatedPassengers = passengers.filter(p => p.id !== id);
      savePassengers(updatedPassengers).then(() => {
        setPassengers(updatedPassengers);
      });
    }
  };

  const downloadQR = (passenger: Passenger) => {
    const link = document.createElement('a');
    link.download = `QR_${passenger.name}_${passenger.cedula}.png`;
    link.href = passenger.qrCode;
    link.click();
  };
  
  const viewQR = (passenger: Passenger) => {
    setSelectedPassenger(passenger);
    setShowQRViewer(true);
  };

  const resetForm = () => {
    setFormData({ name: '', cedula: '', gerencia: '' });
    setEditingPassenger(null);
    setShowModal(false);
  };
  


  // Asegurarnos de que filteredPassengers siempre sea un array
  const safeFilteredPassengers = Array.isArray(filteredPassengers) ? filteredPassengers : [];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-center">Iniciar sesión</h2>
          {authError && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
              {authError}
            </div>
          )}
          <div className="flex justify-center">
            <GoogleAuth
              onSuccess={handleAuthSuccess}
              onError={handleAuthError}
              buttonText="Iniciar sesión con Google"
            />
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando pasajeros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Barra de herramientas */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Gestión de Pasajeros</h1>
        
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {/* Botón de Nuevo Pasajero */}
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Nuevo Pasajero</span>
          </button>
        </div>
      </div>
      
      {safeFilteredPassengers.length === 0 && !isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No se encontraron pasajeros.</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Agregar Pasajero
          </button>
        </div>
      ) : (
        <div className="mt-8">
          <div className="flex flex-col">
            <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 hidden md:table-header-group">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nombre
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cédula
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Gerencia
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 block md:table-row-group">
                      {safeFilteredPassengers.map((passenger) => (
                        <tr key={passenger.id} className="hover:bg-gray-50 block md:table-row">
                          <td className="px-6 py-4 block md:table-cell">
                            <div className="font-medium text-gray-900">{passenger.name}</div>
                          </td>
                          <td className="px-6 py-4 block md:table-cell text-gray-600">
                            {passenger.cedula}
                          </td>
                          <td className="px-6 py-4 block md:table-cell text-gray-600">
                            {passenger.gerencia}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex space-x-2 justify-end">
                              <button
                                onClick={() => viewQR(passenger)}
                                className="text-green-600 hover:text-green-800"
                                title="Ver QR"
                              >
                                <QrCode className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleEdit(passenger)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Editar"
                              >
                                <Edit className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(passenger.id!)}
                                className="text-red-600 hover:text-red-800"
                                title="Eliminar"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingPassenger ? 'Editar Pasajero' : 'Nuevo Pasajero'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cédula *
                </label>
                <input
                  type="text"
                  required
                  value={formData.cedula}
                  onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                  className="w-full md:max-w-xs md:mx-auto border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gerencia *
                </label>
                <input
                  type="text"
                  required
                  value={formData.gerencia}
                  onChange={(e) => setFormData({ ...formData, gerencia: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingPassenger ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* QR Viewer */}
      {showQRViewer && selectedPassenger && (
        <QRViewer
          passenger={selectedPassenger}
          onClose={() => {
            setShowQRViewer(false);
            setSelectedPassenger(null);
          }}
        />
      )}


    </div>
  );
};

export default Passengers;