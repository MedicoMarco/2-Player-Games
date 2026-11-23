# Chat-Grundlage für Play2Gether

## Aktive Firebase-Pfade und kombinierte Änderungen

| Pfad | Zweck und Zugriff |
| --- | --- |
| directMessages/{uidA}/{uidB}/{id} | Verlauf für beide aktuell bestätigten Freunde. Einzelne Nachrichten und Abfragen mit höchstens 50 Einträgen. |
| groups/{gid}, groupIndex/{uid}, groupInvitations/{uid} | Gruppenprofil und Rollen, privater Mitgliedschaftsindex und private Einladungen. Platz, Mitgliedschaftsindex und Einladung ändern sich beim Beitritt in einem Schreibvorgang. |
| groupMessages/{gid}/{id} | Nur aktuelle Mitglieder lesen einzelne Nachrichten oder eine nach Sendezeit begrenzte Abfrage ab ihrem Beitritt. Versand und Änderungen prüfen die Mitgliedschaft auch im Ergebnis eines kombinierten Schreibvorgangs. |
| rooms/{code}/chat/{seat} | Letzte Nachricht am belegten Spielplatz. Dieselbe Realtime Database prüft den Platz, die UID und den Spielstatus. Direkte Zweierpartien übertragen Chattext über WebRTC. |
| chatPreferences/{uid} und blocked/{uid} | Private Lese- und Benachrichtigungseinstellungen, Anheftungen und die bestehende Blockierliste des Kontos. |
| dmReports, groupReports, roomChatReports, peerChatReports | Unveränderlicher Bericht mit separatem Bearbeitungsstatus. Nur ausdrücklich freigeschaltete Moderationskonten dürfen Meldungen abrufen und bearbeiten. |
| dmThrottle und chatReportThrottle | Private Daten zur zeitlichen Begrenzung von Nachrichten und Meldungen. |

Die Regeln prüfen bei neuen oder geänderten Direktnachrichten auch die resultierende Freundschaft und Blockierliste. Eine gleichzeitige Blockierung oder Auflösung der Freundschaft kann daher keine weitere Nachricht mitveröffentlichen. Gruppenmitgliedschaft, Einladungen und Inhaberschaft werden bei zusammengefassten Änderungen sowohl vor als auch nach dem Vorgang geprüft. Die vorhandenen Konto-, Freundschafts- und Spielpfade werden weiterverwendet. Für diese Prüfung ist keine Datenmigration erforderlich.


## Meldungen bearbeiten

Über die Firebase-Konsole kann der Betreiber die UID eines angemeldeten Moderationskontos unter chatV1/control/moderators/{uid} auf true setzen. Der Menüpunkt Moderation erscheint dann für dieses Konto. Er zeigt ausschließlich gemeldete Nachrichten, Meldegrund, Quelle, beteiligte Kennungen und Bearbeitung. Moderatoren können Meldungen prüfen, verwerfen oder wieder öffnen. Eine Meldung pro Nachricht und Melder ist möglich; Firebase lässt pro Konto frühestens nach 30 Sekunden die nächste Meldung zu. Die ursprüngliche Meldung bleibt nach einer Bearbeitung unverändert. Berechtigung und Freigabe erfolgen über Firebase-Regeln. Das Entfernen der UID entzieht den Zugriff.

Privat- und Gruppenmeldungen übernehmen den zum Meldezeitpunkt in Firebase sichtbaren Text. Spielchatmeldungen erhalten die Kennung von Raum oder Partie. Bei der neuesten Nachricht eines Platzes kann Firebase den Text kontrollieren. Bei älteren Raumtexten und direkten WebRTC-Spielen ist der Text eine unbestätigte Angabe. Bei direkten Spielen bestätigen die Regeln anhand des bestehenden Match-Eintrags lediglich, dass der Melder und der gemeldete Spieler in derselben angenommenen Partie sind. Die Spielteilnahme wird während einer offenen WebRTC-Verbindung über den vorhandenen Ablauf für Match-Einträge verlängert. Normales Verlassen löscht diesen Eintrag, verwaiste Einträge folgen der bestehenden Aufräumroutine für Online-Partien. Bereits gespeicherte Meldungen bleiben in der geschützten Warteschlange. Die Sicherung offener Meldungen und Löschung abgeschlossener Fälle übernimmt der Betreiber.


## Chat während Online-Partien

