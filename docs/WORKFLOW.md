# Talent Tailor HR Screening Workflow

This document outlines the step-by-step user journey and system interactions during a resume screening session.

## High-Level Process Flow

```mermaid
flowchart TD
    A[HR User Logs In] --> B[Creates New Screening Session]
    B --> C[Configures Job Profile & Hiring Preferences]
    C --> D[Uploads Candidate Resumes (PDF)]
    D --> E[Triggers AI Analysis Pipeline]
    
    E --> F{AI Pipeline Execution}
    F --> G[Extract Baseline Profiles]
    F --> H[Score Candidates]
    F --> I[Generate Interview Questions]
    
    G --> J[Database Checkpoint]
    H --> J
    I --> J
    
    J --> K[HR Reviews Candidate Dashboard]
    K --> L[Selects Top Candidates]
    L --> M[Proceeds to Interview Stage]
```

## AI Pipeline Orchestration (Sequence Diagram)

```mermaid
sequenceDiagram
    participant UI as HR Frontend (Vite)
    participant API as Express Server
    participant DB as Supabase PostgreSQL
    participant Storage as Supabase Storage
    participant AI as Gemini 2.0 Flash
    
    UI->>API: POST /api/hr/sessions/upload
    API->>Storage: Store Resumes
    Storage-->>API: File URLs
    API->>DB: Update Session with File URLs
    UI->>API: POST /api/hr/sessions/:id/analyze
    API->>DB: Update Status = 'analyzing'
    
    API->>AI: classifyTrack(JD)
    AI-->>API: Returns { track: 'IC' | 'Manager' }
    
    par Candidate Processing (Throttled via p-queue)
        API->>AI: extractProfile(Resume)
        API->>AI: scoreCandidate(Resume, JD, Track)
        
        AI-->>API: Profile Data & Gaps
        
        opt Candidate Meets Mandatory Criteria & Score >= 5.0
            API->>AI: generateQuestions(Gaps)
            AI-->>API: Discovery Questions
        end
        
        API->>DB: logPipelineEvent (Latency & Status)
    end
    
    API->>DB: Update Session with Final Analysis JSONB
    API-->>UI: 200 OK (Analysis Complete)
    UI->>API: GET /api/hr/sessions/:id (Polling)
    API-->>UI: Render Dashboard Data
```
