#!/usr/bin/env python3
import json
import os
import re

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEXT = os.path.join(REPO, "resources", "text")
OUT = os.path.join(REPO, "src", "tips.json")

SKIP_GETTING_REAL = {
    "01.1-what-is-getting-real",
    "01.2-about-basecamp",
    "01.3-caveats-disclaimers-and-other-preemptive-strikes",
    "13.1-start-your-engines",
}


def trim_to_sentences(body, limit=260):
    body = re.sub(r"\s+", " ", body).strip()
    out = ""
    for sentence in re.split(r"(?<=[.!?])\s+", body):
        if out and len(out) + len(sentence) + 1 > limit:
            break
        out = f"{out} {sentence}".strip()
    return out


def getting_real_tips():
    index = json.load(open(os.path.join(TEXT, "gettingreal-index.json")))
    tips = []
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
        tips.append({
            "title": entry["tagline"],
            "body": body,
            "source": "Getting Real, 37signals",
            "url": f"https://basecamp.com/gettingreal/{entry['slug']}",
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


def main():
    tips = getting_real_tips()
    tips += [{"title": t, "body": b, "source": "Paul Graham", "url": u} for t, b, u in PAUL_GRAHAM]
    tips += [{"title": t, "body": b, "source": s, "url": u} for t, b, s, u in STACK]
    json.dump(tips, open(OUT, "w"), indent=1, ensure_ascii=False)
    print(f"{len(tips)} tips -> {OUT}")


if __name__ == "__main__":
    main()