Bis zu vier menschliche Plätze können Sprechblasen am Spielplatz sehen. Bei mehr Spielern, engem oder gedrehtem Spielfeld zeigt die rechte Seite einen gemeinsamen Verlauf. Die geöffneten Clients halten empfangene Nachrichten bis zum Partiewechsel im Arbeitsspeicher. Im aufgeklappten Fenster sind ältere Nachrichten in Schritten zu 40 Einträgen abrufbar. Ludo und Mau-Mau speichern pro Sitzplatz nur die neueste Nachricht in rooms/{code}/chat/{seat}. Die Regeln prüfen Spielstatus, belegten Sitz, Absender, maximal 180 Zeichen und mindestens 2,2 Sekunden zwischen Nachrichten. Bei einer Revanche beginnt die Anzeige neu. Beim Entfernen des Raums verschwinden auch die Nachrichten. Verwaiste Räume folgen der bestehenden Aufräumroutine für Räume. Direkte Zweierpartien übertragen Texte über die bestehende WebRTC-Verbindung und speichern sie im Browser für die Dauer der Verbindung. Spielchat-Nachrichten können über die Optionen im geöffneten Spielchat gemeldet werden. Im laufenden Spiel lässt sich ein Absender für die Partie ausblenden oder dauerhaft blockieren. Bestehende Spielplätze bleiben in laufenden Räumen zugänglich. Einladungen und Lobbyzugriff prüfen weiterhin Blockierungen.

## Gruppen und Chatübersicht

Die Chatübersicht sortiert nach letzter Nachricht, angeheftete Unterhaltungen erscheinen zuerst. Stummschalten blendet die Vorschau aus. Direktantworten sind in der geöffneten Website verfügbar. Firebase speichert persönliche Einstellungen und den zuletzt gesehenen Sendezeitpunkt unter `chatPreferences/{uid}`. Die Vorschau bleibt beim Wechsel zwischen Privat- und Gruppenchats erreichbar. Der Zähler umfasst bis zu 50 aktuelle Nachrichten je Unterhaltung. Ein Plus kennzeichnet mögliche ältere ungelesene Nachrichten. Im Verlauf bleibt die Leseposition erhalten, bis der Nutzer wieder ans Ende springt.

Gruppen verwenden `groups`, `groupIndex`, `groupInvitations`, `groupMessages` und `groupReports`. Die Datenbank beschränkt Gruppen auf 30 Plätze. Beim Beitritt werden Einladung, Platz und persönlicher Index gemeinsam geschrieben. Der Verlauf ist nur für aktuelle Mitglieder und ab der eigenen Beitrittszeit abrufbar. Die Inhaberschaft kann an einen bestehenden Admin übertragen werden. Der Inhaber kann die Gruppe schließen. Der gespeicherte Verlauf einer geschlossenen Gruppe kann vom Betreiber bereinigt werden. Blockierte Absender werden in gemeinsamen Gruppen in der Oberfläche ausgeblendet.

Website-Dateien gemeinsam über GitHub Pages bereitstellen und die vollständige `database.rules.json` in Firebase veröffentlichen.

## Aktiver Privatchat nach der neuen Chatbeschreibung

Die Website nutzt für freie Privatchats die Pfade `directMessages/{uidA}/{uidB}/{id}`, `dmThrottle/{uid}` und `dmReports/{uidA}/{uidB}/{id}/{melder}`. Die Website sortiert die UIDs für einen gemeinsamen Verlauf. Die Datenbank prüft beide Freundschaften und Blockierlisten. Zwischen Schreib- oder Bearbeitungsvorgängen liegen mindestens zwei Sekunden je Konto. Beide Freunde können die letzten 50 Einträge und ältere Seiten abrufen. Ein Meldedatensatz hält die gemeldete Textfassung fest. Berechtigte Moderatoren werden über `chatV1/control/moderators/{uid} = true` durch den Betreiber verwaltet. Meldungen werden im geschützten Menüpunkt Moderation bearbeitet. Verlauf und Meldungen brauchen bei einer Kontolöschung eine separate Bereinigung durch den Betreiber.

Die folgenden Abschnitte dokumentieren den früheren Entwurf unter `chatV1`. Dessen Freigabeschalter wird für den neuen Privatchat nicht benötigt.

Die Regeln verwenden Firebase Authentication und die bestehenden Pfade für Freundschaften, Blockierungen und Spielräume. Der Schalter `chatV1/control/enabled` lässt sich nur durch einen Firebase-Administrator setzen. Standardmäßig ist er aus. Nachrichten, Mitgliedschaften, Einladungen und Moderationsdaten werden ausschließlich durch den späteren vertrauenswürdigen Dienst geschrieben. Eine Chat-Oberfläche und produktive Chatdaten gehören zu den folgenden Punkten.

