# System Architecture

Talent Tailor is a monolithic React + Express application designed for stateless, serverless-friendly deployment (e.g., Railway, Render) utilizing Supabase for persistent data and storage.

## Tech Stack
- **Frontend:** React 19, Vite, Tailwind CSS v4, Motion (Framer), Lucide Icons, Shadcn UI components.
- **Backend:** Node.js (Express), `tsx` for TypeScript execution.
- **Database:** Supabase PostgreSQL (via `postgres` npm driver).
- **Storage:** Supabase Storage (for Resume PDFs).
- **AI Engine:** Google Gemini 2.0 Flash (`@google/genai`).

## Architectural Diagram

```mermaid
graph TD
    Client[Web Browser] -->|HTTP/REST| API[Express Server]
    
    subgraph Backend [Node.js Environment]
        API --> Routes[API Routes]
        Routes --> SessionsRouter[sessions.ts]
        Routes --> UploadRouter[upload.ts]
        
        SessionsRouter --> Pipeline[ai/pipeline.ts]
        
        subgraph Intelligence Engine [Mixture of Experts]
            Pipeline --> Classifier[classifier.ts]
            Pipeline --> Extractor[extractor.ts]
            Pipeline --> Scorer[scorer.ts]
            Pipeline --> Interrogator[questions.ts]
        end
    end
    
    subgraph Supabase Cloud
        API -->|SQL Queries| DB[(PostgreSQL)]
        DB -.-> Table1[screening_sessions]
        DB -.-> Table2[pipeline_logs]
        API -->|Upload/Download| Blob[Supabase Storage bucket: resumes]
    end
    
    Intelligence Engine -->|gRPC/REST| Gemini[Gemini API]
```

## Key Design Decisions
1. **Statelessness:** The backend does not store any files on the local disk. `multer` uses memory buffering, which is streamed directly to Supabase Storage.
2. **Rate Limiting:** The AI pipeline utilizes `p-queue` (concurrency: 5) to aggressively prevent Gemini `429 Too Many Requests` limits during bulk candidate uploads.
3. **Pervasive Logging:** Every AI execution is logged to the `pipeline_logs` PostgreSQL table, capturing millisecond latencies and potential API failures for internal HR audits.
