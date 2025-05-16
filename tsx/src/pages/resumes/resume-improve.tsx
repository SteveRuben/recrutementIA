"use client"

import { useState, useEffect, useRef } from "react"
import Head from "next/head"
import type { ResumeImprovement } from "@/types/resume-improve"
import FileUpload from "@/components/FileUpload"
import { ResumeImproveService } from "@/services/resume-improve-service"
import { 
  ArrowRight, CheckCircle, FileText, Briefcase, 
  BarChart2, AlertCircle, X, Download, Edit, 
  Star, AlertTriangle, List, FileDown, Code,
  ChevronUp,
  ChevronDown
} from "lucide-react"

export default function ResumeImprovePage() {
  const formatExperienceYears = (years : number) => {
    if (!years) return "0";
    
    // Si c'est un entier (comme 1.0, 2.0) -> "1 an" ou "2 ans"
    if (years === Math.floor(years)) {
      return years === 1 ? "1 an" : `${years} ans`;
    }
    
    // Si c'est moins d'un an (0.x)
    if (years < 1) {
      const months = Math.round(years * 12);
      return months === 1 ? "1 mois" : `${months} mois`;
    }
    
    // Si c'est une valeur décimale avec années et mois (comme 1.5 -> "1 an et 6 mois")
    const wholeYears = Math.floor(years);
    const months = Math.round((years - wholeYears) * 12);
    
    if (months === 0) {
      return wholeYears === 1 ? "1 an" : `${wholeYears} ans`;
    }
    
    if (months === 12) {
      return (wholeYears + 1) === 1 ? "1 an" : `${wholeYears + 1} ans`;
    }
    
    const yearsText = wholeYears === 1 ? "1 an" : `${wholeYears} ans`;
    const monthsText = months === 1 ? "1 mois" : `${months} mois`;
    
    return `${yearsText} et ${monthsText}`;
  };
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [jobFile, setJobFile] = useState<File | null>(null)
  const [improvementTarget, setImprovementTarget] = useState<string>("american")
  const [outputFormat, setOutputFormat] = useState<string>("pdf")
  const [improvement, setImprovement] = useState<ResumeImprovement | null>(null)
  const [showResults, setShowResults] = useState<boolean>(false)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number>(0)
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [showTips, setShowTips] = useState<boolean>(true)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    strengths: true,
    weaknesses: true,
    missing: true,
    format: true,
    content: true,
    structure: true,
    keywords: true,
    ats: true,
  })
  const progressBarRef = useRef<HTMLDivElement>(null)

  // Réinitialiser l'erreur lorsque les fichiers changent
  useEffect(() => {
    if (error) setError(null)
  }, [resumeFile, jobFile, improvementTarget])

  // Effet pour l'animation de la barre de progression
  useEffect(() => {
    if (progressBarRef.current) {
      progressBarRef.current.style.width = `${progress}%`
    }
  }, [progress])

  // Gestion des changements de format de sortie
  const handleFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setOutputFormat(e.target.value)
  }

  // Gestion des changements de cible d'amélioration
  const handleTargetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setImprovementTarget(e.target.value)
    // Si on sélectionne job_offer, forcer l'étape 1 pour permettre le téléchargement de la description
    if (e.target.value === "job_offer" && !jobFile) {
      setCurrentStep(1)
    } else if (e.target.value !== "job_offer") {
      // Si on désélectionne job_offer, passer à l'étape 2 (CV)
      setJobFile(null)
      if (currentStep === 1) setCurrentStep(2)
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const handleImprove = async () => {
    if (!resumeFile) {
      setError("Veuillez sélectionner un CV.")
      return
    }

    if (improvementTarget === "job_offer" && !jobFile) {
      setError("Veuillez sélectionner une description de poste pour l'amélioration ciblée.")
      return
    }

    try {
      setError(null)
      setIsProcessing(true)
      setProgress(0)
      setCurrentStep(3)

      // Animation de progression plus réaliste
      const progressSteps = [
        { target: 15, time: 800 },
        { target: 35, time: 1500 },
        { target: 60, time: 2000 },
        { target: 85, time: 2500 },
      ]

      let currentStepIndex = 0
      const animateProgressStep = () => {
        if (currentStepIndex < progressSteps.length) {
          const { target, time } = progressSteps[currentStepIndex]
          const startValue = currentStepIndex > 0 ? progressSteps[currentStepIndex - 1].target : 0
          const valueToAdd = target - startValue
          const startTime = Date.now()
          const endTime = startTime + time

          const updateProgress = () => {
            const now = Date.now()
            if (now < endTime) {
              const elapsedRatio = (now - startTime) / time
              // Fonction d'accélération pour une animation plus naturelle
              const easedRatio = 1 - Math.pow(1 - elapsedRatio, 3) // Cubic ease-out
              setProgress(Math.floor(startValue + valueToAdd * easedRatio))
              requestAnimationFrame(updateProgress)
            } else {
              setProgress(target)
              currentStepIndex++
              animateProgressStep()
            }
          }

          requestAnimationFrame(updateProgress)
        }
      }

      animateProgressStep()

      // Effectuer l'analyse
      console.log("Début de l'amélioration avec:", {
        resume: resumeFile.name,
        target: improvementTarget,
        job: jobFile?.name || "N/A",
        format: outputFormat
      })
      
      const result = await ResumeImproveService.improveResume(resumeFile, improvementTarget, jobFile, outputFormat)
      console.log("Amélioration terminée, résultat:", result)

      setProgress(100)
      setImprovement(result)
      setShowResults(true)
      setCurrentStep(4)

      // Faire défiler vers les résultats
      setTimeout(() => {
        const resultsSection = document.getElementById("results-section")
        if (resultsSection) {
          resultsSection.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      }, 500)
    } catch (err) {
      console.error("Erreur lors de l'amélioration:", err)
      setError(err instanceof Error ? err.message : "Une erreur s'est produite pendant l'amélioration")
    } finally {
      setIsProcessing(false)
    }
  }

  const resetImprovement = () => {
    setShowResults(false)
    setImprovement(null)
    setProgress(0)
    setCurrentStep(resumeFile ? 2 : 1)
  }

  const downloadImprovedCV = () => {
    if (improvement?.download_url) {
      const link = document.createElement('a');
      link.href = improvement.download_url;
      link.download = improvement.analysis.output_document.filename || 'CV_amélioré.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const renderStepIcon = (step: number, isActive: boolean, isCompleted: boolean) => {
    const baseClasses = "w-6 h-6"
    const activeClasses = isActive ? "text-primary" : isCompleted ? "text-success" : "text-gray-400"

    switch (step) {
      case 1:
        return <Briefcase className={`${baseClasses} ${activeClasses}`} />
      case 2:
        return <FileText className={`${baseClasses} ${activeClasses}`} />
      case 3:
        return <BarChart2 className={`${baseClasses} ${activeClasses}`} />
      case 4:
        return <CheckCircle className={`${baseClasses} ${activeClasses}`} />
      default:
        return null
    }
  }

  return (
    <>
      <Head>
        <title>Amélioration de CV - RecruteIA</title>
        <meta name="description" content="Améliorez votre CV avec l'intelligence artificielle" />
      </Head>

      <div className="bg-gradient-to-b from-gray-50 to-white min-h-screen py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* En-tête */}
            <div className="text-center mb-12 fade-in">
              <h1 className="text-4xl font-bold text-gray-800 mb-4">Amélioration de CV</h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Notre IA optimise votre CV selon des standards internationaux ou pour des offres d'emploi spécifiques.
              </p>
            </div>

            {/* Barre de progression des étapes */}
            <div className="mb-12 px-4">
              <div className="relative">
                {/* Ligne de progression */}
                <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -translate-y-1/2 rounded-full"></div>
                <div
                  className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${Math.max(0, (currentStep - 1) * 33.33)}%` }}
                ></div>

                {/* Étapes */}
                <div className="relative flex justify-between">
                  {[1, 2, 3, 4].map((step) => {
                    const isActive = currentStep === step
                    const isCompleted = currentStep > step
                    return (
                      <div
                        key={step}
                        className={`flex flex-col items-center cursor-pointer transition-all duration-300 ${
                          isActive ? "scale-110" : ""
                        }`}
                        onClick={() => {
                          if (!isProcessing && (step < currentStep || (step === 2 && resumeFile) || step === 1)) {
                            setCurrentStep(step)
                          }
                        }}
                      >
                        <div
                          className={`
                            w-12 h-12 rounded-full flex items-center justify-center z-10
                            transition-all duration-300 ease-in-out
                            ${
                              isActive
                                ? "bg-primary text-white shadow-lg shadow-primary/20"
                                : isCompleted
                                  ? "bg-success text-white"
                                  : "bg-white text-gray-400 border-2 border-gray-200"
                            }
                          `}
                        >
                          {renderStepIcon(step, isActive, isCompleted)}
                        </div>
                        <div
                          className={`
                            mt-2 font-medium text-sm transition-all duration-300
                            ${isActive ? "text-primary" : isCompleted ? "text-success" : "text-gray-500"}
                          `}
                        >
                          {step === 1 && "Cible d'amélioration"}
                          {step === 2 && "Votre CV"}
                          {step === 3 && "Optimisation"}
                          {step === 4 && "Résultats"}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Conseils (collapsible) */}
            {showTips && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md mb-8 fade-in">
                <div className="flex justify-between items-start">
                  <div className="flex">
                    <div className="flex-shrink-0 text-blue-500 mt-1">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">Conseils pour de meilleurs résultats</h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Utilisez un CV au format PDF pour une meilleure analyse</li>
                          <li>Pour le style américain, votre CV sera optimisé pour les entreprises aux États-Unis</li>
                          <li>Pour le style canadien, des sections spécifiques seront ajoutées (langues, etc.)</li>
                          <li>Pour LinkedIn, le format sera adapté pour un profil professionnel en ligne</li>
                          <li>Pour une offre d'emploi, téléchargez la description du poste pour un CV ciblé</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setShowTips(false)} className="text-blue-500 hover:text-blue-700">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Contenu principal basé sur l'étape actuelle */}
            <div className="bg-white rounded-xl shadow-xl overflow-hidden mb-8 transition-all duration-500 fade-in">
              {/* Étape 1: Choix de la cible d'amélioration */}
              <div className={`transition-all duration-500 ${currentStep === 1 ? "block" : "hidden"}`}>
                <div className="bg-gradient-to-r from-primary-50 to-white p-6 border-b">
                  <div className="flex items-center">
                    <div className="bg-primary-100 rounded-full p-3 mr-4">
                      <Briefcase className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">Type d'amélioration</h2>
                      <p className="text-gray-600">
                        Choisissez le standard pour lequel vous souhaitez optimiser votre CV
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-8">
                  <div className="max-w-lg mx-auto">
                    <div className="mb-6">
                      <label htmlFor="improvement-target" className="block text-sm font-medium text-gray-700 mb-2">
                        Cible d'amélioration
                      </label>
                      <select
                        id="improvement-target"
                        value={improvementTarget}
                        onChange={handleTargetChange}
                        className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors duration-200"
                      >
                        <option value="american">Style américain</option>
                        <option value="canadian">Style canadien</option>
                        <option value="linkedin">Format LinkedIn</option>
                        <option value="job_offer">Pour une offre d'emploi spécifique</option>
                      </select>
                    </div>

                    {improvementTarget === "job_offer" && (
                      <div className="mt-6">
                        <FileUpload
                          id="job-file"
                          label="Sélectionner une description de poste"
                          acceptedFormats=".pdf,.docx,.txt"
                          onFileSelected={setJobFile}
                          disabled={isProcessing}
                        />
                      </div>
                    )}

                    <div className="mb-6 mt-8">
                      <label htmlFor="output-format" className="block text-sm font-medium text-gray-700 mb-2">
                        Format du CV amélioré
                      </label>
                      <select
                        id="output-format"
                        value={outputFormat}
                        onChange={handleFormatChange}
                        className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors duration-200"
                      >
                        <option value="pdf">PDF</option>
                        <option value="docx">DOCX (Microsoft Word)</option>
                        <option value="txt">TXT (Texte brut)</option>
                      </select>
                    </div>

                    <div className="mt-8 flex justify-end">
                      <button
                        onClick={() => {
                          if (improvementTarget !== "job_offer" || jobFile) {
                            setCurrentStep(2)
                          } else {
                            setError("Veuillez sélectionner une description de poste pour l'amélioration ciblée.")
                          }
                        }}
                        className="flex items-center bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                      >
                        Continuer
                        <ArrowRight className="ml-2 w-5 h-5" />
                      </button>
                    </div>

                    {error && (
                      <div className="mt-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <AlertCircle className="h-5 w-5 text-red-500" />
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-red-700">{error}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Étape 2: Téléchargement du CV */}
              <div className={`transition-all duration-500 ${currentStep === 2 ? "block" : "hidden"}`}>
                <div className="bg-gradient-to-r from-primary-50 to-white p-6 border-b">
                  <div className="flex items-center">
                    <div className="bg-primary-100 rounded-full p-3 mr-4">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">Téléchargement du CV</h2>
                      <p className="text-gray-600">Téléchargez le CV que vous souhaitez améliorer</p>
                    </div>
                  </div>
                </div>

                <div className="p-8">
                  <div className="max-w-lg mx-auto">
                    <FileUpload
                      id="resume-file"
                      label="Sélectionner un CV"
                      acceptedFormats=".pdf,.docx,.txt"
                      onFileSelected={setResumeFile}
                      disabled={isProcessing}
                    />

                    <div className="mt-8 flex justify-between">
                      <button
                        onClick={() => setCurrentStep(1)}
                        className="flex items-center bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium transition-all duration-200"
                      >
                        Retour
                      </button>

                      {resumeFile && (
                        <button
                          onClick={handleImprove}
                          disabled={isProcessing}
                          className="flex items-center bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Améliorer le CV
                          <ArrowRight className="ml-2 w-5 h-5" />
                        </button>
                      )}
                    </div>

                    {error && (
                      <div className="mt-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <AlertCircle className="h-5 w-5 text-red-500" />
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-red-700">{error}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Étape 3: Traitement en cours */}
              <div className={`transition-all duration-500 ${currentStep === 3 ? "block" : "hidden"}`}>
                <div className="bg-gradient-to-r from-primary-50 to-white p-6 border-b">
                  <div className="flex items-center">
                    <div className="bg-primary-100 rounded-full p-3 mr-4">
                      <BarChart2 className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">Amélioration en cours</h2>
                      <p className="text-gray-600">Notre IA optimise votre CV selon vos préférences</p>
                    </div>
                  </div>
                </div>

                <div className="p-8">
                  <div className="max-w-lg mx-auto">
                    {error ? (
                      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md mb-6 animate-pulse">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <AlertCircle className="h-5 w-5 text-red-500" />
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-red-700">{error}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="mb-8">
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Progression</span>
                            <span className="text-sm font-medium text-gray-700">{progress}%</span>
                          </div>
                          <div className="h-4 w-full bg-gray-200 rounded-full overflow-hidden">
                            <div
                              ref={progressBarRef}
                              className="h-full bg-primary rounded-full transition-all duration-700 ease-out progress-bar-animation"
                              style={{ width: "0%" }}
                            ></div>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="flex items-center">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${progress >= 20 ? "bg-success-100 text-success" : "bg-gray-100 text-gray-400"}`}
                            >
                              {progress >= 20 ? <CheckCircle className="w-5 h-5" /> : "1"}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <span className="font-medium">Extraction du contenu</span>
                                {progress >= 20 && <span className="text-success">Terminé</span>}
                              </div>
                              <div
                                className={`h-1 w-full bg-gray-200 rounded-full mt-2 ${progress < 20 ? "animate-pulse" : ""}`}
                              >
                                <div
                                  className="h-full bg-success rounded-full transition-all duration-300"
                                  style={{ width: `${Math.min(100, progress < 20 ? progress * 5 : 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${progress >= 50 ? "bg-success-100 text-success" : "bg-gray-100 text-gray-400"}`}
                            >
                              {progress >= 50 ? <CheckCircle className="w-5 h-5" /> : "2"}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <span className="font-medium">Analyse et optimisation</span>
                                {progress >= 50 && <span className="text-success">Terminé</span>}
                              </div>
                              <div
                                className={`h-1 w-full bg-gray-200 rounded-full mt-2 ${progress >= 20 && progress < 50 ? "animate-pulse" : ""}`}
                              >
                                <div
                                  className="h-full bg-success rounded-full transition-all duration-300"
                                  style={{
                                    width: `${Math.min(100, progress >= 20 ? ((progress - 20) * 100) / 30 : 0)}%`,
                                  }}
                                ></div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${progress >= 80 ? "bg-success-100 text-success" : "bg-gray-100 text-gray-400"}`}
                            >
                              {progress >= 80 ? <CheckCircle className="w-5 h-5" /> : "3"}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <span className="font-medium">Réorganisation du CV</span>
                                {progress >= 80 && <span className="text-success">Terminé</span>}
                              </div>
                              <div
                                className={`h-1 w-full bg-gray-200 rounded-full mt-2 ${progress >= 50 && progress < 80 ? "animate-pulse" : ""}`}
                              >
                                <div
                                  className="h-full bg-success rounded-full transition-all duration-300"
                                  style={{
                                    width: `${Math.min(100, progress >= 50 ? ((progress - 50) * 100) / 30 : 0)}%`,
                                  }}
                                ></div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${progress >= 100 ? "bg-success-100 text-success" : "bg-gray-100 text-gray-400"}`}
                            >
                              {progress >= 100 ? <CheckCircle className="w-5 h-5" /> : "4"}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <span className="font-medium">Finalisation du document</span>
                                {progress >= 100 && <span className="text-success">Terminé</span>}
                              </div>
                              <div
                                className={`h-1 w-full bg-gray-200 rounded-full mt-2 ${progress >= 80 && progress < 100 ? "animate-pulse" : ""}`}
                              >
                                <div
                                  className="h-full bg-success rounded-full transition-all duration-300"
                                  style={{
                                    width: `${Math.min(100, progress >= 80 ? ((progress - 80) * 100) / 20 : 0)}%`,
                                  }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-8 text-center">
                          <p className="text-gray-600 italic">
                            {progress < 20 && "Extraction du contenu du CV..."}
                            {progress >= 20 && progress < 50 && "Analyse du contenu et optimisation selon les standards..."}
                            {progress >= 50 && progress < 80 && "Réorganisation des sections pour une meilleure lisibilité..."}
                            {progress >= 80 && progress < 100 && "Finalisation du document et génération des recommandations..."}
                            {progress >= 100 && "Amélioration terminée ! Affichage des résultats..."}
                          </p>
                        </div>
                      </>
                    )}

                    {error && (
                      <div className="mt-8 flex justify-center">
                        <button
                          onClick={() => setCurrentStep(2)}
                          className="flex items-center bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-medium transition-all duration-200"
                        >
                          Réessayer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Étape 4: Résultats */}
              <div
                id="results-section"
                className={`transition-all duration-500 ${currentStep === 4 && showResults ? "block" : "hidden"}`}
              >
                <div className="bg-gradient-to-r from-success-50 to-white p-6 border-b">
                  <div className="flex items-center">
                    <div className="bg-success-100 rounded-full p-3 mr-4">
                      <CheckCircle className="w-6 h-6 text-success" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">Amélioration terminée</h2>
                      <p className="text-gray-600">
                        Votre CV a été optimisé pour {improvementTarget === "american" ? "le style américain" : 
                                                    improvementTarget === "canadian" ? "le style canadien" : 
                                                    improvementTarget === "linkedin" ? "le format LinkedIn" : 
                                                    "l'offre d'emploi spécifique"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {improvement && (
                    <div className="fade-in-up">
                      {/* Section de téléchargement */}
                      <div className="bg-success-50 p-6 rounded-lg border border-success-200 mb-8 flex flex-col md:flex-row items-center justify-between">
                        <div className="mb-4 md:mb-0">
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">CV amélioré prêt à télécharger</h3>
                          <p className="text-gray-600">Votre CV a été optimisé au format {outputFormat.toUpperCase()}</p>
                        </div>
                        <button
                          onClick={downloadImprovedCV}
                          className="flex items-center bg-success hover:bg-success-dark text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                        >
                          <Download className="mr-2 w-5 h-5" />
                          Télécharger le CV
                        </button>
                      </div>
                      {improvement && improvement.experience_years! > 0 && (
                          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 mb-8 flex flex-col md:flex-row items-start justify-between">
                            <div className="flex items-start">
                              <div className="bg-blue-100 rounded-full p-2 mr-3 mt-1">
                                <Briefcase className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">Expérience professionnelle détectée</h3>
                                <p className="text-gray-700">
                                  <span className="font-medium text-blue-700">{formatExperienceYears(improvement.experience_years || 0)} d'expérience</span> détectés dans votre CV.
                                </p>
                                {improvement.experience_message && (
                                  <p className="text-gray-600 text-sm italic mt-2">{improvement.experience_message}</p>
                                )}
                              </div>
                            </div>
                            <div className="mt-4 md:mt-0">
                              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded">
                                Information clé pour les recruteurs
                              </span>
                            </div>
                          </div>
                      )}
                      {/* Onglets pour les résultats */}
                      <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="p-6">
                          <h3 className="text-xl font-bold text-gray-800 mb-4">Analyse et recommandations</h3>
                          
                          {/* Forces */}
                          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden transition-all duration-300 mb-6">
                            <div
                              className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                              onClick={() => toggleSection("strengths")}
                            >
                              <div className="flex items-center">
                                <Star className="w-5 h-5 text-success mr-2" />
                                <h4 className="text-lg font-semibold text-gray-800">Points forts</h4>
                              </div>
                              {expandedSections.strengths ? (
                                <ChevronUp className="w-5 h-5 text-gray-500" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-500" />
                              )}
                            </div>

                            {expandedSections.strengths && (
                              <div className="p-4 border-t border-gray-100">
                                {improvement?.analysis?.analysis?.strengths?.length > 0 ? (
                                  <ul className="space-y-3">
                                    {improvement.analysis.analysis.strengths.map((strength, index) => (
                                      <li
                                        key={index}
                                        className="flex items-start slide-in-right"
                                        style={{ animationDelay: `${index * 0.1}s` }}
                                      >
                                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-success-100 flex items-center justify-center mr-3">
                                          <CheckCircle className="h-4 w-4 text-success" />
                                        </div>
                                        <span className="text-gray-700">{strength}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-gray-500 italic">Aucun point fort spécifique identifié</p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Faiblesses */}
                          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden transition-all duration-300 mb-6">
                            <div
                              className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                              onClick={() => toggleSection("weaknesses")}
                            >
                              <div className="flex items-center">
                                <AlertTriangle className="w-5 h-5 text-amber-500 mr-2" />
                                <h4 className="text-lg font-semibold text-gray-800">Points faibles</h4>
                              </div>
                              {expandedSections.weaknesses ? (
                                <ChevronUp className="w-5 h-5 text-gray-500" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-500" />
                              )}
                            </div>

                            {expandedSections.weaknesses && (
                              <div className="p-4 border-t border-gray-100">
                                {improvement?.analysis?.analysis?.weaknesses?.length > 0 ? (
                                  <ul className="space-y-3">
                                    {improvement.analysis.analysis.weaknesses.map((weakness, index) => (
                                      <li
                                        key={index}
                                        className="flex items-start slide-in-right"
                                        style={{ animationDelay: `${index * 0.1}s` }}
                                      >
                                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center mr-3">
                                          <AlertCircle className="h-4 w-4 text-amber-500" />
                                        </div>
                                        <span className="text-gray-700">{weakness}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-gray-500 italic">Aucun point faible majeur identifié</p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Éléments manquants */}
                          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden transition-all duration-300 mb-6">
                            <div
                              className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                              onClick={() => toggleSection("missing")}
                            >
                              <div className="flex items-center">
                                <List className="w-5 h-5 text-primary mr-2" />
                                <h4 className="text-lg font-semibold text-gray-800">Éléments manquants</h4>
                              </div>
                              {expandedSections.missing ? (
                                <ChevronUp className="w-5 h-5 text-gray-500" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-500" />
                              )}
                            </div>

                            {expandedSections.missing && (
                              <div className="p-4 border-t border-gray-100">
                                {improvement?.analysis?.analysis?.missing_elements?.length > 0 ? (
                                  <ul className="space-y-3">
                                    {improvement.analysis.analysis.missing_elements.map((element, index) => (
                                      <li
                                        key={index}
                                        className="flex items-start slide-in-right"
                                        style={{ animationDelay: `${index * 0.1}s` }}
                                      >
                                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                                          <Edit className="h-4 w-4 text-primary" />
                                        </div>
                                        <span className="text-gray-700">{element}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-gray-500 italic">Aucun élément manquant identifié</p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Améliorations de contenu */}
                          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden transition-all duration-300 mb-6">
                            <div
                              className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                              onClick={() => toggleSection("content")}
                            >
                              <div className="flex items-center">
                                <FileText className="w-5 h-5 text-primary mr-2" />
                                <h4 className="text-lg font-semibold text-gray-800">Améliorations de contenu</h4>
                              </div>
                              {expandedSections.content ? (
                                <ChevronUp className="w-5 h-5 text-gray-500" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-500" />
                              )}
                            </div>

                            {expandedSections.content && (
                              <div className="p-4 border-t border-gray-100">
                                {improvement?.analysis?.recommendations?.content_improvements?.length > 0 ? (
                                  <div className="space-y-4">
                                    {improvement.analysis.recommendations.content_improvements.map((imp, index) => (
                                      <div
                                        key={index}
                                        className="bg-gray-50 p-4 rounded-lg border border-gray-200 slide-in-right"
                                        style={{ animationDelay: `${index * 0.1}s` }}
                                      >
                                        <div className="flex items-center mb-2">
                                          <span className="bg-primary-100 text-primary px-2 py-1 rounded text-sm font-medium">
                                            {imp.section}
                                          </span>
                                        </div>
                                        <p className="text-gray-700 mb-3">
                                          <span className="font-medium">Actuellement: </span>
                                          {imp.current_content}
                                        </p>
                                        <p className="text-primary-700 bg-primary-50 p-3 rounded-lg border border-primary-100 mb-2">
                                          <span className="font-medium">Suggestion: </span>
                                          {imp.suggested_improvement}
                                        </p>
                                        <p className="text-gray-600 text-sm italic">
                                          <span className="font-medium">Raison: </span>
                                          {imp.rationale}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-gray-500 italic">Aucune amélioration de contenu spécifique recommandée</p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Mots-clés recommandés */}
                          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden transition-all duration-300 mb-6">
                            <div
                              className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                              onClick={() => toggleSection("keywords")}
                            >
                              <div className="flex items-center">
                                <Code className="w-5 h-5 text-primary mr-2" />
                                <h4 className="text-lg font-semibold text-gray-800">Mots-clés recommandés</h4>
                              </div>
                              {expandedSections.keywords ? (
                                <ChevronUp className="w-5 h-5 text-gray-500" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-500" />
                              )}
                            </div>

                            

                            {expandedSections.keywords && (
                              <div className="p-4 border-t border-gray-100">
                                {improvement?.analysis?.recommendations?.keyword_optimization?.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {improvement.analysis.recommendations.keyword_optimization.map((keyword, index) => (
                                      <span
                                        key={index}
                                        className="bg-primary-50 text-primary px-3 py-1 rounded-full text-sm font-medium transition-all duration-300 hover:bg-primary-100"
                                      >
                                        {keyword}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-gray-500 italic">Aucun mot-clé spécifique recommandé</p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Conseils pour améliorer la compatibilité ATS */}
                          {improvement.analysis?.recommendations?.ats_compatibility_tips.length > 0 && (
                            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden transition-all duration-300 mb-6">
                              <div
                                className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                                onClick={() => toggleSection("ats")}
                              >
                                <div className="flex items-center">
                                  <FileDown className="w-5 h-5 text-primary mr-2" />
                                  <h4 className="text-lg font-semibold text-gray-800">Conseils pour les systèmes ATS</h4>
                                </div>
                                {expandedSections.ats ? (
                                  <ChevronUp className="w-5 h-5 text-gray-500" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-gray-500" />
                                )}
                              </div>

                              {expandedSections.ats && (
                                <div className="p-4 border-t border-gray-100">
                                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                    <p className="text-blue-800 mb-3 font-medium">
                                      Pour maximiser vos chances de passage des systèmes de tri de CV (ATS):
                                    </p>
                                    <ul className="space-y-2">
                                      {improvement.analysis.recommendations.ats_compatibility_tips.map((tip, index) => (
                                        <li
                                          key={index}
                                          className="flex items-start text-blue-700"
                                        >
                                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center mr-2 mt-0.5">
                                            <span className="text-blue-600 text-xs font-bold">{index + 1}</span>
                                          </div>
                                          {tip}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Résumé */}
                          {improvement?.analysis?.improved_summary && (
                            <div className="bg-success-50 p-5 rounded-lg border border-success-200 mt-8">
                              <h4 className="text-lg font-semibold text-gray-800 mb-3">Résumé professionnel optimisé</h4>
                              <p className="text-gray-700">
                                {improvement.analysis.improved_summary.split(/(avec \d+(?:\.\d+)?  d'expérience|avec \d+ ans? et \d+ mois d'expérience|with \d+(?:\.\d+)? years? of experience|with \d+ years? and \d+ months? of experience)/).map((part, i) => 
                                  part.match(/(avec \d+(?:\.\d+)?  d'expérience|avec \d+ ans? et \d+ mois d'expérience|with \d+(?:\.\d+)? years? of experience|with \d+ years? and \d+ months? of experience)/) ? 
                                    <span key={i} className="font-bold text-success">{part}</span> : 
                                    <span key={i}>{part}</span>
                                )}
                              </p>
                            </div>
                          )}

                          <div className="mt-8 flex justify-center">
                            <button
                              onClick={resetImprovement}
                              className="flex items-center bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium transition-all duration-200 mr-4"
                            >
                              Nouvelle amélioration
                            </button>
                            <button
                              onClick={downloadImprovedCV}
                              className="flex items-center bg-success hover:bg-success-dark text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                            >
                              <Download className="mr-2 w-5 h-5" />
                              Télécharger le CV
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Informations sur les fichiers sélectionnés */}
            {(currentStep === 1 || currentStep === 2) && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-8 fade-in">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Paramètres sélectionnés</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    className={`
                      p-4 rounded-lg border-2 transition-all duration-300
                      ${improvementTarget ? "border-success-200 bg-success-50" : "border-gray-200 bg-gray-50"}
                    `}
                  >
                    <div className="flex items-center">
                      <div className={`p-2 rounded-full mr-3 ${improvementTarget ? "bg-success-100" : "bg-gray-200"}`}>
                        <Briefcase className={`w-5 h-5 ${improvementTarget ? "text-success" : "text-gray-500"}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Cible d'amélioration</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {improvementTarget === "american" && <span className="text-success">Style américain</span>}
                          {improvementTarget === "canadian" && <span className="text-success">Style canadien</span>}
                          {improvementTarget === "linkedin" && <span className="text-success">Format LinkedIn</span>}
                          {improvementTarget === "job_offer" && <span className="text-success">Pour une offre d'emploi spécifique</span>}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`
                      p-4 rounded-lg border-2 transition-all duration-300
                      ${resumeFile ? "border-success-200 bg-success-50" : "border-gray-200 bg-gray-50"}
                    `}
                  >
                    <div className="flex items-center">
                      <div className={`p-2 rounded-full mr-3 ${resumeFile ? "bg-success-100" : "bg-gray-200"}`}>
                        <FileText className={`w-5 h-5 ${resumeFile ? "text-success" : "text-gray-500"}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">CV à améliorer</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {resumeFile ? (
                            <span className="text-success flex items-center">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              <span className="truncate max-w-[200px]">{resumeFile.name}</span>
                            </span>
                          ) : (
                            <span className="text-gray-400">Aucun fichier sélectionné</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {improvementTarget === "job_offer" && (
                    <div
                      className={`
                        p-4 rounded-lg border-2 transition-all duration-300
                        ${jobFile ? "border-success-200 bg-success-50" : "border-gray-200 bg-gray-50"}
                      `}
                    >
                      <div className="flex items-center">
                        <div className={`p-2 rounded-full mr-3 ${jobFile ? "bg-success-100" : "bg-gray-200"}`}>
                          <Briefcase className={`w-5 h-5 ${jobFile ? "text-success" : "text-gray-500"}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Description du poste</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {jobFile ? (
                              <span className="text-success flex items-center">
                                <CheckCircle className="h-4 w-4 mr-1" />
                                <span className="truncate max-w-[200px]">{jobFile.name}</span>
                              </span>
                            ) : (
                              <span className="text-gray-400">Aucun fichier sélectionné</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div
                    className={`
                      p-4 rounded-lg border-2 transition-all duration-300 border-success-200 bg-success-50
                    `}
                  >
                    <div className="flex items-center">
                      <div className="p-2 rounded-full mr-3 bg-success-100">
                        <FileDown className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Format de sortie</p>
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="text-success">{outputFormat.toUpperCase()}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}