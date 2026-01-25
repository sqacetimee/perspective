# Perspective AI (V2.2 Neon)

> A multi-agent reasoning system that helps users navigate complex decisions through expanding and compressing perspectives.

## 🧠 Core Architecture
This system uses a **Debate-Synthesis** architecture managed by a Python/FastAPI backend and a Next.js frontend.

### The Agents
1.  **Meta Agent:** Analyzes the prompt to select the best underlying model of all 5 apis (deepseek, qwen-coder, gemma, gpt-oss, qwen-emb).
2.  **Clarification Agent:** Smartly asks for missing context (or skips if sufficient).
3.  **Agent A (Expansion):** "The Explorer". Uses **3 Distinct Lenses** (Engineer, Empath, Pragmatist) to widen the problem space.
4.  **Agent B (Compression):** "The Editor". Uses **Constructive Critique** logic to pick apart arguments and narrow focus.
5.  **Synthesis Agent:** Delivers the final answer in a clear **Second-Person** ("You") perspective.

## 🚀 Features (V7 Upgrade)
-   **Punchy Prompts:** Highly tuned system prompts for "Healthy" vs "Wounded" reasoning patterns.
-   **Scanner Mode:** Agents actively detect and flag dysregulated behavioral patterns.
-   **Full Context Debate:** Agents have full visibility into the entire conversation history (no amnesia).
-   **Crisis Safety:** Integrated protocols for Canadian crisis response (911/Helplines).

## 🛠️ Setup & Running

### Prerequisites
-   Python 3.11+
-   Node.js 18+
-   Ollama (running locally with `deepseek-r1:1.5b` and `llama3.2`)

### Quick Start
The easiest way to run the full stack is the helper script:

```bash
/tmp/restart_backend.sh
```

Or manually:

**Backend:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

**Frontend:**
```bash
npm run dev
```

## 🔒 Privacy
This system is designed with a **privacy-first** approach. All reasoning happens locally via Ollama. No user data is sent to external cloud LLMs.

--*Built by David Ogunmuyiwa, Rajin Uddin, Josh Jennings, and Roan Curtis 
