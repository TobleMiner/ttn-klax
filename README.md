TTN decoder für KLAX Smart Meter Sensoren
=========================================

This is the German documentation for the KLAX TTN decoder, see [README_en](README_en.md) for the english documentation.

Diese Repo enthält einen Funktionskompletten Dekoder für [KLAX Smart Meter Sensoren](https://alpha-omega-technology.de/KLAX-der-lorawan-faehige-optokopf).

Der Dekoder ist in der Lage alle vom Sensor ausgesendeten Pakete in einfach zu verwendende JSON-Objekte zu dekodieren.

# Verwendung

Der Dekoder wurde für die TTN Konsole entwickelt und auch ausschließlich dort getestet. Da viele andere IoT Platformen die gleiche Dekoder-API
implementieren, ist es gut möglich, dass dieser Dekoder auch auf anderen LoRaWAN IoT-Platformen funktioniert.


Um diesen Parser zu verwenden, muss lediglich der Inhalt der Datei [decoder.js](decoder.js) per Copy & Paste als Dekoder im TTN für eine bestehende Applikation
eingefügt werden.

# Verschiedene KLAX Versionen

Falls in einer Umgebung KLAX mit Firmwareversionen kleiner gleich V0.4 und größer V0.4 zusammen verwendet werden, haben die dekodierten Daten beider KLAX Versionen
verschiedene Formate. Wenn dies nicht gewünscht wird, kann die Konfigurationsoption `LEGACY_FORMAT` (am Anfang von decoder.js) auf `true` gesetzt werden, um
das alte Ausgabeformat auch für neuere KLAX-Firmware zu forcieren.

# Datenformat

Das Datenformat dieses Dekoders ist im [Wiki](../../wiki) dieses Repos beschrieben.

# Lizenzierung

Dieser Dekoder ist unter CC BY-NC-SA 4.0 nicht-kommerziell lizenziert. Der Dekoder kann auf Anfrage kommerziell lizenziert werden.
Bitte kontaktieren Sie licensing@t-sys.eu für Anfragen bezüglich Lizenzierung.
