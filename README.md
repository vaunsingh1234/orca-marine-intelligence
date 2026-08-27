# ORCA — Marine Intelligence Platform

Agentic AI-powered conversational platform for marine decision support. Fishermen, researchers, coastal authorities, disaster managers, and maritime operators can ask questions in natural language and receive evidence-based recommendations from Earth Observation, oceanographic, and geospatial data.

## Run the app

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`).

## Access flow

Registration is required before anyone can sign in.

1. **Register** — name, mobile number, and profession (Fisherman, Researcher, Coastal Authority, Disaster Management Agency, Maritime Operator).
2. **Verify** — fishermen receive an OTP by SMS on their mobile number and are never asked for an email. Every other profession supplies a work email and receives a verification code there.
3. **Set a password** — used for every future sign-in.
4. **Sign in** — fishermen use mobile number + password; all other roles may use either mobile number or email, plus their password. Unknown credentials are rejected with a prompt to register first.
5. **Forgot password** — sends a fresh code to the registered contact (SMS for fishermen, email otherwise) and lets the user set a new password.

### Prototype limitations

No backend is wired up yet, so accounts live in the browser's `localStorage` and passwords are only digested client side. Because there is no SMS or email gateway, the verification code is displayed on screen with an **Autofill** shortcut. Replace `frontend/src/auth/store.ts` with real API calls when the identity service is available.
