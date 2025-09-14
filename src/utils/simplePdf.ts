import jsPDF from 'jspdf';

export const generateSimplePdf = (data: { title: string; content: string[]; fileName?: string }) => {
  try {
    const doc = new jsPDF();
    
    // Configuración inicial
    doc.setFont('helvetica');
    doc.setFontSize(18);
    
    // Título
    doc.text(data.title, 14, 22);
    
    // Contenido
    doc.setFontSize(12);
    let yPosition = 40;
    
    data.content.forEach((line, index) => {
      if (yPosition > 270) { // Si se acerca al final de la página
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, 14, yPosition);
      yPosition += 7; // Espaciado entre líneas
    });
    
    // Generar el PDF
    const fileName = data.fileName || `documento-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    return { success: true, fileName };
  } catch (error) {
    console.error('Error al generar el PDF:', error);
    return { success: false, error: 'Error al generar el PDF' };
  }
};
