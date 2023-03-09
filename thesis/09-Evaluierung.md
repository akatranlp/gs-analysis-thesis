# Evaluierung

Nach der Implementierung des Prototypen wurde eine Testphase durchgeführt über einen Zeitraum von 2 Wochen. In der ersten Woche wurden die Server nicht automatisch ausgeschaltet, sondern nur der inaktiv Status gemessen und in der zweiten Woche wurde diese Funktion eingeschaltet.

Im Anhang sind 3 Graph-Sammlungen zu sehen, 1 für den Zeitraum der zwei Wochen und jeweils eins für jede Woche alleine.

In der folgenden Abbildung sehen wir einen Ausschnitt vom 20.02.23 und 21.02.23 an denen von den Spielern vergessen wurde den Conan-Exiles Server herunterzufahren. Somit war der Server 80% der Zeit, in der dieser online war, inaktiv. 

![Conan-Exiles Server inaktiv über 2 Tage](./images/conan-inactive.png)

Das gleiche ist am Wochenende erneut passiert beim Minecraft-Server.

![Minecraft-Server inaktiv am Wochenende](./images/mc-inactive.png)


In der ersten Woche war der produktiv-computer zu 69% inaktiv während der eingeschaltet war.

![Host pve03 und VM mc - Inaktivität während der ersten Woche](./images/pve03-inactive-first-week.png)


In dieser Testphase wurde eine Tmeout-Zeit von 15 Minuten festgelegt. Somit wird 15Minuten nachdem der letzte Spieler den Server verlassen hat der Server heruntergefahren. Über die Spanne von diesen 2 Wochen bedeutet dies, das die Server rund 8% online waren auch wenn keine Spieler mehr auf dem Servern waren, aber die Server noch nicht als inaktiv galten. 

![Spielerzahlen während Server online und aktiv sind](./images/online-with-without-players.png)


Am Ende der zweiten Woche sehen wir auch die Tests der Forwarder aus der Recherche

![UDP und TCP - Forwarder Test Stats](./images/testphase-forwarder.png)

Insgesamt gesehen ist der Host pve03 in der gesamten Testphase zu 67% ausgeschaltet.

In der ersten woche nur zu 48% wegen des nicht herunterfahren und in der zweiten dafür zu 86%, da dieser immer automatisch ausgeschaltet wurde. siehe Anhang.






Es soll ein Prototyp erstellt werden mit dem Anwendungen bedarfsbedingt skaliert werden können.

Die Betriebszeit des Computers soll auf die Zeit des Bedarfs gesenkt werden.

Wenn ein Server als inaktiv gewertet wird, soll er heruntergefahren werden.

Wenn kein Server mehr läuft soll der Hardware-Server / VM abgeschaltet werden.










