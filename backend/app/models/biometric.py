# backend/models/biometric.py
from datetime import datetime
from app import db

class FacialAnalysis(db.Model):
    __tablename__ = 'facial_analyses'
    
    id = db.Column(db.Integer, primary_key=True)
    interview_id = db.Column(db.Integer, db.ForeignKey('interviews.id'), nullable=False)
    timestamp = db.Column(db.Integer, nullable=False)  # Position dans l'entretien (en secondes)
    emotions = db.Column(db.JSON, nullable=False)  # {"happy": 0.8, "sad": 0.1, ...}
    dominant_emotion = db.Column(db.String(20), nullable=True)
    confidence = db.Column(db.Float, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # interview = db.relationship('Interview', backref='facial_analyses')
    interview = db.relationship('Interview', backref=db.backref('facial_analyses', cascade="all, delete-orphan"))
    
    def to_dict(self):
        return {
            'id': self.id,
            'interview_id': self.interview_id,
            'timestamp': self.timestamp,
            'emotions': self.emotions,
            'dominant_emotion': self.dominant_emotion,
            'confidence': self.confidence,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class BiometricSummary(db.Model):
    __tablename__ = 'biometric_summaries'
    
    id = db.Column(db.Integer, primary_key=True)
    interview_id = db.Column(db.Integer, db.ForeignKey('interviews.id'), nullable=False, unique=True)
    emotion_distribution = db.Column(db.JSON, nullable=False)  # {"happy": 45%, "neutral": 30%, ...}
    engagement_score = db.Column(db.Float, nullable=True)  # 0-100
    stress_indicators = db.Column(db.Float, nullable=True)  # 0-100
    confidence_indicators = db.Column(db.Float, nullable=True)  # 0-100
    key_moments = db.Column(db.JSON, nullable=True)  # [{"timestamp": 120, "emotion": "surprised", "question_id": 5}, ...]
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # interview = db.relationship('Interview', backref='biometric_summary', uselist=False)
    interview = db.relationship('Interview', backref=db.backref('biombiometric_summarytric_data', cascade="all, delete-orphan"))
    
    def to_dict(self):
        return {
            'id': self.id,
            'interview_id': self.interview_id,
            'emotion_distribution': self.emotion_distribution,
            'engagement_score': self.engagement_score,
            'stress_indicators': self.stress_indicators,
            'confidence_indicators': self.confidence_indicators,
            'key_moments': self.key_moments,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }