// services/resume-service.ts
import axios from 'axios';
import { ResumeAnalysis } from '@/types/resume';

export class ResumeService {
  /**
   * Analyse un CV par rapport à une offre d'emploi
   * @param resumeFile Le fichier CV à analyser
   * @param jobFile Le fichier de description de poste
   * @returns Les résultats de l'analyse
   */
  static async analyzeResume(resumeFile: File, jobFile: File): Promise<ResumeAnalysis> {
    try {
      console.log("ResumeService: Préparation de l'analyse", {
        resume: {
          name: resumeFile.name,
          type: resumeFile.type,
          size: resumeFile.size
        },
        job: {
          name: jobFile.name,
          type: jobFile.type,
          size: jobFile.size
        }
      });

      // Créer un formulaire pour envoyer les fichiers
      const formData = new FormData();
      formData.append('resume', resumeFile);
      formData.append('job_description', jobFile);

      console.log("ResumeService: FormData créé, envoi de la requête");

      // Envoyer la requête au backend via le proxy API de Next.js
      const response = await axios.post('/api/resumes/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log("ResumeService: Réponse reçue", response.status);

      // Retourner les données de l'analyse
      return response.data;
    } catch (error) {
      console.error('Erreur détaillée lors de l\'analyse du CV:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error('Réponse d\'erreur:', error.response.status, error.response.data);
          throw new Error(error.response.data.error || `Erreur ${error.response.status} lors de l'analyse du CV`);
        } else if (error.request) {
          console.error('Pas de réponse reçue:', error.request);
          throw new Error('Aucune réponse du serveur. Veuillez vérifier votre connexion internet.');
        } else {
          console.error('Erreur de configuration:', error.message);
          throw new Error(`Erreur de configuration: ${error.message}`);
        }
      }
      
      throw new Error('Une erreur inattendue est survenue lors de l\'analyse du CV');
    }
  }
}