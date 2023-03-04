# Recherche

Der Großteil der Bachelorarbeit, hier werden alle Sachen die in der Implementierung genutzt werden sollen herausgefunden und erläutert, inwiefern sie genutzt werden sollen.


## Skalieren

### Definition

Skalieren ist der Prozess zum Anpassen und Erweitern der aktuellen Server-Konfiguration um effektiver auf größer Anzahl von Anfragen und größerer Arbeitslast eingehen zu können.
[@redswitches_server_2022]

Dabei gibt es zwei Arten von Skalierungen:

#### Vertikale Skalierung

Bei der vertikalen Skalierung, auch up/down scaling genannt, wird der aktuelle eingesetzte Server mit besserer Hardware ausgerüstet um somit die Performance und Effizenz dieses Servers zu verbessern. [@redswitches_server_2022]

#### Horizontale Skalierung

Horizontal Skalieren, auch in/out scaling genannt, bedeutet den Arbeitsaufwand und die Anfragen auf mehrere Server zu verteilen [@redswitches_server_2022]

#### Hoch und Runter Skalieren

Skalieren geht aber nicht nur in die eine Richtung, es kann auch dazu kommen das die Server-Anfragen mit der Zeit immer weniger werden und somit Ressourcen nicht mehr benötigt werden. Beim vertikalen Skalieren kann man hierbei die Hardware wieder verkleinern. Und bei der vertikalen Skalierung werden Server heruntergefahren. [@el-rewini_advanced_2005]


### Was heißt bedarfsbedingtes Skalieren?

Bedarfsbedingt besteht aus den Worten Bedarf und bedingt und bedeutet das je nach Bedarf nach oben oder unten skaliert wird. Im Cloud-Computing wird dies unter dem Namen Autoscaling beschrieben. [@kerner_what_2021] überarbeiten.....


## Skalieren von dedizierten Gamingservern

Die einfachste Skalierung von Gameservern wäre eingeschaltet und ausgeschaltet. Eine einzige Instanz die je nach Bedarf angeschaltet ist oder eben nicht. 

Bei höheren Skalierungen kommt es auf den jeweiligen Gameserver an, ob es Möglichkeiten gibt mehere Instanzen zu erstellen. Hierbei kommt Minecraft in den Sinn. Es werden Weltdaten im Filesystem der jeweiligen Instanz gespeichert, wodurch es ohne Modifikation des Servers keine Möglichkeit gibt zwei verschiedene Instanzen auf die gleichen Weltdaten zugreifen zu lassen. [@diaconu_manycraft_2013]

Bei anderen Servern wie TF2 ist dies möglich, da hier nur die Konfiguration übernommen werden muss, da das Spiel selbst keinen Zustand zwischen verschiedenen Runden speichert und man somit auf verschiedenen Servern immer die gleichen Bedingungen hat. 

Quellen werden hier benötigt...


### Wann wird skaliert?



Es wird runterskaliert wenn der Arbeitsaufwand zu gering ist, um mehrere Instanzen zur Verfügung zu stellen. 

Die Frage ist nun wann gilt ein Server als Inaktiv.

### Inaktivität




### Spielerzahlen







## UDP und TCP

Unterschied ziwschen UDP und TCP aufzeigen. Was ist ein State und wie kann man feststellen wann man einen State hat. 

### States

Ein Client greift immer mit dem gleichem Port und der gleichen IP-Adresse auf den Server zu. Demnach kann man anhand dieser Kombi herausfinden das eine kontinuierliche Verbindung besteht. Was bei UDP ermittelt werden muss und bei TCP automatisch passiert.

Eine kontinuerliche Verbindung mit dem Server stellt somit einen aktiven Spieler auf dem Server dar. WEnn man nun also herausfindet welche States aktiv sind, kann man herausfinden wie viele Spieler auf dem Server sind. Wo haben wir einen gemeinsamen Schnittpunkt wo man einfach herausfinden kann welche States aktuell aktiv sind. Unser Router: alle Paket die vom und ins Internet verlaufen laufen über diesen Hinweg. Aufgaben eines Routers ()

nun besitze ich für meinen Teil eine PfSense mit dem Plugin pfSense-api kann man der PFSense eine API hinzufügen die sie so nicht besitzt und damit mit Hilfe eines Scripts die aktiven States herauslesen und filtern auf unsere Server die aktiv sind.

## Statistische Werte

Diese Methode wurde benutzt um die ersten statistischen Werte zu ermitteln.

Nachteil an dieser Methode sie ermittelt keine internen Verbindungen. Falls ein Rechner direkt aus meinem Netzwerk mit dem Server verbunden ist werden diese Werte nicht ermittelt, da es keine aktiven Verbindungen über den Router gibt.

Dies Werte wurden dann manuell korrigiert, da die Anzahl der Netzwerkgeräte die aktive Spieler auf meinen Servern sind sehr begrenzt sind. 1-2 Spieler.

Damit aber dann der Prototyp auch die internen Verbindungen erhält und somit die komplett richtigen Daten verarbeitet, muss eine etwas andere Methode gefunden werden die noch näher an dem Server ist. 

Hierzu gucken wir uns über den host selbst alle ankommenden Pakete an den Gameport an und ermitteln mittels dieser Pakete die aktiven Verbindungen selbst (tcpdump).

### gespeicherte Daten

## Rcon

Was ist eine große Gemeinsamkeit zwischen einige Arten von Gamingservern welche zu einem gewissen Standard geworden ist: RCON

### Was ist Rcon?

detailierte Beschreibung des RCON protokolls was mit diesem alles machen kann. Jedoch stellt RCON nur die Verbidnung zur Remote Shell dar. bedeutet jedes Spiel selbst kann seine Commands definieren die mithilfe der Rcon-Console genutzt werden können. Daher ist hier keine Vereinheitlichung der Commands möglich und es muss eine Möglichkeit geschaffen werden, für jedes Spiel festzulegen welchen Command amn für die Anzahl der Spieler eingeben muss und eine Funktion, die die Antwort dann in einen Brauchbares Objekt umwandelt, welches bei allen dann wieder gleich ist.

### Struktur

### Pakete

### Welche Kommandos gibt es ?

Dort gibt es den Standard Command players/playerCount mit diesen können wir direkt ermitteln wie viele Spieler auf diesem Server sind.

Als Ergänzung können wir für alle Server die den Command PlayerPosition unterstützen die aktuelle Position eines Spielers ermitteln und so eine weitere Möglichkeit der Inaktivität darstellen. Ein Spieler der sich so und so lange nicht bewegt gilt als inaktiv und wird wenn möglich gekickt oder als inaktiv gewertet und bei der weiteren Ermittlung der Server-inaktivität als nicht vorhandener Speieler gewertet.

Das Rcon Protokoll wird in der Implementation selbst implementiert und dort noch einige besonderheiten aufgezeigt, die so nicht in den "standards" beschrieben sind.

## Weitere Möglichkeiten

Weitere Möglichkeiten darstellen die vielleicht möglich sind. Anhand der CPU time ermitteln wie viele clients mit dem Server verbunden sind. Oder anhand anderer Faktoren. 



## Konzept

## Prototyp