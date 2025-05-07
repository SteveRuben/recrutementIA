# backend/app/models/interview_response.py
from datetime import datetime
from app import db

class InterviewResponse(db.Model):
    __tablename__ = 'interview_responses'
    
    id = db.Column(db.Integer, primary_key=True)
    interview_id = db.Column(db.Integer, db.ForeignKey('interviews.id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('questions.id'), nullable=False)
    text = db.Column(db.Text, nullable=False)
    confidence_score = db.Column(db.Float, nullable=True)  # Score de confiance basé sur l'analyse biométrique (0-100)
    relevance_score = db.Column(db.Float, nullable=True)  # Score de pertinence évalué par l'IA (0-100)
    technical_score = db.Column(db.Float, nullable=True)  # Score technique évalué par l'IA (0-100)
    communication_score = db.Column(db.Float, nullable=True)  # Score de communication évalué par l'IA (0-100)
    keywords_matched = db.Column(db.JSON, nullable=True)  # Mots-clés identifiés dans la réponse
    start_time = db.Column(db.DateTime, nullable=True)  # Début de la réponse
    end_time = db.Column(db.DateTime, nullable=True)  # Fin de la réponse
    duration_seconds = db.Column(db.Integer, nullable=True)  # Durée de la réponse en secondes
    feedback = db.Column(db.Text, nullable=True)  # Feedback de l'IA ou du recruteur
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    # interview = db.relationship('Interview', backref='responses')
    interview = db.relationship('Interview', backref=db.backref('responses', cascade="all, delete-orphan"))
    question = db.relationship('Question', backref='responses')

    # biometric_data - défini dans BiometricData
    
    def to_dict(self):
        return {
            'id': self.id,
            'interview_id': self.interview_id,
            'question_id': self.question_id,
            'text': self.text,
            'confidence_score': self.confidence_score,
            'relevance_score': self.relevance_score,
            'technical_score': self.technical_score,
            'communication_score': self.communication_score,
            'keywords_matched': self.keywords_matched,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'duration_seconds': self.duration_seconds,
            'feedback': self.feedback,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'question_text': self.question.text if self.question else None
        }