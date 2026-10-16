<!-- QR code scan and update notice of the Shiftplan app. Part of the "dienste" (services) section. -->
<template>
  <h4>QR code scan in the app</h4>
  <p>
    The app only uses the camera when someone taps “QR-Code scannen” (scan QR code). The image is analysed on the device, not stored and not transmitted.
    On iPhones, Apple Vision recognises the code entirely on the device. On Android, Google ML Kit does this, and the app asks for your consent
    beforehand. In doing so, ML Kit sends technical usage and performance data to Google: manufacturer and model, Android and app version, app identifier,
    a random identifier of the installation, image format and resolution, recognition time and error codes. Images and code contents are not included. The
    legal basis is your consent (Art. 6(1)(a) GDPR, Section 25(1) TDDDG). It applies until the app is closed; the app asks again before the next scan. App
    versions before 1.3.0 do not ask beforehand; there, the legal basis is Art. 6(1)(f) GDPR, with the legitimate interest in a simple and reliable setup
    of the app. Google may process this data in the USA; Google LLC is certified under the EU-US Data Privacy Framework (Art. 45 GDPR). Without a camera,
    the app can be connected using the address and code via “Ohne Kamera einrichten” (set up without camera).
  </p>

  <h4>Update notice in the app</h4>
  <p>
    After starting, the Shiftplan app checks whether a newer version is available. On iPhones, it queries Apple's App Store for this and only transmits
    the app identifier and the country; on Android, the check runs via the Google Play app on the device. For technical reasons, Apple or Google receives
    the device's IP address in the process. Data from Shiftplan such as names or shifts is not transmitted. The legal basis is Art. 6(1)(f) GDPR; the
    legitimate interest lies in pointing out updates with bug fixes. Apple Inc. and Google LLC may process data in the USA in the process; the basis for
    this is standard contractual clauses (Apple, Art. 46(2)(c) GDPR) or the EU-US Data Privacy Framework (Google, Art. 45 GDPR).
  </p>
</template>
