// =============================================
// RESUME DATA TYPES
// =============================================

export interface PersonalInfo {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
  profilePicture?: string;
  photoShape?: 'circle' | 'rounded' | 'square';
}

export interface WorkExperience {
  id: string;
  company: string;
  title: string;
  startDate: string;
  endDate: string;
  location: string;
  remote: boolean;
  description: string;
}

export interface Education {
  id: string;
  degree: string;
  institution: string;
  fieldOfStudy: string;
  gpa?: string;
  graduationYear: string;
  honors?: string;
  startYear?: string;
}

export interface Skill {
  id: string;
  name: string;
  category: 'Technical' | 'Soft' | 'Tools' | 'Languages';
}

export interface Project {
  id: string;
  title: string;
  techStack: string[];
  liveUrl?: string;
  githubUrl?: string;
  description: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  credentialUrl?: string;
  expiryDate?: string;
}

export interface Award {
  id: string;
  title: string;
  issuer: string;
  date: string;
  description?: string;
}

export interface Volunteer {
  id: string;
  organization: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface Publication {
  id: string;
  title: string;
  journal: string;
  date: string;
  doiUrl?: string;
}

export interface Language {
  id: string;
  language: string;
  proficiency: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'Native';
}

export interface Reference {
  id: string;
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
}

export interface CustomSection {
  id: string;
  title: string;
  content: string;
}

export interface ResumeData {
  personalInfo: PersonalInfo;
  summary: string;
  experience: WorkExperience[];
  education: Education[];
  skills: Skill[];
  projects: Project[];
  certifications: Certification[];
  awards: Award[];
  volunteer: Volunteer[];
  publications: Publication[];
  languages: Language[];
  references: Reference[];
  referencesOnRequest: boolean;
  customSections: CustomSection[];
}

// =============================================
// STYLE / TEMPLATE TYPES
// =============================================

export type TemplateId =
  | 'classic'
  | 'modern'
  | 'creative'
  | 'minimal'
  | 'executive'
  | 'tech'
  | 'academic'
  | 'infographic'
  | 'two-column'
  | 'ats-safe';

export type SectionId =
  | 'personalInfo'
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'awards'
  | 'volunteer'
  | 'publications'
  | 'languages'
  | 'references';

export interface StyleConfig {
  template: TemplateId;
  accentColor: string;
  headingFont: string;
  bodyFont: string;
  fontSize: 'small' | 'medium' | 'large';
  spacing: 'compact' | 'standard' | 'spacious';
}

// =============================================
// RESUME DOCUMENT TYPES
// =============================================

export interface ResumeDocument {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  data: ResumeData;
  style: StyleConfig;
  sectionOrder: SectionId[];
  hiddenSections: SectionId[];
}

export interface VersionSnapshot {
  id: string;
  resumeId: string;
  timestamp: string;
  label?: string;
  data: ResumeData;
  style: StyleConfig;
}

// =============================================
// AI TYPES
// =============================================

export interface AIResponse {
  content: string;
  loading: boolean;
  error?: string;
}

export type AITone = 'formal' | 'conversational' | 'confident';
