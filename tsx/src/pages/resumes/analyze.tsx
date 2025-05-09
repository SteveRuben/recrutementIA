// pages/resumes/analyze.tsx
import { useState } from 'react';
import Head from 'next/head';
import ResumeAnalysisResult from '@/components/resume/resume-analysis-result';
import { ResumeAnalysis } from '@/types/resume';
import FileUpload from '@/components/FileUpload';
import { ResumeService } from '@/services/resume-service';

export default function ResumeAnalyzePage() {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobFile, setJobFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

  const handleAnalyze = async () => {
    if (!resumeFile || !jobFile) {
      setError('Veuillez sélectionner un CV et une description de poste.');
      return;
    }

    try {
      setError(null);
      setIsAnalyzing(true);
      setProgress(10);

      // Simuler la progression
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      // Effectuer l'analyse
      console.log("Début de l'analyse avec:", resumeFile.name, jobFile.name);
      const result = await ResumeService.analyzeResume(resumeFile, jobFile);
      console.log("Analyse terminée, résultat:", result);

      clearInterval(progressInterval);
      setProgress(100);
      setAnalysis(result);
      setShowResults(true);

      // Faire défiler vers les résultats
      setTimeout(() => {
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) {
          resultsSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (err) {
      console.error("Erreur lors de l'analyse:", err);
      setError(err instanceof Error ? err.message : "Une erreur s'est produite pendant l'analyse");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <>
      <Head>
        <title>Analyse de CV - RecruteIA</title>
        <meta name="description" content="Analyser un CV avec l'intelligence artificielle" />
      </Head>

      <div className="bg-gray-50 py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* En-tête de la page */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-3">Analyse de CV</h1>
              <p className="text-gray-600">
                Téléchargez un CV et une description de poste pour obtenir une analyse détaillée et des recommandations pour l'entretien.
              </p>
            </div>

            {/* Upload de description de poste */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Description du poste</h2>
              <p className="text-gray-600 mb-4">
                Téléchargez un fichier contenant la description du poste pour lequel vous analysez le CV.
              </p>
              
              <FileUpload
                id="job-file"
                label="Sélectionner une description de poste"
                acceptedFormats=".pdf,.docx,.txt"
                onFileSelected={setJobFile}
                disabled={isAnalyzing}
              />
            </div>

            {/* Upload de CV */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Téléchargement du CV</h2>
              <p className="text-gray-600 mb-4">
                Téléchargez un CV au format PDF, DOCX ou TXT pour commencer l'analyse.
              </p>
              
              <FileUpload
                id="resume-file"
                label="Sélectionner un CV"
                acceptedFormats=".pdf,.docx,.txt"
                onFileSelected={setResumeFile}
                disabled={isAnalyzing}
              />
            </div>

            {/* Bouton d'analyse et barre de progression */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              {error && (
                <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {isAnalyzing && (
                <div className="mb-6">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    {progress < 100 ? 'Analyse en cours...' : 'Analyse terminée'}
                  </p>
                </div>
              )}

              {/* Statut des fichiers sélectionnés */}
              <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="text-sm font-medium text-gray-700 mb-1">CV</p>
                  <p className="text-sm text-gray-600">
                    {resumeFile 
                      ? <span className="text-green-600 flex items-center">
                          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {resumeFile.name}
                        </span>
                      : <span className="text-gray-400">Aucun fichier sélectionné</span>
                    }
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="text-sm font-medium text-gray-700 mb-1">Description du poste</p>
                  <p className="text-sm text-gray-600">
                    {jobFile 
                      ? <span className="text-green-600 flex items-center">
                          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {jobFile.name}
                        </span>
                      : <span className="text-gray-400">Aucun fichier sélectionné</span>
                    }
                  </p>
                </div>
              </div>

              {/* Bouton d'analyse très visible */}
              <button
                onClick={handleAnalyze}
                disabled={!resumeFile || !jobFile || isAnalyzing}
                className="w-full bg-primary-600 hover:bg-primary-700 text-gray-600 font-bold py-4 px-6 rounded-lg text-lg shadow-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {isAnalyzing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyse en cours...
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Analyser le CV et la description de poste
                  </>
                )}
              </button>
            </div>

            {/* Résultats d'analyse */}
            {showResults && analysis && (
              <div id="results-section" className="mt-10">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Résultats de l'analyse</h2>
                
                <ResumeAnalysisResult 
                  analysis={analysis}
                  jobTitle={jobFile?.name || ""}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}