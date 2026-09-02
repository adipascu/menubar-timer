#!/usr/bin/env python3
import json
import os
import re
from collections import Counter

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEXT = os.path.join(REPO, "resources", "text")
OUT = os.path.join(REPO, "src", "tips.json")

SKIP_GETTING_REAL = {
    "01.1-what-is-getting-real",
    "01.2-about-basecamp",
    "01.3-caveats-disclaimers-and-other-preemptive-strikes",
    "13.1-start-your-engines",
}


def sentences(body):
    out = []
    for piece in re.split(r"(?<=[.!?])\s+", body):
        if out and re.search(r"\b[A-Z]\.$", out[-1]):
            out[-1] = f"{out[-1]} {piece}"
        else:
            out.append(piece)
    return out


def trim_to_sentences(body, limit=260):
    body = re.sub(r"\s+", " ", body).strip()
    out = ""
    for sentence in sentences(body):
        if out and len(out) + len(sentence) + 1 > limit:
            break
        out = f"{out} {sentence}".strip()
    return out


def getting_real_tips():
    index = json.load(open(os.path.join(TEXT, "gettingreal-index.json")))
    tips = []
    taglines_used = set()
    for entry in index:
        if entry["slug"] in SKIP_GETTING_REAL:
            continue
        lines = open(os.path.join(TEXT, "gettingreal", entry["slug"] + ".txt")).read().split("\n")
        rest = "\n".join(lines[2:]).strip()
        if rest.startswith(entry["tagline"]):
            rest = rest[len(entry["tagline"]):]
        body = trim_to_sentences(rest)
        if not body:
            continue
        title = entry["title"] if entry["tagline"] in taglines_used else entry["tagline"]
        taglines_used.add(entry["tagline"])
        tips.append({
            "topic": "saas",
            "title": title,
            "body": body,
            "source": "Getting Real, 37signals",
            "url": f"https://basecamp.com/gettingreal/{entry['slug']}",
        })
    return tips


