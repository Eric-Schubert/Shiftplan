# Shiftplan Mobile

Flutter client for the Schichtplaner API.

## Setup

Flutter is not committed into this repository. After installing the Flutter SDK, generate the native Android/iOS project files once:

```bash
cd mobile
flutter create . --platforms=ios,android
flutter pub get
```

Run against a local Nuxt backend. The Android emulator cannot reach the host machine through `localhost`, so it uses the special host alias `10.0.2.2`:

```bash
flutter run --dart-define=SHIFTPLAN_API_BASE_URL=http://10.0.2.2:3000
```

Common local backend URLs:

| Target | API base URL |
|--------|--------------|
| Android emulator | `http://10.0.2.2:3000` |
| iOS simulator | `http://127.0.0.1:3000` |
| Physical device | `http://<your-lan-ip>:3000` |
| Production | `https://<your-domain>` |

## MVP Scope

- Token login via `POST /api/auth/login` with `responseMode: "token"`
- Secure bearer-token storage
- Session restore and logout
- Weekly plan read via `GET /api/shiftplan`
- Staff assignment and removal via `POST /api/shiftplan/assign` and `/api/shiftplan/unassign`
