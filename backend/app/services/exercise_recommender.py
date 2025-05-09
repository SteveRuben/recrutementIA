"""
Service pour la génération d'exercices d'évaluation et d'entraînement basés sur des offres d'emploi et des CV.
"""
from typing import Dict, Any, List, Optional
from .resume_analyzer import extract_job_requirements_no_llm, match_resume_to_job_description
from .exercise_generator import ExerciseGenerator

def generate_evaluation_exercises_for_job(job_description: str, preferred_language: Optional[str] = None) -> Dict[str, Any]:
    """
    Génère des exercices d'évaluation adaptés aux compétences requises dans une offre d'emploi.
    
    Args:
        job_description: Le texte de l'offre d'emploi
        preferred_language: Le langage de programmation préféré (optionnel)
        
    Returns:
        Un dictionnaire contenant les exercices d'évaluation générés
    """
    # Extraire les compétences requises de l'offre d'emploi
    job_requirements = extract_job_requirements_no_llm(job_description)
    
    # Extraire les compétences techniques et les piles technologiques
    tech_stacks = job_requirements.get("tech_stacks", [])
    technical_skills = job_requirements.get("technical_skills", [])
    required_skills = tech_stacks + technical_skills  # Priorité aux piles technologiques
    
    # Cartographie des compétences par langage
    language_skill_map = group_skills_by_language(required_skills, preferred_language)
    
    # Déterminer le niveau de difficulté en fonction de l'expérience requise
    difficulty = determine_difficulty_from_experience(job_requirements.get("experience_level", ""))
    
    # Nombre maximum d'exercices à générer par langage
    max_exercises_per_language = 1  # Limitation pour éviter de générer trop d'exercices
    
    # Générer les exercices d'évaluation pour chaque langage
    evaluation_exercises = []
    exercise_generator = ExerciseGenerator()
    
    for language, skills in language_skill_map.items():
        # Limiter à max_exercises_per_language par langage
        for i in range(min(max_exercises_per_language, len(skills))):
            # Prendre un sous-ensemble de compétences pour chaque exercice
            skill_subset = skills[i:i+3]  # Prendre jusqu'à 3 compétences à la fois
            
            # S'assurer que le langage est inclus dans les compétences
            if language != "other" and language not in [s.lower() for s in skill_subset]:
                skill_subset.append(language)
            
            try:
                # Générer un exercice d'évaluation
                exercise = exercise_generator.generate_exercise_for_skills(
                    skills=skill_subset,
                    difficulty=difficulty,
                    purpose="evaluation"  # Toujours générer des exercices d'évaluation
                )
                # Ajouter des informations supplémentaires
                exercise["language"] = language
                exercise["targeted_skills"] = skill_subset
                
                evaluation_exercises.append(exercise)
            except Exception as ex:
                print(f"Erreur lors de la génération d'un exercice pour {language}: {str(ex)}")
    
    # Préparer la réponse avec les exercices générés
    response = {
        "evaluation_exercises": evaluation_exercises,
        "required_skills": required_skills,
        "language_skill_map": language_skill_map,
        "difficulty": difficulty,
        "job_requirements": job_requirements
    }
    
    return response