WIKIPEDIA_FRAMING = {
    "psychology": ("psychology", "Psychology is the scientific study of mind and behaviour"),
    "cognitive-psychology": ("psychology", "Cognitive psychology studies attention, memory and reasoning"),
    "social-psychology": ("psychology", "Social psychology is how other people shape what you think and do"),
    "behavioral-economics": ("psychology", "Behavioural economics is where decisions leave the rational model"),
    "cognitive-science": ("psychology", "Cognitive science studies the mind across disciplines"),
    "neuroscience": ("psychology", "Neuroscience is the study of the nervous system"),
    "positive-psychology": ("psychology", "Positive psychology studies what makes people flourish"),
    "cognitive-bias": ("psychology", "A cognitive bias is a systematic error in judgement"),
    "executive-functions": ("psychology", "Executive functions steer behaviour toward a goal"),
    "attention": ("psychology", "Attention is concentration on one thing at the cost of the others"),
    "motivation": ("psychology", "Motivation is the internal state behind goal-directed behaviour"),
    "working-memory": ("psychology", "Working memory holds a little, briefly"),
    "flow-psychology": ("psychology", "Flow is a state you can set up on purpose"),
    "zeigarnik-effect": ("psychology", "An unfinished task keeps talking to you"),
    "spacing-effect": ("psychology", "Spread the practice out, don't cram it"),
    "testing-effect": ("psychology", "Retrieving beats rereading"),
    "implementation-intention": ("psychology", "Turn the intention into an if-then plan"),
    "yerkes-dodson-law": ("psychology", "Some pressure sharpens you, more of it ruins you"),
    "cognitive-load": ("psychology", "Working memory is the bottleneck"),
    "attention-restoration-theory": ("psychology", "Directed attention runs down and nature refills it"),
    "attentional-control": ("psychology", "Concentration is a choice about what to ignore"),
    "human-multitasking": ("psychology", "Splitting attention costs more than it looks"),
    "procrastination": ("psychology", "Procrastination is avoidance, not laziness"),
    "habit": ("psychology", "Repetition moves behaviour below conscious effort"),
    "self-determination-theory": ("psychology", "Motivation needs autonomy, competence and relatedness"),
    "self-efficacy": ("psychology", "Believing you can act changes whether you do"),
    "goal-setting": ("psychology", "A goal is a plan, not a wish"),
    "decision-fatigue": ("psychology", "Decisions get worse the longer you keep making them"),
    "planning-fallacy": ("psychology", "You will underestimate how long this takes"),
    "sunk-cost": ("psychology", "What you already spent is gone either way"),
    "dunning-kruger-effect": ("psychology", "The less you know, the surer you feel"),
    "incubation-psychology": ("psychology", "Stepping away is part of the work"),
    "learned-helplessness": ("psychology", "Repeated futility teaches you to stop trying"),
    "perfectionism-psychology": ("psychology", "Perfectionism comes with a critic attached"),
    "rumination-psychology": ("psychology", "Chewing on it is not the same as solving it"),
    "mindfulness": ("psychology", "Attention to the present interrupts the spiral"),
    "circadian-rhythm": ("psychology", "Your body runs on a 24-hour clock"),
    "sleep-hygiene": ("psychology", "Sleep responds to habits and surroundings"),
    "hofstadter-s-law": ("psychology", "It always takes longer than you expect"),
    "student-syndrome": ("psychology", "Planned procrastination has a name"),
    "law-of-triviality": ("psychology", "Trivial issues get disproportionate weight"),
    "goodhart-s-law": ("psychology", "When a measure becomes a target it stops measuring"),
    "overjustification-effect": ("psychology", "Paying yourself for what you love can kill the love"),
    "grit-personality-trait": ("psychology", "Grit is perseverance plus passion for a long goal"),
    "conscientiousness": ("psychology", "Conscientiousness is wanting to do the task well"),
    "locus-of-control": ("psychology", "Locus of control is where you think outcomes come from"),
    "self-control": ("psychology", "Self-control is an executive function, not a virtue"),
    "delayed-gratification": ("psychology", "Resisting the immediate reward for the larger later one"),
    "ego-depletion": ("psychology", "The idea that willpower runs out with use"),
    "confirmation-bias": ("psychology", "You search for what confirms what you already believe"),
    "anchoring-effect": ("psychology", "An irrelevant reference point still anchors the judgement"),
    "availability-heuristic": ("psychology", "You judge by the examples that come to mind first"),
    "loss-aversion": ("psychology", "The same outcome hurts more framed as a loss"),
    "status-quo-bias": ("psychology", "The current state is the reference point for everything else"),
    "present-bias": ("psychology", "You overvalue the reward you can have now"),
    "optimism-bias": ("psychology", "You overestimate the good outcomes and underestimate the bad"),
    "illusion-of-control": ("psychology", "You overestimate how much you control events"),
    "overchoice": ("psychology", "Too many options makes the decision worse"),
    "analysis-paralysis": ("psychology", "Overanalysis stops the decision from being made"),
    "impostor-syndrome": ("psychology", "Impostor syndrome is feeling like a professional fraud"),
    "chunking-psychology": ("psychology", "Chunking binds pieces into one memorable whole"),
    "forgetting-curve": ("psychology", "Memory decays on a curve unless you revisit it"),
    "desirable-difficulty": ("psychology", "The right amount of effort makes learning stick"),
    "metacognition": ("psychology", "Thinking about your own thinking"),
    "reinforcement": ("psychology", "Consequences that make a behaviour more likely"),
    "task-switching-psychology": ("psychology", "Switching tasks is set-shifting, an executive function"),
    "mind-wandering": ("psychology", "Mind-wandering comes in three kinds, and one is useful"),
    "social-loafing": ("psychology", "You try less in a group than alone"),
    "social-facilitation": ("psychology", "Being around others can improve your performance"),
    "hawthorne-effect": ("psychology", "Being observed changes what you do"),
    "pygmalion-effect": ("psychology", "High expectations lift performance"),
    "peak-end-rule": ("psychology", "You remember the peak and the end, not the average"),
    "hedonic-treadmill": ("psychology", "You return to baseline happiness after almost anything"),
    "negativity-bias": ("psychology", "Bad affects you more than an equal good"),
    "fundamental-attribution-error": ("psychology", "You blame character when the situation did it"),
    "self-serving-bias": ("psychology", "Self-esteem bends how you perceive yourself"),
    "overconfidence-effect": ("psychology", "Confidence runs ahead of accuracy"),
    "curse-of-knowledge": ("psychology", "Once you know it, you assume others do too"),
    "hindsight-bias": ("psychology", "It only looks predictable afterwards"),
    "survivorship-bias": ("psychology", "You only see the ones that made it"),
    "escalation-of-commitment": ("psychology", "Investing more because you already invested"),
    "endowment-effect": ("psychology", "You value what you own more than what you could get"),
    "ikea-effect": ("psychology", "You overvalue what you partly built yourself"),
    "not-invented-here": ("psychology", "Avoiding what comes from outside has a name"),
    "cognitive-dissonance": ("psychology", "Holding conflicting beliefs without noticing"),
    "framing-effect-psychology": ("psychology", "The same choice reads differently depending on the framing"),
    "information-overload": ("psychology", "Too much information makes the decision harder"),
    "satisficing": ("psychology", "Stop at good enough, deliberately"),
    "psychological-stress": ("psychology", "Stress is strain, and a small amount can help"),
    "coping": ("psychology", "Coping is how you manage unpleasant emotion, consciously or not"),
    "psychological-resilience": ("psychology", "Resilience is coping with a crisis and coming back quickly"),
    "self-compassion": ("psychology", "Turn compassion on yourself when you fail"),
    "broaden-and-build": ("psychology", "Positive emotion widens what you notice and try"),
    "job-crafting": ("psychology", "Reshape the job to fit you, not the other way round"),
    "work-life-balance": ("psychology", "Work-life balance is the equilibrium between the two"),
    "workaholic": ("psychology", "Working compulsively despite the damage is workaholism"),
    "occupational-stress": ("psychology", "Job stress is chronic, and it is manageable"),
    "loneliness": ("psychology", "Loneliness is social pain, and it is a signal"),
    "social-support": ("psychology", "Social support is knowing help is there"),
    "sleep-inertia": ("psychology", "You are impaired right after waking"),
    "power-nap": ("psychology", "A short nap that stops before deep sleep"),
    "chronotype": ("psychology", "Your chronotype is when your body wants to sleep"),
    "ultradian-rhythm": ("psychology", "Cycles shorter than a day run through your day"),
    "post-lunch-dip": ("psychology", "The after-lunch slump is physiological"),
    "directed-attention-fatigue": ("psychology", "Suppressing distraction wears out"),
    "boreout": ("psychology", "Too little to do can make you ill"),
    "divergent-thinking": ("psychology", "Divergent thinking explores many solutions at once"),
    "functional-fixedness": ("psychology", "You only see the usual use of a thing"),
    "fear-of-missing-out": ("psychology", "FOMO is apprehension about what you are not part of"),
    "social-comparison-theory": ("psychology", "Social comparison is how you try to evaluate yourself"),
    "self-handicapping": ("psychology", "Self-handicapping is avoiding effort so failure does not count"),
    "defensive-pessimism": ("psychology", "Setting low expectations on purpose is a strategy"),
    "learned-optimism": ("psychology", "Optimism can be learned by disputing negative self-talk"),
    "hyperfocus": ("psychology", "Hyperfocus is intense concentration on one thing"),
    "timeboxing": ("psychology", "Give the activity a maximum time and stop there"),
    "pomodoro-technique": ("psychology", "Twenty-five minutes on a kitchen timer, then a break"),
    "attention-span": ("psychology", "Attention span is the time before distraction takes over"),
    "attention-economy": ("psychology", "Your attention is what advertising-funded products maximise"),
    "nudge-theory": ("psychology", "Design the environment so the better choice is easier"),
    "commitment-device": ("psychology", "Restrict your future options to make the commitment real"),
    "writing-therapy": ("psychology", "Writing is used clinically for healing and growth"),
    "presenteeism": ("psychology", "Working while sick has a name and a cost"),
    "psychiatry": ("psychiatry", "Psychiatry is a medical specialty"),
    "mental-health": ("psychiatry", "Mental health is more than the absence of illness"),
    "mental-disorder": ("psychiatry", "A mental disorder is a pattern that causes distress or impairment"),
    "psychopathology": ("psychiatry", "Psychopathology is the study of mental illness"),
    "psychopharmacology": ("psychiatry", "Psychopharmacology is what drugs do to mood and thinking"),
    "psychiatrist": ("psychiatry", "A psychiatrist is a physician first"),
    "clinical-psychology": ("psychiatry", "Clinical psychology is the science of relieving psychological distress"),
    "mental-health-professional": ("psychiatry", "Mental health professional is a broad category"),
    "psychotherapy": ("psychiatry", "Psychotherapy is psychological method applied through regular contact"),
    "psychiatric-medication": ("psychiatry", "Psychiatric medication acts on the chemistry of the brain"),
    "mood-disorder": ("psychiatry", "A mood disorder is a disturbance of mood at its core"),
    "diagnostic-and-statistical-manual-of-mental-disorders": ("psychiatry", "The DSM is the shared language for classifying mental disorders"),
    "icd-11": ("psychiatry", "ICD-11 is the global standard for recording health conditions"),
    "comorbidity": ("psychiatry", "Comorbidity is two or more conditions at once"),
    "behavioral-activation": ("psychiatry", "Doing the thing lifts the mood, not the reverse"),
    "cognitive-restructuring": ("psychiatry", "Distorted thoughts can be caught and disputed"),
    "cognitive-behavioral-therapy": ("psychiatry", "CBT trains thoughts and behaviour together"),
    "occupational-burnout": ("psychiatry", "Burnout is a diagnosis about the workplace"),
    "attention-deficit-hyperactivity-disorder": ("psychiatry", "ADHD is a neurodevelopmental condition"),
    "major-depressive-disorder": ("psychiatry", "Depression is measured in weeks, not moods"),
    "anxiety-disorder": ("psychiatry", "Anxiety becomes a disorder when it takes over function"),
    "bipolar-disorder": ("psychiatry", "Bipolar disorder runs in episodes"),
    "insomnia": ("psychiatry", "Insomnia is a condition, not a character flaw"),
    "sleep-deprivation": ("psychiatry", "Short sleep is a health condition"),
    "psychoeducation": ("psychiatry", "Understanding the condition is part of treating it"),
    "generalized-anxiety-disorder": ("psychiatry", "Worry that is excessive, uncontrollable and gets in the way"),
    "panic-disorder": ("psychiatry", "Panic disorder is recurring unexpected panic attacks"),
    "panic-attack": ("psychiatry", "A panic attack is sudden, intense and physical"),
    "social-anxiety-disorder": ("psychiatry", "Social anxiety becomes a disorder when it impairs daily life"),
    "obsessive-compulsive-disorder": ("psychiatry", "OCD is intrusive thoughts and the compulsions that relieve them"),
    "post-traumatic-stress-disorder": ("psychiatry", "PTSD develops from experiencing a traumatic event"),
    "adjustment-disorder": ("psychiatry", "A maladaptive response to a stressor has a diagnosis"),
    "persistent-depressive-disorder": ("psychiatry", "Dysthymia is depression that lasts two years or more"),
    "seasonal-affective-disorder": ("psychiatry", "Depression that returns at the same time each year"),
    "cyclothymia": ("psychiatry", "Cyclothymia cycles between low and elevated mood"),
    "hypomania": ("psychiatry", "Hypomania is elevated mood and energy, short of mania"),
    "mania": ("psychiatry", "Mania is abnormally elevated mood with risky behaviour"),
    "anhedonia": ("psychiatry", "Anhedonia is losing the ability to feel pleasure"),
    "apathy": ("psychiatry", "Apathy is the absence of interest, concern or motivation"),
    "suicidal-ideation": ("psychiatry", "Suicidal ideation is thinking about the possibility of suicide"),
    "suicide-prevention": ("psychiatry", "Suicide is often preventable"),
    "crisis-hotline": ("psychiatry", "A crisis hotline is immediate counselling by phone"),
    "self-harm": ("psychiatry", "Self-harm is usually without suicidal intention"),
    "substance-use-disorder": ("psychiatry", "Persistent use despite substantial harm is the definition"),
    "alcohol-use-disorder": ("psychiatry", "Alcoholism is continued drinking despite the problems it causes"),
    "caffeine-dependence": ("psychiatry", "Caffeine dependence is a real substance dependence"),
    "cannabis-use-disorder": ("psychiatry", "Cannabis use disorder is in the DSM-5 and ICD-11"),
    "internet-addiction-disorder": ("psychiatry", "Problematic internet use is defined by impairment or distress"),
    "video-game-addiction": ("psychiatry", "Gaming disorder is compulsive use that impairs life"),
    "problematic-smartphone-use": ("psychiatry", "Smartphone dependence is a behavioural dependence"),
    "delayed-sleep-phase-disorder": ("psychiatry", "A delayed body clock is a disorder, not laziness"),
    "circadian-rhythm-sleep-disorder": ("psychiatry", "Sleep timing disorders are a family"),
    "sleep-disorder": ("psychiatry", "A sleep disorder is a medical disorder"),
    "hypersomnia": ("psychiatry", "Hypersomnia is too much sleep or too much sleepiness"),
    "sleep-apnea": ("psychiatry", "Sleep apnea is breathing that stops during sleep"),
    "chronic-stress": ("psychiatry", "A remembered stressor triggers the same response as a present one"),
    "acute-stress-reaction": ("psychiatry", "Psychological shock is a response to a terrifying experience"),
    "emotional-exhaustion": ("psychiatry", "Emotional exhaustion is a symptom of burnout"),
    "depersonalization-derealization-disorder": ("psychiatry", "Feeling detached from yourself is a dissociative disorder"),
    "adult-attention-deficit-hyperactivity-disorder": ("psychiatry", "Adult ADHD requires symptoms that started in childhood"),
    "attention-deficit-hyperactivity-disorder-management": ("psychiatry", "ADHD treatment is evidence-based practice"),
    "methylphenidate": ("psychiatry", "Methylphenidate is a stimulant used for ADHD"),
    "autism-spectrum": ("psychiatry", "Autism includes routine, sensory and social differences"),
    "antidepressant": ("psychiatry", "Antidepressants treat more than depression"),
    "selective-serotonin-reuptake-inhibitor": ("psychiatry", "SSRIs are the antidepressants typically used"),
    "anxiolytic": ("psychiatry", "An anxiolytic is anything that reduces anxiety, not only a drug"),
    "benzodiazepine-dependence": ("psychiatry", "Benzodiazepines can create dependence"),
    "mood-stabilizer": ("psychiatry", "Mood stabilisers treat sustained mood shifts"),
    "lithium-medication": ("psychiatry", "Lithium is a psychiatric medication for bipolar disorder"),
    "interpersonal-psychotherapy": ("psychiatry", "Interpersonal therapy is brief and focused on relationships"),
    "acceptance-and-commitment-therapy": ("psychiatry", "ACT is accepting the response and committing to the value"),
    "dialectical-behavior-therapy": ("psychiatry", "DBT is evidence-based and began with personality disorders"),
    "mindfulness-based-cognitive-therapy": ("psychiatry", "MBCT combines mindfulness with CBT to prevent relapse"),
    "mindfulness-based-stress-reduction": ("psychiatry", "MBSR is a course in mindfulness for managing stress"),
    "exposure-therapy": ("psychiatry", "Exposure therapy faces the source of the anxiety"),
    "cognitive-behavioral-therapy-for-insomnia": ("psychiatry", "CBT-I is the first-line treatment for insomnia, ahead of pills"),
    "behaviour-therapy": ("psychiatry", "Behaviour therapy uses techniques from behaviourism"),
    "online-counseling": ("psychiatry", "Therapy over the internet is a recognised form of care"),
    "telepsychiatry": ("psychiatry", "Psychiatric care can be delivered remotely"),
    "psychiatric-assessment": ("psychiatry", "An assessment gathers information to make a diagnosis"),
    "relapse-prevention": ("psychiatry", "Relapse prevention identifies the high-risk situations first"),
    "treatment-resistant-depression": ("psychiatry", "Treatment-resistant depression means two adequate trials failed"),
    "light-therapy": ("psychiatry", "Bright light is a treatment for seasonal and circadian disorders"),
    "melatonin-as-a-medication-and-supplement": ("psychiatry", "Melatonin is a hormone before it is a supplement"),
    "sleep-debt": ("psychiatry", "Lost sleep accumulates"),
    "microsleep": ("psychiatry", "A microsleep is a few seconds you did not choose"),
    "shift-work-sleep-disorder": ("psychiatry", "Working through the sleep period has its own disorder"),
    "anger-management": ("psychiatry", "Anger management is a psychotherapeutic programme"),
    "social-isolation": ("psychiatry", "Isolation is lack of contact, loneliness is how it feels"),
    "mental-health-first-aid": ("psychiatry", "First aid extends to mental health"),
    "peer-support": ("psychiatry", "People who have been there can help"),
    "self-help-groups-for-mental-health": ("psychiatry", "Self-help groups are voluntary and shared"),
    "emotional-dysregulation": ("psychiatry", "Dysregulation is intense, prolonged reactions you cannot flex"),
    "somatic-symptom-disorder": ("psychiatry", "Excessive focus on physical symptoms is itself a disorder"),
    "atypical-depression": ("psychiatry", "Atypical depression lifts in response to good events"),
    "psychological-trauma": ("psychiatry", "Trauma is the response, not the event"),
    "complex-post-traumatic-stress-disorder": ("psychiatry", "Complex PTSD follows prolonged, inescapable trauma"),
    "psychosis": ("psychiatry", "Psychosis is losing the line between real and not"),
    "caffeine-induced-anxiety-disorder": ("psychiatry", "Caffeine can cause an anxiety disorder"),
    "sleep-medicine": ("psychiatry", "Sleep has its own medical specialty"),
    "prolonged-grief-disorder": ("psychiatry", "Grief that does not resolve has a diagnosis"),
    "dissociation-psychology": ("psychiatry", "Dissociation ranges from mild detachment to disconnection"),
    "recovery-approach": ("psychiatry", "The recovery model centres on the potential to recover"),
    "executive-dysfunction": ("psychiatry", "Executive dysfunction disrupts the processes that manage the rest"),
    "neurodiversity": ("psychiatry", "Neurodiversity frames cognition and focus as differences"),
    "alexithymia": ("psychiatry", "Difficulty describing your emotions has a name"),
    "depression-mood": ("psychiatry", "Low mood affects around 280 million people"),
    "cognitive-distortion": ("psychiatry", "A distorted thought perceives reality inaccurately"),
    "worry": ("psychiatry", "Worry is distress from anticipated fear"),
    "wake-therapy": ("psychiatry", "Deliberate sleep deprivation is used to treat mood disorders"),
    "software-as-a-service": ("saas", "SaaS is software delivered and run by the provider"),
    "startup-company": ("saas", "A startup exists to find a scalable business model"),
    "product-market-fit": ("saas", "Product-market fit is how strongly the market wants it"),
    "minimum-viable-product": ("saas", "An MVP has just enough to get feedback from early customers"),
    "customer-development": ("saas", "Customer development is one third of a lean startup"),
    "churn-rate": ("saas", "Churn is the share of customers who leave in a period"),
    "lean-startup": ("saas", "Lean startup shortens the cycle to find out if the model is viable"),
    "subscription-business-model": ("saas", "Subscriptions are recurring payment for continued access"),
    "customer-lifetime-value": ("saas", "LTV is the net profit a customer brings over the whole relationship"),
    "customer-acquisition-cost": ("saas", "CAC is what it costs to persuade one customer"),
    "freemium": ("saas", "Freemium gives the basic product away and charges for more"),
    "entrepreneurship": ("saas", "Entrepreneurship is creating value by commercialising an opportunity"),
}

