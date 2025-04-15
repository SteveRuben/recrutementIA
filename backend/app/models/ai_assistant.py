# backend/app/models/ai_assistant.py
from datetime import datetime
import uuid
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import relationship

from app import db

class AIAssistant(db.Model):
    """Modèle pour les assistants IA configurables"""
    __tablename__ = 'ai_assistants'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    
    # Informations de base
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    avatar = db.Column(db.String(255), nullable=True, default='/images/ai-assistant-default.png')
    model = db.Column(db.String(50), nullable=False, default='claude-3-7-sonnet')
    
    # Classification
    industry = db.Column(db.String(50), nullable=True)
    job_role = db.Column(db.String(50), nullable=True)
    seniority = db.Column(db.String(50), nullable=True)
    interview_mode = db.Column(db.String(20), nullable=False, default='collaborative')
    
    # Configuration avancée
    personality = db.Column(JSON, nullable=False, default={
        'friendliness': 3,
        'formality': 3,
        'technicalDepth': 3,
        'followUpIntensity': 3
    })
    
    base_knowledge = db.Column(JSON, nullable=False, default={
        'technicalSkills': True,
        'softSkills': True,
        'companyValues': False,
        'industryTrends': False
    })
    
    capabilities = db.Column(JSON, nullable=False, default={
        'generateQuestions': True,
        'evaluateResponses': True,
        'provideFeedback': True,
        'suggestFollowUps': True,
        'realTimeCoaching': False,
        'biometricIntegration': False
    })
    
    custom_prompt = db.Column(db.Text, nullable=True)
    question_bank = db.Column(JSON, nullable=True)
    
    # Métadonnées
    is_template = db.Column(db.Boolean, default=False)
    template_id = db.Column(UUID(as_uuid=True), nullable=True)  # Si cloné à partir d'un modèle
    
    # Statistiques d'utilisation
    usage_count = db.Column(db.Integer, default=0)
    last_used = db.Column(db.DateTime, nullable=True)
    
    # Horodatage
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    user = relationship('User', back_populates='ai_assistants')
    documents = relationship('AIAssistantDocument', back_populates='assistant', cascade='all, delete-orphan')
    interviews = relationship('Interview', back_populates='ai_assistant')
    organization_id = db.Column(db.String(36), db.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    organization = relationship("Organization", back_populates="ai_assistants_org")
    
    def __repr__(self):
        return f'<AIAssistant {self.name}>'
    
    def to_dict(self):
        """Convertit l'assistant en dictionnaire pour l'API"""
        return {
            'id': str(self.id),
            'name': self.name,
            'description': self.description,
            'avatar': self.avatar,
            'model': self.model,
            'industry': self.industry,
            'jobRole': self.job_role,
            'seniority': self.seniority,
            'interviewMode': self.interview_mode,
            'personality': self.personality,
            'baseKnowledge': self.base_knowledge,
            'capabilities': self.capabilities,
            'customPrompt': self.custom_prompt,
            'questionBank': self.question_bank,
            'isTemplate': self.is_template,
            'usageCount': self.usage_count,
            'lastUsed': self.last_used.isoformat() if self.last_used else None,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat()
        }

class AIAssistantDocument(db.Model):
    """Modèle pour les documents associés aux assistants IA"""
    __tablename__ = 'ai_assistant_documents'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assistant_id = db.Column(UUID(as_uuid=True), db.ForeignKey('ai_assistants.id'), nullable=False)
    
    filename = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(255), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)  # Taille en octets
    file_type = db.Column(db.String(100), nullable=False)  # MIME type
    
    document_type = db.Column(db.String(50), nullable=False)  # company_values, job_description, etc.
    description = db.Column(db.Text, nullable=True)
    
    vector_index_status = db.Column(db.String(20), default='pending')  # pending, processing, completed, failed
    
    # Horodatage
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    assistant = relationship('AIAssistant', back_populates='documents')
    
    def __repr__(self):
        return f'<AIAssistantDocument {self.original_filename}>'
    
    def to_dict(self):
        """Convertit le document en dictionnaire pour l'API"""
        return {
            'id': str(self.id),
            'assistantId': str(self.assistant_id),
            'filename': self.filename,
            'originalFilename': self.original_filename,
            'fileSize': self.file_size,
            'fileType': self.file_type,
            'documentType': self.document_type,
            'description': self.description,
            'vectorIndexStatus': self.vector_index_status,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat()
        }