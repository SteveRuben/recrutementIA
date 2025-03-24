# backend/models/interview.py
from datetime import datetime
from app import db

class Interview(db.Model):
    __tablename__ = 'interviews'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    job_title = db.Column(db.String(255), nullable=False)
    job_description = db.Column(db.Text, nullable=True)
    experience_level = db.Column(db.String(50), nullable=True)  # 'débutant', 'intermédiaire', 'senior', 'expert'
    interview_mode = db.Column(db.String(20), default='autonomous')  # 'autonomous', 'collaborative'
    status = db.Column(db.String(20), default='draft')  # 'draft', 'scheduled', 'in_progress', 'completed', 'cancelled'
    
    # Informations sur le candidat
    candidate_name = db.Column(db.String(255), nullable=True)
    candidate_email = db.Column(db.String(255), nullable=True)
    cv_file_path = db.Column(db.String(255), nullable=True)
    
    # Dates importantes
    scheduled_for = db.Column(db.DateTime, nullable=True)
    started_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    
    # Méta-données
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations (définies dans les autres modèles via backref)
    # questions - défini dans Question
    # responses - défini dans Response
    # facial_analyses - défini dans FacialAnalysis
    # biometric_summary - défini dans BiometricSummary
    # summary - défini dans InterviewSummary
    # biometric_data - défini dans BiometricData
    
    creator = db.relationship('User', backref='created_interviews', foreign_keys=[created_by])
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'job_title': self.job_title,
            'job_description': self.job_description,
            'experience_level': self.experience_level,
            'interview_mode': self.interview_mode,
            'status': self.status,
            'candidate_name': self.candidate_name,
            'candidate_email': self.candidate_email,
            'cv_file_path': self.cv_file_path,
            'scheduled_for': self.scheduled_for.isoformat() if self.scheduled_for else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def to_dict_with_relations(self):
        """Version étendue de to_dict incluant les relations"""
        base_dict = self.to_dict()
        
        # Ajouter les relations
        base_dict['questions'] = [q.to_dict() for q in self.questions] if hasattr(self, 'questions') else []
        base_dict['responses'] = [r.to_dict() for r in self.responses] if hasattr(self, 'responses') else []
        base_dict['summary'] = self.summary.to_dict() if hasattr(self, 'summary') and self.summary else None
        base_dict['biometric_summary'] = self.biometric_summary.to_dict() if hasattr(self, 'biometric_summary') and self.biometric_summary else None
        
        return base_dict