"""Skill taxonomy, extraction and equivalence.

Replaces a 56-entry dict that was substring-matched against lowercased text.
That approach failed badly and silently:

    "HTML"          -> Machine Learning   ("ml" inside HT-ML-)
    "JavaScript"    -> Java               ("java" is a prefix of it)
    "maintain"      -> AI/ML              ("ai" inside m-ai-ntain)
    "you will go"   -> Golang             ("go" as a plain English verb)

Those phantom skills flowed into a role's must_have_skills and scored real
candidates against requirements the job never had.

Two rules fix the matching:
  * match on token boundaries, not substrings
  * try longer aliases first, so "machine learning" wins over "ml"

The taxonomy also carries a `group`, which gives equivalence for free: two
skills in the same group do broadly the same job, so a recruiter asking for
React can be shown Vue and Angular as near-equivalents. `related` covers
adjacency across groups (React is commonly paired with TypeScript).
"""
import bisect
import re
from typing import Dict, List, Optional

# name -> (aliases, group, related)
# Aliases are matched case-insensitively on token boundaries. Keep them
# unambiguous: an alias that is also an ordinary English word (go, ai, ml)
# belongs in AMBIGUOUS_ALIASES below instead.
_T = {
    # ---- Frontend ----
    "React":        (["react", "react.js", "reactjs"], "frontend-framework", ["TypeScript", "Next.js", "Redux"]),
    "Vue.js":       (["vue", "vue.js", "vuejs", "nuxt"], "frontend-framework", ["TypeScript"]),
    "Angular":      (["angular", "angularjs"], "frontend-framework", ["TypeScript", "RxJS"]),
    "Svelte":       (["svelte", "sveltekit"], "frontend-framework", ["TypeScript"]),
    "Next.js":      (["next.js", "nextjs"], "meta-framework", ["React"]),
    "Remix":        (["remix"], "meta-framework", ["React"]),
    "TypeScript":   (["typescript", "ts"], "language-web", ["JavaScript"]),
    "JavaScript":   (["javascript", "ecmascript", "es6", "vanilla js"], "language-web", ["TypeScript"]),
    "HTML":         (["html", "html5", "semantic html"], "markup", ["CSS", "Accessibility"]),
    "CSS":          (["css", "css3"], "styling", ["Tailwind CSS", "Sass"]),
    "Tailwind CSS": (["tailwind", "tailwind css", "tailwindcss"], "styling", ["CSS"]),
    "Sass":         (["sass", "scss"], "styling", ["CSS"]),
    "Redux":        (["redux", "redux toolkit"], "state-management", ["React"]),
    "RxJS":         (["rxjs"], "state-management", ["Angular"]),
    "Accessibility": (["accessibility", "a11y", "wcag", "screen reader"], "frontend-quality", ["HTML"]),
    "Web Performance": (["web performance", "core web vitals", "lighthouse",
                        "performance optimization", "performance optimisation"], "frontend-quality", ["React"]),
    "Design Systems": (["design system", "design systems", "component library",
                        "storybook"], "frontend-quality", ["Figma", "React"]),

    # ---- Backend languages ----
    "Python":       (["python", "python3", "py3"], "backend-language", ["Django", "FastAPI"]),
    "Java":         (["java", "java8", "java 11", "java 17"], "backend-language", ["Spring Boot"]),
    "Golang":       (["golang", "go lang", "go programming"], "backend-language", ["gRPC", "Kubernetes"]),
    "Node.js":      (["node", "node.js", "nodejs", "express.js", "expressjs"], "backend-language", ["JavaScript", "TypeScript"]),
    "Ruby":         (["ruby", "ruby on rails", "rails"], "backend-language", ["PostgreSQL"]),
    "PHP":          (["php", "laravel", "symfony"], "backend-language", ["MySQL"]),
    "C#":           (["c#", "csharp", ".net", "dotnet", "asp.net"], "backend-language", ["SQL Server"]),
    "Rust":         (["rust"], "backend-language", ["gRPC"]),
    "C++":          (["c++", "cpp"], "backend-language", []),
    "Scala":        (["scala"], "backend-language", ["Apache Spark", "Kafka"]),
    "Elixir":       (["elixir", "phoenix framework"], "backend-language", []),
    "Kotlin":       (["kotlin"], "backend-language", ["Android", "Java"]),

    # ---- Backend frameworks ----
    "Django":       (["django"], "python-web", ["Python", "PostgreSQL"]),
    "Flask":        (["flask"], "python-web", ["Python"]),
    "FastAPI":      (["fastapi", "fast api"], "python-web", ["Python", "Pydantic"]),
    "Pydantic":     (["pydantic"], "python-web", ["FastAPI"]),
    "Spring Boot":  (["spring boot", "springboot", "spring framework"], "jvm-framework", ["Java"]),

    # ---- Data stores ----
    "PostgreSQL":   (["postgres", "postgresql", "psql"], "rdbms", ["SQL"]),
    "MySQL":        (["mysql", "mariadb"], "rdbms", ["SQL"]),
    "SQL Server":   (["sql server", "mssql", "t-sql"], "rdbms", ["SQL"]),
    "Oracle DB":    (["oracle db", "oracle database", "pl/sql"], "rdbms", ["SQL"]),
    "MongoDB":      (["mongodb", "mongo", "mongoose"], "nosql", []),
    "DynamoDB":     (["dynamodb"], "nosql", ["AWS"]),
    "Cassandra":    (["cassandra", "scylladb"], "nosql", []),
    "Redis":        (["redis", "memcached"], "cache", []),
    "Elasticsearch": (["elasticsearch", "opensearch", "elastic search"], "search", []),
    "SQL":          (["sql queries", "sql", "window functions"], "query-language", ["PostgreSQL"]),

    # ---- Messaging ----
    "Kafka":        (["kafka", "apache kafka", "kinesis"], "streaming", ["Distributed Systems"]),
    "RabbitMQ":     (["rabbitmq", "amqp"], "queue", []),
    "SQS":          (["sqs", "amazon sqs"], "queue", ["AWS"]),

    # ---- Cloud & infra ----
    "AWS":          (["aws", "amazon web services", "ec2", "s3", "lambda"], "cloud", ["Terraform"]),
    "GCP":          (["gcp", "google cloud", "google cloud platform"], "cloud", ["Terraform"]),
    "Azure":        (["azure", "microsoft azure"], "cloud", ["Terraform"]),
    "Docker":       (["docker", "containerisation", "containerization"], "containers", ["Kubernetes"]),
    "Kubernetes":   (["kubernetes", "k8s", "eks", "gke", "helm"], "container-orchestration", ["Docker"]),
    "Terraform":    (["terraform", "hcl"], "iac", ["AWS"]),
    "Pulumi":       (["pulumi"], "iac", []),
    "CI/CD":        (["ci/cd", "cicd", "continuous integration", "continuous delivery",
                      "github actions", "gitlab ci", "jenkins", "circleci"], "delivery", ["Docker"]),
    "Observability": (["observability", "prometheus", "grafana", "datadog",
                       "opentelemetry", "new relic"], "operations", ["Kubernetes"]),
    "Linux":        (["linux", "unix", "bash scripting"], "operations", []),
    "gRPC":         (["grpc", "protobuf", "protocol buffers"], "api", ["Golang"]),
    "REST APIs":    (["rest api", "rest apis", "restful", "openapi", "swagger"], "api", []),
    "GraphQL":      (["graphql", "apollo"], "api", ["React"]),
    "Microservices": (["microservices", "micro-services", "service oriented"], "architecture", ["Kubernetes"]),
    "Distributed Systems": (["distributed systems", "distributed computing",
                             "consensus", "eventual consistency"], "architecture", ["Kafka"]),
    "System Design": (["system design", "architecture design", "scalability"], "architecture", ["Distributed Systems"]),

    # ---- Mobile ----
    "iOS":          (["ios", "swiftui", "uikit", "xcode"], "mobile", ["Swift"]),
    "Swift":        (["swift"], "mobile-language", ["iOS"]),
    "Android":      (["android", "jetpack compose"], "mobile", ["Kotlin"]),
    "React Native": (["react native"], "cross-platform-mobile", ["React"]),
    "Flutter":      (["flutter", "dart"], "cross-platform-mobile", []),

    # ---- Data & ML ----
    "Apache Spark": (["spark", "apache spark", "pyspark"], "data-processing", ["Scala"]),
    "Airflow":      (["airflow", "apache airflow"], "data-pipeline", ["Python"]),
    "dbt":          (["dbt", "data build tool"], "data-pipeline", ["SQL"]),
    "Snowflake":    (["snowflake"], "data-warehouse", ["SQL"]),
    "BigQuery":     (["bigquery", "big query"], "data-warehouse", ["GCP", "SQL"]),
    "Redshift":     (["redshift"], "data-warehouse", ["AWS", "SQL"]),
    "ETL":          (["etl", "elt", "data pipelines", "data ingestion"], "data-engineering", ["Airflow"]),
    "Machine Learning": (["machine learning", "deep learning", "neural networks",
                          "supervised learning"], "ml", ["Python", "PyTorch"]),
    "PyTorch":      (["pytorch", "torch"], "ml-framework", ["Machine Learning"]),
    "TensorFlow":   (["tensorflow", "keras"], "ml-framework", ["Machine Learning"]),
    "scikit-learn": (["scikit-learn", "sklearn"], "ml-framework", ["Python"]),
    "LLMs":         (["llm", "llms", "large language model", "large language models",
                      "gpt", "prompt engineering", "rag", "retrieval augmented"], "ml", ["Python"]),
    "MLOps":        (["mlops", "model deployment", "feature store"], "ml-ops", ["Machine Learning"]),
    "Data Science": (["data science", "data scientist", "statistical modelling",
                      "statistical modeling"], "data-science", ["Python", "SQL"]),
    "Pandas":       (["pandas", "numpy"], "data-science", ["Python"]),
    "Analytics":    (["analytics", "product analytics", "mixpanel", "amplitude",
                      "google analytics"], "analytics", ["SQL"]),
    "Tableau":      (["tableau"], "bi", ["SQL"]),
    "Power BI":     (["power bi", "powerbi"], "bi", ["SQL"]),
    "Looker":       (["looker", "metabase"], "bi", ["SQL"]),

    # ---- Testing ----
    "Automated Testing": (["automated testing", "test automation", "unit testing",
                           "integration testing", "tdd"], "testing", []),
    "Jest":         (["jest", "vitest"], "testing-tool", ["JavaScript"]),
    "Cypress":      (["cypress"], "testing-tool", ["JavaScript"]),
    "Playwright":   (["playwright"], "testing-tool", ["TypeScript"]),
    "Selenium":     (["selenium", "webdriver"], "testing-tool", []),
    "PyTest":       (["pytest"], "testing-tool", ["Python"]),

    # ---- Security ----
    "Security":     (["security", "appsec", "owasp", "penetration testing",
                      "vulnerability"], "security", []),
    "Authentication": (["authentication", "oauth", "oauth2", "sso", "saml", "jwt"], "security", []),

    # ---- Product ----
    "Product Strategy": (["product strategy", "product vision", "roadmap",
                          "roadmapping", "product roadmap"], "product", ["Stakeholder Management"]),
    "Product Discovery": (["product discovery", "customer discovery",
                           "problem discovery"], "product", ["Qualitative Research"]),
    "A/B Testing":  (["a/b test", "a/b testing", "ab testing", "experimentation",
                      "split testing"], "experimentation", ["Analytics"]),
    "Growth":       (["growth", "growth marketing", "user acquisition", "retention",
                      "funnel optimisation", "funnel optimization"], "growth", ["Analytics"]),
    "Stakeholder Management": (["stakeholder management", "cross-functional",
                                "cross functional", "influence without authority"], "product", []),
    "Agile":        (["agile", "scrum", "kanban", "sprint planning", "jira"], "process", []),
    "Go-to-Market": (["go-to-market", "go to market", "gtm", "product launch"], "product", ["Growth"]),

    # ---- Domain ----
    "Fintech":      (["fintech", "financial services", "lending", "credit card",
                      "neobank"], "domain", ["UPI / Payments"]),
    "UPI / Payments": (["upi", "payments", "payment gateway", "razorpay", "payment rails",
                        "nach", "imps", "neft"], "domain", ["Fintech"]),
    "E-commerce":   (["e-commerce", "ecommerce", "marketplace", "d2c"], "domain", []),
    "SaaS":         (["saas", "b2b saas", "enterprise software"], "domain", []),
    "Compliance":   (["compliance", "regulatory", "rbi guidelines", "kyc", "aml",
                      "dpdp", "gdpr"], "domain", ["Security"]),

    # ---- Design & research ----
    "Figma":        (["figma", "figjam"], "design-tool", ["Design Systems"]),
    "Sketch":       (["sketch app", "sketch"], "design-tool", ["Design Systems"]),
    "Adobe XD":     (["adobe xd", "adobe creative suite", "photoshop", "illustrator"], "design-tool", []),
    "Prototyping":  (["prototyping", "wireframing", "wireframes", "mockups",
                      "interaction design"], "design", ["Figma"]),
    "Qualitative Research": (["qualitative research", "user research", "user interviews",
                              "ethnography", "contextual inquiry"], "research", ["Usability Testing"]),
    "Usability Testing": (["usability testing", "usability", "user testing",
                           "moderated testing"], "research", ["Qualitative Research"]),
    "Survey Design": (["survey design", "surveys", "quantitative research"], "research", ["Analytics"]),
    "Information Architecture": (["information architecture", "card sorting",
                                  "taxonomy design"], "design", ["Prototyping"]),
    "Visual Design": (["visual design", "typography", "brand design", "motion design"], "design", ["Figma"]),

    # ---- General ----
    "Communication": (["communication", "written communication", "storytelling",
                       "presentation skills"], "soft", []),
    "Mentoring":    (["mentoring", "mentorship", "coaching", "team leadership",
                      "people management"], "soft", []),
    "Problem Solving": (["problem solving", "analytical thinking",
                         "first principles"], "soft", []),
}