def generate_training_exercises_for_candidate(resume_text: str, job_description: str, preferred_language: Optional[str] = None) -> Dict[str, Any]:
    """
    Génère des exercices d'entraînement adaptés aux points faibles du candidat par rapport à une offre d'emploi.
    
    Args:
        resume_text: Le texte du CV
        job_description: Le texte de l'offre d'emploi
        preferred_language: Le langage de programmation préféré (optionnel)
        
    Returns:
        Un dictionnaire contenant les exercices d'entraînement générés
    """
    # Comparer le CV à la description du poste pour identifier les écarts
    match_results = match_resume_to_job_description(resume_text, job_description, detailed=True)
    
    # Extraire les compétences manquantes et les compétences requises
    missing_skills = match_results.get("missing_skills", [])
    job_requirements = extract_job_requirements_no_llm(job_description)
    
    # Si aucune compétence manquante n'est identifiée, utiliser les compétences requises
    if not missing_skills:
        missing_skills = job_requirements.get("technical_skills", []) + job_requirements.get("tech_stacks", [])
    
    # Regrouper les compétences manquantes par langage
    language_skill_map = group_skills_by_language(missing_skills, preferred_language)
    
    # Déterminer le niveau de difficulté
    difficulty = determine_difficulty_from_experience(job_requirements.get("experience_level", ""))
    
    # Nombre d'exercices à générer par langage
    max_exercises_per_language = 3  # Maximum 3 exercices par langage
    
    # Générer les exercices d'entraînement pour chaque langage
    training_exercises = []
    exercise_generator = ExerciseGenerator()
    
    for language, skills in language_skill_map.items():
        # Limiter le nombre d'exercices par langage
        skills_to_use = skills[:max_exercises_per_language]  # Limiter à max_exercises_per_language compétences
        
        for skill in skills_to_use:
            # Pour chaque compétence, générer un exercice
            skill_subset = [skill]
            
            # S'assurer que le langage est inclus dans les compétences
            if language != "other" and language not in [s.lower() for s in skill_subset]:
                skill_subset.append(language)
            
            try:
                # Générer un exercice d'entraînement
                exercise = exercise_generator.generate_exercise_for_skills(
                    skills=skill_subset,
                    difficulty=difficulty,
                    purpose="training"  # Toujours générer des exercices d'entraînement
                )
                
                # Ajouter des informations supplémentaires
                exercise["language"] = language
                exercise["targeted_skills"] = skill_subset
                
                training_exercises.append(exercise)
            except Exception as ex:
                print(f"Erreur lors de la génération d'un exercice pour {skill}: {str(ex)}")
    
    # Préparer la réponse avec les exercices générés
    response = {
        "training_exercises": training_exercises,
        "missing_skills": missing_skills,
        "language_skill_map": language_skill_map,
        "difficulty": difficulty,
        "match_results": {
            "match_score": match_results.get("match_score", 0),
            "matching_skills": match_results.get("matching_skills", []),
            "missing_skills": match_results.get("missing_skills", []),
            "overall_assessment": match_results.get("overall_assessment", "")
        }
    }
    
    return response


def group_skills_by_language(skills: List[str], preferred_language: Optional[str] = None) -> Dict[str, List[str]]:
    """
    Regroupe une liste de compétences par langage de programmation.
    
    Args:
        skills: Liste de compétences à regrouper
        preferred_language: Langage préféré (optionnel)
        
    Returns:
        Un dictionnaire avec les langages comme clés et les compétences associées comme valeurs
    """
    language_skill_map = {}
    language_priorities = {
        "python": ["python", "django", "flask", "fastapi", "pandas", "numpy", "tensorflow", "pytorch"],
        "javascript": ["javascript", "node.js", "nodejs", "react", "angular", "vue", "express", "nextjs", "nuxt"],
        "typescript": ["typescript", "angular", "react", "nextjs"],
        "java": ["java", "spring", "j2ee", "jee", "jakarta", "hibernate", "maven", "gradle"],
        "csharp": ["c#", "csharp", ".net", "dotnet", "asp.net", "xamarin", "unity"],
        "php": ["php", "laravel", "symfony", "wordpress", "drupal"],
        "ruby": ["ruby", "rails", "sinatra"],
        "dart": ["flutter", "dart"],
        "go": ["go", "golang"],
        "sql": ["sql", "mysql", "postgresql", "oracle", "sqlite", "nosql", "mongodb"]
    }
    
    # Si un langage préféré est spécifié, l'ajouter en premier
    if preferred_language and preferred_language.lower() not in language_skill_map:
        language_skill_map[preferred_language.lower()] = []
    
    # Regrouper les compétences par langage
    for skill in skills:
        skill_lower = skill.lower()
        assigned = False
        
        # Vérifier à quel langage appartient cette compétence
        for lang, keywords in language_priorities.items():
            if any(keyword == skill_lower or keyword in skill_lower for keyword in keywords):
                if lang not in language_skill_map:
                    language_skill_map[lang] = []
                language_skill_map[lang].append(skill)
                assigned = True
                break
        
        # Si la compétence n'est pas associée à un langage, l'ajouter à "other"
        if not assigned:
            if "other" not in language_skill_map:
                language_skill_map["other"] = []
            language_skill_map["other"].append(skill)
    
    return language_skill_map


def determine_difficulty_from_experience(experience_level: str) -> str:
    """
    Détermine le niveau de difficulté des exercices en fonction du niveau d'expérience requis.
    
    Args:
        experience_level: Niveau d'expérience requis (texte)
        
    Returns:
        Le niveau de difficulté (easy, medium, hard)
    """
    if "0-2" in experience_level or "junior" in experience_level.lower():
        return "easy"
    elif "5+" in experience_level or "senior" in experience_level.lower():
        return "hard"
    else:
        return "medium"  # Par défaut
    
    