import React, { useState, useRef } from 'react';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { Trip } from '../../types';
import { importTripsFromFile } from '../../utils/csvImport';

interface CSVImportProps {
  onImportSuccess?: (count: number) => void;
  onImportError?: (error: string) => void;
  allowedTypes?: string[];
  onComplete?: () => void;
}

const CSVImport: React.FC<CSVImportProps> = ({
  onImportSuccess,
  onImportError,
  allowedTypes = ['.csv', '.xlsx', '.xls']
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setResult(null);

    // Verificar tipo de archivo
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      const errorMsg = `Tipo de archivo no permitido. Por favor use: ${allowedTypes.join(', ')}`;
      setResult({ type: 'error', message: errorMsg });
      if (onImportError) onImportError(errorMsg);
      setIsProcessing(false);
      return;
    }

    try {
      // Importar y procesar el archivo usando la utilidad
      const importedCount = await importTripsFromFile(file);
      
      if (importedCount === 0) {
        throw new Error('No se pudieron importar viajes del archivo. Verifique el formato.');
      }
      
      setResult({ 
        type: 'success', 
        message: `Archivo importado correctamente: ${importedCount} viajes procesados` 
      });
      
      if (onImportSuccess) onImportSuccess(importedCount);
      if (onComplete) onComplete();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error al procesar el archivo';
      setResult({ type: 'error', message: errorMsg });
      if (onImportError) onImportError(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  // La lógica de procesamiento de archivos se ha movido a utils/csvImport.ts

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processFile(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'} transition-all duration-200`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={allowedTypes.join(',')}
          className="hidden"
        />
        
        <div className="flex flex-col items-center justify-center space-y-4">
          <Upload className="h-12 w-12 text-gray-400" />
          <div className="space-y-1">
            <p className="text-lg font-medium text-gray-700">
              {isDragging ? 'Suelta el archivo aquí' : 'Arrastra y suelta un archivo'}
            </p>
            <p className="text-sm text-gray-500">
              o
            </p>
            <button
              onClick={handleButtonClick}
              disabled={isProcessing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Procesando...' : 'Seleccionar archivo'}
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Formatos permitidos: {allowedTypes.join(', ')}
            </p>
          </div>
        </div>
      </div>

      {result && (
        <div className={`mt-4 p-4 rounded-lg ${result.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          <div className="flex items-center space-x-2">
            {result.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            <span>{result.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CSVImport;