DEFINITIONS = {
    "psychology", "cognitive-psychology", "social-psychology", "behavioral-economics", "cognitive-science",
    "neuroscience", "positive-psychology", "cognitive-bias", "executive-functions", "attention", "motivation",
    "working-memory",
    "psychiatry", "mental-health", "mental-disorder", "psychopathology", "psychopharmacology", "psychiatrist",
    "clinical-psychology", "mental-health-professional", "psychotherapy", "psychiatric-medication", "mood-disorder",
    "diagnostic-and-statistical-manual-of-mental-disorders", "icd-11", "comorbidity",
    "software-as-a-service", "startup-company", "product-market-fit", "minimum-viable-product",
    "customer-development", "churn-rate", "lean-startup", "subscription-business-model", "customer-lifetime-value",
    "customer-acquisition-cost", "freemium", "entrepreneurship",
}


def wikipedia_tips():
    index = json.load(open(os.path.join(TEXT, "wikipedia-index.json")))
    tips = []
    for entry in index:
        topic, title = WIKIPEDIA_FRAMING[entry["slug"]]
        tips.append({
            "topic": topic,
            "title": title,
            "body": trim_to_sentences(entry["extract"]),
            "source": f"{entry['title']}, Wikipedia",
            "url": entry["url"],
            **({"definition": True} if entry["slug"] in DEFINITIONS else {}),
        })
    return tips


