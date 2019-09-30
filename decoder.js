'use strict';

/*
  TTN decoder for KLAX LoRaWAN electricity meter sensors
  © Tobias Schramm 2019 (tobias.schramm@t-sys.eu) (licensed under CC BY-NC-SA 4.0)
*/

var REGISTER_RAW = false;
var DEBUG = true;

function debug(msg) {
  if(DEBUG) {
    console.log('[DEBUG] ' + msg);
  }
}

function warning(msg) {
  console.log('[WARNING] ' + msg);
}

function error(msg) {
  console.log('[ERROR] ' + msg);
}

var METER_TYPES = [
  'SML',
  'IEC 62056-21 Mode B',
  'IEC 62056-21 Mode C',
  'Logarex',
];

function parseHeader(data) {
  var version = data[0];
  var batteryPerc = (data[1] & 0xf) * 10;
  var meterType = METER_TYPES[(data[1] & 0x30) >> 4];
  var configured = (data[1] & 0x40) > 0;
  var connTest = (data[1] & 0x80) > 0;
  return { 'version': version, 'batteryPerc': batteryPerc, 'meterType': meterType, 'configured': configured, 'connTest': connTest };
}

var REGISTER_UNITS = [
  'NDEF',
  'Wh',
  'W',
  'V',
  'A',
  'Hz'
];

function exp2(power) {
  return Math.pow(2, power);
}

function decodeUintN(data, bits, be) {
  var val = 0;
  var bytes = bits / 8;
  for(var i = 0; i < bytes; i++) {
    val += data[be ? bytes - 1 - i : i] * exp2(i * 8);
  }
  return val;
}

function decodeUint16BE(data) {
  return decodeUintN(data, 16, true);
}

function decodeIntN(data, bits, be) {
  var val = 0;
  var bytes = bits / 8;
  for(var i = 0; i < bytes; i++) {
    val += data[i] << ((be ? (bytes - 1 - i) : i) * 8);
  }
  return val;
}

function decodeInt32BE(data) {
  return decodeIntN(data, 32, true);
}

function mkRegister(data, lastValid, unitId) {
  var unit = unitId < REGISTER_UNITS.length ? REGISTER_UNITS[unitId] : null;
  var dataValid = false;
  var values = [ ];
  while(data.length >= 4) {
    if(REGISTER_RAW) {
      var raw = data.slice(0, 4);
      var bytes = [ ];
      for(var i = 0; i < raw.length; i++) {
        var val = raw[i];
        if(val != 0) {
          dataValid = true;
        }
        bytes.push(parseInt(val));
      }
      values.push(bytes);
    } else {
      var val = decodeInt32BE(data);
      if(val != 0) {
        dataValid = true;
      }
      values.push(val);
    }
    data = data.slice(4);
  }
  dataValid = dataValid || lastValid;
  return { 'data_valid': dataValid, 'unit': unit, 'values': values };
}

function decodeHistoric(data) {
  var regmask = data[0];
  var reg1Active = (regmask & 0x01) > 0;
  var reg1Filter = (regmask & 0x06) >> 1;
  var reg1Valid = (regmask & 0x08) > 0;
  var reg2Active = (regmask & 0x10) > 0;
  var reg2Filter = (regmask & 0x60) >> 5;
  var reg2Valid = (regmask & 0x80) > 0;
  var units = data[1];
  var reg1Unit = units & 0x0f;
  var reg2Unit = (units & 0xf0) >> 4;
  data = data.slice(2);
  var registers = [ ];
  if(reg1Active) {
    var reg = mkRegister(data.slice(0, 16), reg1Valid, reg1Unit);
    reg.filterId = reg1Filter;
    registers.push(reg);
  }
  data = data.slice(16);
  if(reg2Active) {
    var reg = mkRegister(data.slice(0, 16), reg2Valid, reg2Unit);
    reg.filterId = reg2Filter;
    registers.push(reg);
  }
  return { 'type': 'historic', 'registers': registers };
}

function decodeNow(data) {
  var registers = [ ];
  for(var i = 0; i < 4; i++) {
    var filterSet = (data[0] & (1<<i)) > 0;
    var filterValid = (data[0] & (1<<(i + 4))) > 0;
    var unitReg = data[i >= 2 ? 2 : 1];
    var unitId = (unitReg & (i % 2 == 0 ? 0x0f : 0xf0)) << ((i % 2) * 4);
    var reg = mkRegister(data.slice(3 + (4 * i), 3 + (4 * (i + 1))), filterValid, unitId);
    reg.filterSet = filterSet;
    reg.filterValid = filterValid;
    registers.push(reg);
  }
  return { 'type': 'now', 'registers': registers };
}

function uint8ToHex(val) {
  var hex = val.toString(16);
  if(hex.length < 2) {
    hex = '0' + hex;
  }
  return hex;
}

