# First setup and the Shiftplan app

Part of the [self-hosting guide](README.md).

## First setup

1. Open `https://plan.example.de`, tap the gear icon and sign in with `admin` and the initial password.
2. Change the password right away (**Einstellungen → Passwort ändern**, Settings → Change password).
3. Create shifts with times and minimum staffing, employees and a rotation pattern. Existing plans can be imported from Excel.
4. **Einstellungen → Team-Zugang → Name in der App** (Settings → Team access → Name in the app): set a name, for example "Pflegeteam Nord". Employees see it in the app, and the push relay uses it as the instance name.
5. Optionally set an access code under **Team-Zugang**. Without a code, anyone with the link can read the plan in the browser. With a code, a browser needs the code or the QR code once. This makes no difference for the app, which uses personal access.
6. For planners without admin rights, create separate users with the role "Planer" (planner). Usernames are case-sensitive.

**Important for the app:** every QR code contains the address under which the settings are currently open in the browser. So always create codes through the public address `https://plan.example.de`, never through `http://localhost:3000` or a LAN IP. Otherwise the QR code contains an address the phone cannot reach.

## Connecting the Shiftplan app

The Shiftplan app for iPhone and Android connects to any instance. Employees need no account and no email address. Anyone who does not want to use the app signs in the same way in the browser.

### Access for one person

1. In the browser, open **Einstellungen → App-Zugänge** (Settings → App access) as a planner or admin.
2. Select the person and create a QR code. The code is valid for 7 days and can be redeemed once.
3. Print the QR code or show it on screen.
4. In the app, tap "QR-Code scannen" (Scan QR code) and scan it, or open the link in a browser and choose "Im Browser anmelden" (Sign in in the browser).
5. On the first sign-in the person sets a PIN. After that they sign in on any further device with their short code (Kürzel, for example `MM`) and PIN, without a new QR code.

The QR code contains an address like `https://plan.example.de/?einladung=CODE`. The app remembers the instance and receives access bound to this one person. Without a camera, use "Ohne Kamera einrichten" (Set up without camera): enter the address `plan.example.de` and type in the code shown below the QR code.

Under **App-Zugänge** you see all devices that have been set up and can revoke individual ones. A revoked device loses access immediately and no longer receives pushes. Anyone removed or deactivated under **Mitarbeiter** (Staff) immediately loses all personal access, their PIN, open QR codes and push registrations, and their open requests are withdrawn. Read access and team pushes through the team link remain: without an access code, anyone with the link can read the plan and subscribe to team pushes in the browser; with a code, any browser that has entered the code before can (for up to 180 days). To lock someone out completely, set or change the access code under **Team-Zugang**. Deactivation can be undone, but the person then needs a new QR code. The instance deletes access that has not been used for 365 days. Forgotten PIN: use "PIN zurücksetzen" (Reset PIN) under **App-Zugänge** and create a new QR code. You change the short code under **Mitarbeiter**.

### Planner sign-in in the app

Planners can also sign in to the app with username and password ("Als Planer anmelden", Sign in as planner). There they can record absences, reassign days and notify the team. The sign-in is valid for 14 days and extends with use.

### Multiple instances

The app can store several shift plans, for example from two teams or employers. Pushes are assigned to the right plan.

Next: [Push notifications](push.md).
