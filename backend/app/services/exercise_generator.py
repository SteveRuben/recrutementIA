import json
import uuid
from typing import Dict, Any, List, Optional
from ..services.llm_service import get_llm_response  

class ExerciseGenerator:
    """Classe pour générer des exercices de code à l'aide de LLM."""
    
    def __init__(self):
        pass
    
    def generate_exercise_for_skills(self, skills: List[str], difficulty: str, purpose: str) -> Dict[str, Any]:
        """
        Génère un exercice adapté aux compétences spécifiées via LLM.
        
        Args:
            skills: Liste des compétences cibles
            difficulty: Niveau de difficulté (easy, medium, hard)
            purpose: Objectif de l'exercice (evaluation, training)
            
        Returns:
            Exercice généré
        """
        if not skills:
            raise ValueError("La liste des compétences ne peut pas être vide.")
            
        # Déterminer la technologie principale pour l'exercice
        main_technology = self._identify_main_technology(skills)
        
        # Définir le niveau de compétence pour la génération
        skill_level = "débutant" if difficulty == "easy" else "intermédiaire" if difficulty == "medium" else "avancé"
        
        try:
            # Construire le prompt pour la génération
            generation_prompt = self._build_generation_prompt(skills, main_technology, skill_level, purpose)
            
            # Utiliser le LLM pour générer l'exercice
            try:
                llm_response = get_llm_response(generation_prompt)
                
                try:
                    # Tenter de parser la réponse JSON
                    exercise_spec = json.loads(llm_response)
                    
                    # Enrichir l'exercice avec des métadonnées
                    exercise_spec["unique_id"] = f"ex-gen-{uuid.uuid4().hex[:8]}"
                    exercise_spec["id"] = exercise_spec["unique_id"]  # Ajouter id pour compatibilité
                    exercise_spec["difficulty"] = difficulty
                    exercise_spec["purpose"] = purpose
                    exercise_spec["is_generated"] = True
                    exercise_spec["generation_prompt"] = generation_prompt
                    exercise_spec["skills"] = skills
                    exercise_spec["technologies"] = [main_technology] if main_technology else []
                    exercise_spec["generation_method"] = "llm"
                    
                    return exercise_spec
                    
                except json.JSONDecodeError:
                    # Si la réponse n'est pas au format JSON valide, utiliser la méthode de secours
                    print(f"Erreur de décodage JSON dans la réponse LLM, utilisation de la méthode de secours")
                    fallback_exercise = self._generate_simple_exercise_no_llm(skills, difficulty, purpose, main_technology)
                    fallback_exercise['metadata'] = {
                        'generation_method': 'fallback',
                        'error': 'JSON invalide dans la réponse LLM'
                    }
                    return fallback_exercise
                    
            except Exception as llm_error:
                # En cas d'erreur avec le LLM, utiliser la méthode de secours
                print(f"Erreur LLM dans generate_exercise_for_skills: {str(llm_error)}, utilisation de la méthode de secours")
                fallback_exercise = self._generate_simple_exercise_no_llm(skills, difficulty, purpose, main_technology)
                fallback_exercise['metadata'] = {
                    'generation_method': 'fallback',
                    'error': f'Erreur LLM: {str(llm_error)}'
                }
                return fallback_exercise
                
        except Exception as e:
            # En cas d'erreur générale, utiliser la méthode de secours
            print(f"Erreur générale dans generate_exercise_for_skills: {str(e)}, utilisation de la méthode de secours")
            fallback_exercise = self._generate_simple_exercise_no_llm(skills, difficulty, purpose, main_technology)
            fallback_exercise['metadata'] = {
                'generation_method': 'fallback',
                'error': f'Erreur générale: {str(e)}'
            }
            return fallback_exercise
    
    def _identify_main_technology(self, skills: List[str]) -> Optional[str]:
        """Identifie la technologie principale parmi les compétences."""
        # Mapping des compétences vers les technologies
        technology_mappings = {
            "flutter": "Flutter",
            "dart": "Dart",
            "react": "React",
            "angular": "Angular",
            "vue": "Vue.js",
            "node.js": "Node.js",
            "nodejs": "Node.js",
            "python": "Python",
            "django": "Django",
            "flask": "Flask",
            "java": "Java",
            "spring": "Spring",
            "javascript": "JavaScript",
            "typescript": "TypeScript",
            "php": "PHP",
            "laravel": "Laravel",
            "ruby": "Ruby",
            "c#": "C#",
            "csharp": "C#",
            ".net": ".NET",
            "dotnet": ".NET"
        }
        
        # Rechercher parmi les compétences
        for skill in skills:
            skill_lower = skill.lower()
            if skill_lower in technology_mappings:
                return technology_mappings[skill_lower]
        
        # Si aucune technologie n'est identifiée mais "frontend" ou "backend" est mentionné
        for skill in skills:
            skill_lower = skill.lower()
            if "frontend" in skill_lower:
                return "JavaScript"
            elif "backend" in skill_lower:
                return "Python"
                
        # Retour par défaut
        return "Python"  # Langue par défaut
    
    def _build_generation_prompt(self, skills: List[str], technology: Optional[str], skill_level: str, purpose: str) -> str:
        """Construit le prompt pour générer un exercice avec le LLM."""
        skills_str = ", ".join(skills)
        technology_str = technology if technology else "programmation générale"
        
        purpose_description = "d'évaluation pour tester les compétences" if purpose == "evaluation" else "d'entraînement pour développer les compétences"
        
        prompt = f"""
Tu es un expert en développement logiciel spécialisé dans la création d'exercices de programmation éducatifs.

TÂCHE: Crée un exercice de programmation {purpose_description} ciblant spécifiquement les compétences suivantes : {skills_str}.
Le niveau de difficulté devrait être: {skill_level}
La technologie principale est: {technology_str}

IMPORTANT: Crée un exercice TRÈS COURT et SIMPLE (comme calculer la somme de deux nombres), car nous sommes en phase de test.
L'exercice doit pouvoir être résolu en moins de 5 minutes.

CONTRAINTES IMPORTANTES:
1. L'exercice doit être directement lié aux compétences mentionnées
2. NE PAS inclure de solution complète, seulement un code de démarrage (starter code)
3. Les cas de test doivent être simples et vérifiables
4. Inclure au moins 1 cas de test visible et 1 cas de test caché

FORMAT DE RÉPONSE (JSON):
{{
    "title": "Titre court et descriptif",
    "description": "Description brève du problème",
    "duration_minutes": 5,
    "starter_code": {{
        "[langage]": "// Code de démarrage simple avec commentaires"
    }},
    "test_cases": [
        {{
            "input": "Description de l'entrée du test",
            "expected_output": "Description de la sortie attendue",
            "is_hidden": false
        }},
        {{
            "input": "Description de l'entrée du test caché",
            "expected_output": "Description de la sortie attendue",
            "is_hidden": true
        }}
    ]
}}
"""
        
        return prompt
    
    # Nouvelle méthode simplifiée pour générer des exercices très simples sans LLM
    def _generate_simple_exercise_no_llm(self, skills: List[str], difficulty: str, purpose: str, technology: Optional[str]) -> Dict[str, Any]:
        """
        Génère un exercice très simple adapté à la technologie spécifiée sans utiliser de LLM.
        Version de secours pour les tests uniquement.
        
        Args:
            skills: Liste des compétences cibles
            difficulty: Niveau de difficulté (easy, medium, hard)
            purpose: Objectif de l'exercice (evaluation, training)
            technology: Technologie principale
            
        Returns:
            Exercice généré
        """
        print(f"Utilisation de la méthode de secours pour générer un exercice simple pour {technology}")
        
        # Créer un identifiant unique
        exercise_id = f"ex-simple-{uuid.uuid4().hex[:8]}"
        
        # Déterminer le langage approprié
        language = self._get_language_for_technology(technology)
        
        # Sélectionner un exercice simple en fonction de la technologie
        title, description, starter_code, test_cases = self._get_simple_exercise(technology, language, difficulty)
        
        # Assembler l'exercice
        return {
            "title": title,
            "description": f"{description}\n\nCet exercice vise à pratiquer les compétences suivantes: {', '.join(skills)}",
            "duration_minutes": 5,
            "starter_code": {
                language: starter_code
            },
            "test_cases": test_cases,
            "unique_id": exercise_id,
            "id": exercise_id,
            "difficulty": difficulty,
            "purpose": purpose,
            "is_generated": True,
            "generation_method": "fallback_simple",
            "skills": skills,
            "technologies": [technology] if technology else ["Programmation"]
        }
    
    def _get_language_for_technology(self, technology: Optional[str]) -> str:
        """Détermine le langage approprié pour une technologie."""
        if technology in ["JavaScript", "React", "Angular", "Vue.js", "Node.js"]:
            return "javascript"
        elif technology in ["TypeScript"]:
            return "typescript"
        elif technology in ["Python", "Django", "Flask"]:
            return "python"
        elif technology in ["Java", "Spring"]:
            return "java"
        elif technology in ["C#", ".NET"]:
            return "csharp"
        elif technology in ["PHP", "Laravel"]:
            return "php"
        elif technology in ["Ruby"]:
            return "ruby"
        elif technology in ["Flutter", "Dart"]:
            return "dart"
        else:
            return "python"  # Par défaut
    
    def _get_simple_exercise(self, technology: Optional[str], language: str, difficulty: str) -> tuple:
        """
        Retourne un exercice simple pour une technologie et un niveau de difficulté.
        
        Returns:
            tuple: (titre, description, code de démarrage, cas de test)
        """
        # Exercices pour Python
        if language == "python":
            if difficulty == "easy":
                return (
                    "Somme de deux nombres",
                    "Écrivez une fonction qui prend deux nombres en entrée et retourne leur somme.",
                    """def add_numbers(a, b):
    # TODO: Implémentez la fonction pour retourner la somme de a et b
    pass

# Exemple d'utilisation
if __name__ == "__main__":
    result = add_numbers(5, 3)
    print(f"5 + 3 = {result}")
""",
                    [
                        {
                            "input": "add_numbers(5, 3)",
                            "expected_output": "8",
                            "is_hidden": False
                        },
                        {
                            "input": "add_numbers(-2, 7)",
                            "expected_output": "5",
                            "is_hidden": True
                        }
                    ]
                )
            elif difficulty == "medium":
                return (
                    "Compter les voyelles",
                    "Écrivez une fonction qui compte le nombre de voyelles dans une chaîne de caractères.",
                    """def count_vowels(text):
    # TODO: Implémentez la fonction pour compter les voyelles (a, e, i, o, u)
    pass

# Exemple d'utilisation
if __name__ == "__main__":
    result = count_vowels("Hello World")
    print(f"Nombre de voyelles dans 'Hello World': {result}")
""",
                    [
                        {
                            "input": "count_vowels('Hello World')",
                            "expected_output": "3",
                            "is_hidden": False
                        },
                        {
                            "input": "count_vowels('Python Programming')",
                            "expected_output": "4",
                            "is_hidden": True
                        }
                    ]
                )
            else:  # hard
                return (
                    "Vérifier si un nombre est premier",
                    "Écrivez une fonction qui vérifie si un nombre est premier.",
                    """def is_prime(number):
    # TODO: Implémentez la fonction pour vérifier si le nombre est premier
    pass

# Exemple d'utilisation
if __name__ == "__main__":
    number = 17
    if is_prime(number):
        print(f"{number} est un nombre premier")
    else:
        print(f"{number} n'est pas un nombre premier")
""",
                    [
                        {
                            "input": "is_prime(17)",
                            "expected_output": "True",
                            "is_hidden": False
                        },
                        {
                            "input": "is_prime(4)",
                            "expected_output": "False",
                            "is_hidden": False
                        },
                        {
                            "input": "is_prime(97)",
                            "expected_output": "True",
                            "is_hidden": True
                        }
                    ]
                )
        
        # Exercices pour JavaScript
        elif language == "javascript":
            if difficulty == "easy":
                return (
                    "Somme de deux nombres",
                    "Écrivez une fonction qui prend deux nombres en entrée et retourne leur somme.",
                    """function addNumbers(a, b) {
    // TODO: Implémentez la fonction pour retourner la somme de a et b
}

// Exemple d'utilisation
console.log(`5 + 3 = ${addNumbers(5, 3)}`);
""",
                    [
                        {
                            "input": "addNumbers(5, 3)",
                            "expected_output": "8",
                            "is_hidden": False
                        },
                        {
                            "input": "addNumbers(-2, 7)",
                            "expected_output": "5",
                            "is_hidden": True
                        }
                    ]
                )
            elif difficulty == "medium":
                return (
                    "Compter les voyelles",
                    "Écrivez une fonction qui compte le nombre de voyelles dans une chaîne de caractères.",
                    """function countVowels(text) {
    // TODO: Implémentez la fonction pour compter les voyelles (a, e, i, o, u)
}

// Exemple d'utilisation
console.log(`Nombre de voyelles dans 'Hello World': ${countVowels('Hello World')}`);
""",
                    [
                        {
                            "input": "countVowels('Hello World')",
                            "expected_output": "3",
                            "is_hidden": False
                        },
                        {
                            "input": "countVowels('JavaScript Programming')",
                            "expected_output": "6",
                            "is_hidden": True
                        }
                    ]
                )
            else:  # hard
                return (
                    "Vérifier si un nombre est premier",
                    "Écrivez une fonction qui vérifie si un nombre est premier.",
                    """function isPrime(number) {
    // TODO: Implémentez la fonction pour vérifier si le nombre est premier
}

// Exemple d'utilisation
const number = 17;
if (isPrime(number)) {
    console.log(`${number} est un nombre premier`);
} else {
    console.log(`${number} n'est pas un nombre premier`);
}
""",
                    [
                        {
                            "input": "isPrime(17)",
                            "expected_output": "true",
                            "is_hidden": False
                        },
                        {
                            "input": "isPrime(4)",
                            "expected_output": "false",
                            "is_hidden": False
                        },
                        {
                            "input": "isPrime(97)",
                            "expected_output": "true",
                            "is_hidden": True
                        }
                    ]
                )
        
        # Exercices pour Java
        elif language == "java":
            if difficulty == "easy":
                return (
                    "Somme de deux nombres",
                    "Écrivez une méthode qui prend deux nombres en entrée et retourne leur somme.",
                    """public class AddNumbers {
    public static int addNumbers(int a, int b) {
        // TODO: Implémentez la méthode pour retourner la somme de a et b
        return 0;
    }
    
    public static void main(String[] args) {
        int result = addNumbers(5, 3);
        System.out.println("5 + 3 = " + result);
    }
}
""",
                    [
                        {
                            "input": "addNumbers(5, 3)",
                            "expected_output": "8",
                            "is_hidden": False
                        },
                        {
                            "input": "addNumbers(-2, 7)",
                            "expected_output": "5",
                            "is_hidden": True
                        }
                    ]
                )
            elif difficulty == "medium":
                return (
                    "Compter les voyelles",
                    "Écrivez une méthode qui compte le nombre de voyelles dans une chaîne de caractères.",
                    """public class CountVowels {
    public static int countVowels(String text) {
        // TODO: Implémentez la méthode pour compter les voyelles (a, e, i, o, u)
        return 0;
    }
    
    public static void main(String[] args) {
        String text = "Hello World";
        int result = countVowels(text);
        System.out.println("Nombre de voyelles dans '" + text + "': " + result);
    }
}
""",
                    [
                        {
                            "input": "countVowels(\"Hello World\")",
                            "expected_output": "3",
                            "is_hidden": False
                        },
                        {
                            "input": "countVowels(\"Java Programming\")",
                            "expected_output": "5",
                            "is_hidden": True
                        }
                    ]
                )
            else:  # hard
                return (
                    "Vérifier si un nombre est premier",
                    "Écrivez une méthode qui vérifie si un nombre est premier.",
                    """public class IsPrime {
    public static boolean isPrime(int number) {
        // TODO: Implémentez la méthode pour vérifier si le nombre est premier
        return false;
    }
    
    public static void main(String[] args) {
        int number = 17;
        if (isPrime(number)) {
            System.out.println(number + " est un nombre premier");
        } else {
            System.out.println(number + " n'est pas un nombre premier");
        }
    }
}
""",
                    [
                        {
                            "input": "isPrime(17)",
                            "expected_output": "true",
                            "is_hidden": False
                        },
                        {
                            "input": "isPrime(4)",
                            "expected_output": "false",
                            "is_hidden": False
                        },
                        {
                            "input": "isPrime(97)",
                            "expected_output": "true",
                            "is_hidden": True
                        }
                    ]
                )
        
        # Exercices pour TypeScript (similaires à JavaScript mais avec des types)
        elif language == "typescript":
            if difficulty == "easy":
                return (
                    "Somme de deux nombres",
                    "Écrivez une fonction qui prend deux nombres en entrée et retourne leur somme.",
                    """function addNumbers(a: number, b: number): number {
    // TODO: Implémentez la fonction pour retourner la somme de a et b
    return 0;
}

// Exemple d'utilisation
console.log(`5 + 3 = ${addNumbers(5, 3)}`);
""",
                    [
                        {
                            "input": "addNumbers(5, 3)",
                            "expected_output": "8",
                            "is_hidden": False
                        },
                        {
                            "input": "addNumbers(-2, 7)",
                            "expected_output": "5",
                            "is_hidden": True
                        }
                    ]
                )
            else:  # medium ou hard
                return (
                    "Calculer la longueur d'une chaîne",
                    "Écrivez une fonction qui retourne la longueur d'une chaîne de caractères sans utiliser la propriété length.",
                    """function getStringLength(str: string): number {
    // TODO: Implémentez la fonction pour calculer la longueur de la chaîne sans utiliser str.length
    return 0;
}

// Exemple d'utilisation
console.log(`Longueur de 'Hello': ${getStringLength('Hello')}`);
""",
                    [
                        {
                            "input": "getStringLength('Hello')",
                            "expected_output": "5",
                            "is_hidden": False
                        },
                        {
                            "input": "getStringLength('')",
                            "expected_output": "0",
                            "is_hidden": False
                        },
                        {
                            "input": "getStringLength('TypeScript')",
                            "expected_output": "10",
                            "is_hidden": True
                        }
                    ]
                )
        
        # Exercices pour Flutter/Dart
        elif language == "dart":
            if difficulty == "easy":
                return (
                    "Somme de deux nombres",
                    "Écrivez une fonction qui prend deux nombres en entrée et retourne leur somme.",
                    """int addNumbers(int a, int b) {
  // TODO: Implémentez la fonction pour retourner la somme de a et b
  return 0;
}

void main() {
  int result = addNumbers(5, 3);
  print('5 + 3 = $result');
}
""",
                    [
                        {
                            "input": "addNumbers(5, 3)",
                            "expected_output": "8",
                            "is_hidden": False
                        },
                        {
                            "input": "addNumbers(-2, 7)",
                            "expected_output": "5",
                            "is_hidden": True
                        }
                    ]
                )
            else:  # medium ou hard
                return (
                    "Capitaliser une chaîne",
                    "Écrivez une fonction qui convertit la première lettre de chaque mot en majuscule.",
                    """String capitalize(String text) {
  // TODO: Implémentez la fonction pour capitaliser la première lettre de chaque mot
  return '';
}

void main() {
  String text = 'hello dart world';
  String result = capitalize(text);
  print('Original: $text');
  print('Capitalisé: $result');
}
""",
                    [
                        {
                            "input": "capitalize('hello dart world')",
                            "expected_output": "Hello Dart World",
                            "is_hidden": False
                        },
                        {
                            "input": "capitalize('flutter programming')",
                            "expected_output": "Flutter Programming",
                            "is_hidden": True
                        }
                    ]
                )
        
        # Par défaut, utiliser un exercice PHP, Ruby ou C# simple selon le langage
        else:
            return (
                "Somme de deux nombres",
                f"Écrivez une fonction en {language} qui prend deux nombres en entrée et retourne leur somme.",
                f"// Écrivez la fonction addNumbers en {language} qui prend deux nombres et retourne leur somme",
                [
                    {
                        "input": "addNumbers(5, 3)",
                        "expected_output": "8",
                        "is_hidden": False
                    },
                    {
                        "input": "addNumbers(-2, 7)",
                        "expected_output": "5",
                        "is_hidden": True
                    }
                ]
            )