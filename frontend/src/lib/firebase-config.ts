/**
 * Firebase web app settings for browser alerts.
 *
 * These identify the project to Firebase and are public by design: every visitor's browser has to
 * receive them, and Firebase's own setup instructions paste them into client code. They are NOT
 * secrets. The secret half (the service account key) lives only in the backend environment.
 *
 * The values below are this project's settings, including its web push key (VAPID, the public half
 * of the key pair from Firebase console -> Project settings -> Cloud Messaging -> Web Push
 * certificates). Any of them can be overridden with NEXT_PUBLIC_* variables at build time.
 */
export interface FirebaseWebConfig {
  apiKey: string;
  projectId: string;
  messagingSenderId: string;
  appId: string;
  vapidKey: string;
}

/** The complete settings, or null if an override has blanked any piece. */
export function localFirebaseConfig(): FirebaseWebConfig | null {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBUmEvqPhTHwK9QY9JtbtGxloQww_-6yoc',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'insights-edb8b',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '16963825351',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:16963825351:web:c268721fbdcbc762bbd8e2',
    vapidKey:
      process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ||
      'BACAliPbv73JvPHH9IlB4IDMwASZ7xbp4Tg3YH0UwkjDu3Hn7TAPIAi25vS2LGRaPaik2Kk2BNGSrm2CLYGmZ5I',
  };
  return Object.values(config).every(Boolean) ? config : null;
}
