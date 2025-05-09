import os
import re
import io
import json
from werkzeug.utils import secure_filename
from PyPDF2 import PdfReader
import docx
from datetime import datetime
from .llm_service import get_llm_response

# Constantes pour les types de fichiers supportés
ALLOWED_EXTENSIONS = {'pdf', 'docx', 'doc', 'txt'}

# Template de prompt pour l'analyse du CV
RESUME_ANALYSIS_PROMPT = """
Tu es un expert en recrutement chargé d'analyser un CV pour le poste de {job_role}.

Voici le contenu textuel du CV à analyser:
```
{resume_text}
```

Effectue une analyse approfondie de ce CV et fournis un rapport détaillé sur les éléments suivants:

1. Résumé des qualifications clés
2. Compétences techniques (technologies, langages, outils)
3. Compétences non techniques (soft skills)
4. Expérience professionnelle pertinente pour le poste
5. Formation et certifications
6. Adéquation globale avec le poste (score sur 10 et justification)
7. Forces principales du candidat
8. Éventuelles lacunes ou domaines à approfondir
9. Questions recommandées pour l'entretien, basées sur ce CV

Fournis ta réponse au format JSON avec la structure suivante:
{{
  "resume_summary": "Résumé concis du profil",
  "technical_skills": ["compétence1", "compétence2", ...],
  "soft_skills": ["compétence1", "compétence2", ...],
  "relevant_experience": [
    {{
      "position": "Titre du poste",
      "company": "Entreprise",
      "duration": "Durée",
      "highlights": ["point clé 1", "point clé 2", ...]
    }},
    ...
  ],
  "education": [
    {{
      "degree": "Diplôme/Formation",
      "institution": "Institution",
      "year": "Année",
      "relevance": "Pertinence pour le poste (haute/moyenne/faible)"
    }},
    ...
  ],
  "fit_score": 7.5,
  "fit_justification": "Explication du score d'adéquation",
  "strengths": ["force 1", "force 2", ...],
  "gaps": ["lacune 1", "lacune 2", ...],
  "recommended_questions": [
    {{
      "question": "Question d'entretien",
      "rationale": "Pourquoi poser cette question"
    }},
    ...
  ],
  "keywords": ["mot-clé1", "mot-clé2", ...] // mots-clés pertinents extraits du CV
}}
"""

def allowed_file(filename):
    """
    Vérifie si le fichier a une extension autorisée
    """
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text_from_pdf(pdf_file):
    """
    Extrait le texte d'un fichier PDF
    """
    pdf_reader = PdfReader(pdf_file)
    text = ""
    for page in pdf_reader.pages:
        text += page.extract_text() + "\n"
    return text

def extract_text_from_docx(docx_file):
    """
    Extrait le texte d'un fichier DOCX
    """
    doc = docx.Document(docx_file)
    text = ""
    for paragraph in doc.paragraphs:
        text += paragraph.text + "\n"
    return text

def extract_text_from_file(file):
    """
    Extrait le texte d'un fichier selon son type
    """
    filename = secure_filename(file.filename)
    file_extension = filename.rsplit('.', 1)[1].lower() if '.' in filename else ""
    
    # Réinitialiser la position du curseur au début du fichier
    file.seek(0)
    
    if file_extension == 'pdf':
        return extract_text_from_pdf(file)
    elif file_extension == 'docx':
        return extract_text_from_docx(file)
    elif file_extension == 'txt':
        return file.read().decode('utf-8')
    else:
        raise ValueError(f"Format de fichier non pris en charge: {file_extension}")

def preprocess_resume_text(text):
    """
    Prétraite le texte du CV pour améliorer l'analyse
    """
    # Suppression des espaces multiples
    text = re.sub(r'\s+', ' ', text)
    
    # Suppression des caractères spéciaux superflus
    text = re.sub(r'[^\w\s.,:;@()[\]{}\'\"&\-/]', '', text)
    
    # Normalisation des sauts de ligne
    text = re.sub(r'\n+', '\n', text)
    
    return text.strip()

def extract_contact_info(text):
    """
    Extrait les informations de contact du texte du CV
    """
    contact_info = {
        'email': None,
        'phone': None,
        'linkedin': None
    }
    
    # Extraction de l'email
    email_pattern = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
    email_matches = re.findall(email_pattern, text)
    if email_matches:
        contact_info['email'] = email_matches[0]
    
    # Extraction du numéro de téléphone (formats français et internationaux)
    phone_patterns = [
        r'(?:\+33|0)(?:\s*\d){9}',  # Format français
        r'(?:\+\d{1,3}\s*)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}'  # Format international
    ]
    
    for pattern in phone_patterns:
        phone_matches = re.findall(pattern, text)
        if phone_matches:
            contact_info['phone'] = phone_matches[0]
            break
    
    # Extraction du profil LinkedIn
    linkedin_patterns = [
        r'linkedin\.com/in/[\w-]+',
        r'linkedin\.com/profile/[\w-]+'
    ]
    
    for pattern in linkedin_patterns:
        linkedin_matches = re.findall(pattern, text)
        if linkedin_matches:
            contact_info['linkedin'] = linkedin_matches[0]
            break
    
    return contact_info

       
        
        

