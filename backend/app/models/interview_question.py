# backend/app/models/interview_question.py
from datetime import datetime
from app import db

class InterviewQuestion(db.Model):
    __tablename__ = 'interview_questions'
    
    id = db.Column(db.Integer, primary_key=True)
    interview_id = db.Column(db.Integer, db.ForeignKey('interviews.id'), nullable=False)
    text = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(50), nullable=False)  # 'technical', 'behavioral', 'experience', 'situational'
    category = db.Column(db.String(50), nullable=True)  # Catégorie spécifique de la question
    expected_topics = db.Column(db.JSON, nullable=True)  # Points clés attendus dans la réponse
    position = db.Column(db.Integer, nullable=False)  # Ordre dans l'entretien
    time_limit_seconds = db.Column(db.Integer, nullable=True)  # Temps suggéré pour répondre
    is_required = db.Column(db.Boolean, default=True)  # La question est-elle obligatoire
    status = db.Column(db.String(20), default='pending')  # 'pending', 'asked', 'answered', 'skipped'
    asked_at = db.Column(db.DateTime, nullable=True)  # Horodatage lorsque la question a été posée
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    # interview = db.relationship('Interview', backref='questions')
    interview = db.relationship('Interview', backref=db.backref('interview_question', cascade="all, delete-orphan"))

    # responses - défini dans Response
    # biometric_data - défini dans BiometricData
    
    def to_dict(self):
        return {
            'id': self.id,
            'interview_id': self.interview_id,
            'text': self.text,
            'type': self.type,
            'category': self.category,
            'expected_topics': self.expected_topics,
            'position': self.position,
            'time_limit_seconds': self.time_limit_seconds,
            'is_required': self.is_required,
            'status': self.status,
            'asked_at': self.asked_at.isoformat() if self.asked_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def to_dict_with_responses(self):
        """Version étendue de to_dict incluant les réponses"""
        base_dict = self.to_dict()
        
        # Ajouter les réponses
        base_dict['responses'] = [r.to_dict() for r in self.responses] if hasattr(self, 'responses') else []
        
        return base_dict