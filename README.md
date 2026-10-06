# Allz Bharat — Customer App

Expo (React Native) app for customers: browse shops, add to cart, check out (cash on delivery), track orders. Talks only to the Duo-Face server (`../server`) with a Firebase ID token — never to Firestore. See `docs/decisions/031-customer-app.md`.

## Run

```bash
cd customer
npm install
cp .env.example .env.local     # fill in Firebase web config (see below)
npx expo start                 # press w for web, or scan the QR code
```

### Look at the screens without any backend

Set `EXPO_PUBLIC_UI_PREVIEW=1` in `.env.local`. Every screen then runs on built-in sample data (shops, products, addresses, order placing and cancelling) with a PREVIEW banner. Development builds only.

### Real run

1. Server running (`cd server && npm run dev`) with a Firebase project configured.
2. In the Firebase console enable **Authentication → Email/Password**, register a Web app, and put its config in `.env.local` (`EXPO_PUBLIC_FIREBASE_*`).
3. On a physical phone leave `EXPO_PUBLIC_API_URL` unset (the app finds the dev machine), or set it to your LAN address.

## Sign-in

Email + password (Firebase JS SDK) works on web, iOS and Android with no native build. Phone OTP on iOS/Android needs a development build with native Firebase; `lib/authService.ts` is the seam it plugs into.

## Checks

```bash
npm run typecheck && npm run lint
```

There is no automated UI test framework yet; the cart logic in `lib/cart.ts` is pure and ready to test when one is added.
