TTN decoder for KLAX electricity meter sensors
==============================================

This repo contains a fully featured decoder for [KLAX electricity meter LoRaWAN sensor](https://alpha-omega-technology.de/klax-der-lorawan-faehige-optokopf).

It decodes all types of messages the sensor sends into easy to use JSON objects.

# Usage

This decoder has been tested to work with The Things Network. Since a lot of other IoT platforms have adopted the same decoder API, this decoder may
also work on other platforms.

## Setup

In this step we will create an account at TTN and register your KLAX with TTN. If you have already done this and are already receiving packets
from your KLAX you can skip this step.

### Registration

To use this decoder your KLAX needs to be registered with TTN. To do so you will need a TTN account at https://www.thethingsnetwork.org/.

### Create application

Next you will need to create an application in the TTN console at https://console.thethingsnetwork.org/applications. Do so by visiting
https://console.thethingsnetwork.org/applications/add or clicking the 'add application' button.

Next you will be prompted for an application id. This id is for reference only and can be picked to your liking. Once you have entered an application
id you can click the `Add application` button to create the application.

Clicking the `Add application` button should have taken you to your newly created application. If not you will be able to see and select it at
https://console.thethingsnetwork.org/applications.

### Configure application

To use your KLAX with your newly created application you will need to tweak some application settings first. In your TTN application, click the button
`Settings` and select `EUIs` from the left-hand menu. Your KLAX comes with a hard-coded application EUI. You can find it on the sheet of paper you received
with your KLAX. Click the `add EUI` link in the upper right corner of the `EUIS` window. This will open a new dialog. Click the pencil icon to the left of
the `EUI will be generated text`. Now enter the EUI of your KLAX into the field and click the `Add EUI` button.

### Add your KLAX to the application

To receive messages from your KLAX we will need to add your KLAX to the TTN application next. Click the `Devices` Button on the page of the application we
just configured. Now click the `register device` link in the top right corner of the `DEVICES` pane. This will open the `REGISTER DEVICE` dialog. Here you can
again select an arbitrary id for the device and enter it into the `Device ID` field. Next enter the `Device EUI` of your KLAX into the `Device EUI` field. Again
this value is hard-coded into the KLAX and can be found on the sheet of paper you received with your KLAX. By default the `App Key` is auto-generated. Since this
value is also hard-coded into your KLAX, click the pencil icon on the `App Key` field and enter the app key of your KLAX. You can find the app key on the same piece
of paper as the device EUI and application EUI. As the last step we need to select the correct application EUI. To do so select the application EUI of your KLAX from
the `App EUI` drop-down. Now you can click the `Register` button at the bottom of the page to finish device registration.

### Installing the decoder

To decode the messages of your KLAX we need to install the decoder from this repository into you TTN application. While inside you application on the TTN console
select the `Payload Formats` button from the top of the page. Ensure `Custom` is selected from the drop-down below the `Payload format` heading. Next ensure
the `decoder` button is selected from the buttons above the editor window. Now we can enter our custom payload decoder. Open the file `decoder.js` from this
repository and select all contained text. Now click into the editor window on the TTN page and paste the code. Don't forget to hit the `save payload functions` button
on the bottom of the page. Now we are ready to receive and decode the first packets.

### Installing you KLAX

To see the first transmission by your KLAX, we need to make sure the `Data` page of your TTN application is open in a web browser before installing the KLAX, else
you might need to wait up to an hour to see the next transmissions of your KLAX. Open the page of your TTN application in the TTN console and click on the
`Data` button on the top of the page. Now we will see any messages sent by your KLAX and received by TTN.
Next mount the KLAX to your electricity meter according to the instructions included with the device. After that insert the single AA battery into the KLAX. At this
point the KLAX should start blinking. The blinking will last for a few seconds as the KLAX is now testing LoRaWAN and smart meter interface connectivity. After
a few seconds the KLAX should stop blinking and flash the LED for two seconds. If you are observing any other blinking patterns your KLAX encountered an error.
Refer to the KLAX user manual to identify which error code corresponds to your blinking pattern. If everything went well we can now look at the first packets
received in the TTN console. You should be seeing various transmissions by the KLAX, including some on port 3. If the decoder is working as well you can click on
each of the messages and will see a decoded, human readable version of the messages in the `Fields` section of the message.

## Data format

This section describes the format of data returned by the decoder. The decoder returns either a JSON object or `null` if the message could not be decoded.
For each message decoded the decoder return a JSON object.

Below follows a partial description of the decoders output format. Please see the repositories Wiki for a more detailed description.

Common to all messages received is the header. The header is always placed in the member `header` at the root of the returned JSON object.

```js
{
  "header": {
    "batteryPerc": <int, state of charge in percent>,
    "configured": <bool, are Klax registers configured>,
    "deviceType": <string, Klax firmware used, either "SML Klax" or "MODBUS Klax">,
    "meterType": <string, meter readout interface type>,
    "version": <int, version of Klax communication protocol> 
  }
}
```

To identify different message types there is another member at root level, namely `type`. The `type` member contains a string identifying the type of message received.
The different types possible are listed as subsections of this section.

### App data

This message is indicated by type `"app"`.

The most important message sent by the KLAX at regular intervals is application data. Application data itself can contain a number of different payloads. Possible payload
types depend on the type of KLAX used. When using a SML KLAX possible payload types are:

- `"historic"` (Only with older KLAX firmware) Information on set filters and last readings of the filters
- `"filter"` Information on set filters
- `"now"` Last readings
- `"serverID"` KLAX identification
- `"deviceID"` ID of the smart meter, not supported on SML communication protocol

With a MODBUS KLAX the following types are possible:

- `"registerFilter"` Information on set registers and last read values

The parser returns all payloads contained within a packet as an array called `payloads` nested inside the app object. A decoded app packet could look like this:
```js
{
  "header": {
    "batteryPerc": 100,
    "configured": true,
    "connTest": false,
    "deviceType": "SML Klax",
    "meterType": "SML",
    "version": 1
  },
  "msgInfo": {
    "msgCnt": 1,
    "msgIdx": 32,
    "msgNum": 1
  },
  "payloads": [
    {
      "id": "00112233445566778899",
      "type": "serverID"
    },
    {
      "register": {
        "filterActive": true,
        "filterId": 0,
        "unit": "Wh",
        "values": [
          {
            "valid": true,
            "value": 34000
          },
          {
            "valid": true,
            "value": 34000
          },
          {
            "valid": true,
            "value": 34000
          },
          {
            "valid": true,
            "value": 34000
          }
        ]
      },
      "type": "filter"
    }
  ],
  "type": "app"
}
```
As illustrated by above example each payload type is again indicated by a unique string in the "type" field of the payload.

# Licensing

This decoder is licensed under CC BY-NC-SA 4.0 . Dual-licensing options are available. Contact licensing@t-sys.eu for inquiries regarding licensing options.
