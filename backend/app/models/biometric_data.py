# backend/models/biometric_data.py
from datetime import datetime
from app import db

class BiometricData(db.Model):
    """
    Modèle pour stocker les données biométriques capturées lors d'une question spécifique
    dans un entretien. Ce modèle complète le modèle FacialAnalysis avec des données
    supplémentaires sur l'engagement et d'autres métriques.
    """
    __tablename__ = 'biometric_data'
    
    id = db.Column(db.Integer, primary_key=True)
    interview_id = db.Column(db.Integer, db.ForeignKey('interviews.id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('questions.id'), nullable=False)
    response_id = db.Column(db.Integer, db.ForeignKey('responses.id'), nullable=True)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    # Données d'engagement
    eye_contact = db.Column(db.String(20), nullable=True)  # 'Faible', 'Moyen', 'Bon', 'Excellent'
    posture = db.Column(db.String(20), nullable=True)  # 'Faible', 'Moyen', 'Bon', 'Excellent'
    gestures = db.Column(db.String(20), nullable=True)  # 'Faible', 'Moyen', 'Bon', 'Excellent'
    attention = db.Column(db.String(20), nullable=True)  # 'Faible', 'Moyen', 'Bon', 'Excellent'
    
    # Données émotionnelles (complète les données de FacialAnalysis)
    emotions = db.Column(db.JSON, nullable=True)  # {"happy": 0.8, "sad": 0.1, ...}
    dominant_emotion = db.Column(db.String(20), nullable=True)
    
    # Méta-données
    capture_method = db.Column(db.String(50), nullable=True)  # 'webcam', 'upload', 'simulation'
    analysis_model = db.Column(db.String(50), nullable=True)  # 'azure-face', 'custom', 'simulation'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    # interview = db.relationship('Interview', backref='biometric_data')
    interview = db.relationship('Interview', backref=db.backref('biometric_data', cascade="all, delete-orphan"))
    question = db.relationship('Question', backref='biometric_data')
    response = db.relationship('Response', backref='biometric_data')
    
    def to_dict(self):
        return {
            'id': self.id,
            'interview_id': self.interview_id,
            'question_id': self.question_id,
            'response_id': self.response_id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'engagement': {
                'eye_contact': self.eye_contact,
                'posture': self.posture,
                'gestures': self.gestures,
                'attention': self.attention
            },
            'emotions': self.emotions,
            'dominant_emotion': self.dominant_emotion,
            'capture_method': self.capture_method,
            'analysis_model': self.analysis_model,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }