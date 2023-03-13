\newpage
# Evaluierung

Nach der Implementierung des Prototyps wurde eine Testphase über einen Zeitraum von zwei Wochen durchgeführt. In der ersten Woche wurden die Server nicht automatisch ausgeschaltet, sondern nur der "inaktiv"-Status gemessen und in der zweiten Woche wurde diese Funktion eingeschaltet.

Im [Anhang](#grafana-both) sind drei Graph-Sammlungen zu sehen: Einer für den Zeitraum der zwei Wochen und jeweils einer für jede Woche allein.

In der folgenden Abbildung sehen wir einen Ausschnitt vom 20.02.23 und 21.02.23, an denen von den Spielern vergessen wurde, den Conan-Exiles Server herunterzufahren. Somit war der Server 80% der Zeit, in der dieser online war, inaktiv. 

![Conan-Exiles Server inaktiv über 2 Tage](./images/conan-inactive.png){ width=1500px }

Das Gleiche ist beim Minecraft-Server am Wochenende passiert.
\newpage

![Minecraft-Server inaktiv am Wochenende](./images/mc-inactive.png){ width=1000px }

In der ersten Woche war der Produktiv-Computer zu 69% inaktiv, während er eingeschaltet war.

![Host pve03 und VM mc - Inaktivität während der ersten Woche](./images/pve03-inactive-first-week.png){ width=1000px }

Mit dem Ausschnitt inklusive Offline-Zeit für die gesamte Woche war der Server insgesamt 36% inaktiv, was in etwa 60h entspricht, die der Server ungenutzt eingeschaltet war.

Folgende Grafik zeigt, wie viele Spieler auf den Gameservern waren, während der Server online und aktiv war. Die 8% entsprechen zum einen der Zeit zwischen dem Einschalten eines Servers und dem Verbinden des ersten Clients und zum anderen der Zeit zwischen dem Disconnect des letzten Spielers und dem Herunterfahren des Servers nach einer Timeout-Zeit von 15 Minuten.

![Spielerzahlen während Server online und aktiv sind](./images/online-with-without-players.png){ width=800px }

Diese Zeit kann also nur verringert werden, indem man die Timeout-Zeit heruntersetzt, das kann aber dazu führen, dass der Gameserver noch vor dem Verbinden des ersten Spielers bereits wieder ausgeschaltet wird oder auch zum Ende, wenn der Spieler nur einen Verbindungsabbruch hatte.


Am Ende der zweiten Woche sehen wir auch die Tests der Forwarder aus der Recherche

![UDP und TCP - Forwarder Test Stats](./images/testphase-forwarder.png){ width=1000px }

Insgesamt gesehen ist der Host pve03 in der gesamten Testphase zu 67% ausgeschaltet.

In der ersten Woche nur zu 48%, wegen des nicht Herunterfahrens, und in der zweiten dafür zu 86%, da dieser immer automatisch ausgeschaltet wurde. ([siehe Anhang 8](#grafana-both))











