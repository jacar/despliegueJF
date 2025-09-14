import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Passenger } from '../types';

export const generatePassengerReport = (passengers: Passenger[], title: string = 'Informe de Pasajeros') => {
  // Crear un nuevo documento PDF
  const doc = new jsPDF();
  
  // Título del informe
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
  // Fecha de generación
  doc.setFontSize(10);
  doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 14, 30);
  
  // Configurar la tabla
  const tableColumn = ['Nombre', 'Cédula', 'Gerencia'];
  const tableRows: string[][] = [];
  
  // Llenar los datos de la tabla
  passengers.forEach(passenger => {
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
  
  // Crear un blob y forzar la descarga
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  
  // Crear un enlace temporal para la descarga
  const downloadLink = document.createElement('a');
  downloadLink.href = pdfUrl;
  downloadLink.download = `informe-pasajeros-${new Date().toISOString().split('T')[0]}.pdf`;
  
  // Simular clic para iniciar la descarga
  document.body.appendChild(downloadLink);
  downloadLink.click();
  
  // Limpiar
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(pdfUrl);
}
