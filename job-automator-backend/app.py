from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
from werkzeug.utils import secure_filename
import tempfile

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests

# Create upload folder if it doesn't exist
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Mock job data
JOBS = [
    {
        "id": "1",
        "title": "2025 MBA Intern - Product Marketing",
        "company": "Adobe Systems Incorporated",
        "location": "San Jose, CA",
        "type": "Internship",
        "posted": "7 months ago",
        "requiresCoverLetter": False,
        "relevanceScore": 95
    },
    {
        "id": "2",
        "title": "Decision Analytics Consultant",
        "company": "ZS Associates, Inc.",
        "location": "Seattle, WA",
        "type": "Job",
        "posted": "16 hours ago",
        "requiresCoverLetter": False,
        "relevanceScore": 88
    },
    {
        "id": "3",
        "title": "Consultant, Americas Division",
        "company": "Simon-Kucher & Partners",
        "location": "Multiple Locations",
        "type": "Job",
        "posted": "2 months ago",
        "requiresCoverLetter": True,
        "relevanceScore": 90
    },
    {
        "id": "4",
        "title": "Director & Senior Associates",
        "company": "Emergis Global Capital Advisors",
        "location": "Multiple Locations",
        "type": "Job",
        "posted": "2 days ago",
        "requiresCoverLetter": True,
        "relevanceScore": 85
    },
    {
        "id": "5",
        "title": "Product Manager",
        "company": "Microsoft",
        "location": "Redmond, WA",
        "type": "Job",
        "posted": "3 days ago",
        "requiresCoverLetter": True,
        "relevanceScore": 82
    },
    {
        "id": "6",
        "title": "Strategy Consultant",
        "company": "McKinsey & Company",
        "location": "New York, NY",
        "type": "Job",
        "posted": "1 week ago",
        "requiresCoverLetter": True,
        "relevanceScore": 91
    },
    {
        "id": "7",
        "title": "Business Analyst",
        "company": "Amazon",
        "location": "Seattle, WA",
        "type": "Job",
        "posted": "2 weeks ago",
        "requiresCoverLetter": False,
        "relevanceScore": 87
    },
    {
        "id": "8",
        "title": "Summer Associate",
        "company": "Goldman Sachs",
        "location": "New York, NY",
        "type": "Internship",
        "posted": "1 month ago",
        "requiresCoverLetter": True,
        "relevanceScore": 83
    }
]

@app.route('/api/login', methods=['POST'])
def login():
    # Mock login - in a real app, you would verify 12twenty credentials
    credentials = request.json
    return jsonify({"success": True, "message": "Login successful"})

@app.route('/api/upload', methods=['POST'])
def upload_files():
    if 'resume' not in request.files:
        return jsonify({"success": False, "message": "No resume file found"}), 400
    
    resume = request.files['resume']
    resume_path = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(resume.filename))
    resume.save(resume_path)
    
    # Cover letter is optional
    cover_letter_path = None
    if 'coverLetter' in request.files:
        cover_letter = request.files['coverLetter']
        if cover_letter.filename:
            cover_letter_path = os.path.join(app.config['UPLOAD_FOLDER'], 
                                            secure_filename(cover_letter.filename))
            cover_letter.save(cover_letter_path)
    
    return jsonify({
        "success": True,
        "message": "Files uploaded successfully",
        "resumePath": resume_path,
        "coverLetterPath": cover_letter_path
    })

@app.route('/api/jobs', methods=['GET'])
def get_jobs():
    # Filter out applied and rejected jobs if provided
    applied_jobs = request.args.get('appliedJobs', '').split(',')
    rejected_jobs = request.args.get('rejectedJobs', '').split(',')
    count = int(request.args.get('count', 5))
    
    # Filter jobs
    filtered_jobs = [job for job in JOBS if 
                    job['id'] not in applied_jobs and 
                    job['id'] not in rejected_jobs]
    
    # Sort by relevance score and limit to requested count
    sorted_jobs = sorted(filtered_jobs, key=lambda x: x['relevanceScore'], reverse=True)
    result_jobs = sorted_jobs[:count]
    
    return jsonify({"success": True, "jobs": result_jobs})

@app.route('/api/cover-letter', methods=['POST'])
def customize_cover_letter():
    # Mock cover letter customization
    # In a real app, you would call your cover letter customization logic here
    data = request.json
    job_details = data.get('jobDetails', {})
    
    return jsonify({
        "success": True,
        "message": f"Cover letter customized for {job_details.get('company', 'the company')}",
        "coverLetterPath": f"custom_cover_letter_{job_details.get('id', 'job')}.pdf"
    })

@app.route('/api/apply', methods=['POST'])
def apply_to_job():
    # Mock application submission
    data = request.json
    job_id = data.get('jobId')
    
    return jsonify({
        "success": True,
        "message": f"Successfully applied to job {job_id}",
        "applicationDate": "2025-05-15T12:00:00Z"
    })

if __name__ == '__main__':
    app.run(debug=True) 