## Datenpfade

Alle folgenden Pfade liegen unter `chatV1`.

| Pfad | Inhalt und Zugriff |
| --- | --- |
| `control/enabled` | Zentraler Schalter. Administration über Firebase. |
| `conversations/{cid}` | Typ `direct`, `group` oder `game`, Zustand `active` oder `closed` und höchste veröffentlichte Sequenz `lastSeq`. Bei Direktchats enthalten `directA` und `directB` die beiden UIDs. Gruppen erhalten Name und Inhaber. Spielchats erhalten eine `sessionId` und bei Raumspielen zusätzlich `roomCode`. |
| `memberSlots/{cid}/{slot}` und `memberIndex/{cid}/{uid}` | Gruppen und Spielchats verwenden Plätze 0 bis 9 mit `uid`, `role` (`owner`, `admin`, `member`) und `visibleFrom`. Der interne Index verweist mit dem Platz als Zeichenfolge auf dieselbe belegte Stelle. `visibleFrom` ist die erste Sequenz, die ein Mitglied in diesem Chat sehen darf. |
| `inbox/{uid}` | Private Liste undurchsichtiger Chat- und Einladungs-IDs. Hier stehen nur IDs und Wahrheitswerte. Inhalte werden einzeln mit eigener Berechtigung abgefragt. |
| `invitations/{uid}/{cid}` | Einzelne Einladung mit `invitedBy` und `expiresAt`. Nur der Empfänger kann sie lesen, solange der Einladende aktiv und berechtigt ist, zwischen beiden keine Blockierung vorliegt und die Einladung gültig ist. |
| `liveSessions/{sessionId}`, `activeRoom/{code}` und `activeMatch/{matchId}` | Vom Dienst registrierter laufender Spielabschnitt. Der Eintrag enthält `conversationId`, `state`, `mode`, `validUntil` sowie entweder Raumcode und Spielkennung oder Match-ID und die beiden Teilnehmer. Die Verweise zeigen immer auf den aktuellen Spielabschnitt. |
| `messages/{cid}/{id}` | Veröffentlichte Nachrichten mit Absender-UID, unveränderlicher Sequenz `seq`, Serverzeit und Inhalt. Jede Nachricht wird einzeln mit Prüfung der erlaubten Startsequenz gelesen. Der gesamte Verlauf kann über diesen Pfad nicht aufgelistet werden. |
| `messageIndex/{cid}/{uid}/{id}` | Privater Nachrichtenindex für Seiten von höchstens 100 Einträgen mit `seq` und `inbound` (Nachricht eines anderen Absenders). Der Dienst schreibt den Index nur für die berechtigten Empfänger. |
| `receipts/{cid}/{uid}` | Je Konto die höchste empfangene Sequenz `deliveredThrough` und gelesene Sequenz `readThrough`. Der Kontoinhaber darf beide Werte monoton erhöhen. Andere berechtigte Teilnehmer können sie für aktuell berechtigte Mitglieder abrufen. |
| `mutes/{uid}/{cid}` | Private Stummschaltung. Der Kontoinhaber kann sie für zugängliche Chats setzen und später entfernen. |
| `reportStatus/{uid}/{id}` und `moderationStatus/{uid}` | Private Statusansichten für Melder und betroffene Konten. Der Dienst schreibt die Einträge. |
| `pending/{cid}`, `reports/{id}`, `moderation/{uid}`, `byUser/{uid}` | Dienstinterne Pfade für noch ungeprüfte Eingaben, Meldefälle, Maßnahmen und Löschreferenzen. Zugriff über die Browser-App ist gesperrt. |

## Zugriff und Gerätewechsel

