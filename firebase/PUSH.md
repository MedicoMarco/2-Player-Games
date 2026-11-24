# Systembenachrichtigungen mit Cloudflare Pages

Play2Gether nutzt weiterhin Firebase Authentication und Realtime Database im Spark-Tarif. Die Pages Function unter `/api/push` versendet Web Push für neue Spieleinladungen sowie Direkt-, Gruppen- und Spielraumnachrichten. Sie prüft dabei das Firebase-Konto, die in der Datenbank gespeicherte Nachricht oder Einladung und die Rechte des Empfängers. Die Systemmeldung enthält keinen Nachrichtentext.

## Einmalig im Browser einrichten

1. Öffne das GitHub-verbundene Pages-Projekt `2-player-games`. Der Produktionszweig ist `main`. Pages soll die Dateien des Repository-Hauptordners veröffentlichen und den vorbereiteten Pages-Worker `_worker.js` aus diesem Ordner laden. Der Worker wird bei Änderungen am Quellcode mit `npm run build:pages` neu gebündelt. Der bereitgestellte Worker braucht beim Deployment keinen zusätzlichen Build-Befehl.
2. Erzeuge im Browser ein VAPID-Schlüsselpaar mit [dem Schlüsselgenerator](https://medicomarco.github.io/2-Player-Games/firebase/push-schluessel.html). Öffne anschließend in Cloudflare **Settings → Variables and Secrets** und füge für **Production** ein **Secret** namens `PLAY2GETHER_PUSH_VAPID` ein. Füge den vollständigen erzeugten Wert ein. Behalte das Schlüsselpaar für zukünftige Deployments bei.
3. Öffne [Firebase → Projekteinstellungen → Dienstkonten](https://console.firebase.google.com/project/play2gether-c4e05/settings/serviceaccounts/adminsdk). Erzeuge einen privaten Schlüssel für den Zugriff des Servers auf Realtime Database. Öffne die heruntergeladene JSON-Datei und kopiere ihren vollständigen Inhalt in ein zweites **Production Secret** namens `PLAY2GETHER_FIREBASE_SERVICE_ACCOUNT`. Der Dienstkontoschlüssel ist vertraulich. Hinterlege ihn ausschließlich als Cloudflare-Secret.
4. Starte unter **Deployments** ein neues Produktionsdeployment. Beide Secrets müssen bei diesem Deployment verfügbar sein.

## Auf dem iPad testen

Öffne Play2Gether über Safari und füge es zum Home-Bildschirm hinzu. Öffne die Home-Bildschirm-App, melde dich an und wähle **Online → Benachrichtigungen einschalten → Erlauben**. Sende von einem zweiten befreundeten Konto eine Einladung oder Chatnachricht, während die App auf dem iPad geschlossen ist. Ein Tipp auf eine gültige Einladung öffnet den Raum oder nimmt die Online-Herausforderung an.

Die GitHub-Pages-Version nutzt dieselbe Cloudflare-Funktion. Installiere die Home-Bildschirm-App über die Adresse, die du künftig verwenden willst. Die Berechtigung und das Push-Abo gelten jeweils für die installierte Website.
