# 2-Player-Games
2-Player-Games Website

## Online-Poker veröffentlichen

Poker erscheint bei den Kartenspielen und ist auch aus dem Mau-Mau-Menü erreichbar. Lokal kann man sofort gegen bis zu neun Computergegner spielen.

Online-Poker verwendet die bestehenden Firebase-Räume und privaten Kartenpfade. Veröffentliche vor dem ersten Online-Spiel [die aktualisierten Regeln](firebase/database.rules.json) in der Realtime Database des Projekts `play2gether-c4e05`. Das geht im Firebase-Dashboard unter **Realtime Database → Regeln → Veröffentlichen** oder mit der Firebase CLI aus dem Ordner `firebase`.

```sh
firebase deploy --only database --project play2gether-c4e05
```

Zum Testen einen Poker-Raum erstellen, einen Freund einladen und gegebenenfalls offene Plätze auf **Aus** oder **Computer** stellen. Jedes Gerät sieht bis zum Showdown nur seine eigenen Karten.
