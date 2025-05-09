import axios from 'axios';
import { TestCase, StarterCode, EvaluationExercise } from './exercise-service';

export interface MatchResults {
  match_score: number;
  matching_skills: string[];
  missing_skills: string[];
  overall_assessment: string;
}

export interface TrainingExerciseResponse {
  difficulty: string;
  language_skill_map: Record<string, string[]>;
  match_results: MatchResults;
  missing_skills: string[];
  training_exercises: EvaluationExercise[];
}

export class TrainingService {
  /**
   * Génère des exercices d'entraînement basés sur un CV et une description de poste
   * @param resumeFile Fichier CV
   * @param jobFile Fichier de description de poste
   * @param language Langage préféré pour les exercices (optionnel)
   */
  static async generateTrainingExercises(
    resumeFile: File,
    jobFile: File,
    language: string | null = null
  ): Promise<TrainingExerciseResponse> {
    try {
      console.log("TrainingService: Préparation de la génération d'exercices d'entraînement");

      // Créer le FormData
      const formData = new FormData();
      formData.append('resume', resumeFile);
      formData.append('job_description', jobFile);
      
      if (language) {
        formData.append('language', language);
      }
      
      console.log("TrainingService: Envoi FormData avec fichiers", {
        resume: { name: resumeFile.name, size: resumeFile.size, type: resumeFile.type },
        job: { name: jobFile.name, size: jobFile.size, type: jobFile.type }
      });

      // Envoyer la requête
      const response = await axios.post('/api/training/generate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      console.log("TrainingService: Réponse reçue", { 
        status: response.status 
      });
      console.log("TrainingService: Type de la réponse", typeof response.data);
      console.log("TrainingService: Clés de la réponse", 
        response.data ? Object.keys(response.data) : 'Aucune donnée'
      );
      
      return response.data;
    } catch (error) {
      console.error("TrainingService: Erreur lors de la génération d'exercices d'entraînement:", error);
      
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.error || `Erreur ${error.response.status} lors de la génération d'exercices d'entraînement`);
      }
      
      throw new Error("Une erreur est survenue lors de la génération des exercices d'entraînement");
    }
  }
}