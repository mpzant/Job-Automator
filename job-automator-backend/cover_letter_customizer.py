import os
import tempfile
import logging
import re
from datetime import datetime
from io import BytesIO
import time

# Updated PyMuPDF import to handle both older and newer versions
try:
    import fitz  # PyMuPDF
except ImportError:
    from pymupdf import fitz  # Newer versions may use this import

# For PDF generation (reportlab is more Windows-friendly than pypandoc)
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.lib.units import inch

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def extract_text_from_pdf(pdf_file):
    """
    Extract text from a PDF BytesIO object
    Args:
        pdf_file: BytesIO object containing PDF data
    Returns:
        str: Extracted text
    """
    temp_file = None
    try:
        # Create a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
            tmp.write(pdf_file.getvalue())
            temp_file = tmp.name
        
        # Open and extract text with context manager to ensure proper closing
        text = ""
        with fitz.open(temp_file) as doc:
            for page in doc:
                text += page.get_text()
        
        return text
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {e}")
        return None
    finally:
        # Clean up temporary file in finally block
        if temp_file and os.path.exists(temp_file):
            try:
                # Give Windows a moment to release the file
                time.sleep(0.5)
                os.unlink(temp_file)
            except Exception as e:
                logger.warning(f"Could not delete temporary file {temp_file}: {e}")

def modify_cover_letter(cover_letter_text, job_details):
    """
    Modify cover letter text based on job details
    Args:
        cover_letter_text (str): Base cover letter text
        job_details (dict): Job details for customization
    Returns:
        str: Customized cover letter text
    """
    try:
        # Create a copy of the text to modify
        modified_text = cover_letter_text
        
        # Replace date with current date
        current_date = job_details.get('current_date', datetime.now().strftime('%B %d, %Y'))
        date_pattern = r'(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}'
        modified_text = re.sub(date_pattern, current_date, modified_text, flags=re.I)
        
        # Replace company name
        company_name = job_details.get('firm_name', job_details.get('company', ''))
        if company_name:
            modified_text = modified_text.replace('Simon-Kucher', company_name)
            modified_text = modified_text.replace('Simon Kucher', company_name)
        
        # Replace role in Re: line
        target_role = job_details.get('target_role', job_details.get('title', ''))
        if target_role:
            modified_text = re.sub(r'Re:.*?Position', f"Re: {target_role} Position", modified_text, flags=re.I)
        
        # Replace Consultant with target role in first paragraph
        if target_role:
            first_para_pattern = r'As a current Masters.*?Yale School of Management'
            first_para_match = re.search(first_para_pattern, modified_text, re.DOTALL | re.I)
            if first_para_match:
                first_para = first_para_match.group(0)
                updated_first_para = re.sub(r'Consultant', target_role, first_para, flags=re.I)
                modified_text = modified_text.replace(first_para, updated_first_para)
        
        # Handle people spoken to paragraph
        people_spoken_to = job_details.get('people_spoken_to', '')
        engaging_para_pattern = r'From engaging discussions.*?industry\.'
        engaging_para_match = re.search(engaging_para_pattern, modified_text, re.DOTALL | re.I)
        
        if engaging_para_match and people_spoken_to:
            new_engaging_para = f"From engaging discussions with {people_spoken_to}, I have gained valuable insights into {company_name}'s collaborative culture and innovative approach. I am particularly impressed by the company's commitment to creativity and its reputation for excellence in the industry."
            modified_text = modified_text.replace(engaging_para_match.group(0), new_engaging_para)
        elif engaging_para_match and not people_spoken_to:
            new_engaging_para = f"I am particularly impressed by {company_name}'s innovative culture and its reputation for excellence in the industry. The company's commitment to creativity and customer-centric solutions aligns perfectly with my professional values."
            modified_text = modified_text.replace(engaging_para_match.group(0), new_engaging_para)
        
        return modified_text
    
    except Exception as e:
        logger.error(f"Error modifying cover letter: {e}")
        return cover_letter_text

