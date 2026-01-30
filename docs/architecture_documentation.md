Perspective AI (V2.2 Neon)

A multi-agent reasoning system that provides comprehensive analysis of complex problems through structured debate and synthesis.

🧠 Core Architecture
Perspective AI employs a Debate-Synthesis architecture combining multiple specialized language models to analyze problems from different angles. The system consists of a Python/FastAPI backend and Next.js frontend.
Agent Pipeline

Meta Agent: Analyzes incoming queries and selects the optimal model from available APIs (DeepSeek, Qwen-Coder, Gemma, GPT-OSS, Qwen-Emb)
Clarification Agent: Identifies missing context and requests additional information when necessary
Agent A (Expansion): Explores the problem space through three analytical frameworks:

Engineering perspective (technical feasibility and constraints)
Human-centered perspective (stakeholder impact and user experience)
Pragmatic perspective (implementation and resource considerations)


Agent B (Compression): Critically evaluates arguments, identifies logical weaknesses, and prioritizes key considerations
Synthesis Agent: Integrates insights from the debate phase into a coherent, actionable recommendation

🚀 Key Features

Intelligent Model Selection: Automatic routing to the most appropriate LLM based on query characteristics
Context-Aware Processing: Full conversation history maintained across all agents for coherent multi-turn analysis
Structured Reasoning: Systematic exploration and evaluation of decision spaces
Privacy-First Design: All processing occurs locally via Ollama with no external data transmission

🛠️ Setup & Installation
Prerequisites

Python 3.11+
Node.js 18+
Ollama (with required models: deepseek-r1:1.5b, llama3.2)

Quick Start
Option 1: Automated Setup
bash/tmp/restart_backend.sh
Option 2: Manual Setup
Backend:
bashcd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
Frontend:
bashcd frontend
npm install
npm run dev
The application will be available at http://localhost:3000
📋 System Requirements

8GB+ RAM recommended
Ollama configured with at least 4GB model memory
Modern web browser with JavaScript enabled

🔒 Privacy & Security
This system prioritizes user privacy through:

Local Processing: All inference runs on-premises via Ollama
No Cloud Dependencies: No user data transmitted to external LLM services
Transparent Architecture: Open-source codebase for full auditability

📚 Documentation
For detailed information on:

Agent prompt engineering
Model configuration
API endpoints
Architecture diagrams

Please refer to the /docs directory.
🤝 Contributors
Built by David Ogunmuyiwa, Rajin Uddin, Josh Jennings, and Roan Curtis