# AudioScribe - AI-Powered Video Conferencing

<div align="center">
  <br />
  <h3 align="center">A Modern Video Conferencing & Summarization Platform</h3>
  <p align="center">
    Built with Next.js, featuring real-time meeting transcription and AI-powered meeting summarization using Groq & AssemblyAI.
  </p>
</div>

## 🚀 Features

- **Video Conferencing**: Real-time video calls with screen sharing, recording, and participant management.
- **AI Meeting Summarization**: Automatically generate intelligent summaries of recorded meetings using blazing-fast Groq LLMs.
- **Speaker Diarization**: Accurately maps spoken words to actual meeting participants rather than generic labels.
- **Authentication**: Secure login with Clerk authentication.
- **Meeting Management**: Schedule, join, and manage meetings with ease.
- **Recording Playback**: View, replay, and download summaries of past meeting recordings in PDF format.
- **Personal Rooms**: Create permanent meeting rooms with unique links.

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with TypeScript
- **Authentication**: Clerk
- **Video SDK**: Stream.io
- **Transcription SDK**: AssemblyAI
- **AI Integration**: Groq API
- **Styling**: Tailwind CSS, shadcn/ui
- **UI Components**: Radix UI

## 📋 Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Clerk account (for authentication)
- Stream.io account (for video functionality)
- Groq API key (for meeting summarization)
- AssemblyAI API key (for meeting transcription)

## 🔧 Installation

1. **Clone the repository**
```bash
git clone https://github.com/gautam-kabra/AudioScribe.git
cd AudioScribe
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Create a `.env.local` file in the root directory:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard

# Stream.io Video
NEXT_PUBLIC_STREAM_API_KEY=your_stream_api_key
STREAM_API_SECRET=your_stream_secret_key

# Base URL (change to your deployed domain later)
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# AI APIs (for transcription and summarization)
GROQ_API_KEY=your_groq_api_key
ASSEMBLYAI_API_KEY=your_assemblyai_api_key
```

4. **Run the development server**
```bash
npm run dev
```

5. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

## 🎯 Key Features

### Meeting Summarization & Action Items
- Record meetings and automatically transcribe audio with speaker identification.
- Generate AI-powered summaries with actionable insights and next steps.
- Extract targeted action items and export reports as PDFs.

### Video Conferencing
- Start instant meetings or schedule future ones.
- Join meetings via invitation links.
- Full meeting controls (mute, video, screen share, reactions, etc.)
- Grid and speaker view layouts.

### Meeting Management
- View upcoming meetings.
- Access past meeting recordings.
- Personal meeting room with permanent link.

## 📁 Project Structure

```
├── app/
│   ├── api/
│   │   └── summarize/          # Meeting summarization API endpoint
│   ├── (auth)/                 # Authentication pages
│   ├── (root)/                 # Main application pages
│   └── meeting/                # Meeting room pages
├── components/
│   ├── ui/                     # Reusable UI components
│   └── ...                     # Feature components
├── hooks/                      # Custom React hooks
├── lib/                        # AI Services & Utility functions
└── constants/                  # App constants
```

## 🔐 Getting API Keys

### Clerk (Authentication)
1. Sign up at [clerk.com](https://clerk.com/)
2. Create a new application
3. Copy your publishable key and secret key

### Stream.io (Video)
1. Sign up at [getstream.io](https://getstream.io/)
2. Create a new application
3. Copy your API key and secret key

### Groq (AI Summarization)
1. Go to [Groq](https://groq.com/)
2. Sign in with your Groq account
3. Create a new API key

### AssemblyAI (Transcription)
1. Go to [AssemblyAI](https://www.assemblyai.com/)
2. Create an account and generate an API key

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub.
2. Import your repository on [Vercel](https://vercel.com).
3. Add your environment variables (from `.env.local`) to the Vercel project settings.
4. Set `NEXT_PUBLIC_BASE_URL` to your Vercel production domain.
5. Deploy!

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

Built with ❤️ using Next.js, Stream, AssemblyAI, and Groq.
