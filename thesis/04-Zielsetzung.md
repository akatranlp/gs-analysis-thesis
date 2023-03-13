# Zielsetzung

Folgende Ziele werden für diese Bachelorthesis definiert, die nach der Recherche im Bereich der [Evaluierung](#evaluierung) wieder aufgenommen werden.

- Es soll ein Prototyp erstellt werden, mit dem Anwendungen bedarfsbedingt skaliert werden können.
- Die Betriebszeit der Computer soll auf die Zeit des Bedarfs gesenkt werden.
- Wenn ein Server als inaktiv gewertet wird, soll er heruntergefahren werden.
- Wenn kein Server mehr läuft, soll der Hardware-Server / VM abgeschaltet werden.

## Messung

Um eine Evaluierung der Ziele am Ende der Thesis treffen zu können, müssen Daten in regelmäßigen Abständen über den jeweils aktuellen Stand der Server erhoben werden.

Hierzu werden folgende Dinge erhoben:

- Name des Servers, der gemessen wird
- Anzahl der Spieler auf dem Server, wenn es ein Gameserver ist
- Ist der Server eingeschaltet?
- Ist der Server inaktiv?

Die erste Datenerhebung fand zwischen dem 16.01.2023 und dem 23.01.2023 statt und basierte auf der Methode aus [Abschnitt 5.4.1](#router) der Recherche. In einem Skript wurde in einem festgelegten Intervall die Anzahl der Spieler über die aktiven Verbindungen des Routers zu diesem Server ermittelt und anschließend in eine InfluxDB-Datenbank geschrieben. Da hierdurch keine internen Verbindungen betrachtet werden, wurden diese im Nachhinein manuell hinzugefügt.

In der folgenden Abbildung sind die Spielerzahlen der einzelnen Gameserver zu sehen.
Die Server waren die ganze Woche hinweg eingeschaltet, obwohl über einen längeren Zeitraum kein Spieler mehr auf dem Server war.

![Spielerzahlen Erste Woche](./images/playercount-first-week.png){ width=80% }