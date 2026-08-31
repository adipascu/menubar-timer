#!/usr/bin/env python3
import os
import re
import time
import urllib.parse
import urllib.request

REPO = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(REPO, "raw")
GETTING_REAL = "https://basecamp.com/gettingreal"
WIKIPEDIA_SUMMARY = "https://en.wikipedia.org/api/rest_v1/page/summary/"

ESSAYS = {
    "pg-do-things-that-dont-scale.html": "https://paulgraham.com/ds.html",
    "pg-how-to-get-startup-ideas.html": "https://paulgraham.com/startupideas.html",
    "pg-startup-equals-growth.html": "https://paulgraham.com/growth.html",
    "pg-be-relentlessly-resourceful.html": "https://paulgraham.com/relres.html",
    "pg-how-to-make-wealth.html": "https://paulgraham.com/wealth.html",
    "pg-schlep-blindness.html": "https://paulgraham.com/schlep.html",
    "pg-startup-mistakes.html": "https://paulgraham.com/startupmistakes.html",
    "pg-users.html": "https://paulgraham.com/newideas.html",
    "saas-starter-stack.md": "https://raw.githubusercontent.com/timb-103/saas-starter-stack/main/README.md",
    "open-saas.md": "https://raw.githubusercontent.com/wasp-lang/open-saas/main/README.md",
    "getting-real.html": GETTING_REAL,
}

HEALTH = {
    "nimh-adhd.html": "https://www.nimh.nih.gov/health/topics/attention-deficit-hyperactivity-disorder-adhd",
    "nimh-depression.html": "https://www.nimh.nih.gov/health/topics/depression",
    "nimh-anxiety-disorders.html": "https://www.nimh.nih.gov/health/topics/anxiety-disorders",
    "nimh-bipolar-disorder.html": "https://www.nimh.nih.gov/health/topics/bipolar-disorder",
    "nimh-psychotherapies.html": "https://www.nimh.nih.gov/health/topics/psychotherapies",
    "nimh-caring-for-your-mental-health.html": "https://www.nimh.nih.gov/health/topics/caring-for-your-mental-health",
    "nimh-do-i-need-help.html": "https://www.nimh.nih.gov/health/publications/my-mental-health-do-i-need-help",
    "nimh-stress.html": "https://www.nimh.nih.gov/health/publications/stress",
    "nimh-find-help.html": "https://www.nimh.nih.gov/health/find-help",
    "nhlbi-sleep-deprivation.html": "https://www.nhlbi.nih.gov/health/sleep-deprivation",
}

WIKIPEDIA = [
    "Flow_(psychology)",
    "Zeigarnik_effect",
    "Spacing_effect",
    "Testing_effect",
    "Implementation_intention",
    "Yerkes–Dodson_law",
    "Cognitive_load",
    "Attention_restoration_theory",
    "Attentional_control",
    "Human_multitasking",
    "Behavioral_activation",
    "Procrastination",
    "Habit",
    "Self-determination_theory",
    "Self-efficacy",
    "Goal_setting",
    "Decision_fatigue",
    "Planning_fallacy",
    "Sunk_cost",
    "Dunning–Kruger_effect",
    "Incubation_(psychology)",
    "Learned_helplessness",
    "Perfectionism_(psychology)",
    "Rumination_(psychology)",
    "Mindfulness",
    "Cognitive_restructuring",
    "Cognitive_behavioral_therapy",
    "Occupational_burnout",
    "Attention_deficit_hyperactivity_disorder",
    "Major_depressive_disorder",
    "Anxiety_disorder",
    "Bipolar_disorder",
    "Insomnia",
    "Sleep_hygiene",
    "Circadian_rhythm",
    "Sleep_deprivation",
    "Psychiatry",
    "Psychoeducation",
    "Mental_health",
]


def slugify(title):
    return re.sub(r"[^a-z0-9]+", "-", urllib.parse.unquote(title).lower()).strip("-")


def download(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return False
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=45) as response:
        open(path, "wb").write(response.read())
    time.sleep(0.5)
    return True


def main():
    os.makedirs(os.path.join(RAW, "gettingreal"), exist_ok=True)
    os.makedirs(os.path.join(RAW, "wikipedia"), exist_ok=True)
    for name, url in {**ESSAYS, **HEALTH}.items():
        download(url, os.path.join(RAW, name))

    index = open(os.path.join(RAW, "getting-real.html"), encoding="utf-8", errors="ignore").read()
    chapters = sorted(set(re.findall(r'href="(/gettingreal/[^"]+)"', index)))
    for path in chapters:
        download(f"https://basecamp.com{path}", os.path.join(RAW, "gettingreal", path.split("/")[-1] + ".html"))

    for title in WIKIPEDIA:
        url = WIKIPEDIA_SUMMARY + urllib.parse.quote(title, safe="")
        download(url, os.path.join(RAW, "wikipedia", slugify(title) + ".json"))

    print(
        f"{len(ESSAYS)} essays, {len(chapters)} Getting Real chapters, "
        f"{len(HEALTH)} NIH pages and {len(WIKIPEDIA)} Wikipedia summaries in {RAW}"
    )


if __name__ == "__main__":
    main()
