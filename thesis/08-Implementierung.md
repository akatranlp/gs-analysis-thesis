# Implementierung

```typescript
const main = async () => {
	const config = await getConfig();
	const app = new Application(config);
	await app.start();
}
```

Hier wird speziell auf die Entwicklung des Prototypen eingegangen, welche methoden hier benutzt werden, um das Ziel zu erreichen.

Ausschnitte aus meinem Code. erläuterung des möglichen Plugin Struktur??

Darstellen von Ablaufdiagram wie mein Programm abläuft.



## SSH-Playercount-Client




## RCON-Client

Ich habe im Laufe der Implementation einen eigenen Rcon Client implementiert.
Dieser basiert auf Basis der Spezifikation von ValveGames. Hierzu wird das net.Socket von node genutzt und umgebaut auf Promises, um nicht um die events etc. herumzuarbeiten sondern man die Antwort auf die Request durch await der Funktion sofort zurückbekommt.

Bei Conan Exiles haben tests ergeben, dass die falschen IDs zurückkommen, immer um eine Nachricht verschoben. Weshalb anhand der ID die Response nicht mit der Anfrage kombiniert werden kann. Deshalb wurde eine Version des Commands abgeändert und ignoriert nun die IDs und gibt die erste erhaltene Antowrt des Servers zurück

