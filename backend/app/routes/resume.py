from flask import request, jsonify
from . import resume_bp
from ..services.resume_analyzer import analyze_resume, match_resume_to_job_description


@resume_bp.route('/analyze', methods=['POST'])
def analyze():
    """Analyse un CV téléchargé"""
    # Vérifier si un fichier a été téléchargé
    if 'resume' not in request.files:
        return jsonify({"error": "Aucun fichier téléchargé"}), 400
    
    file = request.files['resume']
    
    if file.filename == '':
        return jsonify({"error": "Aucun fichier sélectionné"}), 400
    
    # Logique pour analyser le CV
    analysis_results = analyze_resume(file)
    
    return jsonify(analysis_results)

@resume_bp.route('/match-job', methods=['POST'])
def match_job():
    """
    Analyse un CV par rapport à une offre d'emploi et retourne les faiblesses, 
    compétences, éducation et autres informations pour le candidat
    """
    # Vérifier si un fichier CV a été téléchargé
    if 'resume' not in request.files:
        return jsonify({"error": "Aucun fichier CV téléchargé"}), 400
    
    resume_file = request.files['resume']
    
    if resume_file.filename == '':
        return jsonify({"error": "Aucun fichier CV sélectionné"}), 400
    
    # Vérifier si un fichier de description de poste a été téléchargé
    if 'job_description' not in request.files:
        return jsonify({"error": "Aucun fichier de description de poste téléchargé"}), 400
    
    job_description_file = request.files['job_description']
    
    if job_description_file.filename == '':
        return jsonify({"error": "Aucun fichier de description de poste sélectionné"}), 400
    
    # Extraire le texte du fichier de description de poste
    try:
        job_description_file.seek(0)  # Réinitialiser le curseur au début du fichier
        # Vérifier l'extension du fichier
        if job_description_file.filename.endswith('.txt'):
            job_description = job_description_file.read().decode('utf-8')
        else:
            from ..services.resume_analyzer import extract_text_from_file
            job_description = extract_text_from_file(job_description_file)
    except Exception as e:
        return jsonify({"error": f"Erreur lors de la lecture du fichier de description de poste: {str(e)}"}), 400
    
    # Analyser le CV
    resume_analysis = analyze_resume(resume_file)
    
    # Vérifier s'il y a eu une erreur lors de l'analyse du CV
    if "error" in resume_analysis:
        return jsonify({"error": "Erreur lors de l'analyse du CV: " + resume_analysis["error"]}), 500
    
    # Extraire le texte du CV
    resume_file.seek(0)  # Réinitialiser le curseur au début du fichier
    try:
        from ..services.resume_analyzer import extract_text_from_file
        resume_text = extract_text_from_file(resume_file)
    except Exception as e:
        # Si on ne peut pas récupérer le texte brut, on crée un texte à partir des données extraites
        resume_text = f"Résumé: {resume_analysis.get('resume_summary', '')}\n"
        resume_text += f"Compétences techniques: {', '.join(resume_analysis.get('technical_skills', []))}\n"
        resume_text += f"Compétences non techniques: {', '.join(resume_analysis.get('soft_skills', []))}\n"
            
        # Ajouter l'expérience
        resume_text += "Expérience professionnelle:\n"
        for exp in resume_analysis.get('relevant_experience', []):
            resume_text += f"- {exp.get('position', '')} chez {exp.get('company', '')} ({exp.get('duration', '')})\n"
            
        # Ajouter l'éducation
        resume_text += "Formation:\n"
        for edu in resume_analysis.get('education', []):
            resume_text += f"- {edu.get('degree', '')} à {edu.get('institution', '')} ({edu.get('year', '')})\n"
    
    # Comparer le CV à la description du poste
    match_results = match_resume_to_job_description(resume_text, job_description, detailed=True)
    
    # Combiner les résultats
    combined_results = {
        "resume_analysis": resume_analysis,
        "job_match": match_results,
        "candidate_profile": {
            "strengths": resume_analysis.get("strengths", []),
            "gaps": resume_analysis.get("gaps", []) + match_results.get("missing_skills", []),
            "education": resume_analysis.get("education", []),
            "technical_skills": resume_analysis.get("technical_skills", []),
            "soft_skills": resume_analysis.get("soft_skills", []),
            "match_score": match_results.get("match_score", 0),
            "recommended_focus_areas": match_results.get("missing_skills", [])
        }
    }
    
    return jsonify(combined_results)

@resume_bp.route('/generate-evaluation-exercises', methods=['POST'])
def generate_evaluation_exercises():
    """
    Génère des exercices d'évaluation basés sur une offre d'emploi
    """
    try:
        # Récupérer le fichier de description de poste ou le texte JSON
        if 'job_description' not in request.files and not request.is_json:
            return jsonify({"error": "Description du poste manquante (fichier ou JSON)"}), 400
            
        job_description = None
        
        # Extraire le texte de la description de poste
        if 'job_description' in request.files:
            job_description_file = request.files['job_description']
            if job_description_file.filename == '':
                return jsonify({"error": "Aucun fichier de description de poste sélectionné"}), 400
                
            job_description_file.seek(0)
            if job_description_file.filename.endswith('.txt'):
                job_description = job_description_file.read().decode('utf-8')
            else:
                from ..services.resume_analyzer import extract_text_from_file
                job_description = extract_text_from_file(job_description_file)
        else:
            # Si pas de fichier mais JSON
            job_description = request.json.get('job_description')
        
        # Récupérer le langage préféré (optionnel)
        language = request.form.get('language')
        if language is None and request.is_json:
            language = request.json.get('language')
        
        # Utiliser le service pour générer les exercices d'évaluation
        from ..services.exercise_recommender import generate_evaluation_exercises_for_job
        evaluation_exercises = generate_evaluation_exercises_for_job(job_description, language)
        
        return jsonify(evaluation_exercises)
        
    except Exception as e:
        return jsonify({"error": f"Erreur lors de la génération des exercices: {str(e)}"}), 500


@resume_bp.route('/generate-training-exercises', methods=['POST'])
def generate_training_exercises():
    """
    Génère des exercices d'entraînement basés sur un CV et une offre d'emploi
    """
    try:
        # Vérifier les fichiers requis
        if 'resume' not in request.files:
            return jsonify({"error": "Aucun fichier CV téléchargé"}), 400
            
        resume_file = request.files['resume']
        if resume_file.filename == '':
            return jsonify({"error": "Aucun fichier CV sélectionné"}), 400
            
        if 'job_description' not in request.files:
            return jsonify({"error": "Aucun fichier de description de poste téléchargé"}), 400
            
        job_description_file = request.files['job_description']
        if job_description_file.filename == '':
            return jsonify({"error": "Aucun fichier de description de poste sélectionné"}), 400
        
        # Extraire le texte des fichiers
        resume_file.seek(0)
        from ..services.resume_analyzer import extract_text_from_file
        resume_text = extract_text_from_file(resume_file)
        
        job_description_file.seek(0)
        if job_description_file.filename.endswith('.txt'):
            job_description = job_description_file.read().decode('utf-8')
        else:
            job_description = extract_text_from_file(job_description_file)
        
        # Récupérer le langage préféré (optionnel)
        language = request.form.get('language')
        
        # Utiliser le service pour générer les exercices d'entraînement
        from ..services.exercise_recommender import generate_training_exercises_for_candidate
        training_exercises = generate_training_exercises_for_candidate(resume_text, job_description, language)
        
        return jsonify(training_exercises)
        
    except Exception as e:
        return jsonify({"error": f"Erreur lors de la génération des exercices: {str(e)}"}), 500

