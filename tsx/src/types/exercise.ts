export interface EvaluationExercise {
    title: string;
    description: string;
    difficulty: 'easy' | 'medium' | 'hard';
    estimated_time: string;
    skills_evaluated: string[];
    evaluation_criteria: string[];
    solution_hints?: string[];
   }
   
   export interface ExerciseGenerationResponse {
    exercises: EvaluationExercise[];
    job_title?: string;
    key_skills?: string[];
   }