PAUL_GRAHAM = [
    ("Do things that don't scale",
     "Startups take off because the founders make them take off. The most common unscalable thing founders have to do at the start is recruit users manually, one at a time.",
     "https://paulgraham.com/ds.html"),
    ("Recruit your first users by hand",
     "You can't wait for users to come to you. You have to go out and get them. Stripe's founders would ask people who agreed to try it if they could set it up on their laptop right then, instead of emailing a signup link.",
     "https://paulgraham.com/ds.html"),
    ("A handful of delighted users beats a crowd of lukewarm ones",
     "It's better to have 100 people who love you than a million who sort of like you. Make a few users really happy and word spreads from there.",
     "https://paulgraham.com/ds.html"),
    ("Deliver insanely great customer service early",
     "Your first users should feel that signing up with you was the best choice they ever made. Over-serving them teaches you what the product actually needs to be.",
     "https://paulgraham.com/ds.html"),
    ("Start with a narrow market and expand",
     "Almost all startups are fragile initially. The way to succeed is to start with a market so small it seems barely worth having, then grow out of it.",
     "https://paulgraham.com/ds.html"),
    ("Notice problems, don't brainstorm ideas",
     "The very best startup ideas are things the founders themselves want, that they can build, and that few others realize are worth doing. Live in the future and build what's missing.",
     "https://paulgraham.com/startupideas.html"),
    ("Well is more important than many",
     "It's better to make a small number of users really love you than a large number merely like you. Almost all good startup ideas are of the type that make a few people intensely happy first.",
     "https://paulgraham.com/startupideas.html"),
    ("Beware ideas that only sound plausible",
     "Sitting down to think of startup ideas produces plausible-sounding ideas nobody wants. Real ideas come from noticing something broken in your own life.",
     "https://paulgraham.com/startupideas.html"),
    ("A startup is a company designed to grow fast",
     "Growth is the single metric that matters. Pick a growth rate you can hit each week and let it drive every decision about what to work on.",
     "https://paulgraham.com/growth.html"),
    ("Measure growth weekly, not monthly",
     "A good growth rate during YC is 5-7% a week. If you're doing 10% a week you're doing exceptionally well. Measuring weekly keeps you honest and keeps the feedback loop tight.",
     "https://paulgraham.com/growth.html"),
    ("Pick one number and optimize it",
     "Focus on one metric that captures the value you deliver, usually revenue or active users. Optimizing a single number turns a vague quest into a solvable problem.",
     "https://paulgraham.com/growth.html"),
    ("Do the schleps nobody else will",
     "The most valuable startup ideas are guarded by tedious, unglamorous work. Schlep blindness hides good ideas from founders who unconsciously filter out anything that looks like a grind.",
     "https://paulgraham.com/schlep.html"),
    ("Wealth is what people want, not money",
     "You make wealth by making something people want. Money is just a way of moving wealth around, so measure yourself by the thing you made, not the round you raised.",
     "https://paulgraham.com/wealth.html"),
    ("Be relentlessly resourceful",
     "The single best predictor of a founder's success is relentless resourcefulness: pushing through obstacles rather than being deflected by them.",
     "https://paulgraham.com/relres.html"),
    ("Don't spend money before you have to",
     "The most common way startups die is running out of money, and the most common way to run out of money is hiring too fast. Stay cheap and stay alive.",
     "https://paulgraham.com/startupmistakes.html"),
    ("Launch before you feel ready",
     "Not launching is a classic startup mistake. Until you launch you're only guessing what users want, and every week of guessing is a week wasted.",
     "https://paulgraham.com/startupmistakes.html"),
]

