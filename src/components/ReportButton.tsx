import { useState } from 'react';
import { Download, FileText, Loader2, Share2 } from 'lucide-react';
import { Passenger } from '../types';
import { generatePassengerReport } from '../utils/pdfGenerator';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface ReportButtonProps {
  passenger?: Passenger;
  passengers?: Passenger[];
  title?: string;
  onError?: (message: string) => void;
  showShareButton?: boolean;
}

export default function ReportButton({ 
  passenger,
  passengers,
  title = 'Informe de Pasajero',
  onError = (message: string) => alert(message),
  showShareButton = false
}: ReportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Función para generar y descargar el reporte
  const handleGenerateReport = async () => {
    if (isGenerating) return;
    
    try {
      setIsGenerating(true);
      
      // Determinar qué datos usar para el reporte
      const reportData = passengers || (passenger ? [passenger] : []);
      
      if (reportData.length === 0) {
        throw new Error('No hay datos para generar el reporte');
      }
      
      // Generar y descargar el reporte
      generatePassengerReport(
        reportData,
        passengers ? 'Informe de Pasajeros' : `Informe de ${passenger?.name || 'Pasajero'}`
      );
      
    } catch (error) {
      console.error('Error al generar el reporte:', error);
      onError('No se pudo generar el reporte. Por favor, intente nuevamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Función para compartir por WhatsApp
  const shareViaWhatsApp = async () => {
    if (isSharing) return;
    
    setIsSharing(true);
    try {
      // Determinar qué datos usar para el reporte
      const reportData = passengers || (passenger ? [passenger] : []);
      
      if (reportData.length === 0) {
        throw new Error('No hay datos para generar el reporte');
      }
      
      // Generar el PDF como blob
      const pdfBlob = await generatePDFBlob(reportData);
      if (!pdfBlob) {
        throw new Error('No se pudo generar el PDF.');
      }

      const fileName = `informe-${passenger?.name || 'pasajeros'}-${new Date().toISOString().split('T')[0]}.pdf`;
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
      
      // Verificar si estamos en un dispositivo móvil
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Intentar usar la API nativa para compartir (ideal para móviles)
      if (isMobile && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        console.log('Usando Web Share API para compartir archivo');
        try {
          await navigator.share({
            files: [pdfFile],
            title: 'Informe de Pasajero',
            text: `Informe de ${passenger?.name || 'pasajeros'}`,
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
      
      // 1. Guardar el PDF localmente
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = pdfUrl;
      downloadLink.download = fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      
      // Pequeño retraso para asegurar que la descarga comience
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 2. Abrir WhatsApp con mensaje predefinido
      const text = encodeURIComponent(`Hola, te envío el informe de ${passenger?.name || 'pasajeros'}. Acabo de descargar el PDF, te lo adjunto por este medio.`);
      
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
        URL.revokeObjectURL(pdfUrl);
      }, 1500);
      
    } catch (error) {
      console.error("Error al compartir por WhatsApp:", error);
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        onError('Hubo un error al intentar compartir el informe. Por favor, intente nuevamente.');
      }
    } finally {
      setIsSharing(false);
    }
  };

  // Función para generar el PDF como blob
  const generatePDFBlob = async (reportData: Passenger[]) => {
    try {
      // Crear un nuevo documento PDF
      const doc = new jsPDF();
      
      // Título del informe
      const title = passengers ? 'Informe de Pasajeros' : `Informe de ${passenger?.name || 'Pasajero'}`;
      doc.setFontSize(18);
      doc.text(title, 14, 22);
      
      // Fecha de generación
      doc.setFontSize(10);
      doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 14, 30);
      
      // Configurar la tabla
      const tableColumn = ['Nombre', 'Cédula', 'Gerencia'];
      const tableRows: string[][] = [];
      
      // Llenar los datos de la tabla
      reportData.forEach(passenger => {
        const passengerData = [
          passenger.name,
          passenger.cedula,
          passenger.gerencia
        ];
        tableRows.push(passengerData);
      });
      
      // Agregar la tabla al documento
      (doc as any).autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        styles: { 
          fontSize: 10,
          cellPadding: 3,
          valign: 'middle',
          halign: 'left',
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        margin: { top: 40 }
      });
      
      // Pie de página
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text(
          `Página ${i} de ${pageCount}`,
          doc.internal.pageSize.width - 30,
          doc.internal.pageSize.height - 10
        );
      }
      
      // Retornar como blob
      return doc.output('blob');
    } catch (error) {
      console.error('Error generando PDF blob:', error);
      return null;
    }
  };

  return (
    <div className="flex space-x-2">
      <button
        onClick={handleGenerateReport}
        disabled={isGenerating}
        className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
          isGenerating 
            ? 'bg-blue-400' 
            : 'bg-blue-600 hover:bg-blue-700'
        } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors`}
        title="Generar y descargar reporte PDF"
      >
        {isGenerating ? (
          <>
            <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
            Generando...
          </>
        ) : (
          <>
            <FileText className="-ml-1 mr-2 h-4 w-4" />
            {passengers ? 'Descargar Informe' : 'Descargar Reporte'}
          </>
        )}
      </button>

      {showShareButton && (
        <button
          onClick={shareViaWhatsApp}
          disabled={isSharing || isGenerating}
          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
            isSharing || isGenerating
              ? 'bg-green-400' 
              : 'bg-green-600 hover:bg-green-700'
          } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors`}
          title="Compartir por WhatsApp"
        >
          {isSharing ? (
            <>
              <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
              Compartiendo...
            </>
          ) : (
            <>
              <Share2 className="-ml-1 mr-2 h-4 w-4" />
              WhatsApp
            </>
          )}
        </button>
      )}
    </div>
  );
}