- Direktchats setzen eine beidseitig bestätigte Freundschaft voraus. Eine Blockierung in einer der beiden Richtungen oder das Entfernen der Freundschaft entzieht beiden Konten den Zugriff.
- Gruppenmitglieder brauchen einen aktiven Platz und den passenden Index. Ein neuer Beitritt startet hinter der bis dahin veröffentlichten Sequenz. Der Wechsel wird im Dienst zusammen mit der Mitgliedschaft geschrieben. Bei einer Blockierung mit einem aktiven Gruppenmitglied pausiert der Chat-Zugriff für die beiden betroffenen Konten, solange sie gemeinsam in der Gruppe sind. Andere Gruppenmitglieder bleiben zugriffsberechtigt.
- Raum-Chats erfordern einen tatsächlich belegten Platz im aktuellen Online-Raum und eine gültige, serverseitig registrierte Spielsitzung. Bei einem blockierten Mitspieler gilt dieselbe Zugriffspause. WebRTC-Spiele benötigen eine eigene vertrauenswürdige Teilnehmerregistrierung, weil Play2Gether die Signalisierungsdaten nach dem Verbindungsaufbau entfernt. Vor Ende, Abbruch oder Revanche schließt der Dienst den alten Spielabschnitt oder ersetzt den aktuellen Verweis. Die Regeln akzeptieren nur eine gültige Spielsitzung mit höchstens fünf Minuten verbleibender Laufzeit. Der Dienst verlängert sie während des Spiels.
- Alle Geräte eines Kontos verwenden dieselben Empfangs- und Lesepositionen. Die Werte werden gemeinsam aktualisiert, beispielsweise mit einer Transaktion und dem Maximum aus altem und neuem Wert. Für die spätere Anzeige zählen Nachrichten anderer Absender oberhalb von `readThrough`, paginiert über `messageIndex`. So bleiben eigene Nachrichten und gelöschte Sequenzen aus dem Zähler. Bei Bedarf kann der Dienst diesen Wert aus denselben Daten vorab berechnen.

## Anforderungen an den späteren Dienst

1. Direktchat-Anlage anhand des authentifizierten Kontos und der aktuellen gegenseitigen Freundschaft. Pro ungeordnetem Kontopaar wird ein Direktchat verwendet.
2. Gruppenanlage, Einladung, Annahme durch den Empfänger, Austritt, Entfernung, Rollenwechsel und Inhaberübergabe. Der Dienst prüft Rollen und Blockierungen und aktualisiert Einladung, Platz, Index und sichtbare Startsequenz atomar. Eine Gruppenrolle berechtigt weder zu privaten Chats anderer Spieler noch zu Moderationsdaten.
3. Meldung und Veröffentlichung. Eine Meldung bezieht sich auf genau eine sichtbare Nachricht. Inhalte werden serverseitig geprüft. Der Dienst stellt Authentifizierung, aktuelle Mitgliedschaft, Blockierungen, Sperren, Längenlimit, Rate-Limit und Wiederholungsschutz sicher, bevor er eine Sequenz vergibt. Er schreibt die veröffentlichte Nachricht und die Nachrichtenindex-Einträge ihrer Empfänger gemeinsam. Der Browser schreibt weder öffentliche Nachrichten noch sein Moderationsergebnis.
4. Löschreferenzen und Fristen. Bei jeder gespeicherten Referenz aktualisiert der Dienst einen privaten UID-Index. Die Kontolöschung nutzt ihn für Nachrichten, Gruppenrollen, Lesepositionen, Einladungen, Mutes und Meldungen. Bei gemeinsamen Chats bleiben unabhängige Daten anderer Nutzer erhalten. Vor einer Aktivierung müssen die Fristen und die überprüfbare Löschung umgesetzt sein. Als Ausgangswerte für die Planung sind 90 Tage ab Versand für Direkt- und Gruppennachrichten, eine halbe Stunde ab Spielende für Spielnachrichten, sieben Tage für Einladungen und 30 Tage ab Entscheidung für Meldedaten vorgesehen. Abgelehnte Eingaben sollen im Normalfall nach der Prüfung verworfen werden. Die Fristen sind Planungswerte für einen späteren Dienst.

Firebase Spark und GitHub Pages bieten in der jetzigen Einrichtung keinen Laufzeitdienst mit diesen Rechten. Chat, Moderation und die zugehörige Datenverarbeitung bleiben deaktiviert. Die Produktions-Datenschutzerklärung beschreibt weiterhin die aktiven Funktionen.

## Meldeannahme und Moderationszugriff

Die Regeln erlauben bei eingeschaltetem Chat-Schalter eine Meldung zu einer veröffentlichten Nachricht, die das meldende Konto nach den jeweiligen Chatregeln lesen darf. Die Meldung wird pro Nachricht und Konto einmal angelegt. Zusammen mit ihr muss der Zeitstempel im Pfad `reportThrottle/{uid}` im selben Datenbankvorgang geschrieben werden. Firebase prüft eine Pause von 30 Sekunden zwischen zwei Meldungen desselben Kontos, auch bei mehreren Geräten.

