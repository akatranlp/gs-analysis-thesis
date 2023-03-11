\newpage
# Evaluierung

Nach der Implementierung des Prototypen wurde eine Testphase durchgeführt über einen Zeitraum von 2 Wochen. In der ersten Woche wurden die Server nicht automatisch ausgeschaltet, sondern nur der inaktiv Status gemessen und in der zweiten Woche wurde diese Funktion eingeschaltet.

Im Anhang sind 3 Graph-Sammlungen zu sehen, 1 für den Zeitraum der zwei Wochen und jeweils eins für jede Woche alleine.

In der folgenden Abbildung sehen wir einen Ausschnitt vom 20.02.23 und 21.02.23 an denen von den Spielern vergessen wurde den Conan-Exiles Server herunterzufahren. Somit war der Server 80% der Zeit, in der dieser online war, inaktiv. 

![Conan-Exiles Server inaktiv über 2 Tage](./images/conan-inactive.png){ width=1500px }

Das gleiche ist am Wochenende erneut passiert beim Minecraft-Server.
\newpage

![Minecraft-Server inaktiv am Wochenende](./images/mc-inactive.png){ width=1000px }

In der ersten Woche war der produktiv-computer zu 69% inaktiv während der eingeschaltet war.

![Host pve03 und VM mc - Inaktivität während der ersten Woche](./images/pve03-inactive-first-week.png){ width=1000px }

Mit dem Ausschnitt inklusive Offline-Zeit für die gesamte Woche war der Server insgesamt 36% inaktiv was somit in etwa 60h entspricht die der Server unnötig Strom verbraucht hat.


Folgende Grafik zeigt wie viele Spieler auf den Gameservern waren während der Server online und aktiv war. Die 8% entsprechen zum einen der Zeit zwischen dem einschalten des Server und dem verbinden des ersten Clients, und zum anderen der Zeit zwischen dem disconnect des letzten Spielers und dem herunterfahren des Servers nach einer Timeout-Zeit von 15 Minuten.

![Spielerzahlen während Server online und aktiv sind](./images/online-with-without-players.png){ width=800px }

Diese Zeit kann also nur verringert werden indem man die Timeout-Zeit heruntersetzt, das kann aber dazu führen, dass der Gameserver noch vor dem verbinden des ersten Spielers bereits wieder ausgeschaltet wird oder auch zum Ende, wenn der Spieler nur einen Verbindungsabbruch hatte.


Am Ende der zweiten Woche sehen wir auch die Tests der Forwarder aus der Recherche

![UDP und TCP - Forwarder Test Stats](./images/testphase-forwarder.png){ width=1000px }

Insgesamt gesehen ist der Host pve03 in der gesamten Testphase zu 67% ausgeschaltet.

In der ersten woche nur zu 48% wegen des nicht herunterfahren und in der zweiten dafür zu 86%, da dieser immer automatisch ausgeschaltet wurde. siehe Anhang.

## Ziele

Nun kommen wir auf die Ziele zurück, die in der Zielsetzung definiert wurden.

#### Es soll ein Prototyp erstellt werden mit dem Anwendungen bedarfsbedingt skaliert werden können. {-}

Im Teil der Implementierung wurde ein Prototyp entwickelt mit dem die Gameserver über einen Discord-Bot oder Webapp gestartet werden kann und beim verlassen des letzten Spielers nach 15 Minuten automatisch heruntergefahren wird.

#### Die Betriebszeit der Computer soll auf die Zeit des Bedarfs gesenkt werden. {-}

Wie in den Graphen der Evaluierung zu sehen ist. Wurde die Betriebszeit der einzlenen Server an den Bedarf angepasst und im Gegensatz zum ersten Testzeitraum die Betriebszeit um ca. 67% verringert.

#### Wenn ein Server als inaktiv gewertet wird, soll er heruntergefahren werden. {-}

Dies wurde im Prototypen integriert und durch die Abbildungen bewiesen.

#### Wenn kein Server mehr läuft soll der Hardware-Server / VM abgeschaltet werden. {-}

Dies ist auch der Fall und wurde im Prototypen integriert.