STACK = [
    ("Start from an open-source SaaS boilerplate",
     "Open SaaS is a free, open-source React and Node starter with auth, Stripe payments, an admin dashboard and deployment docs. Skipping the auth and billing plumbing saves weeks.",
     "Open SaaS", "https://opensaas.sh/"),
    ("Own your code, avoid vendor lock-in",
     "A boilerplate you can deploy anywhere beats a platform you can't leave. Check the licence and the deploy story before you build your business on top of it.",
     "Open SaaS", "https://github.com/wasp-lang/open-saas"),
    ("Keep the first year's infrastructure on free tiers",
     "Between free CI minutes, generous database free tiers and a cheap VPS, a pre-revenue SaaS should cost close to nothing to run. Spend the savings on getting users instead.",
     "SaaS Starter Stack", "https://github.com/timb-103/saas-starter-stack"),
    ("Bootstrap it as a side project first",
     "Founders who kept the day job until the product had paying users had a much easier time than those who went all in on day one. Give yourself a runway you don't have to raise.",
     "SaaS Starter Stack", "https://github.com/timb-103/saas-starter-stack"),
    ("Charge from the first day you can",
     "Free users tell you what they like. Paying users tell you what they need. Get the payment flow live early even if the price is wrong.",
     "SaaS Starter Stack", "https://github.com/timb-103/saas-starter-stack"),
    ("$500 MRR is the first real milestone",
     "The founders worth learning from are the ones who got past a few hundred a month, not the ones with a launch post. Aim for the first small recurring number and the rest compounds.",
     "SaaS Starter Stack", "https://github.com/timb-103/saas-starter-stack"),
]


