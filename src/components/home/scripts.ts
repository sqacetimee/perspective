export type PreviewKey = "relationship" | "code" | "general";

export type Script = {
  title: string;
  subtitle: string;
  accent: string;
  prompt: string;
  convo: { who: "Empathy AI" | "Logic AI"; text: string }[];
  agreement: string;
  response: string;
};

export const SCRIPTS: Record<PreviewKey, Script> = {
  relationship: {
    title: "Relationship",
    subtitle: "Tone + clarity + next step",
    accent: "from-rose-400/25 via-fuchsia-400/20 to-indigo-400/20",
    prompt:
      "My girlfriend says I’m distant lately. What do I say without starting a fight?",
    convo: [
      {
        who: "Empathy AI",
        text:
          "We should assume she feels ignored emotionally. Start by validating her feelings and apologizing for being distant.",
      },
      {
        who: "Logic AI",
        text:
          "Careful — we’re assuming the cause. We don’t actually know *why* she feels that way. We should ask what “distant” means to her before apologizing for the wrong thing.",
      },
      {
        who: "Empathy AI",
        text:
          "Good catch. Instead of assuming, we should validate the feeling itself and invite her to explain what she’s experiencing.",
      },
      {
        who: "Logic AI",
        text:
          "Then we add structure: propose a calm talk time tonight and one concrete follow-up so it doesn’t become vague.",
      },
    ],
    agreement:
      "We’ll validate without assuming, ask what she means by distant, and invite a calm talk tonight with one follow-up habit.",
    response:
      "Send:\n“Hey — I hear you. I don’t want you feeling alone, and I want to understand what you mean by ‘distant.’ Can we talk tonight? I’ll listen first.”\n\nThen follow through with one simple habit: a weekly fifteen-minute check-in so this doesn’t build up again.",
  },

  code: {
    title: "Code",
    subtitle: "Logic corrects the assumption",
    accent: "from-cyan-400/22 via-indigo-400/18 to-fuchsia-400/18",
    prompt:
      "My Next.js page is blank but there are no errors. Fastest way to find it?",
    convo: [
      {
        who: "Empathy AI",
        text:
          "This is probably a CSS issue — something like opacity or text color making it invisible.",
      },
      {
        who: "Logic AI",
        text:
          "That’s only one possibility. We don’t even know if the page is rendering. First we need to confirm whether the component runs at all.",
      },
      {
        who: "Empathy AI",
        text:
          "Right — so we should test rendering first before assuming it’s styling.",
      },
      {
        who: "Logic AI",
        text:
          "Exactly. Add a giant render marker. Then branch: not rendering vs rendering but hidden vs hydration issues.",
      },
    ],
    agreement:
      "We’ll verify rendering before assuming CSS, then isolate based on what the marker does.",
    response:
      "Do this in order:\n\none) Add a giant render marker at the top of the page component.\n\ntwo) Interpret behavior:\n• Marker never appears → wrong route or layout.\n• Marker appears but UI is blank → opacity, hidden, or overlay issue.\n• Marker flashes or changes → hydration/client boundary problem.\n\nthree) If it’s hydration:\nCheck for missing “use client”, random/date logic, and full-screen overlays.",
  },

  general: {
    title: "General",
    subtitle: "Burnout vs urgency",
    accent: "from-emerald-400/22 via-sky-400/18 to-violet-400/18",
    prompt:
      "Should I study tonight or go out? I’m burnt out, but I have a quiz tomorrow.",
    convo: [
      {
        who: "Empathy AI",
        text:
          "They should probably rest completely. Burnout means no studying tonight.",
      },
      {
        who: "Logic AI",
        text:
          "That assumes rest is better than preparation — but there’s a quiz tomorrow. We need balance, not avoidance.",
      },
      {
        who: "Empathy AI",
        text:
          "True. Instead of skipping entirely, we can make it feel emotionally manageable with a short block.",
      },
      {
        who: "Logic AI",
        text:
          "So we timebox it: one structured sprint, then stop and decide about going out.",
      },
    ],
    agreement:
      "We’ll do a short, structured study sprint instead of all-or-nothing.",
    response:
      "Do a ninety-minute sprint:\n• forty-five minutes: definitions + two examples\n• ten-minute break\n• thirty minutes: practice questions\n\nThen stop. If you still want to go out, go — you earned it. Protect sleep so you perform tomorrow.",
  },
};
