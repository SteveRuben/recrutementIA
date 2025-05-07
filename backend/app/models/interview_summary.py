# backend/models/interview_summary.py
from datetime import datetime
from app import db

class InterviewSummary(db.Model):
    __tablename__ = 'interview_summaries'
    
    id = db.Column(db.Integer, primary_key=True)
    interview_id = db.Column(db.Integer, db.ForeignKey('interviews.id'), nullable=False, unique=True)
    overall_score = db.Column(db.Float, nullable=True)  # Score global (0-100)
    technical_score = db.Column(db.Float, nullable=True)  # Score technique (0-100)
    soft_skills_score = db.Column(db.Float, nullable=True)  # Score de soft skills (0-100)
    communication_score = db.Column(db.Float, nullable=True)  # Score de communication (0-100)
    strengths = db.Column(db.JSON, nullable=True)  # Liste des points forts
    weaknesses = db.Column(db.JSON, nullable=True)  # Liste des points faibles
    key_insights = db.Column(db.JSON, nullable=True)  # Points clés de l'entretien
    recommendation = db.Column(db.String(50), nullable=True)  # 'hire', 'consider', 'reject'
    recommendation_confidence = db.Column(db.Float, nullable=True)  # Confiance dans la recommandation (0-100)
    recommendation_reasons = db.Column(db.Text, nullable=True)  # Raisons de la recommandation
    summary_text = db.Column(db.Text, nullable=True)  # Résumé textuel de l'entretien
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # Peut être généré par l'IA (NULL)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    # interview = db.relationship('Interview', backref='summary', uselist=False)
    interview = db.relationship('Interview', backref=db.backref('interview_summary', cascade="all, delete-orphan"))
    creator = db.relationship('User', backref='created_summaries', foreign_keys=[created_by])
    
    def to_dict(self):
        return {
            'id': self.id,
            'interview_id': self.interview_id,
            'overall_score': self.overall_score,
            'technical_score': self.technical_score,
            'soft_skills_score': self.soft_skills_score,
            'communication_score': self.communication_score,
            'strengths': self.strengths,
            'weaknesses': self.weaknesses,
            'key_insights': self.key_insights,
            'recommendation': self.recommendation,
            'recommendation_confidence': self.recommendation_confidence,
            'recommendation_reasons': self.recommendation_reasons,
            'summary_text': self.summary_text,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_by_name': self.creator.name if self.creator else 'IA'
        }