def extract_candidate_skills_no_llm(resume_text):
    """
    Extrait les compétences d'un CV sans utiliser de LLM.
    Version de secours basée sur l'analyse du texte en temps réel.
    
    Args:
        resume_text: Texte du CV
            
    Returns:
        Dictionnaire contenant les compétences du candidat
    """
    skills = []
    education = []
    
    # Listes de technologies et compétences courantes à rechercher
    common_techs = ["Python", "JavaScript", "TypeScript", "Java", "C#", "PHP", 
                    "Ruby", "Go", "React", "Angular", "Vue", "Node.js", "Django", 
                    "Flask", "Spring", "Express", "Laravel", "Ruby on Rails", 
                    "PostgreSQL", "MySQL", "MongoDB", "SQL Server", "Oracle", 
                    "Flutter", "Dart", "Swift", "Kotlin"]
    
    common_skills = ["API REST", "GraphQL", "Git", "Docker", "Kubernetes", "CI/CD", 
                     "AWS", "Azure", "GCP", "DevOps", "Agile", "Scrum", "TDD", 
                     "Machine Learning", "Deep Learning", "Data Science", "Big Data", 
                     "Cloud Computing", "Microservices", "Mobile Development",
                     "UML", "RUP", "Tests unitaires", "UI/UX"]
    
    # Recherche basique de mots-clés et détermination du niveau
    technical_skills = []
    
    # Analyser chaque ligne pour les compétences et niveaux d'expertise
    lines = resume_text.split('\n')
    for line in lines:
        # Chercher les compétences techniques
        for tech in common_techs:
            if tech.lower() in line.lower():
                level = "intermédiaire"  # niveau par défaut
                
                # Détecter le niveau basé sur le contexte
                line_lower = line.lower()
                if "expert" in line_lower or "avancée" in line_lower or "confirmé" in line_lower:
                    level = "expert"
                elif "avancé" in line_lower or "forte" in line_lower or "solide" in line_lower:
                    level = "avancé"
                elif "débutant" in line_lower or "notions" in line_lower or "base" in line_lower:
                    level = "débutant"
                
                skills.append({"name": tech, "level": level})
                if tech not in technical_skills:
                    technical_skills.append(tech)
        
        # Chercher les autres compétences
        for skill in common_skills:
            if skill.lower() in line.lower():
                level = "intermédiaire"  # niveau par défaut
                
                # Détecter le niveau basé sur le contexte
                line_lower = line.lower()
                if "expert" in line_lower or "avancée" in line_lower or "confirmé" in line_lower:
                    level = "expert"
                elif "avancé" in line_lower or "forte" in line_lower or "solide" in line_lower:
                    level = "avancé"
                elif "débutant" in line_lower or "notions" in line_lower or "base" in line_lower:
                    level = "débutant"
                
                skills.append({"name": skill, "level": level})
                if skill not in technical_skills:
                    technical_skills.append(skill)
    
    # Détection plus avancée de l'éducation
    education_data = []
    education_keywords = ["Licence", "Master", "Doctorat", "DUT", "BTS", "Ingénieur", "Université", "École", "Formation", "Diplôme"]
    year_pattern = r'20\d{2}|19\d{2}'  # Années entre 1900 et 2099
    
    for i, line in enumerate(lines):
        for keyword in education_keywords:
            if keyword.lower() in line.lower():
                # Obtenir plus d'informations en analysant la ligne et les lignes suivantes et précédentes
                context_start = max(0, i - 2)
                context_end = min(len(lines), i + 3)
                context = ' '.join(lines[context_start:context_end])
                
                # Extraire l'année (si disponible)
                year_match = re.search(year_pattern, context)
                year = year_match.group(0) if year_match else "N/A"
                
                # Extraire l'institution (essai simple)
                institution = "Non spécifiée"
                institution_keywords = ["Université", "École", "Institute", "College", "Faculté"]
                for inst_kw in institution_keywords:
                    if inst_kw.lower() in context.lower():
                        # Extraire le nom complet de l'institution
                        inst_pattern = f"{inst_kw}[^,;\n.]*"
                        inst_match = re.search(inst_pattern, context, re.IGNORECASE)
                        if inst_match:
                            institution = inst_match.group(0).strip()
                            break
                
                # Déterminer la pertinence basée sur les mots-clés dans la formation
                relevance = "moyenne"
                if any(tech.lower() in context.lower() for tech in technical_skills):
                    relevance = "haute"
                
                # Éviter les doublons
                if not any(edu["degree"] == line.strip() for edu in education_data):
                    education_data.append({
                        "degree": line.strip(),
                        "institution": institution,
                        "year": year,
                        "relevance": relevance
                    })
                break
    
    # Détection de l'expérience professionnelle
    experience_years = 0
    roles = []
    relevant_experience = []
    
    # Recherche des années d'expérience
    experience_patterns = [
        r'(\d+)\s*(?:an(?:s|née(?:s)?)?\s+d\'?(?:expérience))',
        r'expérience\s+(?:de|:)?\s*(\d+)\s*an(?:s|née(?:s)?)?',
        r'(?:depuis|pendant)\s+(\d+)\s*an(?:s|née(?:s)?)?'
    ]
    
    for pattern in experience_patterns:
        matches = re.finditer(pattern, resume_text.lower())
        for match in matches:
            try:
                years = int(match.group(1))
                experience_years = max(experience_years, years)
            except:
                pass
    
    # Recherche de postes et entreprises
    company_patterns = [
        r'(?:chez|à|pour|au sein de)\s+([A-Z][A-Za-z0-9\s&\.\-]+)',
        r'([A-Z][A-Za-z0-9\s&\.\-]+)(?:\s*,|\s+SA|\s+SAS|\s+SARL|\s+Inc\.)'
    ]
    
    role_patterns = [
        r'([A-Z][a-zéèêë]+\s+(?:de\s+)?[Dd]éveloppeur\w*)',
        r'([Dd]éveloppeur\w*\s+[A-Za-z]+)',
        r'([A-Z][a-zéèêë]+\s+(?:d\'|en\s+)?[Ii]ngénieur\w*)',
        r'([Ii]ngénieur\w*\s+[A-Za-z]+)',
        r'([Cc]hef\s+de\s+projet)',
        r'([Cc]onsultant\w*\s+[A-Za-z]+)',
        r'([Aa]rchitecte\s+[A-Za-z]+)',
        r'([Aa]nalyst\w*\s+[A-Za-z]+)',
        r'([Dd]ata\s+[Ss]cientist)',
        r'([Tt]ech\s*(?:nical)?\s*[Ll]ead)',
        r'([Dd]ev[Oo]ps)',
        r'([Ff]ull\s*[Ss]tack)',
        r'([Ff]ront\s*[Ee]nd)',
        r'([Bb]ack\s*[Ee]nd)'
    ]
    
    # Extraire les rôles
    for pattern in role_patterns:
        matches = re.finditer(pattern, resume_text)
        for match in matches:
            role = match.group(1).strip()
            if role not in roles:
                roles.append(role)
    
    # Rechercher les expériences professionnelles (rôle + entreprise + durée)
    position_blocks = []
    current_block = {}
    
    # Analyser ligne par ligne pour trouver des blocs d'expérience
    for i, line in enumerate(lines):
        # Chercher les rôles/titres de poste
        for pattern in role_patterns:
            role_match = re.search(pattern, line)
            if role_match and (not current_block or 'position' not in current_block):
                current_block = {'position': role_match.group(1).strip()}
                # Chercher l'entreprise sur la même ligne ou les lignes suivantes
                company_context = ' '.join(lines[i:min(i+3, len(lines))])
                for company_pattern in company_patterns:
                    company_match = re.search(company_pattern, company_context)
                    if company_match:
                        current_block['company'] = company_match.group(1).strip()
                        break
                
                # Chercher la durée
                duration_match = re.search(r'(\d+)\s*(?:an(?:s|née(?:s)?)?)', company_context)
                if duration_match:
                    current_block['duration'] = f"{duration_match.group(1)} ans"
                else:
                    # Chercher des dates pour calculer la durée
                    years_match = re.findall(r'(20\d{2}|19\d{2})', company_context)
                    if len(years_match) >= 2:
                        years = sorted([int(y) for y in years_match])
                        duration = years[-1] - years[0]
                        current_block['duration'] = f"{duration} ans"
                    else:
                        current_block['duration'] = "Durée non spécifiée"
                
                # Ajouter des points clés
                highlights = []
                highlight_context = ' '.join(lines[i:min(i+10, len(lines))])
                # Rechercher des réalisations marquées par des puces ou numéros
                highlight_matches = re.findall(r'(?:•|\-|\*|–|—|\d+[\.\)])\s+([^\n\r•\-\*]+)', highlight_context)
                for highlight in highlight_matches[:3]:  # Prendre les 3 premiers points
                    if len(highlight.strip()) > 10:  # Ignorer les points trop courts
                        highlights.append(highlight.strip())
                
                # S'il n'y a pas de points formatés, essayer d'extraire des phrases clés
                if not highlights:
                    sentences = re.split(r'[.!?]+', highlight_context)
                    for sentence in sentences[:3]:
                        if any(kw in sentence.lower() for kw in ['développ', 'mis en place', 'créé', 'réalis', 'implémen', 'conçu']):
                            if len(sentence.strip()) > 15:
                                highlights.append(sentence.strip())
                
                # Ajouter des valeurs par défaut si nécessaire
                if 'company' not in current_block:
                    current_block['company'] = "Entreprise non spécifiée"
                if 'duration' not in current_block:
                    current_block['duration'] = "Durée non spécifiée"
                if not highlights:
                    highlights = ["Expérience professionnelle pertinente"]
                
                current_block['highlights'] = highlights
                position_blocks.append(current_block)
                current_block = {}
    
    # Si des expériences ont été trouvées, les utiliser
    if position_blocks:
        relevant_experience = position_blocks
    # Sinon, créer des entrées basées sur les rôles détectés
    elif roles:
        for role in roles:
            relevant_experience.append({
                "position": role,
                "company": "Détectée à partir du CV",
                "duration": f"{max(1, experience_years // len(roles))} ans",
                "highlights": ["Expérience professionnelle pertinente"]
            })
    
    # Détection des soft skills
    soft_skills = []
    common_soft_skills = ["Communication", "Travail d'équipe", "Autonomie", 
                          "Résolution de problèmes", "Adaptabilité", "Créativité",
                          "Leadership", "Gestion du temps", "Organisation", 
                          "Rigueur", "Polyvalence", "Esprit d'analyse", 
                          "Sens des responsabilités", "Capacité d'apprentissage"]
    
    # Rechercher les soft skills dans le texte complet
    for skill in common_soft_skills:
        if skill.lower() in resume_text.lower():
            soft_skills.append(skill)
    
    # Inférer des soft skills supplémentaires basés sur le contexte
    if any(kw in resume_text.lower() for kw in ["équipe", "collabor", "groupe"]):
        if "Travail d'équipe" not in soft_skills:
            soft_skills.append("Travail d'équipe")
    
    if any(kw in resume_text.lower() for kw in ["autonome", "indépend", "seul"]):
        if "Autonomie" not in soft_skills:
            soft_skills.append("Autonomie")
    
    if any(kw in resume_text.lower() for kw in ["complex", "problèm", "solution", "résoudre"]):
        if "Résolution de problèmes" not in soft_skills:
            soft_skills.append("Résolution de problèmes")
    
    # Valeurs minimales par défaut uniquement si rien n'est détecté
    if not technical_skills:
        technical_skills = []
    
    if not soft_skills:
        soft_skills = []
    
    if not education_data:
        education_data = []
    
    if not relevant_experience:
        relevant_experience = []
    
    # Créer un résumé basé sur les données extraites
    resume_summary = ""
    
    # Ajouter les rôles et l'expérience au résumé
    if roles:
        resume_summary += f"Professionnel avec expérience en tant que {', '.join(roles[:2])}. "
    elif experience_years > 0:
        resume_summary += f"Professionnel avec {experience_years} ans d'expérience. "
    
    # Ajouter les compétences techniques au résumé
    if technical_skills:
        resume_summary += f"Compétences en {', '.join(technical_skills[:5])}. "
    
    # Ajouter la formation si disponible
    if education_data:
        degrees = [edu['degree'] for edu in education_data]
        resume_summary += f"Formation: {', '.join(degrees[:2])}."
    
    # Calculer un score d'adéquation basé sur des facteurs objectifs
    # Plus de poids aux compétences techniques et à l'expérience
    fit_score = min(7.0, 3.0 + 
                   min(2.0, len(technical_skills) * 0.2) + 
                   min(1.0, len(soft_skills) * 0.1) + 
                   min(1.0, experience_years * 0.1))
    
    # Identifier les forces basées sur les compétences et l'expérience
    strengths = []
    
    # Ajouter les compétences techniques comme forces
    if technical_skills:
        top_skills = technical_skills[:3]
        strengths.append(f"Compétences techniques en {', '.join(top_skills)}")
    
    # Ajouter l'expérience comme force si significative
    if experience_years > 2:
        strengths.append(f"Expérience professionnelle de {experience_years} ans")
    elif relevant_experience:
        strengths.append("Expérience professionnelle pertinente")
    
    # Ajouter les soft skills comme forces
    if soft_skills:
        top_soft_skills = soft_skills[:2]
        strengths.append(f"Compétences en {', '.join(top_soft_skills)}")
    
    # Ajouter la formation comme force si pertinente
    if education_data and any(edu["relevance"] == "haute" for edu in education_data):
        strengths.append("Formation académique pertinente")
    
    # Identifier les lacunes potentielles
    gaps = []
    
    # Manque d'expérience
    if experience_years < 2 and not any("stage" in exp.get("position", "").lower() for exp in relevant_experience):
        gaps.append("Expérience professionnelle limitée")
    
    # Manque de formation spécifique si pertinent
    if not education_data:
        gaps.append("Formation non spécifiée dans le CV")
    
    # Si très peu de compétences détectées
    if len(technical_skills) < 3:
        gaps.append("Gamme limitée de compétences techniques détectées")
    
    # Générer des questions pertinentes
    recommended_questions = []
    
    # Question sur l'expérience professionnelle
    if relevant_experience:
        most_recent_role = relevant_experience[0]["position"]
        recommended_questions.append({
            "question": f"Pouvez-vous me détailler votre expérience en tant que {most_recent_role}?",
            "rationale": "Pour évaluer l'expérience professionnelle récente"
        })
    
    # Question sur les compétences techniques
    if technical_skills:
        main_skill = technical_skills[0]
        recommended_questions.append({
            "question": f"Pouvez-vous me parler d'un projet où vous avez utilisé {main_skill}?",
            "rationale": f"Pour évaluer l'expertise pratique en {main_skill}"
        })
    
    # Question sur la résolution de problèmes
    recommended_questions.append({
        "question": "Décrivez un défi technique complexe que vous avez rencontré et comment vous l'avez résolu.",
        "rationale": "Pour évaluer les capacités de résolution de problèmes et l'approche technique"
    })
    
    # Retourner les résultats avec toutes les données extraites
    return {
        "resume_summary": resume_summary,
        "technical_skills": technical_skills,
        "soft_skills": soft_skills,
        "relevant_experience": relevant_experience,
        "education": education_data,
        "fit_score": fit_score,
        "fit_justification": "Score basé sur l'analyse des compétences techniques, soft skills et expérience professionnelle",
        "strengths": strengths,
        "gaps": gaps,
        "recommended_questions": recommended_questions,
        "keywords": technical_skills + soft_skills,
        "_generated_by": "fallback_method"  # Marqueur pour indiquer que c'est la méthode de secours
    }

