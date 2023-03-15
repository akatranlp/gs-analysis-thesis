# gs-analysis

Repo zu meiner Bachelorthesis an der Hochschule Flensburg

## Konfiguration

Die Datei `./apps/gs-analysis/config-sample.json` ist eine Beispiel-Datei der Konfiguration. Kopiert und ändert die Konfiguration mit euren Daten ab.

## Build-Optionen:

Es gibt zwei Arten den Prototypen zu bauen:

### Docker

Für Docker muss die Konfiguration im Ordner `/opt/config/gs-analysis/config.json` liegen, dann kann man einfach den Befehl `npm run docker-app ausführen`.

Andernfalls führt man diese beiden Befehle aus:
- `docker build -t {image-name} .` -- Erstellt das Docker-Image
- `docker run -v {path-to-config}:/app/config.json -e CONFIG_FILE=/app/config.json -it --net=host --name {container-name} {image-name}` -- Führt das Docker-Image aus

### Direkt auf dem PC

Um den Prototypen direkt auf dem PC auszuführen muss die Umgebungsvariable `CONFIG_FILE` auf den Pfad der Konfigurationsdatei gesetzt werden. 

Anschließend kann der Prototyp mit diesen vier Befehlen gestartet werden:
- `npm install` -- Installiert die Benötigten Abhängigkeiten
- `npm run prod-build` -- Baut den gesamten Prototypen und kopiert die Webapp-Dateien in den Public-Folder der API
- `npm run deployCommands -w=gs-analysis` -- Sendet die SlashCommands des Discord-Bots zu Discord
- `npm run start -w=gs-analysis` -- Startet die gesamte Applikation des Prototypen