| Pfad unter `chatV1` | Daten und Berechtigungen |
| --- | --- |
| `reportQueue/{cid}/{messageId}/{uid}` | Meldung mit Grund und Serverzeit. Das meldende Konto sieht seinen Eintrag. Moderationskonten dürfen die Warteschlange lesen. Die Nachricht bleibt an ihrem ursprünglichen Speicherort. |
| `reportThrottle/{uid}` | Zeitstempel und Referenz auf die letzte Meldung. Spieler schreiben den Verweis ausschließlich zusammen mit einer neuen Meldung. |
| `control/moderators/{uid}` | Nur ein Firebase-Administrator vergibt die Rolle. Sie erlaubt den Zugriff auf die Warteschlange und die jeweils gemeldete Nachricht. Eine Gruppenrolle gewährt diesen Zugriff nicht. |
| `mutedPlayers/{uid}/{peer}` | Private Einstellung, um einen Spieler stummzuschalten. Der Kontoinhaber kann sie ändern. Die spätere Oberfläche verwendet die Einstellung bei Anzeige und Benachrichtigungen. |

Die Meldegründe sind Belästigung, Hass oder Diskriminierung, Drohung, sexualisierte Inhalte oder Gefährdung, Spam sowie Sonstiges. Gespeichert werden die Nachrichtenreferenz, der Grund und ein Serverzeitstempel. Die Meldung enthält keinen kopierten Chatverlauf und kein Freitextfeld. Der Moderationszugriff auf einzelne Nachrichten endet, sobald die letzte Meldung zu dieser Nachricht entfernt wurde. Das meldende Konto kann den eigenen Eintrag lesen. Status und interne Entscheidungen bleiben getrennt.

### Voraussetzungen für die Freigabe

Ein vertrauenswürdiger Dienst muss neue Nachrichten im Kontext prüfen, bevor sie gespeichert oder angezeigt werden. Die Datenbank setzt die Anmelde-, Mitgliedschafts- und Meldebedingungen durch. Veröffentlichung und verbindliche Moderationsentscheidungen bleiben für Browser-Schreibzugriffe gesperrt. Durch den Chat-Schalter ist auch die Meldeannahme derzeit geschlossen.

Der spätere Dienst braucht folgende Prüfabläufe:

- Normale Gaming-Sprüche wie „Du Noob!“ und „Schlecht gespielt!“ dürfen für sich allein keine Sanktion auslösen. Kontext entscheidet bei gezielten Wiederholungen, Diskriminierung und glaubwürdigen Drohungen. Unsichere Fälle gehen zur manuellen Prüfung. Eine automatische dauerhafte Sperre ist dafür ungeeignet.
- Der Sendedienst prüft Mitgliedschaft, Blockierungen und aktive Sperren bei jeder Aktion. Er begrenzt die Senderate kontoweit, insbesondere bei In-Game-Chats. Ein Wiederholungsversuch derselben Nachricht darf die Senderate und die gespeicherten Zähler nur einmal belasten.
- Gruppenadministratoren dürfen in ihren Gruppen melden und den Dienst mit dem Entfernen eines Mitglieds beauftragen. Der Dienst bestätigt dabei die aktuelle Rolle und schützt den Inhaber. Sanktionen und die Bearbeitung einer Meldung benötigen eine eigene Moderationsberechtigung.
- Die Oberfläche stellt Melden und Blockieren bei betroffenen Nachrichten zur Verfügung. Minderjährige werden durch den geschlossenen Erstkontakt, Einladungen und sparsame Profildaten geschützt. Eine Speicherung des Geburtsdatums ist dafür nicht vorgesehen.
- Der Dienst führt einen privaten Entscheidungsstatus mit Zeitpunkt, Grund und gegebenenfalls Sperrende. Für die spätere Meldungsverarbeitung ist eine begrenzte Frist ab Entscheidung vorgesehen. Nach Ablauf müssen Warteschlangeneintrag, unnötige Status- und Zeitdaten sowie zugehörige Referenzen tatsächlich entfernt werden.

Moderatoren prüfen gemeldete Einzelnachrichten. Bei begründetem Bedarf wird Kontext für den Einzelfall durch den vertrauenswürdigen Dienst bereitgestellt. Ausnahmen bei Aufbewahrung und Zugriff müssen vor dem Produktivstart festgelegt werden.

## Emulator-Prüfung

Die Regeln können im Realtime-Database-Emulator mit temporären Testdaten geprüft werden. Der Schalter wird für Berechtigungstests nur in der Testdatenbank aktiviert. Die bestehenden Spiel-, Profil-, Freundschafts- und Bereinigungsregeln stimmen als JSON-Struktur vollständig mit der vorherigen Fassung überein.
