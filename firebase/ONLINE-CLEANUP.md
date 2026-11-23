# Bereinigung temporärer Online-Daten im Spark-Tarif

Play2Gether hält Präsenz pro Browser-Tab und aktualisiert sie ungefähr alle zwei Minuten. Firebase entfernt die Präsenz eines Tabs über `onDisconnect`, sobald es dessen Verbindungsende erkennt. Ein weiterer Tab desselben Kontos bleibt online. Ein verbliebener Indexeintrag wird beim geplanten Lauf mit entfernt. Laufende Ludo- und Mau-Mau-Räume bleiben während kurzer Unterbrechungen erhalten. Ein Mitglied mit aktiver Verbindung verlängert den Raum. Bei langer Abwesenheit eines Gastes übernimmt der Host nach zehn Minuten mit der bestehenden Bot-Logik. Ist der Host länger als fünfzehn Minuten offline, verlassen verbundene Gäste den Raum, sobald ihr Browser den Ausfall erkennt. Ein kompletter Browser-Neustart stellt die im Host-Tab gehaltene Partie nicht wieder her.

| Eintrag | Frühestens zur Bereinigung zugelassen |
| --- | --- |
| Einladungen | Fünf Minuten nach Erstellung |
| Präsenz eines Tabs | Zehn Minuten nach dem letzten Signal, wenn der Disconnect-Eintrag blieb |
| WebRTC-Signalisierung | Fünfzehn Minuten nach Erstellung. Erreichbare Teilnehmer beenden die Signalisierung im normalen Ablauf früher. |
| Verwaiste Räume und zugehörige Mau-Mau-Hände | Fünfzehn Minuten nach dem letzten Signal eines Teilnehmers |

Der geplante Lauf löscht nur Einträge aus dem Index `expiry`. Er lädt daraus Kennungen und Zeitstempel, keine Profile, Spielstände oder Karten. Firebase überprüft das Alter beim Löschvorgang erneut. Raum, Karten und Index werden gemeinsam entfernt. Ein erneuertes Signal hat Vorrang, sobald es bei Firebase angekommen ist. Dauerhafte Profile, Fortschritte, Statistiken und Freundschaften liegen außerhalb der Bereinigung.

## Einrichtung

1. Beende offene Online-Partien, bevor du diese `index.html` und die dazugehörigen Regeln gemeinsam veröffentlichst. Ältere Clients brauchen danach einen Neuladevorgang. Cloud Functions werden dafür nicht benötigt.
2. Lege in **Firebase Authentication → Users** ein separates Konto für die Bereinigung an. Verwende ein eigenes starkes Passwort und eine Adresse außerhalb des für Spielerkonten vorgesehenen Bereichs `@spieler.2pg.invalid`. Das Konto erhält kein Play2Gether-Profil und benötigt keine Google-Cloud-IAM- oder Admin-Rechte.
3. Trage in der Firebase-Realtime-Database-Konsole unter `operations/cleanupUid` die exakte UID dieses Kontos als Zeichenfolge ein. Spieler und das Bereinigungskonto selbst können diese Einstellung nicht lesen oder ändern.
4. Lege im GitHub-Repository unter **Settings → Secrets and variables → Actions** die Secrets `FIREBASE_CLEANUP_EMAIL` und `FIREBASE_CLEANUP_PASSWORD` an. Lege unter **Variables** zusätzlich `FIREBASE_DATABASE_URL` und `FIREBASE_WEB_API_KEY` aus der Firebase-Web-App-Konfiguration an. Setze `PLAY2GETHER_CLEANUP_ENABLED` erst danach auf `true`.
5. Sobald der Workflow auf dem Standardbranch liegt, starte **Temporäre Online-Daten bereinigen** einmal über **Run workflow**. Das Log enthält nur Ergebniszahlen, keine Kennungen oder Zugangsdaten. Danach läuft der Job stündlich, soweit GitHub Actions ihn ausführt. Geplante Läufe können sich verzögern. Bei öffentlichen Repositories kann GitHub sie nach 60 Tagen ohne Repository-Aktivität deaktivieren.

Der Index wird mit dieser Website-Version aufgebaut. Historische Einträge ohne Index müssen separat in der Firebase-Konsole geprüft werden. Der Workflow ist bis zur Einrichtung deaktiviert.
