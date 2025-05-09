import { useState } from 'react';
import Head from 'next/head';
import { EvaluationExercise } from '@/services/exercise-service';
import { TrainingService, MatchResults } from '@/services/training-service';
import FileUpload from '@/components/FileUpload';

const LANGUAGES = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'Anglais' },
  { value: 'es', label: 'Espagnol' }
];

export default function GenerateTrainingPage() {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobFile, setJobFile] = useState<File | null>(null);
  const [language, setLanguage] = useState<string>('fr');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [exercises, setExercises] = useState<EvaluationExercise[]>([]);
  const [matchResults, setMatchResults] = useState<MatchResults | null>(null);
  const [missingSkills, setMissingSkills] = useState<string[]>([]);
  const [skillMap, setSkillMap] = useState<Record<string, string[]>>({});

  const handleGenerate = async () => {
    if (!resumeFile) {
      setError('Veuillez sélectionner un fichier CV.');
      return;
    }

    if (!jobFile) {
      setError('Veuillez sélectionner un fichier de description de poste.');
      return;
    }

    try {
      setError(null);
      setIsGenerating(true);
      setExercises([]);
      setMatchResults(null);
      setMissingSkills([]);
      setSkillMap({});

      // Générer les exercices d'entraînement
      const result = await TrainingService.generateTrainingExercises(
        resumeFile,
        jobFile,
        language
      );

      console.log("Page: Résultat brut reçu", result);
      
      // Extraire les exercices
      if (result.training_exercises && Array.isArray(result.training_exercises)) {
        // Adapter les exercices pour l'affichage
        const adaptedExercises = result.training_exercises.map(ex => ({
          ...ex,
          // Convertir les durées en un format plus lisible
          estimated_time: ex.estimated_time || 
            (ex.duration_minutes ? `${ex.duration_minutes} min` : 'Non spécifié'),
          
          // Unifier les champs de compétences
          skills_evaluated: ex.skills_evaluated || ex.skills || ex.targeted_skills || [],
          
          // Ajouter des critères d'évaluation s'ils n'existent pas
          evaluation_criteria: ex.evaluation_criteria || 
            (ex.test_cases ? ex.test_cases.map(tc => 
              `Vérifier que l'entrée ${tc.input} produit la sortie ${tc.expected_output}`
            ) : [])
        }));
        
        setExercises(adaptedExercises);
      }
      
      // Extraire les autres informations
      if (result.match_results) {
        setMatchResults(result.match_results);
      }
      
      if (result.missing_skills && Array.isArray(result.missing_skills)) {
        setMissingSkills(result.missing_skills);
      }
      
      if (result.language_skill_map) {
        setSkillMap(result.language_skill_map);
      }

      // Faire défiler vers les résultats
      setTimeout(() => {
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) {
          resultsSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (err) {
      console.error("Erreur lors de la génération d'exercices d'entraînement:", err);
      setError(err instanceof Error ? err.message : "Une erreur s'est produite pendant la génération");
    } finally {
      setIsGenerating(false);
    }
  };

  // Fonction pour formater un score de correspondance
  const formatMatchScore = (score: number): { text: string; color: string } => {
    if (score >= 80) {
      return { text: 'Excellent', color: 'text-green-600' };
    } else if (score >= 60) {
      return { text: 'Bon', color: 'text-yellow-600' };
    } else if (score >= 40) {
      return { text: 'Moyen', color: 'text-orange-600' };
    } else {
      return { text: 'Faible', color: 'text-red-600' };
    }
  };

  return (
    <>
      <Head>
        <title>Exercices d'entraînement - RecruteIA</title>
        <meta name="description" content="Générer des exercices d'entraînement personnalisés basés sur un CV et une description de poste" />
      </Head>

      <div className="bg-gray-50 py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* En-tête de la page */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-3">Exercices d'entraînement personnalisés</h1>
              <p className="text-gray-600">
                Générez des exercices d'entraînement adaptés aux compétences manquantes d'un candidat par rapport à une offre d'emploi.
              </p>
            </div>

            {/* Formulaire de génération d'exercices */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Documents requis</h2>
              
              {/* CV */}
              <div className="mb-6">
                <label htmlFor="resume-file" className="block text-sm font-medium text-gray-700 mb-2">
                  CV du candidat
                </label>
                <FileUpload
                  id="resume-file"
                  label="Sélectionner un CV"
                  acceptedFormats=".pdf,.docx,.txt"
                  onFileSelected={setResumeFile}
                  disabled={isGenerating}
                />
              </div>
              
              {/* Description de poste */}
              <div className="mb-6">
                <label htmlFor="job-file" className="block text-sm font-medium text-gray-700 mb-2">
                  Description du poste
                </label>
                <FileUpload
                  id="job-file"
                  label="Sélectionner une description de poste"
                  acceptedFormats=".pdf,.docx,.txt"
                  onFileSelected={setJobFile}
                  disabled={isGenerating}
                />
              </div>
              
              {/* Sélection de langue */}
              <div className="mb-6">
                <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
                  Langue des exercices
                </label>
                <select
                  id="language"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  disabled={isGenerating}
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Erreur */}
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

              {/* Bouton de génération */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !resumeFile || !jobFile}
                className="w-full bg-primary-600 hover:bg-primary-700 text-gray-400 font-bold py-4 px-6 rounded-lg text-lg shadow-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Générer les exercices d'entraînement
                  </>
                )}
              </button>
            </div>

            {/* Résultats - Analyse de correspondance et exercices */}
            {(matchResults || exercises.length > 0) && (
              <div id="results-section" className="mt-10">
                {/* Analyse de correspondance */}
                {matchResults && (
                  <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
                    <div className="bg-primary-700 p-4">
                      <h3 className="text-xl font-bold text-white">Analyse de correspondance</h3>
                    </div>
                    
                    <div className="p-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                        <div>
                          <p className="text-gray-700 mb-1">Score de correspondance :</p>
                          <div className="flex items-baseline">
                            <span className="text-3xl font-bold mr-2">{matchResults.match_score}%</span>
                            <span className={`${formatMatchScore(matchResults.match_score).color} font-medium`}>
                              {formatMatchScore(matchResults.match_score).text}
                            </span>
                          </div>
                        </div>
                        
                        <div className="mt-4 md:mt-0">
                          <div className="relative h-24 w-24">
                            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                              <circle
                                className="text-gray-200"
                                strokeWidth="8"
                                stroke="currentColor"
                                fill="transparent"
                                r="45"
                                cx="50"
                                cy="50"
                              />
                              <circle
                                className={`${
                                  matchResults.match_score >= 80 ? 'text-green-500' :
                                  matchResults.match_score >= 60 ? 'text-yellow-500' :
                                  matchResults.match_score >= 40 ? 'text-orange-500' : 'text-red-500'
                                }`}
                                strokeWidth="8"
                                strokeDasharray={`${matchResults.match_score * 2.83}, 283`} // 2.83 = 2π×45 ÷ 100
                                strokeLinecap="round"
                                stroke="currentColor"
                                fill="transparent"
                                r="45"
                                cx="50"
                                cy="50"
                              />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
                              {matchResults.match_score}%
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {matchResults.overall_assessment && (
                        <div className="mb-6">
                          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">
                            Évaluation globale
                          </h4>
                          <p className="text-gray-700">{matchResults.overall_assessment}</p>
                        </div>
                      )}
                      
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">
                            Compétences correspondantes
                          </h4>
                          <div className="bg-green-50 p-4 rounded-md">
                            {matchResults.matching_skills.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {matchResults.matching_skills.map((skill, index) => (
                                  <span key={index} className="bg-green-100 text-green-800 text-sm px-2.5 py-0.5 rounded">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500 italic">Aucune compétence correspondante</p>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">
                            Compétences manquantes
                          </h4>
                          <div className="bg-red-50 p-4 rounded-md">
                            {missingSkills.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {missingSkills.map((skill, index) => (
                                  <span key={index} className="bg-red-100 text-red-800 text-sm px-2.5 py-0.5 rounded">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500 italic">Aucune compétence manquante</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Exercices recommandés */}
                {exercises.length > 0 && (
                  <>
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Exercices d'entraînement recommandés</h2>
                    
                    <div className="space-y-6 mb-8">
                      {exercises.map((exercise, index) => (
                        <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
                          <div className="bg-primary-700 p-4">
                            <div className="flex justify-between items-center">
                              <h3 className="text-lg font-bold text-white">{exercise.title}</h3>
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  exercise.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                                  exercise.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {exercise.difficulty === 'easy' ? 'Facile' :
                                  exercise.difficulty === 'medium' ? 'Moyen' : 'Difficile'}
                                </span>
                                <span className="text-xs bg-white text-primary-700 px-2 py-1 rounded-full">
                                  {exercise.estimated_time}
                                </span>
                              </div>
                            </div>
                            {exercise.language && (
                              <div className="mt-2 text-sm text-white/80">
                                Langage: <span className="font-semibold">{exercise.language}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="p-6">
                            <div className="prose max-w-none mb-6">
                              <p>{exercise.description}</p>
                            </div>
                            
                            <div className="mb-6">
                              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                                Compétences ciblées
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {(exercise.skills_evaluated || []).map((skill, skillIndex) => (
                                  <span key={skillIndex} className="bg-blue-100 text-blue-800 text-sm px-2.5 py-0.5 rounded">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                            
                            {exercise.starter_code && (
                              <div className="mb-6">
                                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                                  Code de départ
                                </h4>
                                <div className="bg-gray-800 rounded-md text-white p-4 overflow-auto max-h-60">
                                  <pre className="whitespace-pre-wrap">
                                    {Object.entries(exercise.starter_code).map(([lang, code]) => (
                                      <div key={lang}>
                                        <p className="text-xs text-gray-400 mb-1">{lang}</p>
                                        <code>{code}</code>
                                      </div>
                                    ))}
                                  </pre>
                                </div>
                              </div>
                            )}
                            
                            {(exercise.evaluation_criteria && exercise.evaluation_criteria.length > 0) && (
                              <div className="mb-4">
                                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                                  Critères d'évaluation
                                </h4>
                                <ul className="list-disc pl-5 space-y-1 text-gray-700">
                                  {exercise.evaluation_criteria.map((criteria, criteriaIndex) => (
                                    <li key={criteriaIndex}>{criteria}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {exercise.test_cases && exercise.test_cases.length > 0 && (
                              <div className="mb-4">
                                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                                  Cas de test
                                </h4>
                                <div className="overflow-x-auto">
                                  <table className="min-w-full border divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Entrée
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Sortie attendue
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                          Type
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                      {exercise.test_cases.map((testCase, testIndex) => (
                                        <tr key={testIndex}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                          {testCase.input}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                          {testCase.expected_output}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                          {testCase.is_hidden ? 'Caché' : 'Visible'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                          <button
                            type="button"
                            onClick={() => {
                              // Fonction pour copier l'exercice
                              const exerciseText = `
# ${exercise.title}

## Description
${exercise.description}

## Difficulté
${exercise.difficulty}

## Temps estimé
${exercise.estimated_time}

${exercise.language ? `## Langage
${exercise.language}` : ''}

## Compétences ciblées
${(exercise.skills_evaluated || []).join(', ')}

${exercise.evaluation_criteria && exercise.evaluation_criteria.length > 0 ? 
`## Critères d'évaluation
${exercise.evaluation_criteria.map(c => `- ${c}`).join('\n')}` : ''}

${exercise.starter_code ? 
`## Code de départ
\`\`\`${Object.keys(exercise.starter_code)[0] || ''}
${Object.values(exercise.starter_code)[0] || ''}
\`\`\`` : ''}

${exercise.test_cases && exercise.test_cases.length > 0 ? 
`## Cas de test
${exercise.test_cases.map(tc => `- Entrée: ${tc.input}, Sortie attendue: ${tc.expected_output}${tc.is_hidden ? ' (caché)' : ''}`).join('\n')}` : ''}
                              `;
                              
                              navigator.clipboard.writeText(exerciseText.trim());
                              
                              // Feedback visuel temporaire
                              const button = document.activeElement as HTMLButtonElement;
                              if (button) {
                                const originalText = button.textContent;
                                button.textContent = "Copié !";
                                setTimeout(() => {
                                  button.textContent = originalText;
                                }, 2000);
                              }
                            }}
                            className="text-primary-600 hover:text-primary-800 text-sm font-medium flex items-center"
                          >
                            <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                            Copier l'exercice
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Bouton pour télécharger tous les exercices */}
                  <div className="mt-8 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        // Créer un texte avec tous les exercices et l'analyse
                        let allContent = '';
                        
                        // Ajouter l'analyse de correspondance
                        if (matchResults) {
                          allContent += `# Analyse de correspondance\n\n`;
                          allContent += `Score de correspondance: ${matchResults.match_score}%\n\n`;
                          
                          if (matchResults.overall_assessment) {
                            allContent += `## Évaluation globale\n${matchResults.overall_assessment}\n\n`;
                          }
                          
                          allContent += `## Compétences correspondantes\n${matchResults.matching_skills.join(', ')}\n\n`;
                          allContent += `## Compétences manquantes\n${missingSkills.join(', ')}\n\n`;
                          
                          allContent += `---\n\n`;
                        }
                        
                        // Ajouter les exercices
                        allContent += `# Exercices d'entraînement recommandés\n\n`;
                        
                        exercises.forEach((exercise, index) => {
                          allContent += `## ${index + 1}. ${exercise.title}\n\n`;
                          allContent += `### Description\n${exercise.description}\n\n`;
                          allContent += `### Difficulté\n${exercise.difficulty}\n\n`;
                          allContent += `### Temps estimé\n${exercise.estimated_time}\n\n`;
                          
                          if (exercise.language) {
                            allContent += `### Langage\n${exercise.language}\n\n`;
                          }
                          
                          allContent += `### Compétences ciblées\n${(exercise.skills_evaluated || []).join(', ')}\n\n`;
                          
                          if (exercise.evaluation_criteria && exercise.evaluation_criteria.length > 0) {
                            allContent += `### Critères d'évaluation\n${exercise.evaluation_criteria.map(c => `- ${c}`).join('\n')}\n\n`;
                          }
                          
                          if (exercise.starter_code) {
                            const lang = Object.keys(exercise.starter_code)[0] || '';
                            const code = Object.values(exercise.starter_code)[0] || '';
                            allContent += `### Code de départ\n\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
                          }
                          
                          if (exercise.test_cases && exercise.test_cases.length > 0) {
                            allContent += `### Cas de test\n${exercise.test_cases.map(tc => 
                              `- Entrée: ${tc.input}, Sortie attendue: ${tc.expected_output}${tc.is_hidden ? ' (caché)' : ''}`
                            ).join('\n')}\n\n`;
                          }
                          
                          if (index < exercises.length - 1) {
                            allContent += `---\n\n`;
                          }
                        });
                        
                        // Créer un fichier blob
                        const blob = new Blob([allContent.trim()], { type: 'text/markdown' });
                        const url = URL.createObjectURL(blob);
                        
                        // Créer un lien de téléchargement
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `exercices-entrainement-${new Date().toISOString().split('T')[0]}.md`;
                        a.click();
                        
                        // Nettoyer
                        URL.revokeObjectURL(url);
                      }}
                      className="bg-primary-600 hover:bg-primary-700 text-gray-400 font-medium py-2 px-6 rounded-lg inline-flex items-center shadow-md"
                    >
                      <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Télécharger tous les exercices
                    </button>
                  </div>
                </>
              )}
              
              {!exercises.length && !matchResults && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">Aucun exercice d'entraînement n'a pu être généré.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  </>
);
}