def extract_job_requirements_no_llm(job_text):
    """
    Extrait les exigences d'une offre d'emploi sans utiliser de LLM.
    Version de secours basée sur l'analyse du texte en temps réel.
    
    Args:
        job_text: Texte de l'offre d'emploi
            
    Returns:
        Dictionnaire contenant les exigences du poste
    """
    # Listes de technologies et compétences courantes à rechercher
    common_tech_stacks = ["Python", "JavaScript", "TypeScript", "Java", "C#", "PHP", 
                         "Ruby", "Go", "React", "Angular", "Vue", "Node.js", "Django", 
                         "Flask", "Spring", "Express", "Laravel", "Ruby on Rails", 
                         "PostgreSQL", "MySQL", "MongoDB", "SQL Server", "Oracle", 
                         "Flutter", "Dart", "Swift", "Kotlin"]
    
    common_skills = ["API REST", "GraphQL", "Git", "Docker", "Kubernetes", "CI/CD", 
                    "AWS", "Azure", "GCP", "DevOps", "Agile", "Scrum", "TDD", 
                    "Machine Learning", "Deep Learning", "Data Science", "Big Data", 
                    "Cloud Computing", "Microservices", "Mobile Development",
                    "UML", "RUP", "Tests unitaires", "UI/UX"]
    
    # Initialiser les collections pour les exigences
    tech_stacks = []
    technical_skills = []
    soft_skills = []
    certifications = []
    
    # Diviser le texte en sections pour une analyse plus précise
    lines = job_text.split('\n')
    
    # Rechercher les sections courantes dans les descriptions de poste
    sections = {
        "requirements": [],
        "qualifications": [],
        "skills": [],
        "profile": [],
        "experience": [],
        "education": [],
        "about": []
    }
    
    current_section = "requirements"  # Section par défaut
    
    # Identifier les sections dans le texte
    for line in lines:
        line_lower = line.lower().strip()
        
        # Détecter les en-têtes de section
        if any(header in line_lower for header in ["requis", "exigé", "demandé", "required", "requirements"]):
            current_section = "requirements"
            continue
        elif any(header in line_lower for header in ["qualifications", "profil", "profile"]):
            current_section = "qualifications"
            continue
        elif any(header in line_lower for header in ["compétences", "skills", "abilities"]):
            current_section = "skills"
            continue
        elif any(header in line_lower for header in ["expérience", "experience"]):
            current_section = "experience"
            continue
        elif any(header in line_lower for header in ["formation", "études", "education", "diplôme"]):
            current_section = "education"
            continue
        elif any(header in line_lower for header in ["entreprise", "société", "about us", "qui sommes-nous"]):
            current_section = "about"
            continue
        
        # Ajouter la ligne à la section courante
        sections[current_section].append(line)
    
    # Fusionner toutes les sections pertinentes pour la recherche de compétences
    relevant_sections = ' '.join([
        ' '.join(sections["requirements"]),
        ' '.join(sections["qualifications"]),
        ' '.join(sections["skills"]),
        ' '.join(sections["profile"]),
        ' '.join(sections["experience"])
    ])
    
    # Rechercher les technologies et compétences
    for tech in common_tech_stacks:
        if re.search(r'\b' + re.escape(tech.lower()) + r'\b', relevant_sections.lower()):
            tech_stacks.append(tech)
    
    for skill in common_skills:
        if re.search(r'\b' + re.escape(skill.lower()) + r'\b', relevant_sections.lower()):
            technical_skills.append(skill)
    
    # Détecter les exigences de piles technologiques supplémentaires
    # (expressions comme "React/Angular/Vue" ou "React ou Angular ou Vue")
    stack_groups = re.findall(r'([A-Za-z]+(?:\s*[/,]\s*|\s+ou\s+)[A-Za-z]+(?:\s*[/,]\s*|\s+ou\s+)[A-Za-z]+)', relevant_sections)
    for group in stack_groups:
        # Séparer les technologies dans le groupe
        group_techs = re.split(r'\s*[/,]\s*|\s+ou\s+', group)
        for tech in group_techs:
            if tech and tech not in tech_stacks and any(t.lower() == tech.lower() for t in common_tech_stacks):
                matching_tech = next(t for t in common_tech_stacks if t.lower() == tech.lower())
                tech_stacks.append(matching_tech)
    
    # Rechercher les années d'expérience requises
    experience_patterns = [
        r'(\d+)[+\-]?\s*(?:an(?:s|née(?:s)?)?\s+d\'?(?:expérience))',
        r'expérience\s+(?:de|:)?\s*(\d+)[+\-]?\s*an(?:s|née(?:s)?)?',
        r'(?:minimum|au moins)\s+(\d+)\s*an(?:s|née(?:s)?)?'
    ]
    
    experience_years = []
    for pattern in experience_patterns:
        matches = re.finditer(pattern, job_text.lower())
        for match in matches:
            try:
                years = int(match.group(1))
                experience_years.append(years)
            except:
                pass
    
    # Déterminer le niveau d'expérience
    experience_level = "Junior"
    if experience_years:
        max_years = max(experience_years)
        if max_years >= 5:
            experience_level = "5+ ans"
        elif max_years >= 3:
            experience_level = "3-5 ans"
        else:
            experience_level = "0-2 ans"
    else:
        # Détecter le niveau d'expérience à partir des mots-clés
        if any(kw in job_text.lower() for kw in ["senior", "expérimenté", "confirmé", "5 ans", "5+"]):
            experience_level = "5+ ans"
        elif any(kw in job_text.lower() for kw in ["intermédiaire", "3 ans", "3-5", "3 à 5"]):
            experience_level = "3-5 ans"
        elif any(kw in job_text.lower() for kw in ["junior", "débutant", "entry level", "graduate"]):
            experience_level = "0-2 ans"
    
    # Rechercher les soft skills
    common_soft_skills = ["Communication", "Travail d'équipe", "Autonomie", 
                          "Résolution de problèmes", "Adaptabilité", "Créativité",
                          "Leadership", "Gestion du temps", "Organisation", 
                          "Rigueur", "Polyvalence", "Esprit d'analyse", 
                          "Sens des responsabilités", "Capacité d'apprentissage"]
    
    for skill in common_soft_skills:
        if skill.lower() in job_text.lower():
            soft_skills.append(skill)
    
    # Inférer des soft skills supplémentaires basés sur le contexte
    if any(kw in job_text.lower() for kw in ["équipe", "collabor", "groupe"]):
        if "Travail d'équipe" not in soft_skills:
            soft_skills.append("Travail d'équipe")
    
    if any(kw in job_text.lower() for kw in ["autonome", "indépend", "seul"]):
        if "Autonomie" not in soft_skills:
            soft_skills.append("Autonomie")
    
    if any(kw in job_text.lower() for kw in ["complex", "problèm", "solution", "résoudre"]):
        if "Résolution de problèmes" not in soft_skills:
            soft_skills.append("Résolution de problèmes")
    
    # Rechercher les certifications
    common_certifications = ["AWS Certified", "Microsoft Certified", "Google Cloud", 
                            "Scrum Master", "PMP", "CISSP", "CISA", "ITIL", "TOGAF"]
    
    for cert in common_certifications:
        if cert.lower() in job_text.lower():
            certifications.append(cert)
    
    # Extraire des certifications supplémentaires selon un pattern
    cert_patterns = [
        r'[Cc]ertifi(?:é|cation)\s+([A-Za-z0-9\s]+)',
        r'[Cc]ertification\s+(?:en|:)\s+([A-Za-z0-9\s]+)'
    ]
    
    for pattern in cert_patterns:
        matches = re.finditer(pattern, job_text)
        for match in matches:
            cert = match.group(1).strip()
            if cert and cert not in certifications:
                certifications.append(cert)
    
    return {
        "tech_stacks": tech_stacks,
        "technical_skills": technical_skills,
        "soft_skills": soft_skills,
        "experience_level": experience_level,
        "certifications": certifications,
        "_generated_by": "fallback_method"  # Marqueur pour indiquer que c'est la méthode de secours
    }

