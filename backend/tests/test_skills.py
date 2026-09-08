"""Skill extraction: the feature the whole product scores against.

The cases here are the ones the previous substring matcher got wrong. It ran
`alias in text.lower()`, which meant "HTML" produced Machine Learning, "you
will go deep" produced Golang, and "JavaScript" produced Java — phantom skills
that flowed into must_have_skills and scored real candidates against
requirements the role never had.
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import skills  # noqa: E402


def names(jd):
    return {s["name"] for s in skills.extract_skills(jd)}


# ---------- The false positives that made this unusable ----------
@pytest.mark.parametrize("jd,must_not,why", [
    ("Strong HTML, CSS and semantic markup.", "Machine Learning", '"ml" inside HT-ML-'),
    ("Solid JavaScript and TypeScript.", "Java", '"java" is a prefix of JavaScript'),
    ("You will maintain a detailed roadmap.", "Machine Learning", '"ai" inside m-ai-ntain'),
    ("You will go deep on customer problems.", "Golang", '"go" as an ordinary verb'),
    ("Good judgement and a clear plan.", "Golang", '"go" inside Good'),
    ("Own the go-to-market plan.", "Golang", "go-to-market is not the language"),
    ("Experience with Django and MongoDB.", "Golang", '"go" inside Django and Mongo'),
    ("Mobile engineer building with React Native.", "React", "React Native is its own skill"),
    ("Spring cleaning of our backlog.", "Spring Boot", "not the framework"),
])
def test_no_phantom_skills(jd, must_not, why):
    assert must_not not in names(jd), f"{why}: {jd!r} produced {must_not}"


# ---------- The real ones must still be found ----------
@pytest.mark.parametrize("jd,expected", [
    ("Backend engineer. Go and Kubernetes at scale.", {"Golang", "Kubernetes"}),
    ("Stack: Go, Postgres, Redis.", {"Golang", "PostgreSQL", "Redis"}),
    ("Systems engineer: Rust, C++, gRPC.", {"Rust", "C++", "gRPC"}),
    ("C# and .NET services.", {"C#"}),
    ("Svelte, Tailwind CSS and Playwright.", {"Svelte", "Tailwind CSS", "Playwright"}),
    ("Airflow, Spark and dbt on Snowflake. Strong SQL.", {"Airflow", "Apache Spark", "dbt", "Snowflake", "SQL"}),
    ("PyTorch, TensorFlow, LLM fine-tuning, RAG pipelines, MLOps.",
     {"PyTorch", "TensorFlow", "LLMs", "MLOps"}),
    ("AI and ML experience required.", {"Machine Learning"}),
    ("Deep React and TypeScript experience, plus Next.js.", {"React", "TypeScript", "Next.js"}),
    ("Qualitative research, usability testing and Figma.",
     {"Qualitative Research", "Usability Testing", "Figma"}),
    ("UPI, payment gateway and RBI compliance experience.",
     {"UPI / Payments", "Compliance"}),
])
def test_real_skills_are_found(jd, expected):
    got = names(jd)
    assert expected <= got, f"missing {expected - got} from {jd!r} (got {got})"


def test_a_plain_english_jd_yields_no_technology():
    jd = ("You will go deep on customer problems, maintain a clear roadmap and detail "
          "the trade-offs. Good judgement and stakeholder management are essential.")
    got = names(jd)
    assert not ({"Golang", "Machine Learning", "Java", "React"} & got), got
    # It should still recognise the product skills that are genuinely present.
    assert "Product Strategy" in got and "Stakeholder Management" in got


def test_empty_and_whitespace_input():
    assert skills.extract_skills("") == []
    assert skills.extract_skills("   \n  ") == []


# ---------- Weighting ----------
def test_must_have_context_raises_the_weight():
    must = skills.extract_skills("Must have strong React experience.")
    nice = skills.extract_skills("React is a nice-to-have bonus.")
    assert must[0]["name"] == nice[0]["name"] == "React"
    assert must[0]["weight"] > nice[0]["weight"]


def test_repetition_raises_the_weight():
    once = skills.extract_skills("We use Kafka.")[0]["weight"]
    thrice = skills.extract_skills("Kafka pipelines. Kafka consumers. Kafka tuning.")[0]["weight"]
    assert thrice > once


def test_weights_stay_in_range():
    jd = "Must have expert strong deep React. React. React. React. React."
    for s in skills.extract_skills(jd):
        assert 1 <= s["weight"] <= 5


def test_results_are_ordered_by_prominence():
    jd = "Must have deep Kubernetes expertise. Kubernetes everywhere. Redis is a nice-to-have bonus."
    got = skills.extract_skills(jd)
    assert got[0]["name"] == "Kubernetes"


def test_each_skill_reports_what_it_matched():
    got = skills.extract_skills("We build with k8s and Postgres.")
    by_name = {s["name"]: s for s in got}
    assert by_name["Kubernetes"]["matched_as"].lower() == "k8s"
    assert by_name["PostgreSQL"]["matched_as"].lower() == "postgres"


# ---------- Equivalent / adjacent suggestions ----------
def test_equivalents_come_from_the_same_group():
    out = skills.related_skills(["React"])
    equivalents = {s["name"] for s in out if s["kind"] == "equivalent"}
    assert {"Vue.js", "Angular"} & equivalents, out


def test_related_covers_common_pairings():
    out = skills.related_skills(["React"])
    assert any(s["name"] == "TypeScript" for s in out)


def test_suggestions_never_repeat_what_is_already_chosen():
    out = skills.related_skills(["React", "Vue.js", "TypeScript"])
    assert not ({"React", "Vue.js", "TypeScript"} & {s["name"] for s in out})


def test_every_suggestion_explains_itself():
    for s in skills.related_skills(["PostgreSQL", "Kafka"]):
        assert s["reason"] and s["because"]
        assert s["kind"] in ("equivalent", "related")


def test_database_equivalents_are_sensible():
    equivalents = {s["name"] for s in skills.related_skills(["PostgreSQL"])
                   if s["kind"] == "equivalent"}
    assert {"MySQL"} <= equivalents
    # A queue is not an equivalent for a database.
    assert "Kafka" not in equivalents


def test_unknown_skills_do_not_break_suggestions():
    assert skills.related_skills(["Telepathy", "Wizardry"]) == []


# ---------- The recruiter's own editing ----------
@pytest.mark.parametrize("typed,expected", [
    ("reactjs", "React"), ("React.JS", "React"), ("k8s", "Kubernetes"),
    ("postgres", "PostgreSQL"), ("  TypeScript  ", "TypeScript"), ("golang", "Golang"),
])
def test_typed_skills_resolve_to_canonical_names(typed, expected):
    assert skills.canonicalise(typed) == expected


def test_an_unknown_skill_is_allowed_through_as_typed():
    # The taxonomy should not be a gate on what a recruiter may ask for.
    assert skills.canonicalise("Kubernetes Operators for Quantum Computing") is None


def test_autocomplete_matches_names_and_aliases():
    assert "Kubernetes" in skills.suggest_completions("kube")
    assert "Kubernetes" in skills.suggest_completions("k8s")
    assert "PostgreSQL" in skills.suggest_completions("postg")
    assert skills.suggest_completions("") == []


def test_autocomplete_is_bounded():
    assert len(skills.suggest_completions("a", limit=5)) <= 5


# ---------- Taxonomy hygiene ----------
def test_no_alias_is_claimed_by_two_skills():
    seen = {}
    for name, meta in skills.CANONICAL.items():
        for alias in meta["aliases"]:
            assert alias not in seen, f"{alias!r} claimed by both {seen.get(alias)} and {name}"
            seen[alias] = name


def test_related_entries_all_exist():
    for name, meta in skills.CANONICAL.items():
        for rel in meta["related"]:
            assert rel in skills.CANONICAL, f"{name} points at unknown skill {rel!r}"


def test_taxonomy_is_meaningfully_bigger_than_the_old_dictionary():
    # The old one had 47 canonical skills and missed Rust, Spark, Tailwind,
    # PyTorch, CI/CD and much else entirely.
    assert len(skills.CANONICAL) >= 110
