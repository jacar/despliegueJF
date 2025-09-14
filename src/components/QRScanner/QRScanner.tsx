import React, { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { Camera, X } from 'lucide-react';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const [error, setError] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const lastScanTime = useRef<number>(0);

  useEffect(() => {
    const startCamera = async () => {
      if (!videoRef.current || qrScannerRef.current) return;

      try {
        qrScannerRef.current = new QrScanner(
          videoRef.current,
          (result) => {
            // Prevenir escaneos duplicados en menos de 2 segundos
            const now = Date.now();
            if (now - lastScanTime.current < 2000) {
              return;
            }
            lastScanTime.current = now;
            
            setIsScanning(true);
            onScan(result.data);
            
            // Cerrar el scanner después del escaneo exitoso
            setTimeout(() => {
              onClose();
            }, 1000);
          },
          {
            highlightScanRegion: true,
            highlightCodeOutline: true,
            maxScansPerSecond: 1, // Limitar a 1 escaneo por segundo
            preferredCamera: 'environment', // Usar cámara trasera por defecto
            calculateScanRegion: (video) => {
              // Crear una región de escaneo más grande en el centro
              const smallerDimension = Math.min(video.videoWidth, video.videoHeight);
              const scanRegionSize = Math.round(smallerDimension * 0.7); // 70% del tamaño
              
              return {
                x: Math.round((video.videoWidth - scanRegionSize) / 2),
                y: Math.round((video.videoHeight - scanRegionSize) / 2),
                width: scanRegionSize,
                height: scanRegionSize,
              };
            },
            highlightScanRegionCanvas: {
              strokeStyle: '#22c55e', // Verde más visible
              lineWidth: 4,
            }
          }
        );

        await qrScannerRef.current.start();
      } catch (err) {
        console.error('Error starting QR scanner:', err);
        setError('No se pudo acceder a la cámara. Verifique los permisos.');
      }
    };

    startCamera();

    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.destroy();
        qrScannerRef.current = null;
      }
    };
  }, [onScan, onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full h-full max-h-screen md:h-[95vh] md:w-[95vw] flex flex-col">
        <div className="flex justify-between items-center p-3 bg-green-600 text-white rounded-t-lg">
          <h3 className="text-xl font-bold flex items-center"><Camera className="h-6 w-6 mr-2" />Escanear Código QR</h3>
          <button
            onClick={onClose}
            className="p-1 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
            aria-label="Cerrar escáner"
          >
            <X className="h-6 w-6 text-white" />
          </button>
        </div>

        {error ? (
          <div className="text-center py-8 flex-grow flex flex-col items-center justify-center">
            <Camera className="h-20 w-20 text-gray-400 mx-auto mb-4" />
            <p className="text-red-600 text-base">{error}</p>
            <button
              onClick={onClose}
              className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <div className="relative flex-grow flex flex-col">
            <div className="relative flex-grow">
              <video
                ref={videoRef}
                className="w-full h-full bg-gray-900 object-cover"
                playsInline
              />
              {/* Overlay con guía visual */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                <div className="w-[250px] h-[250px] md:w-[300px] md:h-[300px] border-2 border-green-500 rounded-lg relative">
                  {/* Esquinas del marco */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-500 rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-500 rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-500 rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-500 rounded-br-lg"></div>
                </div>
                <div className="absolute bottom-20 left-0 right-0 text-center">
                  <p className="text-white text-lg font-bold bg-black bg-opacity-50 py-2 px-4 rounded-full inline-block">
                    {isScanning ? 'Procesando...' : 'Centre el código QR en el marco'}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 text-center bg-white">
              <p className="text-base text-gray-700 font-medium">
                {isScanning ? 
                  <span className="flex items-center justify-center">
                    <span className="mr-2">Procesando código QR</span>
                    <span className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></span>
                  </span> : 
                  'Apunte la cámara hacia el código QR del pasajero'
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRScanner;