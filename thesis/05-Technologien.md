\newpage
# Technologien

Im Laufe der Bachelorarbeit greifen wir auf verschiedene Technologien zu. Einige werden für die Statistikerhebung genutzt. Andere in der späteren Implementierung des Prototypen.

## Docker

Docker ^[https://www.docker.com/] ist eine Open-Source-Container-Platform mit der Nutzer Anwenungen isolieren kann.

![Docker Architecture (https://www.educative.io) ](https://www.educative.io/cdn-cgi/image/format=auto,width=3000,quality=75/api/edpresso/shot/4835301315837952/image/5086118547554304){ width=1500px }

Um diese Isolierung zu erreichen, werden Funktionalitäten aus dem Linux-Kernel verwendet.
Dazu gehören:

### Kernel Namespaces

Kernel Namespaces isolieren Prozesse indem sie eine neue virtuelle Globale Instanz erstellen und den angegeben Prozess in diesem ausführen. [@noauthor_namespaces7_nodate]

Somit hat ein Prozess oder mehrere Prozesse einen anderen Blick auf das System als andere Prozesse.[@rosen_resource_2013]

Es gibt 6 verschiedene Arten von Namespaces die aktuell im Linux Kernel implementiert sind:

#### mnt

Mit dem mnt-Namespace werden Mounts und Unmounts von untergeordneten Namespaces nicht an übergeordneten Namespaces übernommen. Mounts und Unmounts von übergeordneten Namespaces werden aber an alle untergeordneten Namespaces weitergebenen. [@rosen_resource_2013]

#### uts

Mit dem UTS-Namespace kann einem Prozess ein eigener Hostname und Domainname vergeben werden. [@rosen_resource_2013]  [@noauthor_uts_namespaces7_nodate]

#### pid

Prozesse in verschiedenen PID-Namespaces können die gleiche Prozess-ID haben. Der erste Prozess in einem neuen PID-Namespace hat immer die PID 1. Die PID von einem Prozess kann von allen übergeordneten Namespaces eingesehen werden aber nicht andersherum. [@rosen_resource_2013]
[@noauthor_pid_namespaces7_nodate]

![Node Container PIDs on Host](./images/pid-local.png)

![Node Container PIDs inside Container](./images/pid-in-namespace.png)

#### net

In einem Net-Namespace gibt es eine logische Kopie des Nettzwerk-Stacks mit eigenem Routing Tabellen, Firewall Regeln und Netzwerk-Geräten. Ein Netzwerkgerät kann nur zu genau einem Net-Namespace gehören. Un beim erstellen eines neuen Net-Namespace gibt es nur ein eigenes Loopback-Interface.
[@noauthor_network_namespaces7_nodate]

#### ipc

Durch diesen Namespace können Prozesse nur noch miteinandern kommunizieren über IPC wenn sie sich im selben IPC-Namespace befinden. [@noauthor_ipc_namespaces7_nodate]

#### user

Mit dem User-Namespace kann jeder Prozess eine eigne Menge an UIDs, GIDs und Berechtigungen haben. Somit kann in einem User-Namespace ein nicht root-User für diesen Prozess ein root-User sein. [@rosen_rosen-namespaces-cgroups-lxcpdf_2016]  [@noauthor_user_namespaces7_nodate]


Durch diese Trennung können Prozesse auserhalb Ihres eigenen Namespaces nicht mit andern Prozessen kommunizieren.


Zusätzlich können weitere Arten von Namespaces 

### cgroups (control groups)

Ist ein Ressoucen Management Subsystem um Ressourcen wie CPU, Netzwerk und Arbeitsspeicher um Prozessen nur eine gewisse Menge an Ressourcen zur Verfügung zu stellen. [@rosen_rosen-namespaces-cgroups-lxcpdf_2016] Hierüber können den Docker Containern die Ressourcen eingeschränkt werden. 

### chroot

Durch den chroot Syscall kann das root-Verzeichnes eines Prozesses an einen anderen Pfad gebunden werden und wird auch für alle child-Prozesse genutzt. [@noauthor_chroot2_nodate]


### Images und Container

Durch die Kombinationen von allen oben genannten Funktionalitäten können durch Docker sogenannte isolierte Container erstellt werden. Diese haben ihr eigenes Filesystem, welches sie durch ein verwendetes Docker-Image erhalten. Ein Image ist ein Abbild eines Dateisystems mit allen benötigten Programmen und Abhängigkeiten die benötigt werden um die Anwendung die das Image beinhaltet zu betreiben. Desweiteren können in einem Image weitere Konfigurationen enthalten sein.[@noauthor_docker-documentation_2023]

Ein Container ist somit eine Instanz eines Dockerimages welche gestartet gestoppt verschoben oder gelöscht werden kann. Dadurch das alle Abhängigketien und Programme in einen Image gebündelt sind ist gewährleistet, dass ein Container auf jedem Gerät immer genau gleich funktioniert und keine besonderen Einstellungen am Hostsystem durchgeführt werden müssen.

## InfluxDB und Grafana

Die Daten der Messungen ergebenen eine sogenannte Time-Series. Eine Time-Series ist eine Reihe von DatenPunkten die anhand Ihrerer Zeit der Erstellung indiziert wird und einen bestimmten Wert zu genau diesem Zeitpunkt darstellt. InfluxDB ist dabei eine Time-Series Datenbank, die diese Daten effezient speichern und auslesen kann, da zum Teil mehrere Millionen von Datenpunkten pro Sekunde in die Datenbank geschrieben werden können. [@nair_introduction_2021]

Grafana ist eine Open-Source Lösung für die Darstellung von analytischen Daten auf sogennanten Dashboards. [@shivang_what_2019] In diesem Fall wird es genutzt um die Time-Series Daten aus InfluxDB in verschiedenen Graphen darzustellen die später in der [Evaluierung](#evaluierung) verwendet werden.

## Node und Typescript

Für die Implementation des Skripts zur Messung der Daten und des gesamten Prototypen wird node mit der Programmiersprache Typescript verwendet. Diese Kombination wurde aufgrund meiner bisherigen Erfahrungen mit diesen Programmiersprachen gewählt.

Node.js benutzt als Runtime die v8-Engine von Google. [@noauthor_documentation-v8_nodate]
Node.js erlaubt es einen Javascript abseits des Browsers auch für Serveranwendungen und alleinstehende Skripte zu benutzten. Dabei benutzt nodejs einen non-blocking Eventloop durch die man asynchrone Programme schreiben kann. [@nodejs_nodejs_nodate]

Darüber hinaus hat Microsoft 2012 die Programmiersprache Typescript entwickelt, um Javascript Typsicher zu machen. Typescript ist ein Superset von Javascript, was bedeutet das valider Javascript-Code auch valider Typescript code ist aber nicht umgekehrt und Typescript noch einige zusätzliche Features mitbringt. Da Webbrowser aber nur Javascript verstehen und keinen eigenen Typescript-Compiler mitliefern muss Typescript mithilfe des Typescript compilers vor der Ausliferung in Javascript transpiliert werden. Hierbei kann auch noch ausgewählt werden in welche Javascript Version transpiliert werden soll, um großflächig Kompatibiltät mit älteren Browsern festzustellen, obwohl man slebst beim Programmieren die neuesten Features von Javascript nutzen kann. [@noauthor_why_nodate]

Durch die Typsicherheit werden Bugs die sonst erst zur Laufzeit auftreten würden größtenteils bereits zum Zeitpunkt der komplierung aufegdeckt und könenn dann bereits behoben werden.


## Proxmox und VMs

Eine virtuelle Maschine ist ein virtueller computer die mithilfe von Software, einem so geannnten Hypervisor, auf einer host maschine betrieben wird. Hierzu werden virtuelle Komponenten durch den Hypervisor emuliert, wie CPU, RAM, Festplattenspeicher usw. Die Ressourcen dieser Komponenten werden je nach Hypervisortyp entweder direkt von der Hardware genommen (Typ 1) oder vom Hostbetriebssystem (Typ 2). [@noauthor_what_nodate-1]

Proxmox ist ein Open-Source Typ1-Hypervisor. Welcher mittels Qemu virtuelle Maschinen bereitstellen kann. Zsätzlich besteht die Möglichkeit LXC Container direkt über Proxmox zu erstellen und zu verwalten. Qemu nutzt widerum das im Kernel integrierte KVM Modul wodurch die virtuellen Maschinen ihre Ressourcen direkt von der Hardware erhalten können und nichts emuliert werden muss. [@noauthor_proxmox_nodate]

Proxmox und VMs werden im Testaufbau genutzt. Auf diesen wird jeweils Docker installiert und über Docker dann die Gamingserver gehostet.


## Gamingserver

Ein Gamingserver ist eine Anwendung die auf einem Server läuft und die Zentrale Authorität die den derzeitigen Stand in einem Multiplayer bestimmt. Game clients senden über das Internet Packete mit Informationen über Updates zum Server, wie z.B. bewegen und springen. Der Server verarbeitet diese und sendet bestimmte Informationen zurück an den Client.
[@noauthor_what_nodate-2]

Es gibt verschiedene Arten von Gameservern die für unterschiedliche Anzahl von Spielern und Arten von Games genutzt werden.

### Peer-to-Peer Server

Das Spiel wählt einen Client aus der dann den Gameserver im Hintergrund startet und alle Clients inklusive dem der den Server gestartet hat werden dann zu diesem Server verbunden. Diese Server sind nur für Spiele mit wenigen Spielern gleichzeitig gedacht und bei denen es sich um ein Spiel in unterschiedlichen unabhägig voneinander laufen Runden. [@noauthor_what_nodate-2]


### Dedicated servers

Dedizierte Server sind Server die entweder vom Spielehersteller betrieben werden oder zu freien Verfügung auch Zuhause oder über andere Dienstleister gehostet werden können.

Server die vom Hersteller direkt betrieben werden, sind meist 24/7 eingeschaltet und stehen allen Spielern offen zur Verfügung, um am Mehrspieler Teil des Spiels teilzunehmen.
[@noauthor_what_nodate-2]

Server die von einem selbst gehostet werden beiten die Möglichkeit zur freien Konfiguration, Installationen von Mods und schützen des Zugans durch Passwort, White- oder Blacklist. Hier kann meist im Client des jeweiligen Spiels entschieden werden, zu welchem Server man sich verbinden möchte. 

In dieser Thesis behandlen wir die dedizierten selbst gehosteten Server, da wir nur diese Konfigurieren und analysieren können und demnach auch skalieren können.

Wir gucken uns 4 verschiedene Gamingserver an zu den Spielen:

- Conan-Exiles
- Minecraft
- Satisfactory
- TF2

Hierbei handeln es sich um 4 komplett verschiedene Gamingserver die unterschiedliche Arten der Konfiguration und des Managements benutzen.

Conan-Exiles und Satusfactory sind in der Unreal-Engine 4 erstellt worden.

TF2 in der Source-Engine und Minecraft in einer eigenen Enigne geschrieben in Java.

Inwiefern hier eine Allgemeine Lösung gefunden wird alle mit einem Programm zu überprüfen sehen wir im nächsten Abschnitt der [Recherche](#recherche).