# Aliases that are also ordinary English words or fragments of other terms.
# Matched only when they look like a technology reference — e.g. "Go" as a
# capitalised standalone token, or next to a word like "developer".
# All case-SENSITIVE on purpose: "ML" is a language, "ml" is inside "HTML";
# "Go" is a language, "go" is a verb. Excluding a following "and"/"with"/"for"
# would drop the common case — "Go and Kubernetes" — so only genuine verb
# continuations are excluded. Multi-word phrases like "go to market" are
# already claimed by their own longer alias before these patterns run.
AMBIGUOUS_ALIASES = {
    "Golang": [r"\bGo\b(?!\s+(?:deep|live|through|beyond|into|over|back|ahead|forward|"
               r"above|hand|wrong|missing|the\s+extra)\b)"],
    "Machine Learning": [r"\bML\b", r"\bAI\b"],
    "C#": [r"\bC#"],
    "C\+\+": [r"\bC\+\+"],
    "Rust": [r"\bRust\b"],
}

CANONICAL: Dict[str, dict] = {
    name: {"name": name, "group": g, "related": rel, "aliases": al}
    for name, (al, g, rel) in _T.items()
}

# Longest alias first, so "machine learning" is consumed before "ml" and
# "react native" before "react".
_ALIAS_INDEX = sorted(
    ((alias, name) for name, meta in CANONICAL.items() for alias in meta["aliases"]),
    key=lambda pair: -len(pair[0]),
)


