# RunIt Pittsburgh

Pickup basketball court finder for Pittsburgh, PA. Built with React + Vite, Tailwind CSS, React Router, and Mapbox.

## Getting Started

1) Install dependencies:

```bash
npm install
```

2) Start the dev server:

```bash
npm run dev
```

Open the local URL shown in the terminal.

## Firebase Setup

1) Create a Firebase project at https://console.firebase.google.com.
2) Enable Authentication → Email/Password.
3) Create a Web App in the Firebase project settings.
4) Create a `.env` file at the project root with your Firebase config:

```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Notes

- The map uses OpenStreetMap tiles via Leaflet (no paid API key required).
- The map centers on Pittsburgh and includes five hardcoded court markers.
- The map is mobile-first and fills the viewport height under the header.
