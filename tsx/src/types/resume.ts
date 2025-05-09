export interface Education {
  degree: string;
  institution: string;
  year: string;
}

export interface Experience {
  position: string;
  company: string;
  duration: string;
  description?: string;
}

export interface CandidateProfile {
  strengths: string[];
  gaps: string[];
  education: Education[];
  technical_skills: string[];
  soft_skills: string[];
  match_score: number;
  recommended_focus_areas: string[];
}

export interface ResumeAnalysis {
  resume_analysis: {
    resume_summary?: string;
    technical_skills?: string[];
    soft_skills?: string[];
    education?: Education[];
    relevant_experience?: Experience[];
    strengths?: string[];
    gaps?: string[];
  };
  job_match: {
    match_score: number;
    matching_skills: string[];
    missing_skills: string[];
    relevant_experience?: string[];
  };
  candidate_profile: CandidateProfile;
}