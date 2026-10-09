<!-- Dienste, die die Shiftplan-App (iOS und Android) anspricht. Teil des Abschnitts "dienste". -->
<template>
  <h4>Benachrichtigungen in der Shiftplan-App</h4>
  <p>
    Nutzt jemand die Shiftplan-App mit Benachrichtigungen, laufen Pushes über den Push-Dienst
    push.shiftplan.info von ES Software, der über das Netzwerk von Cloudflare (Cloudflare, Inc.,
    101 Townsend St., San Francisco, CA 94107, USA) erreichbar ist, und über Firebase Cloud
    Messaging (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland), auf
    iPhones zusätzlich über den Apple Push Notification Service (Apple Inc., One Apple Park Way,
    Cupertino, CA 95014, USA).
  </p>
  <p>
    Diese Nachrichten sind auf dem Transport verschlüsselt, aber nicht Ende-zu-Ende: ES Software,
    Cloudflare, Google und Apple können den Text technisch lesen. Automatische Hinweise auf
    Planänderungen enthalten deshalb nur Kalenderwoche und Schicht, keine Namen. Namen stehen nur
    in Nachrichten, die jemand bewusst auslöst: Ausfallmeldungen (Name, Tag, Schicht, optional
    ein Zusatztext, nie der erfasste Grund), Übernahme- und Tauschanfragen (Name, Schicht oder
    Zeitraum, optional eine Nachricht), deren Zu- oder Absage sowie Nachrichten der Planung.
    Gesundheitsangaben gehören deshalb nicht in diese Freitexte. Der Push-Dienst speichert weder
    Inhalte noch Gerätetokens.
  </p>
  <p>
    Google und Cloudflare sind unter dem EU-US Data Privacy Framework zertifiziert; soweit Daten
    in die USA übermittelt werden, erfolgt dies auf Grundlage des Angemessenheitsbeschlusses der
    EU-Kommission (Art. 45 DSGVO). Für die Zustellung auf iPhones erhält Apple das Gerätetoken und
    den Inhalt der Nachricht; dabei ist eine Verarbeitung in den USA möglich. Rechtsgrundlage ist
    die Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Sie lässt sich je Team in
    den App-Einstellungen unter „Benachrichtigungen“ („Aus“) oder in den Systemeinstellungen
    jederzeit widerrufen.
  </p>

  <h4>QR-Code-Scan in der App</h4>
  <p>
    Die Kamera nutzt die App nur, wenn jemand „QR-Code scannen“ tippt. Das Bild wird auf dem
    Gerät ausgewertet, nicht gespeichert und nicht übertragen. Auf iPhones erkennt Apple Vision
    den Code vollständig auf dem Gerät. Auf Android übernimmt das Google ML Kit (Google Ireland
    Limited, siehe oben). ML Kit sendet dabei technische Nutzungs- und Leistungsdaten an Google:
    Gerätemodell, Android- und App-Version, eine zufällige Kennung der Installation,
    Erkennungsdauer und Fehlercodes. Bilder und Codeinhalte sind nicht dabei. Rechtsgrundlage ist
    Art. 6 Abs. 1 lit. f DSGVO; das berechtigte Interesse liegt in einer einfachen und
    zuverlässigen Einrichtung der App. Ohne Kamera lässt sich die App über „Ohne Kamera
    einrichten“ mit Adresse und Code verbinden.
  </p>

  <h4>Update-Hinweis in der App</h4>
  <p>
    Nach dem Start prüft die Shiftplan-App, ob eine neuere Version verfügbar ist. Auf iPhones
    fragt sie dazu beim App Store von Apple nach und überträgt nur die App-Kennung und das Land,
    auf Android läuft die Prüfung über die Google-Play-App auf dem Gerät. Apple bzw. Google
    erhalten dabei technisch bedingt die IP-Adresse des Geräts. Daten aus Shiftplan wie Namen
    oder Schichten werden nicht übertragen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; das
    berechtigte Interesse liegt darin, auf Updates mit Fehlerbehebungen hinzuweisen.
  </p>
</template>
