"""
Resume parsing and processing for OutreachX
Extracts structured data from resume documents
"""

import re
import json
import os
from typing import Optional, Dict, List, Any
from pydantic import BaseModel

# Optional imports with fallback
try:
    import PyPDF2
except ImportError:
    PyPDF2 = None

try:
    import pytesseract
except ImportError:
    pytesseract = None

try:
    from pdf2image import convert_from_path
except ImportError:
    convert_from_path = None

from docx import Document
from io import BytesIO


class ResumeData(BaseModel):
    """Structured resume data"""
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    skills: List[str] = []
    experience: List[Dict[str, Any]] = []
    education: List[Dict[str, Any]] = []
    projects: List[Dict[str, Any]] = []
    certifications: List[Dict[str, Any]] = []
    social_media_links: Dict[str, str] = {}
    objective: Optional[str] = None
    summary: Optional[str] = None


class ResumeParser:
    """Parse and extract data from resume documents"""
    
    # Regex patterns
    EMAIL_PATTERN = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    PHONE_PATTERN = r'\+?1?\d{9,15}'
    LINKEDIN_PATTERN = r'linkedin\.com/in/[\w-]+'
    GITHUB_PATTERN = r'github\.com/[\w-]+'
    
    @staticmethod
    def extract_text_from_pdf(file_path: str) -> str:
        """Extract text from PDF using PyPDF2 and OCR fallback"""
        try:
            if PyPDF2 is None:
                print("Warning: PyPDF2 not installed. Install python-docx and related packages for resume parsing.")
                return ""
            
            text = ""
            
            # Try PyPDF2 first
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    text += page.extract_text()
            
            # If minimal text extracted, use OCR
            if len(text.strip()) < 100 and convert_from_path and pytesseract:
                try:
                    images = convert_from_path(file_path)
                    for image in images:
                        text += pytesseract.image_to_string(image)
                except Exception as ocr_error:
                    print(f"OCR failed (pdf2image/pytesseract not available): {str(ocr_error)}")
            
            return text
            
        except Exception as e:
            print(f"Error extracting PDF: {str(e)}")
            return ""
    
    @staticmethod
    def extract_text_from_docx(file_path: str) -> str:
        """Extract text from DOCX"""
        try:
            doc = Document(file_path)
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            return text
        except Exception as e:
            print(f"Error extracting DOCX: {str(e)}")
            return ""
    
    @staticmethod
    def extract_contact_info(text: str) -> Dict[str, Any]:
        """Extract contact information"""
        contact = {}
        
        # Email
        email_match = re.search(ResumeParser.EMAIL_PATTERN, text)
        if email_match:
            contact['email'] = email_match.group()
        
        # Phone
        phone_match = re.search(ResumeParser.PHONE_PATTERN, text)
        if phone_match:
            contact['phone'] = phone_match.group()
        
        # LinkedIn
        linkedin_match = re.search(ResumeParser.LINKEDIN_PATTERN, text)
        if linkedin_match:
            contact['linkedin'] = linkedin_match.group()
        
        # GitHub
        github_match = re.search(ResumeParser.GITHUB_PATTERN, text)
        if github_match:
            contact['github'] = github_match.group()
        
        return contact
    
    @staticmethod
    def extract_skills(text: str) -> List[str]:
        """Extract skills from resume"""
        # Common tech skills and keywords
        skill_keywords = [
            'Python', 'JavaScript', 'Java', 'C++', 'C#', 'Go', 'Rust', 'Ruby',
            'React', 'Angular', 'Vue', 'Node.js', 'Django', 'Flask', 'FastAPI',
            'SQL', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Docker', 'Kubernetes',
            'AWS', 'Azure', 'GCP', 'Git', 'Linux', 'Windows', 'MacOS',
            'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch',
            'Data Science', 'Analytics', 'Tableau', 'Power BI',
            'REST API', 'GraphQL', 'Microservices', 'Agile', 'JIRA'
        ]
        
        found_skills = []
        for skill in skill_keywords:
            if re.search(r'\b' + re.escape(skill) + r'\b', text, re.IGNORECASE):
                found_skills.append(skill)
        
        return found_skills
    
    @staticmethod
    def extract_experience(text: str) -> List[Dict[str, Any]]:
        """Extract work experience"""
        experience = []
        
        # Pattern to match experience sections
        lines = text.split('\n')
        
        # Simple heuristic: look for job titles and companies
        # This is simplified - in production, use NLP models
        job_keywords = [
            'engineer', 'developer', 'manager', 'analyst', 'architect',
            'lead', 'senior', 'junior', 'intern', 'specialist'
        ]
        
        for i, line in enumerate(lines):
            if any(keyword in line.lower() for keyword in job_keywords):
                experience.append({
                    "title": line.strip(),
                    "company": lines[i+1].strip() if i+1 < len(lines) else "",
                    "duration": "",
                    "description": ""
                })
        
        return experience[:5]  # Return top 5
    
    @staticmethod
    def extract_education(text: str) -> List[Dict[str, Any]]:
        """Extract education information"""
        education = []
        
        # Common degree types
        degree_keywords = ['B.S.', 'B.A.', 'M.S.', 'M.A.', 'Ph.D.', 'MBA', 'Bachelor', 'Master']
        
        lines = text.split('\n')
        for i, line in enumerate(lines):
            if any(keyword in line for keyword in degree_keywords):
                education.append({
                    "degree": line.strip(),
                    "school": lines[i+1].strip() if i+1 < len(lines) else "",
                    "graduation_year": ""
                })
        
        return education
    
    @staticmethod
    def parse_resume(file_content: bytes, filename: str) -> ResumeData:
        """Parse resume from file content"""
        try:
            # Save temporarily
            temp_path = f"/tmp/{filename}"
            with open(temp_path, 'wb') as f:
                f.write(file_content)
            
            # Extract text based on file type
            if filename.lower().endswith('.pdf'):
                text = ResumeParser.extract_text_from_pdf(temp_path)
            elif filename.lower().endswith(('.docx', '.doc')):
                text = ResumeParser.extract_text_from_docx(temp_path)
            else:
                text = file_content.decode('utf-8', errors='ignore')
            
            # Extract components
            contact = ResumeParser.extract_contact_info(text)
            skills = ResumeParser.extract_skills(text)
            experience = ResumeParser.extract_experience(text)
            education = ResumeParser.extract_education(text)
            
            # Get first line as name (heuristic)
            first_line = text.split('\n')[0].strip()
            
            resume_data = ResumeData(
                full_name=contact.get('name', first_line),
                email=contact.get('email'),
                phone=contact.get('phone'),
                skills=skills,
                experience=experience,
                education=education,
                social_media_links={
                    'linkedin': contact.get('linkedin', ''),
                    'github': contact.get('github', '')
                },
                summary=text[:500]  # First 500 chars as summary
            )
            
            # Clean up
            if os.path.exists(temp_path):
                os.remove(temp_path)
            
            return resume_data
            
        except Exception as e:
            print(f"Error parsing resume: {str(e)}")
            return ResumeData(summary=str(e))
    
    @staticmethod
    def extract_urls(text: str) -> List[str]:
        """Extract URLs from resume"""
        url_pattern = r'https?://[^\s]+'
        urls = re.findall(url_pattern, text)
        return urls
