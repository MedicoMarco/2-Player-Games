# Play2Gether – Prüfpunkte zu Datenschutz und Rechtstexten

Stand: 23. November 2026

Die Texte in `index.html` beschreiben den derzeit implementierten technischen Stand. Sie sind keine Zusage vollständiger Rechtskonformität und ersetzen keine individuelle Rechtsberatung.

## Vor einem dauerhaften öffentlichen Betrieb prüfen

1. **Betreiberangaben bestätigen:** Name, ladungsfähige Anschrift, Kontaktadresse und zuständige Datenschutzaufsicht müssen aktuell und vollständig sein.
2. **Firebase-Verträge und Region prüfen:** In der Firebase-/Google-Cloud-Konsole müssen die anwendbaren Datenverarbeitungsbedingungen akzeptiert und die tatsächliche Region jeder Realtime-Database-Instanz bestätigt werden. Eine Datenbankregion legt nicht automatisch den Ort von Firebase Authentication oder anderer Dienste fest.
3. **Meldungen löschen:** Für abgeschlossene Meldungen ist eine verbindliche Höchstfrist festzulegen. Bis eine automatische Löschung existiert, braucht es einen dokumentierten manuellen Prüflauf. Offene Fälle dürfen nur so lange gespeichert bleiben, wie sie für Prüfung, notwendige Maßnahmen oder Rechtsansprüche erforderlich sind.
4. **Kontolöschung nachbearbeiten:** Die Löschung im Browser kann nicht alle alten Nachrichten, Gruppenrollen, Meldungen und Spielreste sicher auffinden. Löschanfragen müssen deshalb zusätzlich manuell geprüft werden. Vor dem Löschen eines Gruppeneigentümers muss eine Übergabe oder Schließung der Gruppe geklärt werden.
5. **Minderjährigenschutz bewerten:** Es gibt keine Altersprüfung. Zu klären ist insbesondere, ob sich das Angebot gezielt an Kinder richtet und welche zusätzlichen Informations-, Einwilligungs- und Schutzpflichten daraus folgen.
6. **Chatbetrieb organisatorisch absichern:** Nur erforderliche Personen dürfen als Moderatoren freigeschaltet werden. Zugriffe und Entscheidungen sollten nachvollziehbar dokumentiert werden. Moderatoren dürfen keine pauschalen Leserechte für nicht gemeldete Chats erhalten.
7. **Neue Dienste nachtragen:** Analyse, Werbung, Push-Dienste, neue CDNs, weitere Firebase-Produkte oder andere externe Inhalte dürfen erst nach erneuter Datenschutz- und Einwilligungsprüfung ergänzt werden.
8. **Regelmäßige Prüfung:** Rechtstexte, Firebase-Regeln und tatsächlicher Betrieb müssen nach Funktionsänderungen sowie in angemessenen Abständen gemeinsam geprüft werden.

## Verwendete Primärquellen

- [Datenschutz-Grundverordnung, insbesondere Art. 5, 6, 8, 12–23 und 32](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679)
- [Firebase: Privacy and Security](https://firebase.google.com/support/privacy)
- [Firebase: Speicherorte von Produkten und Ressourcen](https://firebase.google.com/docs/projects/locations)
- [GitHub General Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement)