function decodeServerID(data) {
  var id = '';
  for(var i = 0; i < data.length; i++) {
    id = id + uint8ToHex(data[i]);
  }
  return { 'type': 'serverID', 'id': id };
}

var PAYLOAD_HANDLERS = [
  { 'id': 1, 'len': 34, 'decode': decodeHistoric },
  { 'id': 2, 'len': 19, 'decode': decodeNow },
  { 'id': 3, 'len': 10, 'decode': decodeServerID },
];

function getHandler(data) {
  var id = data[0];
  for(var i = 0; i < PAYLOAD_HANDLERS.length; i++) {
    var handler = PAYLOAD_HANDLERS[i];
    if(handler.id == id) {
      return handler;
    }
  }
  return null;
}

function parsePayload(handler, data) {
  return handler.decode(data.slice(0, handler.len));
}

function parseMsgInfo(data) {
  var msgIdx = data[0];
  var msgCnt = data[1] & 0x0f;
  var msgNum = (data[1] & 0xf0) >> 4;
  return { 'msgIdx': msgIdx, 'msgCnt': msgCnt, 'msgNum': msgNum };
}

function parseApp(data) {
  var header = parseHeader(data);
  data = data.slice(2);
  var msgInfo = parseMsgInfo(data);
  data = data.slice(2);
  debug('Got ' + data.length + ' bytes of payload');
  var payloads = [ ];
  while(data.length > 0) {
    var handler = getHandler(data);
    if(!handler) {
      debug('Encountered unknown payload type ' + data[0])
      break;
    }
    data = data.slice(1);
    debug('Found payload type ' + handler.id + ' with length of ' + handler.len + ' bytes');
    payloads.push(parsePayload(handler, data));
    data = data.slice(handler.len);
  }
  var appData = { 'type': 'app', 'header': header, 'msgInfo': msgInfo, 'payloads': payloads };
  return appData;
}

function parseConfig(data) {
  var header = parseHeader(data);
  data = data.slice(2);
  var measureInterval = decodeUint16BE(data);
  return { 'type': 'config', 'header': header, 'measureIntervalMin': measureInterval };
}

function parseInfo(data) {
  var header = parseHeader(data);
  data = data.slice(2);
  var appMajorVersion = data[0];
  var appMinorVersion = data[1];
  return { 'type': 'info', 'header': header, 'appMajorVersion': appMajorVersion, 'appMinorVersion': appMinorVersion };
}

function parseRegisterDefs(data) {
  var registers = [ ];
  while(data.length >= 3) {
    var main = data[0];
    var major = data[1];
    var minor = data[2];
    registers.push({ 'main': main, 'major': major, 'minor': minor });
    data = data.slice(3);
  }
  return registers;
}

function parseRegisterSearch(data) {
  var header = parseHeader(data);
  data = data.slice(2);
  var msgInfo = parseMsgInfo(data);
  data = data.slice(2);
  return { 'type': 'registerSearch', 'header': header, 'msgInfo': msgInfo, 'registerDefs': parseRegisterDefs(data) };
}

function parseRegisterSet(data) {
  var header = parseHeader(data);
  data = data.slice(2);
  var activeFilters = data[0] & 0x0f;
  data = data.slice(1);
  var filters = parseRegisterDefs(data.slice(0, 12));
  for(var i = 0; i < filters.length; i++) {
    filters[i].active = ((activeFilters & (1<<i)) >> i) > 0;
  }
  return { 'type': 'registerSet', 'header': header, 'filters': filters };
}

var DECODERS = [
  { 'port': 3,   minLen:  4, name: 'app',            'decode': parseApp },
  { 'port': 100, minLen:  4, name: 'config',         'decode': parseConfig },
  { 'port': 101, minLen:  4, name: 'info',           'decode': parseInfo },
  { 'port': 103, minLen:  4, name: 'registerSearch', 'decode': parseRegisterSearch },
  { 'port': 104, minLen: 15, name: 'registerSet',    'decode': parseRegisterSet },
];

function getDecoder(port) {
  for(var i = 0; i < DECODERS.length; i++) {
    var decoder = DECODERS[i];
    if(decoder.port == port) {
      return decoder;
    }
  }
  return null;
}

function Decoder(bytes, port) {
  var decoder = getDecoder(port);
  if(!decoder) {
    warning('No decoder for port ' + port + ' found');
    return { 'port': port, 'rawData': bytes };
  }
  if(bytes.len < decoder.minLen) {
    warning('Message too short for decoder "' + decoder.name + '", got ' + bytes.len + ' bytes need at least ' + decoder.minLen + ' bytes');
    return { 'port': port, 'rawData': bytes };
  }
  return decoder.decode(bytes);
}

