import React, { useState } from 'react';
import { X, Download, Share2, Loader2 } from 'lucide-react';
import { Passenger } from '../../types';

interface QRViewerProps {
  passenger: Passenger;
  onClose: () => void;
}

const QRViewer: React.FC<QRViewerProps> = ({ passenger, onClose }) => {
  const [isSharing, setIsSharing] = useState(false);
  
  const downloadQR = () => {
    const link = document.createElement('a');
    link.download = `QR_${passenger.name.replace(/\s+/g, '_')}_${passenger.cedula}.png`;
    link.href = passenger.qrCode;
    link.click();
  };
  
  const shareViaWhatsApp = async () => {
    if (isSharing) return;
    
    setIsSharing(true);
    try {
      // Convertir la imagen base64 a un blob
      const response = await fetch(passenger.qrCode);
      const blob = await response.blob();
      
      // Crear un archivo a partir del blob
      const fileName = `QR_${passenger.name.replace(/\s+/g, '_')}_${passenger.cedula}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });
      
      // Verificar si estamos en un dispositivo móvil
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Intentar usar la API nativa para compartir (ideal para móviles)
      if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
        console.log('Usando Web Share API para compartir archivo');
        try {
          await navigator.share({
            files: [file],
            title: 'Código QR',
            text: `Código QR de ${passenger.name}`,
          });
          console.log('Archivo compartido exitosamente');
          return;
        } catch (shareError) {
          console.error('Error al usar Web Share API:', shareError);
          // Si falla, continuamos con el método alternativo
        }
      }
      
      // Método alternativo para navegadores de escritorio o no compatibles con Web Share API
      console.log('Usando método alternativo para compartir');
      
      // 1. Guardar la imagen localmente
      const imageUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = imageUrl;
      downloadLink.download = fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      
      // Pequeño retraso para asegurar que la descarga comience
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 2. Abrir WhatsApp con mensaje predefinido
      const text = encodeURIComponent(`Hola, te envío el código QR de ${passenger.name}. Acabo de descargar la imagen, te la adjunto por este medio.`);
      
      // En móviles, intentar abrir la app de WhatsApp
      if (isMobile) {
        window.location.href = `whatsapp://send?text=${text}`;
      } else {
        // En desktop, abrir WhatsApp Web
        window.open(`https://wa.me/?text=${text}`, '_blank');
      }
      
      // 3. Limpiar recursos
      setTimeout(() => {
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(imageUrl);
      }, 1500);
      
    } catch (error) {
      console.error("Error al compartir por WhatsApp:", error);
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        alert('Hubo un error al intentar compartir la imagen. Por favor, intente nuevamente.');
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Código QR</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <div className="text-center">
          <div className="bg-white p-4 rounded-lg border-2 border-gray-200 mb-4">
            <img 
              src={passenger.qrCode} 
              alt={`QR Code for ${passenger.name}`}
              className="w-64 h-64 mx-auto"
            />
          </div>
          
          <div className="space-y-2 text-sm text-gray-600 mb-4">
            <p><strong>Nombre:</strong> {passenger.name}</p>
            <p><strong>Cédula:</strong> {passenger.cedula}</p>
            <p><strong>Gerencia:</strong> {passenger.gerencia}</p>
          </div>
          
          <div className="flex space-x-2 justify-center">
            <button
              onClick={downloadQR}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Descargar QR</span>
            </button>
            <button
              onClick={shareViaWhatsApp}
              disabled={isSharing}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-white transition-colors ${isSharing ? 'bg-green-400' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {isSharing ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4" />
                  <span>Compartiendo...</span>
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" />
                  <span>WhatsApp</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRViewer;