import axios from 'axios';
import { ResumeImprovement } from '@/types/resume-improve';

export class ResumeImproveService {
/**
 * Améliore un CV selon un standard spécifique ou pour une offre d'emploi
 * @param resumeFile Le fichier CV à améliorer
 * @param improvementTarget Le type d'amélioration (american, canadian, linkedin, job_offer)
 * @param jobFile Le fichier de description de poste (optionnel)
 * @param outputFormat Le format de sortie souhaité (pdf, docx, txt)
 * @param jobDescriptionText Le texte de description de poste (alternative à jobFile)
 * @returns Les résultats de l'amélioration avec un lien de téléchargement
 */
static async improveResume(
    resumeFile: File, 
    improvementTarget: string, 
    jobFile: File | null, 
    outputFormat: string = 'pdf',
    jobDescriptionText?: string
  ): Promise<ResumeImprovement> {
    try {
      console.log("ResumeService: Préparation de l'amélioration", {
        resume: {
          name: resumeFile.name,
          type: resumeFile.type,
          size: resumeFile.size
        },
        improvement_target: improvementTarget,
        output_format: outputFormat,
        job: jobFile ? {
          name: jobFile.name,
          type: jobFile.type,
          size: jobFile.size
        } : jobDescriptionText ? 'Texte fourni' : 'N/A'
      });

      // Créer un formulaire pour envoyer les fichiers
      const formData = new FormData();
      formData.append('resume', resumeFile);
      formData.append('improvement_target', improvementTarget);
      formData.append('output_format', outputFormat);
      
      // Ajouter les informations de description de poste (fichier ou texte)
      if (improvementTarget === 'job_offer') {
        if (jobFile) {
          formData.append('job_description', jobFile);
        } else if (jobDescriptionText) {
          formData.append('job_description_text', jobDescriptionText);
        }
      }

      console.log("ResumeService: FormData créé, envoi de la requête");

      // Envoyer la requête au backend via le proxy API de Next.js
      const response = await axios.post('/api/resumes/improve', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log("ResumeService: Réponse reçue", response.status);
      console.log("ResumeService: Années d'expérience détectées:", response.data.experience_years);

      // S'assurer que toutes les propriétés requises sont présentes pour éviter les erreurs
      const result = response.data as ResumeImprovement;
      
      // Vérifier et initialiser les structures de données si nécessaire
      if (!result.analysis.recommendations) {
        result.analysis.recommendations = {
          content_improvements: [],
          structure_improvements: [],
          keyword_optimization: [],
          ats_compatibility_tips: []
        };
      }
      
      // S'assurer que les listes ne sont pas null/undefined
      if (!result.analysis.recommendations.content_improvements) {
        result.analysis.recommendations.content_improvements = [];
      }
      if (!result.analysis.recommendations.structure_improvements) {
        result.analysis.recommendations.structure_improvements = [];
      }
      if (!result.analysis.recommendations.keyword_optimization) {
        result.analysis.recommendations.keyword_optimization = [];
      }
      if (!result.analysis.recommendations.ats_compatibility_tips) {
        result.analysis.recommendations.ats_compatibility_tips = [];
      }
      
      // De même pour l'analyse
      if (!result.analysis.analysis) {
        result.analysis.analysis = {
          strengths: [],
          weaknesses: [],
          missing_elements: [],
          format_issues: []
        };
      }
      
      // Vérifier que les listes ne sont pas null/undefined
      if (!result.analysis.analysis.strengths) result.analysis.analysis.strengths = [];
      if (!result.analysis.analysis.weaknesses) result.analysis.analysis.weaknesses = [];
      if (!result.analysis.analysis.missing_elements) result.analysis.analysis.missing_elements = [];
      if (!result.analysis.analysis.format_issues) result.analysis.analysis.format_issues = [];
      
      return result;
    } catch (error) {
      console.error('Erreur détaillée lors de l\'amélioration du CV:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error('Réponse d\'erreur:', error.response.status, error.response.data);
          throw new Error(error.response.data.error || `Erreur ${error.response.status} lors de l'amélioration du CV`);
        } else if (error.request) {
          console.error('Pas de réponse reçue:', error.request);
          throw new Error('Aucune réponse du serveur. Veuillez vérifier votre connexion internet.');
        } else {
          console.error('Erreur de configuration:', error.message);
          throw new Error(`Erreur de configuration: ${error.message}`);
        }
      }
      
      throw new Error('Une erreur inattendue est survenue lors de l\'amélioration du CV');
    }
  }
}