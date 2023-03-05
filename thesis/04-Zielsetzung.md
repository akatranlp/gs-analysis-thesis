# Zielsetzung

Folgende Ziele werden für diese Bachelorthesis definiert die nach der Recherche im Bereich der [Evaluierung](evaluierung) wieder aufgenommen werden.

Es soll ein Konzept und daraus ein Prototyp erstellt werden mit dem Anwendungen bedarfsbedingt skaliert werden können.

Die Betriebszeit des Computers soll auf die Zeit des Bedarfs gesenkt werden

Wenn ein Server als inaktiv gewertet wird, soll er heruntergefahren werden

Wenn kein Server mehr läuft soll der Hardware-Server / VM abgeschaltet werden

## Messung

Durch was werden die Ziele gemessen. Auf Basis von Methoden die im Recherche Part noch ausführlich erläutert werden, werden folgende Daten erhoben:
- Name des Game Servers der Gemessen wird
- Anzahl der Spieler auf diesem Server
- Ob der Server aktuell eingeschaltet ist
- Ist der Hardware PC oder die VM eingeschaltet

Erläutern mit Recherchen wieso diese Daten erhoben werden und was sie am Ende aussagen wenn wir sie mit den Endergebnissen vergleichen.

## Statistische Werte

Diese Methode wurde benutzt um die ersten statistischen Werte zu ermitteln.

Nachteil an dieser Methode sie ermittelt keine internen Verbindungen. Falls ein Rechner direkt aus meinem Netzwerk mit dem Server verbunden ist werden diese Werte nicht ermittelt, da es keine aktiven Verbindungen über den Router gibt.

Dies Werte wurden dann manuell korrigiert, da die Anzahl der Netzwerkgeräte die aktive Spieler auf meinen Servern sind sehr begrenzt sind. 1-2 Spieler.

Damit aber dann der Prototyp auch die internen Verbindungen erhält und somit die komplett richtigen Daten verarbeitet, muss eine etwas andere Methode gefunden werden die noch näher an dem Server ist. 

Hierzu gucken wir uns über den host selbst alle ankommenden Pakete an den Gameport an und ermitteln mittels dieser Pakete die aktiven Verbindungen selbst (tcpdump).

### gespeicherte Daten