def match_resume_to_job_description_no_llm(resume_text, job_description):
    """
    Compare un CV à une description de poste sans utiliser de LLM.
    Version de secours basée sur l'analyse approfondie en temps réel.
    
    Args:
        resume_text: Le texte du CV
        job_description: La description du poste
        
    Returns:
        dict: Résultats de correspondance
    """
    # Extraire les compétences du CV et les exigences du poste
    resume_data = extract_candidate_skills_no_llm(resume_text)
    job_data = extract_job_requirements_no_llm(job_description)
    
    # Normaliser les compétences pour la comparaison
    def normalize_skills(skills):
        return [skill.lower() for skill in skills]
    
    # Compétences techniques du CV (normalisées)
    resume_skills = set(normalize_skills(resume_data["technical_skills"]))
    
    # Compétences techniques requises pour le poste (normalisées)
    job_skills = set(normalize_skills(job_data["technical_skills"] + job_data["tech_stacks"]))
    
    # Compétences correspondantes (originales, non normalisées)
    matching_skills = [
        skill for skill in (resume_data["technical_skills"])
        if skill.lower() in job_skills
    ]
    
    # Compétences manquantes (originales, non normalisées)
    missing_skills = [
        skill for skill in (job_data["technical_skills"] + job_data["tech_stacks"])
        if skill.lower() not in resume_skills
    ]
    
    # Analyse des soft skills
    resume_soft_skills = set(normalize_skills(resume_data["soft_skills"]))
    job_soft_skills = set(normalize_skills(job_data["soft_skills"]))
    matching_soft_skills = [
        skill for skill in resume_data["soft_skills"]
        if skill.lower() in job_soft_skills
    ]
    
    # Analyse de l'expérience
    experience_match = 0
    
    # Calculer les années d'expérience du candidat
    candidate_experience = 0
    # Essayer d'extraire les années d'expérience des données du CV
    if "experience" in resume_data and "years" in resume_data["experience"]:
        candidate_experience = resume_data["experience"]["years"]
    else:
        # Estimer à partir des expériences professionnelles
        for exp in resume_data["relevant_experience"]:
            duration = exp.get("duration", "")
            years_match = re.search(r'(\d+)', duration)
            if years_match:
                candidate_experience += int(years_match.group(1))
    
    # Déterminer l'expérience requise pour le poste
    required_experience = 0
    if job_data["experience_level"] == "0-2 ans":
        required_experience = 1
    elif job_data["experience_level"] == "3-5 ans":
        required_experience = 4
    elif job_data["experience_level"] == "5+ ans":
        required_experience = 6
    
    # Calculer la correspondance d'expérience
    if candidate_experience >= required_experience:
        experience_match = 1.0  # Correspondance parfaite ou supérieure
    else:
        experience_match = max(0, candidate_experience / required_experience)
    
    # Analyse de l'adéquation des compétences
    # Calculer l'importance relative des compétences du poste
    total_job_skills = len(job_skills)
    if total_job_skills == 0:
        skills_match_score = 0.5  # Score moyen par défaut
    else:
        # Calculer le nombre de compétences correspondantes
        skills_match_count = len([skill for skill in resume_skills if skill in job_skills])
        skills_match_score = skills_match_count / total_job_skills
    
    # Calculer la correspondance des soft skills
    total_job_soft_skills = len(job_soft_skills)
    if total_job_soft_skills == 0:
        soft_skills_match_score = 0.5  # Score moyen par défaut
    else:
        # Calculer le nombre de soft skills correspondantes
        soft_skills_match_count = len([skill for skill in resume_soft_skills if skill in job_soft_skills])
        soft_skills_match_score = soft_skills_match_count / total_job_soft_skills
    
    # Calculer le score de correspondance global pondéré
    # Plus de poids aux compétences techniques, puis à l'expérience, puis aux soft skills
    match_score = (
        (skills_match_score * 0.6) +  # 60% pour les compétences techniques
        (experience_match * 0.3) +    # 30% pour l'expérience
        (soft_skills_match_score * 0.1)  # 10% pour les soft skills
    ) * 100  # Convertir en pourcentage
    
    # Arrondir le score
    match_score = round(match_score)
    
    # Identifier les points forts du candidat
    key_strengths = []
    
    # Ajouter les compétences correspondantes comme points forts
    if matching_skills:
        key_strengths.append(f"Maîtrise des technologies requises: {', '.join(matching_skills[:3])}")
    
    # Ajouter l'expérience si adéquate
    if candidate_experience >= required_experience:
        key_strengths.append(f"Expérience adéquate: {candidate_experience} ans (requis: {required_experience} ans)")
    
    # Ajouter les soft skills correspondantes
    if matching_soft_skills:
        key_strengths.append(f"Compétences interpersonnelles requises: {', '.join(matching_soft_skills[:3])}")
    
    # Ajouter la formation si pertinente
    if resume_data["education"] and any(edu["relevance"] == "haute" for edu in resume_data["education"]):
        key_strengths.append("Formation académique pertinente pour le poste")
    
    # S'assurer d'avoir au moins 2 points forts
    if len(key_strengths) < 2:
        # Chercher d'autres points forts potentiels
        if resume_data["technical_skills"]:
            key_strengths.append(f"Compétences techniques variées incluant {', '.join(resume_data['technical_skills'][:3])}")
        
        if resume_data["relevant_experience"]:
            key_strengths.append("Expérience professionnelle dans le domaine")
    
    # Déterminer l'évaluation globale
    assessment = ""
    if match_score >= 80:
        assessment = "Excellente correspondance - Le candidat possède la plupart des compétences et l'expérience requises pour le poste."
    elif match_score >= 60:
        assessment = "Bonne correspondance - Le candidat possède plusieurs compétences clés requises mais pourrait nécessiter une formation dans certains domaines."
    elif match_score >= 40:
        assessment = "Correspondance moyenne - Le candidat possède quelques compétences pertinentes mais manque d'expérience ou de compétences clés."
    else:
        assessment = "Correspondance faible - Le profil du candidat diffère significativement des exigences du poste."
    
    # Ajouter des informations contextuelles à l'évaluation
    if len(matching_skills) > 0:
        match_ratio = len(matching_skills) / max(1, len(job_data["technical_skills"] + job_data["tech_stacks"]))
        if match_ratio > 0.7:
            assessment += f" Le candidat maîtrise {len(matching_skills)} des {len(job_data['technical_skills'] + job_data['tech_stacks'])} compétences techniques requises."
        else:
            assessment += f" Le candidat maîtrise seulement {len(matching_skills)} des {len(job_data['technical_skills'] + job_data['tech_stacks'])} compétences techniques requises."
    
    if candidate_experience < required_experience:
        assessment += f" Le niveau d'expérience ({candidate_experience} ans) est inférieur aux {required_experience} ans requis."
    
    # Assembler le résultat
    return {
        "match_score": match_score,
        "matching_skills": matching_skills,
        "missing_skills": missing_skills,
        "key_strengths": key_strengths,
        "overall_assessment": assessment,
        "_generated_by": "fallback_method"  # Marqueur pour indiquer que c'est la méthode de secours
    }

