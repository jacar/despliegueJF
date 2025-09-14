import { supabase, hasSupabase } from '../../lib/supabase';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export type ReportMeta = {
  id?: number;
  passenger_id: string;
  period: string; // 'YYYY-MM-DD'
  storage_key: string; // reports/<passenger_id>/<period>.pdf
  size_bytes: number;
};

export async function listReports(passengerId: string, limit = 50, ltCreatedAt?: string) {
  if (!hasSupabase) throw new Error('Supabase no configurado');
  let q = supabase.from('reports').select('*').eq('passenger_id', passengerId).order('created_at', { ascending: false }).limit(limit);
  if (ltCreatedAt) q = q.lt('created_at', ltCreatedAt);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function getDownloadUrl(reportId: number) {
  if (!hasSupabase) throw new Error('Supabase no configurado');
  const { data, error } = await supabase.from('reports').select('storage_key').eq('id', reportId).single();
  if (error) throw error;
  const { data: signed, error: e2 } = await supabase.storage.from('reports').createSignedUrl(data.storage_key, 600);
  if (e2) throw e2;
  return signed.signedUrl;
}

export async function generatePdfBuffer(payload: { 
  passengerId: string; 
  period: string;
  passengerName?: string;
  trips?: Array<{
    date: string;
    origin: string;
    destination: string;
    status: string;
  }>;
}) {
  const { passengerId, period, passengerName = 'Pasajero', trips = [] } = payload;
  
  // Crear documento
  const doc = new jsPDF();
  
  // Configuración de estilos
  const primaryColor = '#2563eb'; // azul-600
  const secondaryColor = '#4b5563'; // gray-600
  const margin = 20;
  let yPosition = margin;
  
  // Función para agregar espacio
  const addSpace = (space = 10) => {
    yPosition += space;
  };
  
  // Logo (opcional)
  // doc.addImage(logo, 'PNG', margin, yPosition, 50, 20);
  
  // Título
  doc.setFontSize(20);
  doc.setTextColor(primaryColor);
  doc.text('REPORTE DIARIO', margin, yPosition + 20);
  
  // Fecha
  doc.setFontSize(10);
  doc.setTextColor(secondaryColor);
  doc.text(
    `Generado el: ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}`, 
    margin, 
    yPosition + 30
  );
  
  // Línea divisoria
  doc.setDrawColor(primaryColor);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition + 35, 210 - margin, yPosition + 35);
  
  yPosition += 50;
  
  // Información del pasajero
  doc.setFontSize(14);
  doc.setTextColor(primaryColor);
  doc.text('INFORMACIÓN DEL PASAJERO', margin, yPosition);
  
  doc.setFontSize(11);
  doc.setTextColor(0); // negro
  yPosition += 10;
  doc.text(`• Nombre: ${passengerName}`, margin + 5, yPosition);
  yPosition += 7;
  doc.text(`• Cédula: ${passengerId}`, margin + 5, yPosition);
  yPosition += 7;
  doc.text(`• Período: ${format(new Date(period), "dd 'de' MMMM 'de' yyyy", { locale: es })}`, margin + 5, yPosition);
  
  // Sección de viajes
  if (trips.length > 0) {
    addSpace(20);
    doc.setFontSize(14);
    doc.setTextColor(primaryColor);
    doc.text('REGISTRO DE VIAJES', margin, yPosition);
    
    // Encabezados de la tabla
    yPosition += 10;
    doc.setFillColor(241, 245, 249); // bg-slate-50
    doc.rect(margin, yPosition - 5, 170, 10, 'F');
    
    doc.setFontSize(10);
    doc.setTextColor(secondaryColor);
    doc.text('FECHA', margin + 3, yPosition);
    doc.text('ORIGEN', margin + 50, yPosition);
    doc.text('DESTINO', margin + 100, yPosition);
    doc.text('ESTADO', margin + 150, yPosition);
    
    // Filas de viajes
    trips.forEach((trip, index) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = margin;
      }
      
      yPosition += 8;
      doc.setFontSize(9);
      doc.setTextColor(0);
      
      // Fila con fondo alternado
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252); // bg-slate-50
        doc.rect(margin, yPosition - 5, 170, 8, 'F');
      }
      
      doc.text(format(new Date(trip.date), 'HH:mm', { locale: es }), margin + 3, yPosition);
      doc.text(trip.origin.substring(0, 20), margin + 50, yPosition);
      doc.text(trip.destination.substring(0, 20), margin + 100, yPosition);
      
      // Estado con color
      const statusColor = trip.status === 'COMPLETADO' ? '#10b981' : '#ef4444';
      doc.setTextColor(statusColor);
      doc.text(trip.status, margin + 150, yPosition);
    });
  } else {
    addSpace(20);
    doc.setFontSize(12);
    doc.setTextColor(secondaryColor);
    doc.text('No hay registros de viajes para este período.', margin, yPosition);
  }
  
  // Pie de página
  const pageCount = doc.internal.pages.length;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(secondaryColor);
    doc.text(
      `Página ${i} de ${pageCount} • Generado por Sistema de Reportes JF`, 
      margin, 
      290,
      { align: 'center' }
    );
  }
  
  // Convertir a ArrayBuffer
  return doc.output('arraybuffer');
}

export async function uploadReportPDF(passengerId: string, period: string, pdfArrayBuffer: ArrayBuffer) {
  if (!hasSupabase) throw new Error('Supabase no configurado');
  const key = `reports/${passengerId}/${period}.pdf`;
  const file = new File([pdfArrayBuffer], `${period}.pdf`, { type: 'application/pdf' });
  const { error: upErr } = await supabase.storage.from('reports').upload(key, file, { upsert: true, contentType: 'application/pdf' });
  if (upErr) throw upErr;
  const size = file.size;
  const { data, error } = await supabase
    .from('reports')
    .upsert({ passenger_id: passengerId, period, storage_key: key, size_bytes: size }, { onConflict: 'passenger_id,period' })
    .select('id')
    .single();
  if (error) throw error;
  return { id: data.id as number, key };
}

export async function createDailyReport(passengerId: string, period: string) {
  try {
    // 1. Generar el PDF
    const pdfBuffer = await generatePdfBuffer({ passengerId, period });
    
    // 2. Subir el PDF a Supabase Storage
    const key = `reports/${passengerId}/${period}.pdf`;
    const file = new File([pdfBuffer], `${period}.pdf`, { type: 'application/pdf' });
    
    // Subir el archivo
    const { error: uploadError } = await supabase.storage
      .from('reports')
      .upload(key, file, { 
        upsert: true, 
        contentType: 'application/pdf' 
      });
    
    if (uploadError) {
      console.error('Error al subir el PDF:', uploadError);
      throw new Error('No se pudo guardar el reporte en el servidor');
    }

    // 3. Guardar metadatos en la base de datos
    const { data, error } = await supabase
      .from('reports')
      .upsert(
        { 
          passenger_id: passengerId, 
          period, 
          storage_key: key, 
          size_bytes: file.size 
        },
        { 
          onConflict: 'passenger_id,period' 
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error al guardar metadatos:', error);
      throw new Error('No se pudieron guardar los metadatos del reporte');
    }

    // 4. Obtener URL de descarga
    const { data: signedUrl } = await supabase.storage
      .from('reports')
      .createSignedUrl(key, 3600); // Válido por 1 hora

    return { 
      id: data.id, 
      downloadUrl: signedUrl?.signedUrl || null,
      period,
      size: file.size
    };
  } catch (error) {
    console.error('Error en createDailyReport:', error);
    throw new Error('Error al generar el reporte. Por favor, intente nuevamente.');
  }
}
