# Weiterführende Arbeiten

Die bedarfsbedingte Skalierung kann auch noch über andere Parameter entschieden werden, wie CPU-Auslastung, Arbeitsspeicherverbrauch oder Festplattenauslastung. [@amin_calculating_2019]

Eine Möglichkeit wäre, den Prototypen auf eine Client-Server Anwendung umzubauen. Hierzu sollte ein Client entwickelt werden, der sich z.B. über Websockets mit dem Server verbindet und über diese Verbindung immer den aktuellen Zustand meldet und Befehle vom Server entgegennimmt. Gleichzeitig würde dies dazu führen das in der Konfiguration des Servers keine Nutzernamen und Passwörter der einzelnen Server mehr vorhanden sein müssen, weil der Client diese Aufgabe nun übernimmt.

Weiterhin sollte getestet werden ob der TCP- oder UDP-Forwarder eine valide Option der Verbindungsanalyse ist, indem zum Beispiel die Latenz und die Geschwindigkeit zwischen Server und Client gemessen wird. Falls diese Tests zu einen befriedigenden Ergebnis führen, könnte der Prototyp dann mit dem Forwarder arbeiten und nicht mehr über die tcpdump-Methode.

Und um den Bogen zu einer allgemeinen Software für andere Anwendungen zu spannen, sollte getestet werden, ob diese Software sich auch für andere Bereiche außer dem Gamingbereich eignet und noch weiter verallgemeinern lässt.

