from flask import request, jsonify, send_from_directory, current_app
from . import resume_bp
from ..services.resume_analyzer import analyze_resume, match_resume_to_job_description
import os
import uuid
import traceback
import logging
from werkzeug.utils import secure_filename

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

@resume_bp.route('/improve', methods=['POST'])
def improve_cv_api():
    """
    Améliore un CV pour correspondre à une offre d'emploi ou un standard spécifique
    et permet le téléchargement du CV amélioré
    """
    try:
        # Vérifier si un fichier CV a été téléchargé
        if 'resume' not in request.files:
            return jsonify({"error": "Aucun fichier CV téléchargé"}), 400
        
        resume_file = request.files['resume']
        
        if resume_file.filename == '':
            return jsonify({"error": "Aucun fichier CV sélectionné"}), 400
        
        # Récupérer le type d'amélioration souhaité
        improvement_target = request.form.get('improvement_target', 'general')
        
        # Récupérer le format de sortie souhaité
        output_format = request.form.get('output_format', 'pdf')
        if output_format not in ['pdf', 'docx', 'txt']:
            output_format = 'pdf'  # Valeur par défaut si format invalide
        
        # Vérifier les sources de description de poste (fichier ou texte)
        job_description = None
        
        # Priorité au fichier de description de poste
        if 'job_description' in request.files:
            job_description_file = request.files['job_description']
            
            if job_description_file.filename != '':
                # Extraire le texte du fichier de description de poste
                try:
                    job_description_file.seek(0)  # Réinitialiser le curseur au début du fichier
                    if job_description_file.filename.endswith('.txt'):
                        job_description = job_description_file.read().decode('utf-8')
                    else:
                        from ..services.resume_analyzer import extract_text_from_file
                        job_description = extract_text_from_file(job_description_file)
                except Exception as e:
                    current_app.logger.error(f"Erreur lors de la lecture du fichier de description de poste: {str(e)}")
                    return jsonify({"error": f"Erreur lors de la lecture du fichier de description de poste: {str(e)}"}), 400
        
        # Vérifier si une description de poste a été fournie sous forme de texte
        elif 'job_description_text' in request.form and request.form.get('job_description_text').strip():
            job_description = request.form.get('job_description_text').strip()
        
        # Pré-extraction des années d'expérience pour journalisation (optionnel)
        experience_years = 0
        try:
            # Extraction préliminaire pour le logging
            from ..services.resume_analyzer import extract_text_from_file, preprocess_resume_text
            import re
            
            resume_file.seek(0)
            resume_text = extract_text_from_file(resume_file)
            processed_text = preprocess_resume_text(resume_text)
            
            # Patterns pour les années d'expérience en français et anglais
            experience_patterns = [
                r'(\d+)[+\-]?\s*(?:an(?:s|née(?:s)?)?\s+d\'?(?:expérience))',
                r'expérience\s+(?:de|:)?\s*(\d+)[+\-]?\s*an(?:s|née(?:s)?)?',
                r'(\d+)[+\-]?\s*(?:year(?:s)?\s+(?:of\s+)?experience)',
                r'experience\s+(?:of|:)?\s*(\d+)[+\-]?\s*year(?:s)?'
            ]
            
            for pattern in experience_patterns:
                matches = re.findall(pattern, processed_text.lower())
                if matches:
                    try:
                        experience_years = max(experience_years, int(matches[0]))
                    except (ValueError, TypeError, IndexError):
                        continue
            
            resume_file.seek(0)  # Réinitialiser le curseur pour l'appel principal
            current_app.logger.info(f"Années d'expérience détectées dans le CV: {experience_years}")
        except Exception as exp_error:
            current_app.logger.warning(f"Erreur lors de la pré-extraction des années d'expérience: {str(exp_error)}")
            # Non bloquant, on continue
        
        # Améliorer le CV avec gestion d'erreurs robuste
        from ..services.resume_analyzer import improve_cv
        try:
            result = improve_cv(resume_file, improvement_target, job_description, output_format)
        except Exception as e:
            current_app.logger.error(f"Erreur lors de l'amélioration du CV: {str(e)}")
            current_app.logger.error(traceback.format_exc())
            return jsonify({"error": f"Erreur lors de l'amélioration du CV: {str(e)}"}), 500
        
        if 'error' in result:
            return jsonify(result), 400
        
        # Créer un identifiant unique pour le fichier
        file_id = str(uuid.uuid4())
        
        # Assurez-vous d'utiliser le chemin absolu
        upload_folder = current_app.config['UPLOAD_FOLDER']
        if not os.path.isabs(upload_folder):
            upload_folder = os.path.abspath(upload_folder)
            
        output_dir = os.path.join(upload_folder, 'improved_cvs')
        os.makedirs(output_dir, exist_ok=True)
        
        # Obtenir le nom du fichier et s'assurer qu'il est sécurisé
        original_filename = result['analysis']['output_document']['filename']
        secure_name = secure_filename(original_filename)
        
        # Créer un nom de fichier unique
        unique_filename = f"{file_id}_{secure_name}"
        file_path = os.path.join(output_dir, unique_filename)
        
        # Journaliser pour debug
        current_app.logger.info(f"Sauvegarde du fichier à: {file_path}")
        
        # Écrire le contenu du fichier
        with open(file_path, 'wb') as f:
            f.write(result['document'][0].getvalue())
        
        # Vérifier que le fichier existe
        if not os.path.exists(file_path):
            current_app.logger.error(f"Échec de création du fichier: {file_path}")
            return jsonify({"error": "Impossible de créer le fichier amélioré"}), 500
            
        # Créer l'URL de téléchargement
        download_url = f"/api/resumes/download-improved-cv/{file_id}/{secure_name}"
        
        # Construire la réponse avec les années d'expérience
        experience_years = result.get('experience_years', 0)
        response_data = {
            "analysis": result['analysis'],
            "download_url": download_url,
            "experience_years": experience_years
        }
        
        # Ajouter un message explicatif si des années d'expérience ont été trouvées
        if experience_years > 0:
            response_data["experience_message"] = f"Le CV indique {experience_years} ans d'expérience professionnelle."
        
        return jsonify(response_data)
    except Exception as e:
        current_app.logger.error(f"Erreur générale dans improve_cv_api: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        return jsonify({"error": f"Une erreur s'est produite lors du traitement de votre demande: {str(e)}"}), 500


@resume_bp.route('/download-improved-cv/<file_id>/<filename>', methods=['GET'])
def download_improved_cv(file_id, filename):
    """
    Télécharge un CV amélioré précédemment généré
    """
    try:
        # Vérifier le nom de fichier pour des raisons de sécurité
        filename = secure_filename(filename)
        
        # Construire le chemin vers le fichier
        upload_folder = current_app.config['UPLOAD_FOLDER']
        output_dir = os.path.join(upload_folder, 'improved_cvs')
        
        # Vérifier si le fichier existe
        file_path = os.path.join(output_dir, f"{file_id}_{filename}")
        if not os.path.exists(file_path):
            current_app.logger.error(f"Fichier non trouvé: {file_path}")
            return jsonify({"error": "Fichier non trouvé"}), 404
        
        # Déterminer le type MIME basé sur l'extension
        mime_type = None
        if filename.endswith('.pdf'):
            mime_type = 'application/pdf'
        elif filename.endswith('.docx'):
            mime_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        elif filename.endswith('.txt'):
            mime_type = 'text/plain'
        
        return send_from_directory(output_dir, f"{file_id}_{filename}", 
                                  as_attachment=True, 
                                  mimetype=mime_type)
    except Exception as e:
        current_app.logger.error(f"Erreur lors du téléchargement du CV: {str(e)}")
        return jsonify({"error": f"Erreur lors du téléchargement du CV: {str(e)}"}), 500