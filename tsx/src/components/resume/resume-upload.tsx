// frontend/components/resume/resume-upload.tsx
import { useState } from 'react';
import { ResumeService } from '@/services/resume-service';
import { ResumeAnalysis } from '@/types/resume';

interface ResumeUploadProps {
  onAnalysisComplete: (data: ResumeAnalysis) => void;
  jobFile: File | null;
}

export default function ResumeUpload({ onAnalysisComplete, jobFile }: ResumeUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Gérer le changement de fichier
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    // Vérifier le type et la taille du fichier
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!validTypes.includes(selectedFile.type)) {
      setUploadError('Format de fichier non pris en charge. Veuillez télécharger un fichier PDF, DOCX ou TXT.');
      return;
    }
    
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (selectedFile.size > maxSize) {
      setUploadError('La taille du fichier dépasse la limite de 5 Mo.');
      return;
    }
    
    setFile(selectedFile);
    setUploadError(null);
  };

  // Gérer l'envoi du fichier
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setUploadError('Veuillez sélectionner un fichier CV.');
      return;
    }
    
    if (!jobFile) {
      setUploadError('Veuillez télécharger une description de poste.');
      return;
    }
    
    try {
      setIsUploading(true);
      setUploadProgress(10);
      
      // Simuler une progression
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);
      
      // Appeler le service d'analyse de CV
      const analysisResult = await ResumeService.analyzeResume(file, jobFile);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Transmettre les résultats au composant parent
      onAnalysisComplete(analysisResult);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'analyse du CV.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col space-y-4">
          {/* Sélection du fichier */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              id="resume-file"
              className="hidden"
              accept=".pdf,.docx,.txt"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <label
              htmlFor="resume-file"
              className="cursor-pointer flex flex-col items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="font-medium text-gray-600 mb-1">
                {file ? file.name : 'Cliquez pour sélectionner un CV'}
              </span>
              <span className="text-xs text-gray-500">
                Formats acceptés: PDF, DOCX, TXT (max. 5MB)
              </span>
            </label>
          </div>

          {/* Message d'erreur */}
          {uploadError && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{uploadError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Barre de progression */}
          {isUploading && (
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${uploadProgress}%` }}
              ></div>
              <p className="text-xs text-red-500 mt-1 text-center">
                {uploadProgress < 100 ? 'Analyse en cours...' : 'Analyse terminée'}
              </p>
            </div>
          )}

          {/* Bouton d'envoi */}
          <button
            type="submit"
            disabled={!file || !jobFile || isUploading}
            className="bg-primary-600 text-red-600 font-medium py-2 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Analyse en cours...' : 'Analyser le CV'}
          </button>
        </div>
      </form>
    </div>
  );
}