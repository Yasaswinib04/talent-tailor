"""
CRED HR - Backend API
Mock-first API for the redesigned HR candidate evaluation platform.
All data is in-memory + persisted to MongoDB for a light experience.
"""
import os
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

load_dotenv()

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="CRED HR API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Models ----------
def now_iso():
    return datetime.now(timezone.utc).isoformat()


class Job(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    department: str
    location: str
    employment_type: str = "Full-time"
    seniority: str = "Mid"
    salary_min: int = 1200000
    salary_max: int = 2400000
    jd: str = ""
    skills: List[dict] = []  # [{name, weight}]
    screening_questions: List[str] = []
    filters: dict = Field(default_factory=dict)  # {min_experience, education, notice_period, must_have_skills, preferred_companies, locations}
    scoring_weights: dict = Field(default_factory=dict)  # {skills, experience, education, notice, cultural_fit} summing ~100
    status: str = "open"
    created_at: str = Field(default_factory=now_iso)
    candidates_count: int = 0
    share_slug: str = Field(default_factory=lambda: uuid.uuid4().hex[:8])


class JobCreate(BaseModel):
    title: str
    department: str
    location: str
    employment_type: Optional[str] = "Full-time"
    seniority: Optional[str] = "Mid"
    salary_min: Optional[int] = 1200000
    salary_max: Optional[int] = 2400000
    jd: Optional[str] = ""
    skills: Optional[List[dict]] = []
    screening_questions: Optional[List[str]] = []
    filters: Optional[dict] = None
    scoring_weights: Optional[dict] = None


class ExtractSkillsRequest(BaseModel):
    jd: str


class Candidate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: str
    current_title: str
    current_company: str
    location: str
    experience_years: float
    expected_ctc: int
    notice_period: str
    skills: List[str] = []
    education: str
    resume_summary: str
    avatar: str = ""
    match_score: int = 0
    stage: str = "New"  # New, Shortlisted, Interview, Offer, Rejected
    role_ids: List[str] = []  # multiple roles!
    tags: List[str] = []
    rating: int = 0
    notes: str = ""
    applied_at: str = Field(default_factory=now_iso)
    auto_applied: bool = False


class CandidateApply(BaseModel):
    name: str
    email: str
    phone: str
    current_title: str
    current_company: str
    experience_years: float
    expected_ctc: int
    resume_text: Optional[str] = ""


class RoleAssignment(BaseModel):
    role_ids: List[str]


class StageUpdate(BaseModel):
    stage: str


# ---------- Seed Data ----------
SEED_JOBS = [
    {
        "title": "Senior Frontend Engineer",
        "department": "Engineering",
        "location": "Bengaluru",
        "seniority": "Senior",
        "salary_min": 3500000,
        "salary_max": 6500000,
        "jd": "We are looking for a Senior Frontend Engineer with deep expertise in React, TypeScript, and modern web performance. You will lead the UI architecture of our flagship consumer product used by millions in India.",
        "skills": [
            {"name": "React", "weight": 5},
            {"name": "TypeScript", "weight": 5},
            {"name": "Next.js", "weight": 4},
            {"name": "Performance Optimization", "weight": 4},
            {"name": "Design Systems", "weight": 3},
        ],
        "screening_questions": [
            "How many years of production React experience do you have?",
            "Have you led design system work? Briefly describe.",
        ],
    },
    {
        "title": "Product Manager - Payments",
        "department": "Product",
        "location": "Bengaluru",
        "seniority": "Senior",
        "salary_min": 4000000,
        "salary_max": 7500000,
        "jd": "Own the roadmap for our UPI & credit card payments experience. Deep collaboration with Engineering, Design, Risk, and Growth. Prior fintech experience is a strong plus.",
        "skills": [
            {"name": "Product Strategy", "weight": 5},
            {"name": "Fintech", "weight": 5},
            {"name": "UPI / Payments", "weight": 4},
            {"name": "SQL", "weight": 3},
            {"name": "A/B Testing", "weight": 3},
        ],
        "screening_questions": [
            "Describe a 0-1 fintech product you shipped.",
        ],
    },
    {
        "title": "Backend Engineer - Platform",
        "department": "Engineering",
        "location": "Bengaluru / Remote",
        "seniority": "Mid",
        "salary_min": 2500000,
        "salary_max": 4500000,
        "jd": "Build the platform APIs & event-driven services that power CRED. Golang, PostgreSQL, Kafka, AWS.",
        "skills": [
            {"name": "Golang", "weight": 5},
            {"name": "PostgreSQL", "weight": 4},
            {"name": "Kafka", "weight": 4},
            {"name": "AWS", "weight": 3},
            {"name": "Distributed Systems", "weight": 4},
        ],
        "screening_questions": [],
    },
    {
        "title": "UX Researcher",
        "department": "Design",
        "location": "Bengaluru",
        "seniority": "Mid",
        "salary_min": 2200000,
        "salary_max": 3800000,
        "jd": "Lead qualitative & quantitative research studies for CRED's consumer experiences. Craft insight narratives that drive product decisions.",
        "skills": [
            {"name": "Qualitative Research", "weight": 5},
            {"name": "Usability Testing", "weight": 5},
            {"name": "Survey Design", "weight": 3},
            {"name": "Figma", "weight": 3},
        ],
        "screening_questions": [],
    },
]

SEED_CANDIDATES_TEMPLATE = [
    ("Rohan Sharma", "rohan.sharma@email.in", "Sr. Frontend Engineer", "Razorpay", "Bengaluru", 6.5, 4200000, "30 days", ["React", "TypeScript", "Next.js", "GraphQL", "Design Systems"], "B.Tech, IIT Bombay", 92, "Shortlisted"),
    ("Priya Desai", "priya.desai@email.in", "Product Manager", "Swiggy", "Bengaluru", 5.0, 5500000, "60 days", ["Product Strategy", "Fintech", "UPI / Payments", "SQL"], "MBA, IIM Ahmedabad", 88, "Interview"),
    ("Anand Iyer", "anand.iyer@email.in", "Backend Lead", "Flipkart", "Bengaluru", 8.0, 5200000, "90 days", ["Golang", "PostgreSQL", "Kafka", "AWS", "Distributed Systems"], "M.Tech, IIT Madras", 95, "Interview"),
    ("Kavita Rangan", "kavita.r@email.in", "UX Researcher", "Zomato", "Bengaluru", 4.0, 3000000, "30 days", ["Qualitative Research", "Usability Testing", "Figma"], "M.Des, IDC IIT Bombay", 85, "Shortlisted"),
    ("Arjun Mehta", "arjun.mehta@email.in", "Frontend Engineer", "PhonePe", "Bengaluru", 4.5, 3200000, "60 days", ["React", "TypeScript", "Redux", "Performance Optimization"], "B.E., BITS Pilani", 81, "New"),
    ("Sneha Iyer", "sneha.iyer@email.in", "Product Manager", "CRED", "Bengaluru", 3.5, 3800000, "Immediate", ["Product Strategy", "A/B Testing", "SQL", "UPI / Payments"], "B.Tech, NIT Trichy", 79, "New"),
    ("Vikram Rao", "vikram.rao@email.in", "Backend Engineer", "Cred", "Remote", 5.5, 3600000, "30 days", ["Golang", "PostgreSQL", "AWS", "Kafka"], "B.Tech, VIT Vellore", 87, "Shortlisted"),
    ("Neha Kapoor", "neha.kapoor@email.in", "Senior Frontend", "Meesho", "Bengaluru", 7.0, 4800000, "60 days", ["React", "TypeScript", "Next.js", "Design Systems"], "B.Tech, IIT Delhi", 90, "Interview"),
    ("Karthik Subramanian", "karthik.s@email.in", "Backend Engineer", "Ola", "Bengaluru", 3.0, 2400000, "Immediate", ["Golang", "PostgreSQL", "Distributed Systems"], "B.Tech, IIT Kanpur", 76, "New"),
    ("Ananya Reddy", "ananya.reddy@email.in", "UX Researcher", "Freshworks", "Bengaluru", 5.5, 3400000, "30 days", ["Qualitative Research", "Usability Testing", "Survey Design"], "M.Sc., Srishti Institute", 89, "Shortlisted"),
    ("Rahul Nair", "rahul.nair@email.in", "Frontend Engineer", "Groww", "Remote", 2.5, 1800000, "Immediate", ["React", "TypeScript", "Redux"], "B.E., PES University", 68, "New"),
    ("Meera Krishnan", "meera.k@email.in", "Product Manager", "Zerodha", "Bengaluru", 6.0, 5000000, "60 days", ["Product Strategy", "Fintech", "SQL", "A/B Testing"], "MBA, ISB Hyderabad", 91, "Offer"),
    ("Aditya Bhatia", "aditya.b@email.in", "Backend Lead", "Paytm", "Noida", 9.0, 5800000, "90 days", ["Golang", "Kafka", "AWS", "Distributed Systems", "PostgreSQL"], "M.Tech, IIT Roorkee", 93, "Offer"),
    ("Divya Menon", "divya.menon@email.in", "Product Designer", "Postman", "Bengaluru", 4.0, 2800000, "30 days", ["Figma", "Design Systems", "Usability Testing"], "B.Des, NID Ahmedabad", 82, "Shortlisted"),
    ("Siddharth Jain", "siddharth.j@email.in", "Senior Frontend", "InMobi", "Bengaluru", 6.5, 4500000, "60 days", ["React", "TypeScript", "Performance Optimization", "GraphQL"], "B.Tech, DTU Delhi", 86, "Interview"),
    ("Pooja Agarwal", "pooja.a@email.in", "UX Researcher", "MakeMyTrip", "Gurgaon", 3.5, 2600000, "Immediate", ["Qualitative Research", "Survey Design"], "M.Des, IIT Guwahati", 74, "New"),
    ("Nikhil Verma", "nikhil.v@email.in", "Product Manager", "Meesho", "Bengaluru", 4.5, 4200000, "30 days", ["Product Strategy", "SQL", "A/B Testing", "Fintech"], "MBA, IIM Bangalore", 83, "Shortlisted"),
    ("Isha Patel", "isha.patel@email.in", "Frontend Engineer", "Rippling", "Remote", 3.0, 2600000, "60 days", ["React", "TypeScript", "Next.js"], "B.Tech, IIIT Hyderabad", 78, "New"),
    ("Rajesh Kumar", "rajesh.k@email.in", "Backend Engineer", "Zerodha", "Bengaluru", 5.0, 3400000, "30 days", ["Golang", "PostgreSQL", "AWS"], "B.Tech, NIT Warangal", 84, "Shortlisted"),
    ("Tanvi Shah", "tanvi.shah@email.in", "Product Designer", "Dunzo", "Bengaluru", 4.5, 3000000, "60 days", ["Figma", "Design Systems", "Usability Testing"], "B.Des, IIT Bombay", 87, "Interview"),
]

AVATAR_POOL = [
    "https://images.unsplash.com/photo-1542190891-2093d38760f2?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1722061666207-b75ca92f8d0f?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1589386417686-0d34b5903d23?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&h=200&fit=crop",
    "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&h=200&fit=crop",
]


# ---------- Seeder ----------
@app.on_event("startup")
async def seed():
    jobs_count = await db.jobs.count_documents({})
    if jobs_count == 0:
        job_docs = []
        for j in SEED_JOBS:
            job = Job(**j)
            job_docs.append(job.model_dump())
        await db.jobs.insert_many(job_docs)
        # candidates
        cand_docs = []
        # map candidates to jobs by role affinity
        role_map = {}
        for jd in job_docs:
            role_map[jd["title"].lower()] = jd["id"]
        for idx, tup in enumerate(SEED_CANDIDATES_TEMPLATE):
            name, email, title, company, loc, exp, ctc, notice, skills, edu, score, stage = tup
            # assign to matching jobs (by skill overlap)
            assigned = []
            for jd in job_docs:
                job_skill_names = [s["name"] for s in jd["skills"]]
                overlap = len(set(skills) & set(job_skill_names))
                if overlap >= 2:
                    assigned.append(jd["id"])
            if not assigned:
                assigned = [job_docs[idx % len(job_docs)]["id"]]
            c = Candidate(
                name=name,
                email=email,
                phone=f"+91 9{80000000 + idx * 137:08d}"[:14],
                current_title=title,
                current_company=company,
                location=loc,
                experience_years=exp,
                expected_ctc=ctc,
                notice_period=notice,
                skills=skills,
                education=edu,
                resume_summary=f"{exp} years of experience at {company} working as {title}. Strong background in {', '.join(skills[:3])}.",
                avatar=AVATAR_POOL[idx % len(AVATAR_POOL)],
                match_score=score,
                stage=stage,
                role_ids=assigned,
                tags=[],
                rating=(score // 20),
            )
            cand_docs.append(c.model_dump())
        await db.candidates.insert_many(cand_docs)
        # update candidate counts on jobs
        for jd in job_docs:
            count = sum(1 for c in cand_docs if jd["id"] in c["role_ids"])
            await db.jobs.update_one({"id": jd["id"]}, {"$set": {"candidates_count": count}})


def strip_mongo(doc):
    if doc and "_id" in doc:
        doc.pop("_id")
    return doc


# ---------- Routes ----------
@app.get("/api/health")
async def health():
    return {"status": "ok", "time": now_iso()}


@app.get("/api/jobs")
async def list_jobs():
    jobs = await db.jobs.find({}).to_list(1000)
    return [strip_mongo(j) for j in jobs]


@app.post("/api/jobs")
async def create_job(payload: JobCreate):
    job = Job(**payload.model_dump())
    await db.jobs.insert_one(job.model_dump())
    return job.model_dump()


@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str):
    job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(404, "Job not found")
    return strip_mongo(job)


@app.get("/api/jobs/share/{slug}")
async def get_job_by_slug(slug: str):
    job = await db.jobs.find_one({"share_slug": slug})
    if not job:
        raise HTTPException(404, "Job not found")
    return strip_mongo(job)


@app.patch("/api/jobs/{job_id}")
async def update_job(job_id: str, payload: dict):
    result = await db.jobs.update_one({"id": job_id}, {"$set": payload})
    if result.matched_count == 0:
        raise HTTPException(404, "Job not found")
    job = await db.jobs.find_one({"id": job_id})
    return strip_mongo(job)


@app.delete("/api/jobs/{job_id}")
async def delete_job(job_id: str):
    await db.jobs.delete_one({"id": job_id})
    return {"ok": True}


# --------- AI Skill Extraction (mocked heuristic) ---------
SKILL_DICTIONARY = {
    "react": "React", "typescript": "TypeScript", "next.js": "Next.js", "nextjs": "Next.js",
    "javascript": "JavaScript", "graphql": "GraphQL", "redux": "Redux", "vue": "Vue.js",
    "angular": "Angular", "node": "Node.js", "python": "Python", "django": "Django",
    "flask": "Flask", "fastapi": "FastAPI", "golang": "Golang", "go": "Golang",
    "java": "Java", "spring": "Spring Boot", "kotlin": "Kotlin", "swift": "Swift",
    "postgres": "PostgreSQL", "postgresql": "PostgreSQL", "mysql": "MySQL", "mongodb": "MongoDB",
    "redis": "Redis", "kafka": "Kafka", "rabbitmq": "RabbitMQ", "aws": "AWS", "gcp": "GCP",
    "azure": "Azure", "docker": "Docker", "kubernetes": "Kubernetes", "terraform": "Terraform",
    "figma": "Figma", "sketch": "Sketch", "design system": "Design Systems", "design systems": "Design Systems",
    "usability": "Usability Testing", "user research": "Qualitative Research", "qualitative": "Qualitative Research",
    "survey": "Survey Design", "a/b test": "A/B Testing", "a/b testing": "A/B Testing",
    "sql": "SQL", "product strategy": "Product Strategy", "roadmap": "Product Strategy",
    "fintech": "Fintech", "upi": "UPI / Payments", "payments": "UPI / Payments",
    "performance": "Performance Optimization", "distributed": "Distributed Systems",
    "machine learning": "Machine Learning", "ml": "Machine Learning", "ai": "AI/ML",
    "data science": "Data Science", "analytics": "Analytics",
}


@app.post("/api/extract-skills")
async def extract_skills(payload: ExtractSkillsRequest):
    text = (payload.jd or "").lower()
    found = {}
    for k, v in SKILL_DICTIONARY.items():
        if k in text:
            found[v] = found.get(v, 0) + 1
    # sort by count desc, then original order
    skills = []
    for name, count in sorted(found.items(), key=lambda x: -x[1]):
        weight = min(5, max(2, 2 + count))
        skills.append({"name": name, "weight": weight})
    # default suggestions if nothing detected
    if not skills:
        skills = [
            {"name": "Communication", "weight": 4},
            {"name": "Problem Solving", "weight": 4},
            {"name": "Collaboration", "weight": 3},
        ]
    # salary suggestion based on seniority keywords
    salary_min = 1500000
    salary_max = 3000000
    if any(k in text for k in ["senior", "lead", "principal", "staff"]):
        salary_min, salary_max = 3500000, 6500000
    elif any(k in text for k in ["junior", "entry", "intern"]):
        salary_min, salary_max = 600000, 1500000

    suggested_questions = []
    if "react" in text or "frontend" in text:
        suggested_questions.append("How many years of production React experience do you have?")
    if "backend" in text or "distributed" in text:
        suggested_questions.append("Describe the largest distributed system you have built.")
    if "product" in text and ("manager" in text or "management" in text):
        suggested_questions.append("Describe a 0→1 product you shipped end-to-end.")
    if not suggested_questions:
        suggested_questions = ["Why are you excited about this role?"]

    # Seniority detection for filter defaults
    is_senior = any(k in text for k in ["senior", "lead", "principal", "staff"])
    is_junior = any(k in text for k in ["junior", "entry", "intern"])
    min_exp = 5 if is_senior else (0 if is_junior else 2)

    # Recommended mandatory filters
    must_have = [s["name"] for s in skills[:3]]
    recommended_filters = {
        "min_experience_years": min_exp,
        "education_preference": "Bachelor's degree or equivalent",
        "notice_period_max_days": 90,
        "must_have_skills": must_have,
        "preferred_companies": [],
        "locations": ["Bengaluru", "Remote"],
        "no_gaps_over_months": 6,
    }

    # Recommended scoring weights (sum to 100)
    if is_senior:
        recommended_weights = {"skills": 45, "experience": 30, "education": 5, "notice": 10, "cultural_fit": 10}
    elif is_junior:
        recommended_weights = {"skills": 35, "experience": 15, "education": 25, "notice": 10, "cultural_fit": 15}
    else:
        recommended_weights = {"skills": 40, "experience": 25, "education": 15, "notice": 10, "cultural_fit": 10}

    return {
        "skills": skills,
        "salary_suggestion": {"min": salary_min, "max": salary_max},
        "screening_questions": suggested_questions,
        "recommended_filters": recommended_filters,
        "recommended_weights": recommended_weights,
    }


# ---------- Candidates ----------
@app.get("/api/candidates")
async def list_candidates(job_id: Optional[str] = None, stage: Optional[str] = None, q: Optional[str] = None):
    query = {}
    if job_id:
        query["role_ids"] = job_id
    if stage:
        query["stage"] = stage
    cands = await db.candidates.find(query).sort("match_score", -1).to_list(1000)
    result = [strip_mongo(c) for c in cands]
    if q:
        ql = q.lower()
        result = [c for c in result if ql in c["name"].lower() or ql in c["current_company"].lower() or any(ql in s.lower() for s in c["skills"])]
    return result


@app.get("/api/candidates/{cid}")
async def get_candidate(cid: str):
    c = await db.candidates.find_one({"id": cid})
    if not c:
        raise HTTPException(404, "Candidate not found")
    return strip_mongo(c)


@app.patch("/api/candidates/{cid}")
async def update_candidate(cid: str, payload: dict):
    result = await db.candidates.update_one({"id": cid}, {"$set": payload})
    if result.matched_count == 0:
        raise HTTPException(404, "Candidate not found")
    c = await db.candidates.find_one({"id": cid})
    # update job candidate counts if role_ids changed
    if "role_ids" in payload:
        jobs = await db.jobs.find({}).to_list(1000)
        for j in jobs:
            count = await db.candidates.count_documents({"role_ids": j["id"]})
            await db.jobs.update_one({"id": j["id"]}, {"$set": {"candidates_count": count}})
    return strip_mongo(c)


@app.post("/api/candidates/{cid}/assign-roles")
async def assign_roles(cid: str, payload: RoleAssignment):
    result = await db.candidates.update_one({"id": cid}, {"$set": {"role_ids": payload.role_ids}})
    if result.matched_count == 0:
        raise HTTPException(404, "Candidate not found")
    jobs = await db.jobs.find({}).to_list(1000)
    for j in jobs:
        count = await db.candidates.count_documents({"role_ids": j["id"]})
        await db.jobs.update_one({"id": j["id"]}, {"$set": {"candidates_count": count}})
    c = await db.candidates.find_one({"id": cid})
    return strip_mongo(c)


@app.post("/api/candidates/{cid}/stage")
async def set_stage(cid: str, payload: StageUpdate):
    result = await db.candidates.update_one({"id": cid}, {"$set": {"stage": payload.stage}})
    if result.matched_count == 0:
        raise HTTPException(404, "Candidate not found")
    c = await db.candidates.find_one({"id": cid})
    return strip_mongo(c)


# ---------- Public Apply (auto-apply from shareable link) ----------
@app.post("/api/apply/{slug}")
async def apply_to_job(slug: str, payload: CandidateApply):
    job = await db.jobs.find_one({"share_slug": slug})
    if not job:
        raise HTTPException(404, "Job not found")
    # mock: derive skills from resume_text using dictionary
    text = ((payload.resume_text or "") + " " + payload.current_title).lower()
    matched_skills = set()
    for k, v in SKILL_DICTIONARY.items():
        if k in text:
            matched_skills.add(v)
    # score against job skills
    job_skill_names = [s["name"] for s in job.get("skills", [])]
    if job_skill_names:
        overlap = len(matched_skills & set(job_skill_names))
        score = min(100, 40 + int(overlap / max(1, len(job_skill_names)) * 60))
    else:
        score = 60
    c = Candidate(
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        current_title=payload.current_title,
        current_company=payload.current_company,
        location="—",
        experience_years=payload.experience_years,
        expected_ctc=payload.expected_ctc,
        notice_period="—",
        skills=list(matched_skills) if matched_skills else ["General"],
        education="—",
        resume_summary=(payload.resume_text or "")[:400] or f"{payload.current_title} at {payload.current_company}",
        avatar=AVATAR_POOL[hash(payload.email) % len(AVATAR_POOL)],
        match_score=score,
        stage="New",
        role_ids=[job["id"]],
        auto_applied=True,
    )
    await db.candidates.insert_one(c.model_dump())
    await db.jobs.update_one({"id": job["id"]}, {"$inc": {"candidates_count": 1}})
    return {"ok": True, "candidate_id": c.id, "match_score": score}


# ---------- Analytics ----------
@app.get("/api/analytics/summary")
async def analytics_summary():
    total_jobs = await db.jobs.count_documents({})
    total_candidates = await db.candidates.count_documents({})
    stages = ["New", "Shortlisted", "Interview", "Offer", "Rejected"]
    funnel = {}
    for s in stages:
        funnel[s] = await db.candidates.count_documents({"stage": s})
    return {
        "total_jobs": total_jobs,
        "total_candidates": total_candidates,
        "funnel": funnel,
        "avg_time_to_shortlist_days": 2.4,
        "auto_apply_conversion": 0.68,
    }
