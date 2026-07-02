# NeuroVid AI - AI Learning Video Generator

NeuroVid AI is a full-stack application that turns learning prompts into structured lessons, short quizzes, and generated video output. It demonstrates an end-to-end AI product workflow: authenticated users submit a topic, the system queues background jobs, generates content with Gemini, and delivers a finished result with status tracking.

**Highlights**
- End-to-end AI pipeline (prompt -> script -> quiz -> Hailuo video)
- Queue-based processing with BullMQ + Redis for scalability and tier priority
- Clerk authentication, credit-based usage limits, and Razorpay payments
- Real MiniMax Hailuo clip generation with ffmpeg stitching
- Clean, modern Next.js UI with real-time progress updates

## Why I Built This
I built NeuroVid AI to tackle a real learning pain point: turning dense topics into clear, visual explanations is time-consuming. The project is also a deliberate showcase of production-style engineering - background jobs, rate limiting, third-party integrations, and an observable backend - packaged into a user-friendly product.

## How It Helps Users
- **Students** get quick, bite-sized revision videos and quizzes.
- **Educators** can generate structured lesson outlines faster.
- **Creators** can bootstrap educational content at scale.
- **EdTech teams** can prototype AI-powered learning flows quickly.

## Key Features
- **AI script and quiz generation** using Google Gemini.
- **Video generation pipeline** using MiniMax Hailuo 2.3 Fast clips stitched into a final MP4.
- **Asynchronous jobs** via BullMQ workers with retries and progress.
- **Brain-dominance personalization** from a short user survey.
- **Secure authentication** and user gating with Clerk.
- **Credit wallet and paid plans** with Razorpay order creation, verification, and failed-generation refunds.
- **Free-trial abuse protection** with device/IP fingerprint redemption tracking.
- **Rate limiting** for generation and payment endpoints.
- **Admin queue dashboard** at `/admin/queues` for job visibility.
- **Health endpoint** at `/health` for service checks.

## Architecture
```
Client (Next.js)
   |
   v
API Server (Express)
   |
   v
Postgres + Redis
   |
   v
BullMQ Worker
   |
   v
Gemini (script/quiz) + MiniMax Hailuo + ffmpeg stitching
```

## Tech Stack
- **Frontend:** Next.js 16, React 19, Tailwind CSS, Radix UI, Framer Motion
- **Backend:** Node.js, Express, BullMQ, Drizzle ORM
- **AI:** Google Gemini (LLM), MiniMax Hailuo 2.3 Fast (video)
- **Infra:** Postgres, Redis
- **Auth and Payments:** Clerk, Razorpay

## Project Structure
- `client/` - Next.js frontend
- `server/` - Express API and workers
- `server/drizzle/` - SQL migrations

## Getting Started (VM Setup)

### 1) Prerequisites
Make sure your VM has:
- Node.js 20+ and npm
- Git
- Redis (local or hosted)
- Postgres (local or hosted)
- ffmpeg installed on the worker host/container

### 2) Clone the Repository
```
git clone https://github.com/Kunal1905/NeuroVid-AI.git
cd NeuroVid-AI
```

### 3) Install Dependencies
```
cd server
npm install

cd ../client
npm install
```

### 4) Environment Variables
Create two files:

**`server/.env`**
```
DATABASE_URL=postgres://user:password@localhost:5432/neurovid
REDIS_URL=redis://localhost:6379
CLIENT_ORIGIN=http://localhost:3000
PORT=3005

CLERK_SECRET_KEY=your_clerk_secret
CLERK_PUBLISHABLE_KEY=your_clerk_publishable

GOOGLE_API_KEY=your_gemini_api_key

MINIMAX_API_KEY=your_minimax_api_key
MINIMAX_GROUP_ID=your_minimax_group_id_optional

RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret

GST_ENABLED=false
ALLOW_VERCEL_PREVIEWS=false
```

**`client/.env.local`**
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3005
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key
```

### 5) Database Migrations
From `server/`:
```
npm run db:migrate
```

### 6) Run the App
Open three terminals:

**API server**
```
cd server
npm run dev
```

**Worker**
```
cd server
npm run worker
```

**Frontend**
```
cd client
npm run dev
```

The app will be available at `http://localhost:3000` and the API at `http://localhost:3005`.

## Usage Flow
1. Sign up or log in.
2. Complete the brain-dominance survey for personalization.
3. Enter a topic and submit a generation request.
4. The backend checks free-trial eligibility or reserves credits.
5. The worker generates script, quiz, Hailuo clips, stitches them, and stores the final video URL.
6. Track progress and view the final video output.

## Notes on Video Generation
Video generation now uses MiniMax Hailuo 2.3 Fast through `server/src/services/hailuo.service.ts`.
Each model call creates a short clip, and longer videos are split by `chainPlan()` in `server/src/config/VideoTiers.ts`.
The worker stitches clip URLs with ffmpeg through `server/src/services/Videostitch.service.ts`.

The object-storage upload in the stitcher still needs to be wired to your S3/R2 bucket before production use. Until that is implemented, ffmpeg can create the local final MP4, but the worker cannot return a permanent public video URL.

## Plans, Credits, and Refunds
- `1 credit = 1 second` of generated video.
- Free trial users get one fingerprint-gated short generation.
- Paid generations reserve credits before queuing.
- If a paid generation fails on the final BullMQ retry, the worker refunds the reserved credits.
- Queue priority is tier-aware: higher paid tiers are processed before lower tiers and free jobs.

## Roadmap
- Multi-language video support
- Voice customization
- Avatar-based lessons
- Real-time generation preview
- Mobile-first optimization

## License
MIT
