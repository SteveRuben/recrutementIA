# backend/app/models/user.py
from datetime import datetime
import uuid
from flask_sqlalchemy import SQLAlchemy
from app import db
from .organization import OrganizationMember  # Import le modèle OrganizationMember

class User(db.Model):
    """
    Modèle SQLAlchemy pour représenter un utilisateur dans le système
    """
    __tablename__ = 'users'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(255), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(50), default='user')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    last_password_change = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, onupdate=datetime.now)
    last_login = db.Column(db.DateTime)
    onboarding_completed = db.Column(db.Boolean, default=False)
    
    # Champs supplémentaires
    job_title = db.Column(db.String(100))
    department = db.Column(db.String(100))
    phone = db.Column(db.String(20))
    avatar_url = db.Column(db.String(255))
    preferences = db.Column(db.JSON, default=lambda: {})
    permissions = db.Column(db.JSON, default=lambda: [])
    
    # Relations pour les organisations
    organizations = None
    created_summaries = None
    ai_assistants = None
    team_ai_assistant_additions = None
    created_interviews = None #created_interviews = db.relationship('Interview', back_populates='creator', foreign_keys='Interview.created_by')
    current_organization_id = db.Column(db.String(36), nullable=True)
    
    """
    Modèle pour représenter un utilisateur dans le système
    """
    def __init__(self, id=None, email=None, password=None, first_name=None, 
                 last_name=None, role="user", is_active=True, created_at=None,
                 last_password_change=None, updated_at=None, last_login=None):
        """
        Initialise un utilisateur.
        
        Args:
            id (str): Identifiant unique de l'utilisateur
            email (str): Email de l'utilisateur (unique)
            password (str): Mot de passe haché
            first_name (str): Prénom
            last_name (str): Nom de famille
            role (str): Rôle de l'utilisateur (admin, recruiter, user, etc.)
            is_active (bool): État du compte (actif/inactif)
            created_at (datetime): Date de création du compte
            updated_at (datetime): Date de dernière mise à jour
            last_login (datetime): Date de dernière connexion
        """
        self.id = id or str(uuid.uuid4())
        self.email = email
        self.password = password
        self.first_name = first_name
        self.last_name = last_name
        self.role = role
        self.is_active = is_active
        self.created_at = created_at or datetime.now()
        last_password_change = last_password_change or datetime.now()
        self.updated_at = updated_at
        self.last_login = last_login
        
        # Champs supplémentaires pour RecruteIA
        self.job_title = None
        self.department = None
        self.phone = None
        self.avatar_url = None
        self.preferences = {}
        self.permissions = []
    
    @property
    def full_name(self):
        """
        Renvoie le nom complet de l'utilisateur
        
        Returns:
            str: Nom complet formaté
        """
        return f"{self.first_name} {self.last_name}"
    
    def to_dict(self):
        """
        Convertit l'objet utilisateur en dictionnaire pour la sérialisation.
        
        Returns:
            dict: Représentation de l'utilisateur sous forme de dictionnaire
        """
        orgs = [member.organization for member in self.organizations]
        has_organization = len(orgs) > 0
        return {
            'id': self.id,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': self.full_name,
            'role': self.role,
            'is_active': self.is_active,
            'job_title': self.job_title,
            'department': self.department,
            'phone': self.phone,
            'avatar_url': self.avatar_url,
            'preferences': self.preferences,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            "has_organization": has_organization,
            "onboarding_completed": self.onboarding_completed
        }
    
    @classmethod
    def from_dict(cls, data):
        """
        Crée une instance de User à partir d'un dictionnaire.
        
        Args:
            data (dict): Dictionnaire contenant les données de l'utilisateur
            
        Returns:
            User: Instance de User créée
        """
        # Convertir les dates si nécessaire
        created_at = data.get('created_at')
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
            
        updated_at = data.get('updated_at')
        if isinstance(updated_at, str) and updated_at:
            updated_at = datetime.fromisoformat(updated_at)
            
        last_login = data.get('last_login')
        if isinstance(last_login, str) and last_login:
            last_login = datetime.fromisoformat(last_login)
        
        # Créer l'instance
        user = cls(
            id=data.get('id'),
            email=data.get('email'),
            password=data.get('password'),
            first_name=data.get('first_name'),
            last_name=data.get('last_name'),
            role=data.get('role', 'user'),
            is_active=data.get('is_active', True),
            created_at=created_at,
            updated_at=updated_at,
            last_login=last_login
        )
        
        # Ajouter les champs supplémentaires
        user.job_title = data.get('job_title')
        user.department = data.get('department')
        user.phone = data.get('phone')
        user.avatar_url = data.get('avatar_url')
        user.preferences = data.get('preferences', {})
        user.permissions = data.get('permissions', [])
        
        return user
    
    @staticmethod
    def has_permission(user, permission):
        """
        Vérifie si un utilisateur a une permission spécifique.
        
        Args:
            user (User): Utilisateur à vérifier
            permission (str): Permission requise
            
        Returns:
            bool: True si l'utilisateur a la permission, False sinon
        """
        # Les admins ont toutes les permissions
        if user.role == 'admin':
            return True
            
        # Vérifier dans les permissions explicites
        if permission in user.permissions:
            return True
            
        # Vérifier les permissions basées sur le rôle
        role_permissions = {
            'recruiter': ['view_candidates', 'manage_interviews', 'view_reports'],
            'manager': ['view_candidates', 'manage_interviews', 'view_reports', 'manage_team'],
            'user': ['view_own_profile']
        }
        
        return permission in role_permissions.get(user.role, [])
    
    # Méthode utilitaire pour obtenir l'organisation active
    @property
    def current_organization(self):
        if not self.current_organization_id:
            # Si pas d'organisation active, prendre la première
            org_member = OrganizationMember.query.filter_by(user_id=self.id).first()
            if org_member:
                return org_member.organization
            return None
        
        # Sinon, chercher l'organisation active
        org_member = OrganizationMember.query.filter_by(
            user_id=self.id, 
            organization_id=self.current_organization_id
        ).first()
        return org_member.organization if org_member else None


# Set up relationships after all models are defined
def setup_user_relationships():
    # Import locally to avoid circular imports
    from .organization import OrganizationMember
    from .interview import Interview
    
    User.organizations = db.relationship(
        "OrganizationMember", 
        back_populates="user",
        lazy='dynamic'
    )
    User.created_interviews = db.relationship(
        "Interview", 
        back_populates="creator",
        foreign_keys="Interview.created_by"
    )
    
    User.created_summaries = db.relationship(
        'InterviewSummary',
        back_populates='creator',
        foreign_keys='InterviewSummary.created_by',
        lazy='dynamic'  # # Allows querying like user.created_summaries.filter(...)
    )
    # Add this relationship
    User.ai_assistants = db.relationship(
        'AIAssistant',
        back_populates='user',
        foreign_keys='AIAssistant.user_id',
        lazy='dynamic'  # or 'select' if you prefer
    )
    
    # Add this if you're using TeamAIAssistant model    
    User.team_ai_assistant_additions = db.relationship(
        'TeamAIAssistant',
        back_populates='adder',
        foreign_keys='TeamAIAssistant.added_by'
    )

# Call the setup function at the bottom
setup_user_relationships()
