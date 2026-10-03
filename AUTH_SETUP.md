# Mobile API and Google sign-in setup

The Expo SDK remains on version 54. The client reads its API base URL from `EXPO_PUBLIC_API_URL`. Copy `.env.example` to `.env`; use `http://localhost:8080` for an emulator on the development computer, and the computer's LAN IP for a physical device on the same network.

Google sign-in requests an identity token and exchanges it with `POST /v1/auth/google`. The API JWT is stored in SecureStore and sent as a bearer token. Google Drive access and Drive scopes are not used.

## OAuth clients

Create separate Web, Android, and iOS OAuth client IDs in the same Google Cloud project. Configure the `googleWebClientId`, `googleAndroidClientId`, and `googleIosClientId` values in the Expo config, using the Android package and signing certificate that match the installed build. Release/EAS builds may require an Android OAuth client registered with the release certificate fingerprint. Do not put OAuth client secrets, API signing keys, database credentials, or Azure credentials in the mobile app.

The API's `GOOGLE_CLIENT_IDS` must include the client IDs accepted by the server. Rebuild after changing native OAuth configuration. No Google Drive API enablement or Drive consent scope is required.

## Current data behavior

Local app data is cached in AsyncStorage. On Google sign-in, the app validates the API session and pulls the server's pantry, recipe, and grocery-list data. The app's create/edit/delete UI writes are not yet fully connected to the API; do not treat local edits as shared or backed up until that checklist item is complete. Household membership and invites use the Go API.
