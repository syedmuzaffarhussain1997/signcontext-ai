<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# SignContext: AI-Powered Contextual Sign Language Translator

[![License: CC BY 4.0](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=flat&logo=vercel)](https://signcontext-ai.vercel.app/)
[![Gemini 3 Pro](https://img.shields.io/badge/Powered%20by-Gemini%203%20Pro-blue?style=flat&logo=google)](https://deepmind.google/models/gemini/)

## Overview
SignContext is an innovative accessibility application engineered to dismantle communication barriers for the deaf and hard-of-hearing community, affecting over 466 million individuals globally according to World Health Organization data. Developed using Google Gemini 3 Pro's advanced multimodal capabilities and vibe coding in Google AI Studio, this tool enables users to upload videos or audio files—such as lectures, meetings, or casual conversations—and receive real-time, context-aware captions and sign language translations. By integrating visual gesture detection, audio transcription, and sophisticated reasoning over environmental and cultural nuances, SignContext transforms raw inputs into meaningful, accurate outputs with confidence scores and ethical safeguards.

This project was created for the Google DeepMind Vibe Code Hackathon with Gemini 3 Pro, showcasing rapid prototyping of AI-driven solutions for real-world impact in the Accessibility track. The app is deployed live on Vercel for seamless, public access: [Try SignContext](https://signcontext-ai.vercel.app/).

## Why Unique from Google DeepMind's Perspective
From Google DeepMind's vantage point, SignContext stands out as a pioneering application of Gemini 3 Pro's multimodal reasoning in accessibility, extending beyond traditional sign language translation models like SignGemma (DeepMind's advanced ASL-to-text model, publicly released in 2025 for on-device use). While SignGemma excels in gesture recognition and text conversion, SignContext innovates by incorporating dynamic, state-of-the-art reasoning to infer contextual elements—such as environmental clues (e.g., background objects indicating a medical vs. casual setting), tonal nuances (e.g., sarcasm from facial expressions), or cultural variations in signs—that are often overlooked in existing systems. This aligns with DeepMind's emphasis on AI for societal benefit, as seen in their initiatives for enabling real-world value in accessibility and education, and leverages Gemini 3 Pro's superior performance in multimodal benchmarks like MMMU-Pro (multimodal understanding) and video comprehension, where it outperforms predecessors by over 50% in reasoning depth.

DeepMind views innovative Gemini applications as those that push boundaries in agentic AI for social good, such as creating helpful assistants that integrate tools like Search, Lens, and Maps for everyday utility. SignContext embodies this by vibe-coding a prototype that not only detects signs but reasons through ambiguities (e.g., disambiguating "bank" as financial or riverside based on video context), fostering inclusion in dynamic scenarios like education or professional collaborations—areas where DeepMind has highlighted AI's potential for Deaf culture awareness and device-camera detection advancements. Unlike static translators, its ethical integration (e.g., disclaimers for non-critical use) and scalability for multi-language expansion position it as a breakthrough, resonating with DeepMind's mission to demonstrate AI's societal impact through open models and real-world prototypes. This uniqueness lies in bridging Gemini's theoretical strengths—dynamic thinking for prompt reasoning and multimodal fusion—with practical, inclusive innovation, potentially inspiring DeepMind's future explorations in robotics or virtual assistants for physical-world accessibility.

## Key Features
- **Multimodal Input Processing**: Seamlessly handles video (for gesture detection) and audio (for speech transcription) using Gemini 3 Pro's native capabilities.
- **Contextual Reasoning Engine**: Applies advanced AI reasoning to interpret nuances, such as cultural sign variations or environmental context, with output explanations and confidence scores for transparency.
- **User-Friendly Interface**: Intuitive upload button, real-time preview pane, and clean output display, optimized for full-screen accessibility.
- **Ethical Safeguards**: Built-in disclaimers emphasizing non-medical/critical use, promoting responsible AI deployment.
- **Scalability**: Designed for future enhancements like multi-language support or integration with DeepMind tools (e.g., Project Astra for agentic extensions).

## Tech Stack
- **Core AI Model**: Google Gemini 3 Pro (multimodal reasoning and vibe coding via Google AI Studio and @google/generative-ai SDK).
- **Frontend**: React with TypeScript, Tailwind CSS.
- **Build Tools**: Vite for development and bundling.
- **Deployment**: Vercel for serverless hosting, ensuring low-latency public access.

## Installation & Local Setup
To run SignContext locally for development or testing:

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/signcontext-ai.git
   ```
2. Navigate to the project directory:
   ```
   cd signcontext-ai
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Set environment variables: Create a `.env` file and add your Gemini API key:
   ```
   VITE_API_KEY=your_api_key_here
   ```
   (Obtain a free key from [Google AI for Developers](https://ai.google.dev/gemini-api/docs)).
5. Start the application:
   ```
   npm run dev
   ```
6. Access at `http://localhost:5173` and test with sample video/audio files.

Note: Ensure Node.js v18+ is installed.

## Deployment
- **Vercel (Recommended)**: Fork this repo, connect to Vercel, and deploy with one click. Add `VITE_API_KEY` as an environment variable in Vercel settings. Live demo: [signcontext-ai.vercel.app](https://signcontext-ai.vercel.app/).
- **Render Alternative**: Use the provided build/start commands in a Render Web Service, linking your GitHub repo.
- **AI Studio Origin**: The core was vibe-coded in Google AI Studio; export for custom deploys.

## Usage
1. Visit the deployed app: [signcontext-ai.vercel.app](https://signcontext-ai.vercel.app/).
2. Upload a video or audio file (e.g., a short clip of sign language or spoken dialogue).
3. View the processed output: Contextual captions, translations, and reasoning explanations appear in real-time.
4. Refine if needed: Use the chat interface for clarifications (e.g., "Explain this sign in more detail").
5. Ethical Note: This is a prototype; always verify outputs in sensitive contexts.

Demo Video: [Watch on Loom](https://www.loom.com/share/647ea832276940abb9315a97f18a25bd) (2-minute walkthrough).

## License
This project is licensed under the Creative Commons Attribution 4.0 International License (CC BY 4.0)—see the [LICENSE](LICENSE) file for details. This open licensing aligns with DeepMind's commitment to publicly available models like SignGemma, enabling commercial and non-commercial reuse while attributing the original work.

## Acknowledgments
- **Google DeepMind**: For Gemini 3 Pro and the Vibe Code Hackathon, inspiring AI innovations for social good.
- **Hackathon Organizers**: For providing a platform to prototype impactful solutions.
- **Community**: Thanks to accessibility advocates and open-source contributors advancing AI for inclusion.

For inquiries or collaborations, contact [your-email@example.com]. Let's build a more accessible future together.
