import { useState, useRef } from 'react';

interface FileUploadProps {
  id: string;
  label: string;
  acceptedFormats: string;
  maxSize?: number; // en Mo
  onFileSelected: (file: File | null) => void;
  disabled?: boolean;
}

export default function FileUpload({ 
  id, 
  label, 
  acceptedFormats,
  maxSize = 5, // 5 Mo par défaut
  onFileSelected,
  disabled = false
}: FileUploadProps) {
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Formats affichés à l'utilisateur
  const displayFormats = acceptedFormats
    .replace(/\./g, '')
    .split(',')
    .map(f => f.toUpperCase())
    .join(', ');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("handleFileChange triggered"); // Debug
    
    const files = e.target.files;
    if (!files || files.length === 0) {
      console.log("No file selected"); // Debug
      setFileName('');
      setError('');
      onFileSelected(null);
      return;
    }
    
    const file = files[0];
    console.log("Selected file:", file.name, file.type, file.size); // Debug
    
    // Vérification du type de fichier
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const acceptedExtensions = acceptedFormats.split(',');
    
    if (!acceptedExtensions.includes(fileExtension)) {
      const errorMsg = `Format non supporté. Veuillez utiliser: ${displayFormats}`;
      console.log(errorMsg); // Debug
      setFileName('');
      setError(errorMsg);
      onFileSelected(null);
      return;
    }
    
    // Vérification de la taille
    const maxSizeBytes = maxSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      const errorMsg = `Fichier trop volumineux (max: ${maxSize} Mo)`;
      console.log(errorMsg); // Debug
      setFileName('');
      setError(errorMsg);
      onFileSelected(null);
      return;
    }
    
    // Fichier valide
    console.log("File valid, setting fileName and calling onFileSelected"); // Debug
    setFileName(file.name);
    setError('');
    onFileSelected(file);
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    
    // Simuler le changement de fichier pour l'input
    if (inputRef.current) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(files[0]);
      inputRef.current.files = dataTransfer.files;
      
      // Déclencher manuellement l'événement de changement
      const event = new Event('change', { bubbles: true });
      inputRef.current.dispatchEvent(event);
    }
  };
  
  const handleClick = () => {
    if (inputRef.current && !disabled) {
      inputRef.current.click();
    }
  };

  return (
    <div className="w-full">
      <div 
        className={`relative border-2 ${isDragging ? 'border-primary-500' : 'border-dashed border-gray-300'} rounded-lg p-6 
        ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'} transition-colors`}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          id={id}
          name={id}
          className="hidden"
          accept={acceptedFormats}
          onChange={handleFileChange}
          disabled={disabled}
        />
        
        <div className="flex flex-col items-center justify-center text-center">
          {fileName ? (
            // Fichier sélectionné
            <div className="flex flex-col items-center">
              <div className="mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="font-medium text-gray-700 break-all">{fileName}</span>
              <button 
                type="button"
                className="mt-2 text-sm text-red-600 hover:text-red-800 focus:outline-none"
                onClick={(e) => {
                  e.stopPropagation();
                  setFileName('');
                  onFileSelected(null);
                  if (inputRef.current) {
                    inputRef.current.value = '';
                  }
                }}
              >
                Supprimer
              </button>
            </div>
          ) : (
            // Pas de fichier sélectionné
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="font-medium text-gray-600 mb-1">
                {label}
              </span>
              <span className="text-xs text-gray-500">
                Formats acceptés: {displayFormats} (max. {maxSize} Mo)
              </span>
              <span className="text-xs text-gray-500 mt-1">
                Glissez-déposez ou cliquez pour sélectionner
              </span>
            </>
          )}
        </div>
      </div>
      
      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}