def create_cover_letter_pdf(text, output_path):
    """
    Create a PDF cover letter from text using ReportLab
    Args:
        text (str): Cover letter text
        output_path (str): Path to save the PDF
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Setup document
        doc = SimpleDocTemplate(
            output_path,
            pagesize=letter,
            rightMargin=1*inch,
            leftMargin=1*inch,
            topMargin=1*inch,
            bottomMargin=1*inch
        )
        
        # Styles
        styles = getSampleStyleSheet()
        styles.add(ParagraphStyle(
            name='Heading',
            fontSize=12,
            alignment=TA_CENTER,
            spaceAfter=12
        ))
        styles.add(ParagraphStyle(
            name='Normal',
            fontSize=12,
            alignment=TA_LEFT,
            spaceAfter=12,
            leading=14
        ))
        styles.add(ParagraphStyle(
            name='Signature',
            fontSize=12,
            alignment=TA_LEFT,
            spaceAfter=12
        ))
        
        # Split text into paragraphs
        paragraphs = []
        current_para = []
        
        for line in text.split('\n'):
            if line.strip():
                current_para.append(line)
            else:
                if current_para:
                    paragraphs.append(' '.join(current_para))
                    current_para = []
        
        # Don't forget the last paragraph
        if current_para:
            paragraphs.append(' '.join(current_para))
        
        # Create document content
        content = []
        
        for para in paragraphs:
            if para.strip():
                # If paragraph looks like a date (top of letter)
                if re.match(r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}', para):
                    content.append(Paragraph(para, styles['Normal']))
                # If paragraph looks like a header (all caps or ends with colon)
                elif para.isupper() or para.strip().endswith(':'):
                    content.append(Paragraph(para, styles['Heading']))
                # If paragraph looks like the signature
                elif 'Sincerely' in para:
                    content.append(Paragraph(para, styles['Signature']))
                # Otherwise, regular paragraph
                else:
                    content.append(Paragraph(para, styles['Normal']))
                
                content.append(Spacer(1, 0.2*inch))
        
        # Build document
        doc.build(content)
        
        return True
    except Exception as e:
        logger.error(f"Error creating PDF: {e}")
        return False

def generate_custom_cover_letter(cover_letter_file, job_details):
    """
    Generate a customized cover letter for a job application
    Args:
        cover_letter_file: Path or BytesIO object containing the base cover letter PDF
        job_details (dict): Details about the job and company
    Returns:
        str: Path to the generated cover letter PDF
    """
    temp_dir = None
    output_path = None
    
    try:
        # If cover_letter_file is a string (path), open the file
        if isinstance(cover_letter_file, str):
            with open(cover_letter_file, 'rb') as f:
                pdf_data = f.read()
            cover_letter_file_obj = BytesIO(pdf_data)
        else:
            cover_letter_file_obj = cover_letter_file
        
        # Extract text from the PDF
        cover_letter_text = extract_text_from_pdf(cover_letter_file_obj)
        if not cover_letter_text:
            default_cover_letter = """
May 15, 2025

Hiring Manager
Company Name
123 Main Street
New York, NY 10001

Re: Position Title

Dear Hiring Manager,

As a current Masters student at Yale School of Management, I am excited to apply for the Position Title at Company Name. My background in business strategy and data analysis combined with my passion for solving complex problems makes me an excellent candidate for this role.

Prior to pursuing an MBA, I worked as a Business Analyst at XYZ Corporation where I led several high-impact projects that increased operational efficiency by 25%. My experience in quantitative analysis and strategic planning would bolster Company Name's project teams.

I am particularly impressed by Company Name's innovative culture and its reputation for excellence in the industry. The company's commitment to creativity and customer-centric solutions aligns perfectly with my professional values.

Thank you for your time and consideration. I look forward to the opportunity to discuss how my skills and experiences align with Company Name's needs.

Sincerely,
Maxwell Prizant
"""
            cover_letter_text = default_cover_letter
        
        # Modify text
        customized_text = modify_cover_letter(cover_letter_text, job_details)
        
        # Create output filename
        candidate_name = job_details.get('candidate_name', 'Maxwell Prizant')
        firm_name = job_details.get('firm_name', job_details.get('company', 'Company'))
        sanitized_firm_name = re.sub(r'[^\w\s-]', '', firm_name).strip().replace(' ', '_')
        output_filename = f"{candidate_name}_Cover_Letter_{sanitized_firm_name}.pdf"
        
        # Create temporary directory for output
        temp_dir = tempfile.mkdtemp()
        output_path = os.path.join(temp_dir, output_filename)
        
        # Convert to PDF using reportlab
        if not create_cover_letter_pdf(customized_text, output_path):
            raise ValueError("Failed to convert text to PDF")
        
        return output_path
    
    except Exception as e:
        logger.error(f"Error generating custom cover letter: {e}")
        return None 