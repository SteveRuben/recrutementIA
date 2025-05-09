// services/exercise-service.ts
import axios from 'axios';

// Mise à jour des interfaces pour correspondre à la réponse réelle
export interface TestCase {
  expected_output: string;
  input: string;
  is_hidden: boolean;
}

export interface StarterCode {
  [language: string]: string;
}

export interface EvaluationExercise {
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  duration_minutes?: number; // Nouveau champ
  estimated_time?: string;   // Pour compatibilité
  skills_evaluated?: string[]; // Pour compatibilité
  skills?: string[];         // Nouveau champ
  evaluation_criteria?: string[]; // Pour compatibilité
  starter_code?: StarterCode; // Nouveau champ
  test_cases?: TestCase[];   // Nouveau champ
  language?: string;         // Nouveau champ
  unique_id?: string;        // Nouveau champ
  targeted_skills?: string[]; // Nouveau champ
}

export interface JobRequirements {
  experience_level?: string;
  tech_stacks?: string[];
  technical_skills?: string[];
  soft_skills?: string[];
  certifications?: string[];
}

export interface ExerciseGenerationResponse {
  exercises?: EvaluationExercise[];            // Pour compatibilité
  evaluation_exercises?: EvaluationExercise[]; // Nouveau champ
  job_title?: string;                          // Pour compatibilité
  key_skills?: string[];                       // Pour compatibilité
  required_skills?: string[];                  // Nouveau champ
  job_requirements?: JobRequirements;          // Nouveau champ
  language_skill_map?: Record<string, string[]>; // Nouveau champ
  difficulty?: string;                         // Nouveau champ
}

export class ExerciseService {
  /**
   * Génère des exercices d'évaluation basés sur une description de poste
   * @param jobFile Fichier de description de poste ou null si on utilise un texte
   * @param jobDescription Texte de la description de poste (si pas de fichier)
   * @param language Langage préféré pour les exercices (optionnel)
   */
  static async generateExercises(
    jobFile: File | null,
    jobDescription: string | null = null,
    language: string | null = null
  ): Promise<ExerciseGenerationResponse> {
    try {
      console.log("ExerciseService: Préparation de la génération d'exercices");
      
      let formData: FormData | null = null;
      let jsonData: any = null;
      
      // Si on a un fichier, utiliser FormData
      if (jobFile) {
        formData = new FormData();
        formData.append('job_description', jobFile);
        
        if (language) {
          formData.append('language', language);
        }
        
        console.log("ExerciseService: Envoi FormData avec fichier", {
          filename: jobFile.name,
          size: jobFile.size,
          type: jobFile.type
        });
      } 
      // Sinon, utiliser JSON
      else if (jobDescription) {
        jsonData = {
          job_description: jobDescription
        };
        
        if (language) {
          jsonData.language = language;
        }
        
        console.log("ExerciseService: Envoi JSON", { 
          descriptionLength: jobDescription.length,
          language 
        });
      }
      else {
        throw new Error("Un fichier ou une description de poste est requis");
      }

      // Effectuer la requête avec le bon format
      const response = formData 
        ? await axios.post('/api/exercises/generate', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
        : await axios.post('/api/exercises/generate', jsonData, {
            headers: { 'Content-Type': 'application/json' }
          });

      console.log("ExerciseService: Réponse reçue", { 
        status: response.status 
      });
      console.log("ExerciseService: Type de la réponse", typeof response.data);
      console.log("ExerciseService: Clés de la réponse", 
        response.data ? Object.keys(response.data) : 'Aucune donnée'
      );
      
      // Adapter le format de la réponse pour le client
      const adaptedResponse: ExerciseGenerationResponse = response.data;
      
      return adaptedResponse;
    } catch (error) {
      console.error("ExerciseService: Erreur lors de la génération d'exercices:", error);
      
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.error || `Erreur ${error.response.status} lors de la génération d'exercices`);
      }
      
      throw new Error("Une erreur est survenue lors de la génération des exercices");
    }
  }
}