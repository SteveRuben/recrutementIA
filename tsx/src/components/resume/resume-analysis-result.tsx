import { ResumeAnalysis } from '@/types/resume';

interface ResumeAnalysisResultProps {
  analysis: ResumeAnalysis | null;
  jobTitle: string;
}

export default function ResumeAnalysisResult({ analysis, jobTitle }: ResumeAnalysisResultProps) {
  if (!analysis) return null;

  // Extraire les informations pertinentes
  const candidateProfile = analysis.candidate_profile || {};
  const matchScore = candidateProfile.match_score || 0;
  const strengths = candidateProfile.strengths || [];
  const gaps = candidateProfile.gaps || [];
  const technicalSkills = candidateProfile.technical_skills || [];
  const softSkills = candidateProfile.soft_skills || [];
  const education = candidateProfile.education || [];
  const focusAreas = candidateProfile.recommended_focus_areas || [];

  // Extraire un nom de poste plus lisible à partir du nom de fichier
  const formatJobTitle = (filename: string) => {
    // Supprimer l'extension de fichier
    let title = filename.replace(/\.[^/.]+$/, "");
    
    // Remplacer les tirets et underscores par des espaces
    title = title.replace(/[-_]/g, " ");
    
    // Mettre en majuscule la première lettre de chaque mot
    title = title.split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    
    return title;
  };

  const displayJobTitle = formatJobTitle(jobTitle);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* En-tête avec score de correspondance */}
      <div className="bg-gray-50 p-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">Analyse de compatibilité</h3>
            <p className="text-gray-600 font-medium">
              {displayJobTitle && (
                <>
                  <span className="text-primary-600">Poste : </span>
                  <span>{displayJobTitle}</span>
                </>
              )}
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center">
            <div className="text-center">
              <div className="relative inline-flex justify-center items-center w-24 h-24">
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
                      matchScore >= 75 ? 'text-green-500' :
                      matchScore >= 50 ? 'text-yellow-500' : 'text-red-500'
                    }`}
                    strokeWidth="8"
                    strokeDasharray={`${matchScore * 2.83}, 283`} // 2.83 = 2π×45 ÷ 100
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="45"
                    cx="50"
                    cy="50"
                  />
                </svg>
                <span className="absolute text-2xl font-bold">{Math.round(matchScore)}%</span>
              </div>
              <p className="text-sm font-medium text-gray-600 mt-1">Correspondance au poste</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu de l'analyse */}
      <div className="p-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Forces */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-3">Points forts</h4>
            {strengths.length > 0 ? (
              <ul className="space-y-2">
                {strengths.map((strength, index) => (
                  <li key={index} className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic">Aucun point fort spécifique identifié</p>
            )}
          </div>

          {/* Lacunes */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-3">Points à améliorer</h4>
            {gaps.length > 0 ? (
              <ul className="space-y-2">
                {gaps.map((gap, index) => (
                  <li key={index} className="flex items-start">
                    <svg className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>{gap}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic">Aucune lacune majeure identifiée</p>
            )}
          </div>
        </div>

        {/* Compétences */}
        <div className="mt-8">
          <h4 className="text-lg font-semibold text-gray-800 mb-3">Compétences identifiées</h4>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h5 className="font-medium text-gray-700 mb-2">Compétences techniques</h5>
              <div className="flex flex-wrap gap-2">
                {technicalSkills.length > 0 ? technicalSkills.map((skill, index) => (
                  <span 
                    key={index} 
                    className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded"
                  >
                    {skill}
                  </span>
                )) : (
                  <p className="text-gray-500 italic">Aucune compétence technique identifiée</p>
                )}
              </div>
            </div>
            <div>
              <h5 className="font-medium text-gray-700 mb-2">Compétences personnelles</h5>
              <div className="flex flex-wrap gap-2">
                {softSkills.length > 0 ? softSkills.map((skill, index) => (
                  <span 
                    key={index} 
                    className="bg-purple-100 text-purple-800 text-sm font-medium px-2.5 py-0.5 rounded"
                  >
                    {skill}
                  </span>
                )) : (
                  <p className="text-gray-500 italic">Aucune compétence personnelle identifiée</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Formation */}
        <div className="mt-8">
          <h4 className="text-lg font-semibold text-gray-800 mb-3">Formation</h4>
          {education.length > 0 ? (
            <ul className="space-y-3">
              {education.map((edu, index) => (
                <li key={index} className="bg-gray-50 p-3 rounded-md">
                  <div className="font-medium">{edu.degree}</div>
                  <div className="text-gray-600">{edu.institution}</div>
                  <div className="text-sm text-gray-500">{edu.year}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 italic">Aucune formation identifiée</p>
          )}
        </div>
        
        {/* Recommandations pour l'entretien */}
        <div className="mt-8 bg-indigo-50 p-4 rounded-md">
          <h4 className="text-lg font-semibold text-gray-800 mb-3">Recommandations pour l'entretien</h4>
          {focusAreas.length > 0 ? (
            <div>
              <p className="mb-3">Concentrez-vous sur ces domaines lors de l'entretien :</p>
              <ul className="space-y-2">
                {focusAreas.map((area, index) => (
                  <li key={index} className="flex items-start">
                    <svg className="h-5 w-5 text-indigo-600 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span>{area}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-gray-600">
              Le profil du candidat semble bien correspondre aux exigences du poste. 
              Concentrez-vous sur la validation des compétences techniques et de l'expérience lors de l'entretien.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}