def generate_interview_questions_from_resume_no_llm(resume_text, job_role, num_questions=5):
    """
    Génère des questions d'entretien personnalisées sans utiliser de LLM.
    Version de secours basée sur l'analyse réelle du CV.
    
    Args:
        resume_text: Le texte du CV
        job_role: Le poste pour lequel le candidat postule
        num_questions: Nombre de questions à générer
        
    Returns:
        list: Liste de questions d'entretien
    """
    # Extraire les compétences et expériences du CV
    skills_data = extract_candidate_skills_no_llm(resume_text)
    
    # Récupérer les informations clés
    technical_skills = skills_data.get("technical_skills", [])
    soft_skills = skills_data.get("soft_skills", [])
    experiences = skills_data.get("relevant_experience", [])
    education = skills_data.get("education", [])
    
    # Collection de questions
    questions = []
    
    # 1. Question sur l'expérience professionnelle la plus récente ou la plus pertinente
    if experiences:
        latest_experience = experiences[0]
        position = latest_experience.get("position", "votre dernier poste")
        company = latest_experience.get("company", "votre précédente entreprise")
        
        questions.append({
            "question": f"Pouvez-vous me décrire vos principales responsabilités et réalisations en tant que {position} chez {company}?",
            "type": "expérience",
            "skill_to_assess": "Expérience professionnelle",
            "difficulty": "facile",
            "expected_answer_elements": ["Responsabilités clés", "Projets significatifs", "Réalisations mesurables", "Compétences techniques utilisées"]
        })
    else:
        # Question générique sur l'expérience si aucune expérience spécifique n'est détectée
        questions.append({
            "question": f"Pouvez-vous me parler de votre parcours professionnel et de son adéquation avec le poste de {job_role}?",
            "type": "expérience",
            "skill_to_assess": "Parcours professionnel",
            "difficulty": "facile",
            "expected_answer_elements": ["Expériences pertinentes", "Progression de carrière", "Motivation pour le poste actuel"]
        })
    
    # 2. Questions sur les compétences techniques spécifiques
    if technical_skills:
        # Sélectionner jusqu'à 2 compétences techniques pour les questions
        for skill in technical_skills[:min(2, len(technical_skills))]:
            # Questions adaptées à différentes compétences
            if skill.lower() in ["python", "java", "javascript", "c#", "php", "ruby", "go"]:
                questions.append({
                    "question": f"Décrivez un projet complexe où vous avez utilisé {skill}. Quels défis techniques avez-vous rencontrés et comment les avez-vous surmontés?",
                    "type": "technique",
                    "skill_to_assess": f"Expertise en {skill}",
                    "difficulty": "moyenne",
                    "expected_answer_elements": ["Description du projet", "Défis techniques", "Solutions implémentées", "Résultats obtenus"]
                })
            elif skill.lower() in ["react", "angular", "vue", "flutter"]:
                questions.append({
                    "question": f"Comment structurez-vous une application {skill} pour qu'elle soit maintenable et évolutive? Pouvez-vous donner un exemple concret?",
                    "type": "technique",
                    "skill_to_assess": f"Architecture {skill}",
                    "difficulty": "difficile",
                    "expected_answer_elements": ["Structure de l'application", "Gestion de l'état", "Bonnes pratiques", "Exemple concret"]
                })
            elif skill.lower() in ["sql", "mysql", "postgresql", "mongodb", "oracle"]:
                questions.append({
                    "question": f"Comment optimisez-vous les performances des requêtes dans {skill}? Donnez un exemple de requête que vous avez optimisée.",
                    "type": "technique",
                    "skill_to_assess": f"Optimisation {skill}",
                    "difficulty": "difficile",
                    "expected_answer_elements": ["Techniques d'indexation", "Optimisation de requêtes", "Analyse de performance", "Exemple concret"]
                })
            else:
                questions.append({
                    "question": f"Quelle est votre expérience avec {skill} et comment l'avez-vous appliquée dans un contexte professionnel?",
                    "type": "technique",
                    "skill_to_assess": f"Expertise en {skill}",
                    "difficulty": "moyenne",
                    "expected_answer_elements": ["Niveau d'expertise", "Applications pratiques", "Contexte d'utilisation", "Résultats obtenus"]
                })
    
    # 3. Question sur la résolution de problèmes (toujours pertinente)
    questions.append({
        "question": "Décrivez une situation où vous avez dû résoudre un problème technique particulièrement complexe. Quelle était votre approche et quel a été le résultat?",
        "type": "situation",
        "skill_to_assess": "Résolution de problèmes",
        "difficulty": "moyenne",
        "expected_answer_elements": ["Analyse du problème", "Méthodologie", "Solutions envisagées", "Solution retenue", "Résultat final"]
    })
    
    # 4. Question sur le travail d'équipe ou la communication (si mentionné dans les soft skills)
    if "Travail d'équipe" in soft_skills or "Communication" in soft_skills:
        questions.append({
            "question": "Pouvez-vous me donner un exemple de situation où vos compétences en communication ou en travail d'équipe ont été essentielles pour la réussite d'un projet?",
            "type": "comportementale",
            "skill_to_assess": "Communication et travail d'équipe",
            "difficulty": "moyenne",
            "expected_answer_elements": ["Contexte du projet", "Défis de communication", "Actions entreprises", "Impact sur le projet"]
        })
    
    # 5. Question sur la gestion du temps ou des priorités
    questions.append({
        "question": "Comment gérez-vous vos priorités lorsque vous avez plusieurs tâches ou projets simultanés avec des délais serrés?",
        "type": "comportementale",
        "skill_to_assess": "Gestion du temps et des priorités",
        "difficulty": "moyenne",
        "expected_answer_elements": ["Méthodes d'organisation", "Outils utilisés", "Définition des priorités", "Gestion du stress"]
    })
    
    # 6. Question sur l'apprentissage continu (importante pour le développement)
    questions.append({
        "question": "Comment vous tenez-vous à jour avec les dernières technologies et tendances dans votre domaine? Donnez un exemple d'une nouvelle compétence que vous avez récemment acquise.",
        "type": "comportementale",
        "skill_to_assess": "Apprentissage continu",
        "difficulty": "facile",
        "expected_answer_elements": ["Sources d'information", "Méthodes d'apprentissage", "Exemple concret", "Application pratique"]
    })
    
    # 7. Question spécifique au poste
    questions.append({
        "question": f"Selon vous, quelles sont les qualités et compétences les plus importantes pour réussir en tant que {job_role}?",
        "type": "comportementale",
        "skill_to_assess": "Compréhension du rôle",
        "difficulty": "facile",
        "expected_answer_elements": ["Compétences techniques pertinentes", "Soft skills nécessaires", "Compréhension des responsabilités", "Vision du poste"]
    })
    
    # 8. Question sur un projet ou une réalisation dont le candidat est fier
    questions.append({
        "question": "Quel projet ou quelle réalisation professionnelle vous a procuré le plus de satisfaction et pourquoi?",
        "type": "comportementale",
        "skill_to_assess": "Motivation et fierté professionnelle",
        "difficulty": "facile",
        "expected_answer_elements": ["Description du projet", "Contribution personnelle", "Défis surmontés", "Impact et résultats", "Apprentissages"]
    })
    
    # 9. Question sur les défis et l'adaptabilité
    questions.append({
        "question": "Face à un changement imprévu dans les spécifications ou les priorités d'un projet, comment réagissez-vous et adaptez-vous votre travail?",
        "type": "situation",
        "skill_to_assess": "Adaptabilité et gestion du changement",
        "difficulty": "moyenne",
        "expected_answer_elements": ["Réaction initiale", "Communication avec l'équipe", "Ajustement du plan", "Flexibilité"]
    })
    
    # 10. Question sur les aspirations professionnelles
    questions.append({
        "question": "Où vous voyez-vous professionnellement dans les 3 à 5 prochaines années et comment ce poste s'inscrit-il dans votre plan de carrière?",
        "type": "comportementale",
        "skill_to_assess": "Ambition et alignement avec l'entreprise",
        "difficulty": "facile",
        "expected_answer_elements": ["Objectifs professionnels", "Plan de développement", "Alignement avec le poste actuel", "Vision à long terme"]
    })
    
    # Limiter au nombre de questions demandé
    return questions[:num_questions]

