# backend/models/job_posting.py
from datetime import datetime
import uuid
from sqlalchemy import Column, String, Text, DateTime, Boolean, ForeignKey, JSON, Integer
from sqlalchemy.orm import relationship
from app import db

class JobPosting(db.Model):
    __tablename__ = 'job_postings'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    # Informations du poste
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    requirements = Column(Text, nullable=True)
    responsibilities = Column(Text, nullable=True)
    location = Column(String(255), nullable=True)
    employment_type = Column(String(50), nullable=True)  # Full-time, Part-time, Contract, etc.
    remote_policy = Column(String(50), nullable=True)  # Remote, Hybrid, On-site
    salary_range_min = Column(Integer, nullable=True)
    salary_range_max = Column(Integer, nullable=True)
    salary_currency = Column(String(3), nullable=True, default="EUR")
    
    # Métadonnées
    status = Column(String(50), default="draft")  # draft, published, closed
    source = Column(String(50), nullable=True)  # manual, imported
    source_url = Column(String(255), nullable=True)  # URL si importé d'un site externe
    external_id = Column(String(100), nullable=True)  # ID externe si importé
    published_at = Column(DateTime, nullable=True)
    closes_at = Column(DateTime, nullable=True)
    is_featured = Column(Boolean, default=False)
    
    # Données structurées pour IA
    keywords = Column(JSON, nullable=True)  # Mots-clés extraits automatiquement
    skills = Column(JSON, nullable=True)  # Compétences requises
    ai_interview_config = Column(JSON, nullable=True)  # Configuration pour l'entretien IA
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    organization = db.relationship("Organization", backref="job_postings")
    creator = relationship("User")
    interview_schedules = relationship("InterviewSchedule", back_populates="job_posting")
    applications = relationship("JobApplication", back_populates="job_posting", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<JobPosting {self.title}>"
    
    def to_dict(self):
        """Convertit l'objet en dictionnaire pour l'API"""
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'requirements': self.requirements,
            'responsibilities': self.responsibilities,
            'location': self.location,
            'employment_type': self.employment_type,
            'remote_policy': self.remote_policy,
            'salary_range_min': self.salary_range_min,
            'salary_range_max': self.salary_range_max,
            'salary_currency': self.salary_currency,
            'status': self.status,
            'published_at': self.published_at.isoformat() if self.published_at else None,
            'closes_at': self.closes_at.isoformat() if self.closes_at else None,
            'is_featured': self.is_featured,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'organization_name': self.organization.name if self.organization else None,
            'creator_name': self.creator.name if self.creator else None,
            'application_count': len(self.applications) if self.applications else 0
        }


class JobApplication(db.Model):
    __tablename__ = 'job_applications'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_posting_id = Column(String(36), ForeignKey("job_postings.id", ondelete="CASCADE"), nullable=False)
    
    # Informations du candidat
    candidate_name = Column(String(255), nullable=False)
    candidate_email = Column(String(255), nullable=False)
    candidate_phone = Column(String(50), nullable=True)
    resume_url = Column(String(255), nullable=True)
    cover_letter = Column(Text, nullable=True)
    
    # Statut de la candidature
    status = Column(String(50), default="new")  # new, reviewed, interview_scheduled, rejected, hired
    notes = Column(Text, nullable=True)
    
    # Métadonnées
    source = Column(String(50), nullable=True)  # website, email, imported, etc.
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relations
    job_posting = relationship("JobPosting", back_populates="applications")
    interview_schedules = relationship("InterviewSchedule")