def _boundary_pattern(alias: str) -> str:
    """Token-boundary match that survives punctuation inside an alias.

    \\b is unusable next to '+', '#' or '.', so assert on adjacent characters
    that could continue a word instead.
    """
    escaped = re.escape(alias)
    left = r"(?<![A-Za-z0-9])"
    right = r"(?![A-Za-z0-9])" if alias[-1].isalnum() else ""
    return left + escaped + right


_COMPILED = [(re.compile(_boundary_pattern(a), re.I), a, n) for a, n in _ALIAS_INDEX]
_COMPILED_AMBIGUOUS = [
    (re.compile(p), name) for name, pats in AMBIGUOUS_ALIASES.items() for p in pats
]

# Phrases that mark a requirement as essential rather than nice-to-have.
_MUST_CUES = re.compile(
    r"(must[- ]have|required|requirements?|essential|strong|deep|expert|proficien|"
    r"solid|extensive|hands[- ]on)", re.I)
_NICE_CUES = re.compile(r"(nice[- ]to[- ]have|bonus|plus|preferred|advantage|good[- ]to[- ]have)", re.I)


def _emphasis(text: str, lines: List[str], line_starts: List[int], pos: int) -> str:
    """Whether a match reads as must-have, nice-to-have, or neither.

    A fixed character window does not work on a real job description: a
    "Requirements:" heading sits within 120 characters of every bullet under it,
    including the "Nice to have" one, so everything came back must-have.

    The bullet or line the skill sits on is the honest unit. Only if that line
    says nothing either way do we fall back to the nearest section heading
    above it, and a cue on the line itself always beats the heading.
    """
    idx = bisect.bisect_right(line_starts, pos) - 1
    idx = max(0, min(idx, len(lines) - 1))
    own = lines[idx]

    # The line wins, and "nice to have" wins over "required" on the same line.
    if _NICE_CUES.search(own):
        return "nice"
    if _MUST_CUES.search(own):
        return "must"

    # Otherwise the nearest heading above, within a short reach.
    for back in range(idx - 1, max(-1, idx - 6), -1):
        prev = lines[back].strip()
        if not prev:
            continue
        is_heading = prev.endswith(":") or len(prev) < 40
        if not is_heading:
            continue
        if _NICE_CUES.search(prev):
            return "nice"
        if _MUST_CUES.search(prev):
            return "must"
    return "neutral"