def analyze_resume(file, job_role=None):
   """
   Analyse un CV téléchargé et retourne des informations structurées
   
   Args:
       file: Le fichier CV téléchargé
       job_role (str, optional): Le poste pour lequel le candidat postule
       
   Returns:
       dict: Résultats d'analyse structurés
   """
   try:
       # Vérifier si le fichier est valide
       if not file or not allowed_file(file.filename):
           return {
               "error": "Format de fichier non pris en charge. Veuillez télécharger un fichier PDF, DOCX ou TXT."
           }
       
       # Extraire le texte du CV
       resume_text = extract_text_from_file(file)
       
       # Prétraiter le texte
       processed_text = preprocess_resume_text(resume_text)
       
       # Extraire les informations de contact
       contact_info = extract_contact_info(processed_text)
       
       # Si aucun poste n'est spécifié, utiliser un poste générique
       job_role = job_role or "un poste dans votre entreprise"
       
       # Tenter d'analyser le CV avec le LLM
       try:
           prompt = RESUME_ANALYSIS_PROMPT.format(
               job_role=job_role,
               resume_text=processed_text[:8000]  # Limiter la taille pour éviter de dépasser le contexte du LLM
           )
           
           llm_response = get_llm_response(prompt)
           
           try:
               # Tenter de parser la réponse JSON
               analysis = json.loads(llm_response)
               
               # Ajouter les informations de contact et métadonnées
               analysis['contact_info'] = contact_info
               analysis['metadata'] = {
                   'filename': secure_filename(file.filename),
                   'analysis_timestamp': datetime.now().isoformat(),
                   'job_role': job_role,
                   'analysis_method': 'llm'
               }
               
               return analysis
               
           except json.JSONDecodeError:
               # Si la réponse n'est pas au format JSON valide, utiliser la méthode de secours
               print(f"Erreur de décodage JSON dans la réponse LLM, utilisation de la méthode de secours")
               fallback_analysis = extract_candidate_skills_no_llm(processed_text)
               fallback_analysis['contact_info'] = contact_info
               fallback_analysis['metadata'] = {
                   'filename': secure_filename(file.filename),
                   'analysis_timestamp': datetime.now().isoformat(),
                   'job_role': job_role,
                   'analysis_method': 'fallback',
                   'error': 'JSON invalide dans la réponse LLM'
               }
               
               return fallback_analysis
               
       except Exception as llm_error:
           # En cas d'erreur avec le LLM, utiliser la méthode de secours
           print(f"Erreur LLM: {str(llm_error)}, utilisation de la méthode de secours")
           fallback_analysis = extract_candidate_skills_no_llm(processed_text)
           fallback_analysis['contact_info'] = contact_info
           fallback_analysis['metadata'] = {
               'filename': secure_filename(file.filename),
               'analysis_timestamp': datetime.now().isoformat(),
               'job_role': job_role,
               'analysis_method': 'fallback',
               'error': f'Erreur LLM: {str(llm_error)}'
           }
           
           return fallback_analysis
           
   except Exception as e:
       # Capturer toute autre erreur et essayer la méthode de secours
       try:
           print(f"Erreur générale: {str(e)}, tentative d'utilisation de la méthode de secours")
           # Si une erreur se produit mais que nous avons déjà le texte du CV
           if 'processed_text' in locals():
               fallback_analysis = extract_candidate_skills_no_llm(processed_text)
               fallback_analysis['contact_info'] = extract_contact_info(processed_text) if 'contact_info' not in locals() else contact_info
               fallback_analysis['metadata'] = {
                   'filename': secure_filename(file.filename),
                   'analysis_timestamp': datetime.now().isoformat(),
                   'job_role': job_role,
                   'analysis_method': 'fallback',
                   'error': f'Erreur générale: {str(e)}'
               }
               return fallback_analysis
       except:
           pass
           
       # Si même la méthode de secours échoue ou si nous n'avons pas le texte du CV
       return {
           "error": f"Erreur lors de l'analyse du CV: {str(e)}",
           "analysis_method": "failed"
       }

