# Recherche

Der Großteil der Bachelorarbeit, hier werden alle Sachen die in der Implementierung genutzt werden sollen herausgefunden und erläutert, inwiefern sie genutzt werden sollen.

Weiterhin werden hier die Gemeinsamkeiten und Unterschiede der Verschiedenen Gamingserver aufgezeigt und auf alle anderen möglichen Anwendungen geschlossen inwieweit diese von meiner Bachelorarbeit profitieren.

Unterschied ziwschen UDP und TCP aufzeigen. Was ist ein State und wie kann man feststellen wann man einen State hat. 

Ein Client greift immer mit dem gleichem Port und der gleichen IP-Adresse auf den Server zu. Demnach kann man anhand dieser Kombi herausfinden das eine kontinuierliche Verbindung besteht. Was bei UDP ermittelt werden muss und bei TCP automatisch passiert.

Eine kontinuerliche Verbindung mit dem Server stellt somit einen aktiven Spieler auf dem Server dar. WEnn man nun also herausfindet welche States aktiv sind, kann man herausfinden wie viele Spieler auf dem Server sind. Wo haben wir einen gemeinsamen Schnittpunkt wo man einfach herausfinden kann welche States aktuell aktiv sind. Unser Router: alle Paket die vom und ins Internet verlaufen laufen über diesen Hinweg. Aufgaben eines Routers ()

nun besitze ich für meinen Teil eine PfSense mit dem Plugin pfSense-api kann man der PFSense eine API hinzufügen die sie so nicht besitzt und damit mit Hilfe eines Scripts die aktiven States herauslesen und filtern auf unsere Server die aktiv sind.

Diese Methode wurde benutzt um die ersten statistischen Werte zu ermitteln.

Nachteil an dieser Methode sie ermittelt keine internen Verbindungen. Falls ein Rechner direkt aus meinem Netzwerk mit dem Server verbunden ist werden diese Werte nicht ermittelt, da es keine aktiven Verbindungen über den Router gibt.

Dies Werte wurden dann manuell korrigiert, da die Anzahl der Netzwerkgeräte die aktive Spieler auf meinen Servern sind sehr begrenzt sind. 1-2 Spieler.

Damit aber dann der Prototyp auch die internen Verbindungen erhält und somit die komplett richtigen Daten verarbeitet, muss eine etwas andere Methode gefunden werden die noch näher an dem Server ist. 

Hierzu gucken wir uns über den host selbst alle ankommenden Pakete an den Gameport an und ermitteln mittels dieser Pakete die aktiven Verbindungen selbst (tcpdump).

## RCON

Was ist eine große Gemeinsamkeit zwischen einige Arten von Gamingservern welche zu einem gewissen Standard geworden ist: RCON

detailierte Beschreibung des RCON protokolls was mit diesem alles machen kann. Jedoch stellt RCON nur die Verbidnung zur Remote Shell dar. bedeutet jedes Spiel selbst kann seine Commands definieren die mithilfe der Rcon-Console genutzt werden können. Daher ist hier keine Vereinheitlichung der Commands möglich und es muss eine Möglichkeit geschaffen werden, für jedes Spiel festzulegen welchen Command amn für die Anzahl der Spieler eingeben muss und eine Funktion, die die Antwort dann in einen Brauchbares Objekt umwandelt, welches bei allen dann wieder gleich ist.

Dort gibt es den Standard Command players/playerCount mit diesen können wir direkt ermitteln wie viele Spieler auf diesem Server sind.

Als Ergänzung können wir für alle Server die den Command PlayerPosition unterstützen die aktuelle Position eines Spielers ermitteln und so eine weitere Möglichkeit der Inaktivität darstellen. Ein Spieler der sich so und so lange nicht bewegt gilt als inaktiv und wird wenn möglich gekickt oder als inaktiv gewertet und bei der weiteren Ermittlung der Server-inaktivität als nicht vorhandener Speieler gewertet.

Das Rcon Protokoll wird in der Implementation selbst implementiert und dort noch einige besonderheiten aufgezeigt, die so nicht in den "standards" beschrieben sind.

Weitere Möglichkeiten darstellen die vielleicht möglich sind. Anhand der CPU time ermitteln wie viele clients mit dem Server verbunden sind. Oder anhand anderer Faktoren. 

Was passiert nach der Ermittlung der aktiven Clients. Die Skalierung der Server: Herunterfahren der Server oder erstellen einer neuen Instanz.

Für was für Arten von Anwendungen kommen neue Instanzen Infrage?
- Statische Instanzen die nur statische Werte zurückgeben (Sehr hohe Userzahlen das dieser jemals überlastet werden würde/ eher Netzwerk bottlenet)
- Nur lesender Zugriff kann auch skaliert werden
- schreibender Zugriff eher nicht wegen gleichzeitigen Schreibens iin Dateien

Im Fall von Gamingservern gibt es zwei Arten von Servern, Server mit Weltdaten die verändert werden können, diese sind nicht nach oben hin skalierbar, da die Weltdaten lokal geschrieben werden und diese nicht gemergt werden können.

Dann gibt es Rundenbasierte Spiele die keine Spielerdaten speichern und man eine Runde spielt die genau wie jede andere Runde auch ist. Hierzu wird höchstens die Server-Config kopiert, der Rest ist eigeständig.

Implementierung des Hochskalierens vielleicht! Aber auf jeden Fall ein Log mit jetzt müsste ein weiterer Server hinzugeschaltet werden.