def extract_skills(text: str) -> List[dict]:
    """Skills found in a job description, most prominent first.

    Each entry carries the weight (1-5), how many times it appeared and the
    exact substring that matched, so the UI can show a recruiter *why* a skill
    was picked up rather than asking them to trust it.
    """
    if not text or not text.strip():
        return []

    lines = text.splitlines()
    line_starts, cursor = [], 0
    for ln in lines:
        line_starts.append(cursor)
        cursor += len(ln) + 1

    hits: Dict[str, dict] = {}
    # Consumed spans stop a longer alias's text being re-matched by a shorter
    # one: "React Native" must not also produce "React".
    claimed: List[tuple] = []

    def overlaps(a: int, b: int) -> bool:
        return any(a < e and s < b for s, e in claimed)

    for pattern, alias, name in _COMPILED:
        for m in pattern.finditer(text):
            if overlaps(m.start(), m.end()):
                continue
            claimed.append((m.start(), m.end()))
            h = hits.setdefault(name, {"name": name, "count": 0, "matched_as": set(), "must": False, "nice": False})
            h["count"] += 1
            h["matched_as"].add(m.group(0))
            tone = _emphasis(text, lines, line_starts, m.start())
            if tone == "must":
                h["must"] = True
            elif tone == "nice":
                h["nice"] = True

    for pattern, name in _COMPILED_AMBIGUOUS:
        for m in pattern.finditer(text):
            if overlaps(m.start(), m.end()):
                continue
            claimed.append((m.start(), m.end()))
            h = hits.setdefault(name, {"name": name, "count": 0, "matched_as": set(), "must": False, "nice": False})
            h["count"] += 1
            h["matched_as"].add(m.group(0))

    out = []
    for h in hits.values():
        weight = 3 + min(2, h["count"] - 1)      # repetition signals importance
        if h["nice"]:
            # An explicit "nice to have" is the recruiter's own words; it beats
            # a generic "Requirements:" heading further up the page.
            weight = max(1, weight - 2)
        elif h["must"]:
            weight = min(5, weight + 1)
        out.append({
            "name": h["name"],
            "weight": max(1, min(5, weight)),
            "count": h["count"],
            "matched_as": sorted(h["matched_as"])[0],
            "group": CANONICAL[h["name"]]["group"],
        })

    out.sort(key=lambda s: (-s["weight"], -s["count"], s["name"]))
    return out