def match_resume_to_job_description(resume_text, job_description, detailed=True):
   """
   Compare un CV à une description de poste et évalue la correspondance
   
   Args:
       resume_text (str): Le texte du CV
       job_description (str): La description du poste
       detailed (bool): Si True, retourne une analyse détaillée
       
   Returns:
       dict: Résultats de correspondance
   """
   try:
       prompt = f"""
       Tu es un expert en recrutement chargé d'évaluer l'adéquation entre un CV et une description de poste.

       CV:
       ```
       {resume_text[:4000]}  # Limiter pour ne pas dépasser le contexte
       ```

       Description du poste:
       ```
       {job_description[:2000]}  # Limiter pour ne pas dépasser le contexte
       ```

       {"Analyse de façon détaillée" if detailed else "Analyse brièvement"} l'adéquation entre ce CV et cette description de poste. 
       
       Fournis ta réponse au format JSON avec la structure suivante:
       {{
         "match_score": 85,  // Score de correspondance sur 100
         "matching_skills": ["compétence1", "compétence2", ...],  // Compétences présentes dans le CV qui correspondent au poste
         "missing_skills": ["compétence1", "compétence2", ...],  // Compétences importantes pour le poste mais absentes du CV
         "key_strengths": ["point1", "point2", ...],  // Points forts du candidat pour ce poste
         "overall_assessment": "Évaluation globale de l'adéquation"
       }}
       """
       
       try:
           llm_response = get_llm_response(prompt)
           match_analysis = json.loads(llm_response)
           match_analysis['analysis_method'] = 'llm'
           return match_analysis
       except Exception as llm_error:
           # En cas d'erreur avec le LLM, utiliser la méthode de secours
           print(f"Erreur LLM dans match_resume_to_job_description: {str(llm_error)}, utilisation de la méthode de secours")
           fallback_analysis = match_resume_to_job_description_no_llm(resume_text, job_description)
           fallback_analysis['analysis_method'] = 'fallback'
           fallback_analysis['error'] = f'Erreur LLM: {str(llm_error)}'
           return fallback_analysis
   except Exception as e:
       # En cas d'erreur générale, utiliser la méthode de secours
       try:
           print(f"Erreur générale dans match_resume_to_job_description: {str(e)}, utilisation de la méthode de secours")
           fallback_analysis = match_resume_to_job_description_no_llm(resume_text, job_description)
           fallback_analysis['analysis_method'] = 'fallback'
           fallback_analysis['error'] = f'Erreur générale: {str(e)}'
           return fallback_analysis
       except:
           return {
               "error": f"Erreur lors de l'analyse de correspondance: {str(e)}",
               "match_score": 0,
               "analysis_method": "failed"
           }

