export interface ContentImprovement {
  section: string;
  current_content: string;
  suggested_improvement: string;
  rationale: string;
}

export interface StructureImprovement {
  recommendation: string;
  importance: string;
  details: string;
}

// Interface pour l'analyse interne
export interface ResumeAnalysisDetails {
  strengths: string[];
  weaknesses: string[];
  missing_elements: string[];
  format_issues: string[];
}

// Interface pour les recommandations
export interface ResumeRecommendations {
  content_improvements: ContentImprovement[];
  structure_improvements: StructureImprovement[];
  keyword_optimization: string[];
  ats_compatibility_tips: string[];
}

// Interface pour l'analyse globale
export interface ResumeAnalysisData {
  _generated_by?: string;
  analysis: ResumeAnalysisDetails;
  formatted_content: string;
  improved_summary: string;
  experience_years?: number; 
  metadata: {
    analysis_method: string;
    analysis_timestamp: string;
    filename: string;
    improvement_target: string;
    error?: string;
    formatting_method?: string; 
    language?: string;
  };
  output_document: {
    filename: string;
    format: string;
  };
  recommendations: ResumeRecommendations;
}

// Interface pour la réponse complète
export interface ResumeImprovement {
  analysis: ResumeAnalysisData;
  download_url: string;
  experience_years?: number; 
  experience_message?: string; 
}