'use strict';

/*
  TTN encoder for KLAX LoRaWAN electricity meter sensors
  © Tobias Schramm 2019 (tobias.schramm@t-sys.eu) (licensed under CC BY-NC-SA 4.0)
*/

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

function exp2(power) {
  return Math.pow(2, power);
}

function encodeUintN(val, bits, be) {
  if(val < 0) {
    error('Can not encode negative value to unsigned int');
    return null;
  }
  if(val > exp2(bits) - 1) {
    error('Can not encode ' + val + ' in ' + bits + ' bits, value too large');
    return null;
  }
  var bytes = [ ];
  for(var i = 0; i < bits / 8; i++) {
    bytes.push(val % 256);
    val = Math.floor(val / 256);
  }
  if(be) {
    bytes.reverse();
  }
  return bytes;
}

function encodeUint32LE(val) {
  return encodeUintN(val, 32, false);
}

function encodeUint16LE(val) {
  return encodeUintN(val, 16, false);
}

function encodeUint32BE(val) {
  return encodeUintN(val, 32, true);
}

function encodeUint16BE(val) {
  return encodeUintN(val, 16, true);
}

function encodeApp(params) {
  return [ 1 ];
}


function encodeConfig(params) {
  if(!'measureIntervalMin' in params) {
    error('Missing required key "measureIntervalMin"');
    return null;
  }
  return encodeUint16BE(params.measureIntervalMin);
}

function encodeInfo(params) {
  return [ 1 ];
}

function encodeRegisterSearch(params) {
  return [ 1 ];
}

function encodeFilter(filter) {
  var keys = [ 'main', 'major', 'minor' ];
  for(var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if(!key in filter) {
      error('Missing required key "' + key + '" in filter');
      return null;
    }
  }
  return [ filter.main, filter.major, filter.minor ];
}

function encodeRegisterSet(params) {
  if(!'filters' in params) {
    error('Missing required key "filters"');
    return null;
  }
  var filters = params.filters;
  var bytes = [ ];
  var active_filters = 0;
  for(var i = 1; i <= 4; i++) {
    var filter = { 'main': 0, 'major': 0, 'minor': 0 };
    if(i in filters) {
      var filter = filters[i];
      active_filters = active_filters | (1<<(i - 1));
    }
    var encoded = encodeFilter(filter);
    if(!encoded) {
      return null;
    }
    bytes = bytes.concat(encoded);
  }
  bytes.unshift(active_filters);
  return bytes;
}

var ENCODERS = [
  { 'port': 3,   name: 'app',            'encode': encodeApp },
  { 'port': 100, name: 'config',         'encode': encodeConfig },
  { 'port': 101, name: 'info',           'encode': encodeInfo },
  { 'port': 103, name: 'registerSearch', 'encode': encodeRegisterSearch },
  { 'port': 104, name: 'registerSet',    'encode': encodeRegisterSet },
];

function getEncoder(port) {
  for(var i = 0; i < ENCODERS.length; i++) {
    var encoder = ENCODERS[i];
    if(encoder.port == port) {
      return encoder;
    }
  }
  return null;
}

function Encoder(object, port) {
  var encoder = getEncoder(port);
  if(!encoder) {
    error('No encoder for port ' + port + ' available')
    return null;
  }
  var bytes = encoder.encode(object);
  debug('Sending ' + bytes);
  return bytes;
}

