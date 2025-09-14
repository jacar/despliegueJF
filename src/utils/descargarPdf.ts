import jsPDF from 'jspdf';

export const descargarListaPasajeros = (pasajeros: { nombre: string; cedula: string; gerencia: string }[]) => {
  try {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(18);
    doc.text('Lista de Pasajeros', 14, 22);
    
    // Fecha
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 30);
    
    // Encabezados de tabla
    doc.setFontSize(12);
    doc.text('Nombre', 14, 45);
    doc.text('Cédula', 70, 45);
    doc.text('Gerencia', 120, 45);
    
    // Línea divisoria
    doc.line(14, 50, 190, 50);
    
    // Contenido
    let y = 60;
    pasajeros.forEach((pasajero, index) => {
      if (y > 270) { // Cambiar de página si es necesario
        doc.addPage();
        y = 20;
      }
      doc.text(pasajero.nombre, 14, y);
      doc.text(pasajero.cedula, 70, y);
      doc.text(pasajero.gerencia, 120, y);
      y += 10;
    });
    
    // Descargar
    doc.save(`pasajeros-${new Date().toISOString().split('T')[0]}.pdf`);
    
  } catch (error) {
    console.error('Error al generar PDF:', error);
    alert('Error al generar el PDF');
  }
};
