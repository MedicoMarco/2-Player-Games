# Systembenachrichtigungen für Play2Gether

Die Website auf GitHub Pages registriert einen Service Worker. Firebase Cloud Functions versenden Web Push bei Spieleinladungen sowie bei neuen Direkt-, Gruppen- und Spielraumnachrichten. WebRTC-Spielchats laufen in einer bestehenden Partie direkt zwischen den Browsern. Sie können auf diesem Gerät eine Meldung anzeigen, solange die Partie weiter verbunden ist.

## Firebase einmalig einrichten

Im Projekt `play2gether-c4e05` werden der Blaze-Tarif und Berechtigungen für Cloud Functions und Secret Manager benötigt. Die Befehle unten werden aus dem Ordner `firebase` mit einer angemeldeten Firebase CLI ausgeführt.

1. Installiere mit `npm --prefix functions install` die Abhängigkeiten. Erzeuge mit `./functions/node_modules/.bin/web-push generate-vapid-keys --json` einmalig das Schlüsselpaar für die Website.
2. Führe `firebase functions:secrets:set PLAY2GETHER_PUSH_VAPID --project play2gether-c4e05` aus. Gib den Wert in der Reihenfolge `öffentlicherSchlüssel,privaterSchlüssel,mailto:deine-kontaktadresse` ein. Bewahre den privaten Schlüssel im Secret Manager auf. Ein Wechsel des Schlüsselpaars erfordert neue Geräteabos.
3. Stelle die sechs Push-Funktionen bereit:

   ```sh
   firebase deploy --project play2gether-c4e05 \
     --only functions:gamePushSubscription,functions:removeGamePushSubscriptions,functions:pushGameInvitation,functions:pushDirectMessage,functions:pushGroupMessage,functions:pushRoomMessage
   ```

Melde dich anschließend auf der veröffentlichten HTTPS-Seite mit zwei befreundeten Konten in getrennten Browserprofilen an. Aktiviere auf dem Empfangsgerät im Online-Menü die Benachrichtigungen. Schließe dort die Seite, sende aus dem anderen Profil eine Spieleinladung und tippe auf die Meldung. Prüfe danach eine Direkt- und eine Gruppennachricht, einschließlich Stummschaltung und Blockierung. Auf iPhone und iPad ist dafür eine Home-Bildschirm-App erforderlich.

Spieleinladungen für einen Raum sind bis zu fünf Minuten gültig. Bei einer direkten Online-Herausforderung wartet der Absender bis zu einer Minute. Beim Antippen führt eine gültige Einladung in den Raum oder bestätigt die Herausforderung.