def generate_interview_questions_from_resume(resume_text, job_role, num_questions=5):
   """
   Génère des questions d'entretien personnalisées basées sur le CV
   
   Args:
       resume_text (str): Le texte du CV
       job_role (str): Le poste pour lequel le candidat postule
       num_questions (int): Nombre de questions à générer
       
   Returns:
       list: Liste de questions d'entretien
   """
   try:
       prompt = f"""
       Tu es un recruteur expérimenté spécialisé dans les entretiens pour le poste de {job_role}.
       Après avoir analysé le CV suivant, génère {num_questions} questions d'entretien pertinentes 
       qui permettront d'évaluer les compétences et l'expérience du candidat.

       CV:
       ```
       {resume_text[:5000]}  # Limiter pour ne pas dépasser le contexte
       ```

       Les questions doivent:
       1. Être spécifiques au parcours et aux compétences mentionnés dans le CV
       2. Inclure un mélange de questions techniques et comportementales
       3. Permettre d'évaluer l'adéquation au poste de {job_role}
       4. Être formulées de manière ouverte pour encourager des réponses détaillées

       Fournis ta réponse au format JSON avec la structure suivante:
       [
         {{
           "question": "Question d'entretien complète",
           "type": "technique/comportementale/situation/expérience",
           "skill_to_assess": "Compétence évaluée",
           "difficulty": "facile/moyenne/difficile",
           "expected_answer_elements": ["élément1", "élément2", ...] // Points clés à rechercher dans la réponse
         }},
         ...
       ]
       """
       
       try:
           llm_response = get_llm_response(prompt)
           questions = json.loads(llm_response)
           # Ajouter des métadonnées d'analyse
           for question in questions:
               question['generated_by'] = 'llm'
           return questions
       except Exception as llm_error:
           # En cas d'erreur avec le LLM, utiliser la méthode de secours
           print(f"Erreur LLM dans generate_interview_questions: {str(llm_error)}, utilisation de la méthode de secours")
           fallback_questions = generate_interview_questions_from_resume_no_llm(resume_text, job_role, num_questions)
           # Ajouter des métadonnées d'analyse
           for question in fallback_questions:
               question['generated_by'] = 'fallback'
               question['error'] = f'Erreur LLM: {str(llm_error)}'
           return fallback_questions
   except Exception as e:
       # En cas d'erreur générale, utiliser la méthode de secours
       try:
           print(f"Erreur générale dans generate_interview_questions: {str(e)}, utilisation de la méthode de secours")
           fallback_questions = generate_interview_questions_from_resume_no_llm(resume_text, job_role, num_questions)
           # Ajouter des métadonnées d'analyse
           for question in fallback_questions:
               question['generated_by'] = 'fallback'
               question['error'] = f'Erreur générale: {str(e)}'
           return fallback_questions
       except:
           # Dernière ressource : questions génériques
           return [
               {
                   "question": f"Parlez-moi de votre expérience en tant que {job_role}.",
                   "type": "expérience",
                   "skill_to_assess": "Expérience générale",
                   "difficulty": "facile",
                   "expected_answer_elements": ["Parcours professionnel", "Réalisations"],
                   "generated_by": "default",
                   "error": f"Erreur lors de la génération des questions: {str(e)}"
               },
               {
                   "question": "Décrivez un projet difficile sur lequel vous avez travaillé récemment.",
                   "type": "situation",
                   "skill_to_assess": "Résolution de problèmes",
                   "difficulty": "moyenne",
                   "expected_answer_elements": ["Analyse de la situation", "Approche méthodique", "Résultats"],
                   "generated_by": "default",
                   "error": f"Erreur lors de la génération des questions : {str(e)}"
               }
           ]