def related_skills(names: List[str], limit: int = 8) -> List[dict]:
    """Skills a recruiter could reasonably also accept.

    Two kinds, labelled so the difference is visible in the UI:
      * "equivalent"  — same group, does the same job (React / Vue / Angular)
      * "related"     — commonly paired with it (React / TypeScript)

    Never suggests something already selected.
    """
    have = {n.lower() for n in names}
    scored: Dict[str, dict] = {}

    for name in names:
        meta = CANONICAL.get(name)
        if not meta:
            continue
        for other, om in CANONICAL.items():
            if other.lower() in have:
                continue
            if om["group"] == meta["group"]:
                entry = scored.setdefault(other, {"name": other, "kind": "equivalent",
                                                  "because": [], "score": 0})
                entry["kind"] = "equivalent"
                entry["score"] += 2
                if name not in entry["because"]:
                    entry["because"].append(name)
        for rel in meta["related"]:
            if rel.lower() in have or rel not in CANONICAL:
                continue
            entry = scored.setdefault(rel, {"name": rel, "kind": "related", "because": [], "score": 0})
            entry["score"] += 1
            if name not in entry["because"]:
                entry["because"].append(name)

    ranked = sorted(scored.values(), key=lambda s: (-s["score"], s["name"]))[:limit]
    for s in ranked:
        who = ", ".join(s["because"][:2])
        s["reason"] = (f"Does the same job as {who}" if s["kind"] == "equivalent"
                       else f"Usually goes with {who}")
        s.pop("score", None)
    return ranked


def canonicalise(raw: str) -> Optional[str]:
    """Map a free-typed skill onto a known one, or None if we don't know it.

    Lets a recruiter type "reactjs" or "k8s" and get the canonical name, while
    still allowing genuinely new skills through as typed.
    """
    if not raw or not raw.strip():
        return None
    probe = raw.strip().lower()
    for name, meta in CANONICAL.items():
        if probe == name.lower() or probe in meta["aliases"]:
            return name
    return None


def suggest_completions(prefix: str, limit: int = 8) -> List[str]:
    """Type-ahead for the recruiter's own skill input."""
    p = (prefix or "").strip().lower()
    if not p:
        return []
    starts = [n for n in CANONICAL if n.lower().startswith(p)]
    alias_hit = [n for n, m in CANONICAL.items()
                 if n not in starts and any(a.startswith(p) for a in m["aliases"])]
    contains = [n for n in CANONICAL if n not in starts and n not in alias_hit and p in n.lower()]
    return (sorted(starts) + sorted(alias_hit) + sorted(contains))[:limit]
