🎥 NeuroVid AI – AI Learning Video Generator

NeuroVid AI is an intelligent learning assistant that transforms educational prompts into structured video content using advanced AI models. It automates the workflow from script creation to video rendering, enabling students, educators, and creators to generate high-quality educational videos effortlessly.


👉 Live Demo: Open NeuroVid AI


🚀 Features :-

🤖 AI Script Generation – Converts learning topics into well-structured scripts.

🎬 Automated Video Creation – Generates videos directly from AI-produced content.

🔐 Secure Authentication – Integrated with Clerk for safe user management.

⚡ Scalable Job Processing – Uses BullMQ for background video tasks.

🧠 LLM Integration – Supports modern AI models for intelligent responses.

☁️ Cloud Deployment – Hosted for fast and reliable performance.


🛠️ Tech Stack

Frontend

Next.js

React

Tailwind CSS

Backend

Node.js

BullMQ (for queue-based processing)

AI / APIs

LLM integrations

Video generation APIs

Authentication

Clerk

Deployment

Vercel


📌 How It Works

1. User enters a learning topic.

2. AI generates a structured educational script.

3. The system processes the script asynchronously.

4. Video is rendered automatically.

5. User receives ready-to-watch educational content.


💻 Installation & Setup
1️⃣ Clone the Repository
git clone https://github.com/Kunal1905/NeuroVid-AI.git
cd NeuroVid-AI

2️⃣ Install Dependencies
npm install

3️⃣ Configure Environment Variables

Create a .env file and add:

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

DATABASE_URL=

REDIS_URL=

AI_API_KEY=
VIDEO_API_KEY=

4️⃣ Run the Development Server
npm run dev


⚙️ Architecture Overview
User → Prompt Input
        ↓
     AI Script Engine
        ↓
   Queue (BullMQ)
        ↓
 Video Generation Service
        ↓
     Delivered to User


This architecture ensures non-blocking processing, allowing the app to scale efficiently under heavy workloads.


🎯 Use Cases

- Students creating revision videos

- Educators generating teaching content

- YouTubers automating educational production

- EdTech platforms scaling content creation


🔥 Challenges Faced

- Handling long AI responses efficiently

- Managing asynchronous video jobs

- Securing API keys and authentication

- Optimizing rendering time

- Designing a scalable architecture


🚧 Future Improvements

- Multi-language video support

- Voice customization

- Avatar-based teaching videos

- Real-time generation preview

- Mobile optimization