NIH = [
    ("Two weeks is the line",
     "Seek professional help for severe or distressing symptoms that have lasted two weeks or more: trouble sleeping, appetite or weight changes, trouble concentrating, losing interest in things you enjoy, or not being able to finish your usual tasks.",
     "National Institute of Mental Health",
     "https://www.nimh.nih.gov/health/topics/caring-for-your-mental-health"),
    ("Stress and anxiety are not the same thing",
     "Stress is a response to an external cause and it goes away once the situation resolves. Anxiety is internal, persists even with no immediate threat, and interferes with how you live. The difference is what tells you when to get help.",
     "National Institute of Mental Health",
     "https://www.nimh.nih.gov/health/publications/stress"),
    ("Three signals that stress has gone too far",
     "You may be at risk for an anxiety disorder if the symptoms of your stress interfere with everyday life, make you avoid doing things, or seem to be always present.",
     "National Institute of Mental Health",
     "https://www.nimh.nih.gov/health/publications/stress"),
    ("Start with a doctor, not a diagnosis",
     "Talk to a primary care provider first. They can rule out a physical cause, because trouble concentrating or a change in mood is sometimes a medical condition, and refer you to a psychologist, psychiatrist or clinical social worker.",
     "National Institute of Mental Health",
     "https://www.nimh.nih.gov/health/topics/caring-for-your-mental-health"),
    ("Talk therapy has a method",
     "Psychotherapy helps you identify and change troubling emotions, thoughts and behaviours. Cognitive behavioural therapy makes you aware of automatic thinking that is inaccurate or harmful, then has you question it and see how it drives what you do.",
     "National Institute of Mental Health",
     "https://www.nimh.nih.gov/health/topics/psychotherapies"),
    ("Therapy and medication are both first-line",
     "Psychotherapy and medication are the two main treatments for anxiety, and many people benefit from a combination of the two. Which one fits is a decision to make with a professional, not alone.",
     "National Institute of Mental Health",
     "https://www.nimh.nih.gov/health/publications/stress"),
    ("Everyone is distracted sometimes, ADHD is different",
     "It is common to show inattention, restlessness and impulsivity now and then. In ADHD the behaviours are frequent, show up across school, work, home and relationships at once, and interfere with daily life.",
     "National Institute of Mental Health",
     "https://www.nimh.nih.gov/health/topics/attention-deficit-hyperactivity-disorder-adhd"),
    ("ADHD rarely travels alone",
     "ADHD often co-occurs with sleep problems, anxiety or depression, which makes all of them harder to diagnose and treat. NIH-supported research points at sleep as a target for early intervention.",
     "National Institute of Mental Health",
     "https://www.nimh.nih.gov/health/topics/attention-deficit-hyperactivity-disorder-adhd"),
    ("Decide what waits, then say no",
     "Set goals and priorities: decide what must get done now and what can wait, and learn to say no to new tasks when you are taking on too much. At the end of the day, count what you did finish.",
     "National Institute of Mental Health",
     "https://www.nimh.nih.gov/health/topics/caring-for-your-mental-health"),
    ("Self-care is an input, not a reward",
     "Thirty minutes of walking, regular meals and water, a sleep schedule with less screen light before bed, and one relaxing activity you actually enjoy. Small acts add up, and they support treatment rather than replace it.",
     "National Institute of Mental Health",
     "https://www.nimh.nih.gov/health/topics/caring-for-your-mental-health"),
    ("Name the unhelpful thought, then argue with it",
     "Identify and challenge your negative and unhelpful thoughts. That single move is the engine of cognitive behavioural therapy, and it works outside a therapist's office too.",
     "National Institute of Mental Health",
     "https://www.nimh.nih.gov/health/publications/stress"),
    ("Nobody trains themselves to need less sleep",
     "A common myth is that people can learn to get by on little sleep with no negative effects. Sleep deficiency makes learning, focusing and reacting harder, and it is linked to depression, heart disease and injury.",
     "National Heart, Lung, and Blood Institute",
     "https://www.nhlbi.nih.gov/health/sleep-deprivation"),
]


def main():
    tips = getting_real_tips()
    tips += [{"topic": "saas", "title": t, "body": b, "source": "Paul Graham", "url": u} for t, b, u in PAUL_GRAHAM]
    tips += [{"topic": "saas", "title": t, "body": b, "source": s, "url": u} for t, b, s, u in STACK]
    tips += wikipedia_tips()
    tips += [{"topic": "psychiatry", "title": t, "body": b, "source": s, "url": u} for t, b, s, u in NIH]
    duplicates = [title for title, n in Counter(tip["title"] for tip in tips).items() if n > 1]
    assert not duplicates, f"duplicate tip titles: {duplicates}"
    json.dump(tips, open(OUT, "w"), indent=1, ensure_ascii=False)
    counts = Counter(tip["topic"] for tip in tips)
    print(f"{len(tips)} tips ({', '.join(f'{n} {topic}' for topic, n in counts.most_common())}) -> {OUT}")


if __name__ == "__main__":
    main()
