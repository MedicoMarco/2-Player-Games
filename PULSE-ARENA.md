# Pulse Arena

Stilisierte Third-Person-Roboterarena für 2–4 Spieler. Offline-Training benötigt kein Konto; Online-Räume verwenden bestehende Play2Gether-Konten, Freunde, Raumcodes und Raum-Cleanup.

## Online-Aktivierung
Die Firebase-Regeln im Repository müssen vor Online-Tests in die bestehende Realtime Database deployed werden. Aus dem Projektordner: `firebase deploy --only database --project play2gether-c4e05 --config firebase/firebase.json` (nur mit autorisiertem Firebase-Zugang). Bestehende Regeln nicht durch Testregeln ersetzen. Kein neues Hosting und kein neuer Cloud-Speicher für Spielstände.

## Abnahme
- Offline: alle drei Maps, Touch und Tastatur, Sprünge, Kollisionen und Rundenende.
- Zwei getrennte Konten: Raum erstellen, Freund einladen oder Code verwenden, Plätze schließen, Einstellungen und Ausrüstung abgleichen, Runde starten und beenden.
- Vier Konten: Verbindungsabbruch, Raum verlassen, erneuter Beitritt in neuen Raum und Blockierregeln prüfen.
- Firebase-Nutzung beobachten: Host-Zustände maximal etwa 6,25/s; keine neuen dauerhaften Spielstände. Host-autoritative Simulation, aber ohne dedizierten Server kein belastbarer Schutz vor Manipulation durch den Host.
- Browser-/Gerätetests und Live-Deployment sind von den automatischen Physiktests getrennt.
