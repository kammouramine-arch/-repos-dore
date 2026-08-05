import {
  array,
  asNumber,
  asRecord,
  asString,
  field,
  optional,
  type Decoder,
} from '@/services/http/decode';
import type {
  OsrmLeg,
  OsrmManeuver,
  OsrmRoute,
  OsrmRouteResponse,
  OsrmStep,
} from './osrmTypes';

const decodeLocation: Decoder<[number, number]> = (value, path) => {
  const pair = array(asNumber)(value, path);
  return [
    pair[0] ?? asNumber(undefined, `${path}[0]`),
    pair[1] ?? asNumber(undefined, `${path}[1]`),
  ];
};

const decodeManeuver: Decoder<OsrmManeuver> = (value, path) => {
  const record = asRecord(value, path);

  return {
    location: field(record, 'location', decodeLocation, path),
    bearing_after: field(record, 'bearing_after', optional(asNumber), path),
    bearing_before: field(record, 'bearing_before', optional(asNumber), path),
    type: field(record, 'type', optional(asString), path),
    modifier: field(record, 'modifier', optional(asString), path),
    exit: field(record, 'exit', optional(asNumber), path),
  };
};

const decodeStep: Decoder<OsrmStep> = (value, path) => {
  const record = asRecord(value, path);

  return {
    distance: field(record, 'distance', asNumber, path),
    duration: field(record, 'duration', asNumber, path),
    name: field(record, 'name', optional(asString), path),
    ref: field(record, 'ref', optional(asString), path),
    maneuver: field(record, 'maneuver', decodeManeuver, path),
  };
};

const decodeLeg: Decoder<OsrmLeg> = (value, path) => {
  const record = asRecord(value, path);

  return {
    distance: field(record, 'distance', asNumber, path),
    duration: field(record, 'duration', asNumber, path),
    summary: field(record, 'summary', optional(asString), path),
    // Strict on purpose: a silently dropped step would shift every subsequent
    // maneuver and mislead the driver. Better to reject the whole route.
    steps: field(record, 'steps', optional(array(decodeStep)), path),
  };
};

const decodeRoute: Decoder<OsrmRoute> = (value, path) => {
  const record = asRecord(value, path);

  return {
    distance: field(record, 'distance', asNumber, path),
    duration: field(record, 'duration', asNumber, path),
    geometry: field(record, 'geometry', asString, path),
    legs: field(record, 'legs', optional(array(decodeLeg)), path),
  };
};

export const decodeOsrmRouteResponse: Decoder<OsrmRouteResponse> = (value, path) => {
  const record = asRecord(value, path);

  return {
    code: field(record, 'code', asString, path),
    message: field(record, 'message', optional(asString), path),
    routes: field(record, 'routes', optional(array(decodeRoute)), path),
  };
};
