// https://uwdata.github.io/arquero/

// ----- Data load -------------------------------------------------------------

/**
 * Load latest Monitor objects from USFS AirFire repositories for 'airnow',
 * 'airsis' and 'wrcc' data.
 * 
 * This function replaces the 'meta' and 'data' properties of the passed in
 * 'monitorObj' with the latest available data. Data are updated every few minutes.
 * @param {Object} monitorObj A Monitor object with 'meta' and 'data' properties.
 * Data in these tables will be replaced with new data obtained from USFS AirFire.
 * @param {String} provider One of "airnow|airsis|wrcc".
 * @archiveBaseUrl {String} Base URL for monitoring v2 data files.
 */
provider_loadLatest = async function(
  monitorObj = null,
  provider = null,
  archiveBaseUrl = "https://airfire-data-exports.s3.us-west-2.amazonaws.com/monitoring/v2",
) {

  // TODO: support additional arguments
  const QC_negativeValues = "zero";
  const QC_removesuspectData = true;

  // * Load meta -----
  var url = archiveBaseUrl + "/latest/data/" + provider + "_PM2.5_latest_meta.csv";
  dt = await aq.loadCSV(url);
  monitorObj['meta'] = monitor_parseMeta(dt);

  // * Load data -----
  url = archiveBaseUrl + "/latest/data/" + provider + "_PM2.5_latest_data.csv";
  dt = await aq.loadCSV(url);
  monitorObj['data'] = monitor_parseData(dt);

}

airnow_loadLatest = async function(
  monitorObj = null,
  archiveBaseUrl = "https://airfire-data-exports.s3.us-west-2.amazonaws.com/monitoring/v2",
) {
  try {
    await provider_loadLatest(monitorObj, 'airnow', archiveBaseUrl);
  } catch (e) {
    console.error(e);
  }
}

airsis_loadLatest = async function(
  monitorObj = null,
  archiveBaseUrl = "https://airfire-data-exports.s3.us-west-2.amazonaws.com/monitoring/v2",
) {
  try {
    await provider_loadLatest(monitorObj, 'airsis', archiveBaseUrl);
  } catch (e) {
    console.error(e);
  }
}

wrcc_loadLatest = async function(
  monitorObj = null,
  archiveBaseUrl = "https://airfire-data-exports.s3.us-west-2.amazonaws.com/monitoring/v2",
) {
  try {
    await provider_loadLatest(monitorObj, 'wrcc', archiveBaseUrl);
  } catch (e) {
    console.error(e);
  }
}

// ----- data ingest -----------------------------------------------------------

/**
 * Automatic parsing works quite well. We help out with:
 *   1. replace 'NA' with null
 *   2. only retain core metadata columns
 */
monitor_parseMeta = function(dt) {
  // Programmatically create a values object that replaces values. See:
  //   https://uwdata.github.io/arquero/api/expressions

  const ids = dt.columnNames();

  // Replace 'NA' with null
  let values1 = {};
  ids.map(id => values1[id] = "d => d['" + id + "'] === 'NA' ? null : d['" + id + "']");
  
  // Guarantee numeric
  let values2 = {
    longitude: d => op.parse_float(d.longitude),
    latitude: d => op.parse_float(d.latitude),
    elevation: d => op.parse_float(d.elevation)
  }
  return(dt.derive(values1).derive(values2).select(monitor_coreMetadataNames));
}

/** 
 * Automatic parsing doesn't automatically recognize 'NA' as null so data gets
 * parsed as text strings. We fix things by:
 *   1. replace 'NA' with null and convert to numeric
 *   2. lift any negative values to zero (matching the default R code behavior)
 */
monitor_parseData = function(dt) {
  // Programmatically create a values object that replaces values. See:
  //   https://uwdata.github.io/arquero/api/expressions

  const ids = dt.columnNames().splice(1);  // remove 'datetime'

  // Replace 'NA' with null
  let values1 = {};
  ids.map(id => values1[id] = "d => d['" + id + "'] === 'NA' ? null : op.parse_float(d['" + id + "'])");

  // Lift up negative values to zero
  // NOTE:  'null <= 0' evaluates to true. So we have to test with '< 0'.
  let values2 = {};
  ids.map(id => values2[id] = "d => d['" + id + "'] < 0 ? 0 : d['" + id + "']");

  // Return the modified data table
  return(dt.derive(values1).derive(values2));
}


// ----- monitor manipulation --------------------------------------------------

/**
 * Subset and reorder time series within a monitor object.
 * @param {Monitor} monitor Monitor object with 'meta' and 'data'.
 * @param {...String} ids deviceDeploymentIDs of the time series to select.
 * @returns {Monitor} A reordered (subset) of the incoming monitor object.
 */
monitor_select = function(monitor, ids) {

  let meta = monitor.meta
    .params({ids: ids})
    .filter( (d, $) => op.includes($.ids, d.deviceDeploymentID) );

  let data = monitor.data.select('datetime', ids);

  // Return
  let return_monitor = {
    meta: meta,
    data: data
  }

  return(return_monitor);

}


/**
 * Drop monitor object time series with all missing data.
 * @param {Monitor} monitor Monitor object with 'meta' and 'data'.
 * @returns {Monitor} A subset of the incoming monitor object.
 */
monitor_dropEmpty = function(monitor) {


  validCount = function(dt) {
    // Programmatically create a values object that counts valid values
    const ids = dt.columnNames();
    let values = {}
    ids.map(id => values[id] = "d => op.valid(d['" + id + "'])");
    let new_dt = dt.rollup(values);
    return(new_dt)
  }

  // -----
  
  var meta = monitor.meta;
  var data = monitor.data;

  // Single row table with the count of valid values 
  var countObj = validCount(data).object(0)
  // {a: 4, b: 4, c: 0}

  var ids = [];
  for (const [key, value] of Object.entries(countObj)) {
    if ( value > 0 ) ids.push(key);
  }

  // Subset data and meta
  data = data.select(ids);

  meta = meta
    .params({ids: ids})
    .filter( (d, $) => op.includes($.ids, d.deviceDeploymentID) );

  // Return
  let return_monitor = {
    meta: meta,
    data: data
  }

  return(return_monitor);

}


/**
 * Augment monitor.meta with current status information derived from monitor.data
 * @param {Monitor} monitor Monitor object with 'meta' and 'data'.
 * @returns {Table} An enhanced version of monitor.meta.
 */
 monitor_getCurrentStatus = function(monitor) {

  let data = monitor.data;

  let ids = data.columnNames().slice(1);

  // Create a data table with no 'datetime' but an added 'index' column
  // NOTE:  op.row_number() starts at 1
  let dataBrick = data.select(aq.not('datetime')).derive({index: d => op.row_number() - 1});

  // Programmatically create a values object that replaces valid values with a row index
  let values1 = {}
  ids.map(id => values1[id] = "d => op.is_finite(d['" + id + "']) ? d.index : 0");

  // Programmatically create a values object that finds the max for each columnm
  let values2 = {}
  ids.map(id => values2[id] = "d => op.max(d['" + id + "'])");

  // Create a single-row dt with the row index of the last valid PM2.5 value
  // Then extract the row as a an object with deviceID: index
  let lastValidIndexObj = dataBrick.derive(values1).rollup(values2).object(0);

  // Array of indices;
  let lastValidIndex = Object.values(lastValidIndexObj);

  // Map indices onto an array of datetimes
  let lastValidDatetime = lastValidIndex.map(index => data.array('datetime')[index]);

  // Map ids onto an array of PM2.5 values
  let lastValidPM_25 = ids.map((id, index) => data.get(id, lastValidIndex[index]));

  // Create a data table with current status columns
  let lastValidDT = aq.table({
    lastValidDatetime: lastValidDatetime,
    lastValidPM_25: lastValidPM_25
  })

  // Return the enhanced metadata  
  let metaPlus = monitor.meta.assign(lastValidDT)

  return(metaPlus)

 }


// ----- SPECIAL FOR THE UI ----------------------------------------------------

/**
 * Combine AirNow, AIRSIS and WRCC monitors into a single Monitor.
 * @param {Object} monitor_objects An object with 'airnow', 'airsis' and 'wrcc' Monitor objects.
 * @returns {Monitor} A combined monitor object.
 */
monitor_combineAAW = function(monitor_objects) {

  // Combining meta is easy when they are guaranteed to have the same columns
  let meta = monitor_objects.airnow.meta
    .concat(monitor_objects.airsis.meta)
    .concat(monitor_objects.wrcc.meta);

  // Combining data is easy but drops datetimes that are not shared
  let data = monitor_objects.airnow.data
    .join(monitor_objects.airsis.data, on = 'datetime')
    .join(monitor_objects.wrcc.data, on = 'datetime');

  let return_monitor = {
    meta: meta,
    data: data
  };

  return_monitor = monitor_dropEmpty(return_monitor);

  return(return_monitor);

}

// ----- Utility functions -----------------------------------------------------

const monitor_coreMetadataNames = [
  "deviceDeploymentID",
  "deviceID",
  "deviceType",
  "deviceDescription",
  "pollutant",         
  "units",
  "dataIngestSource",
  "locationID",
  "locationName",
  "longitude",
  "latitude",
  "elevation",
  "countryCode",         
  "stateCode",
  "countyName",
  "timezone",
  "AQSID",
  "fullAQSID", 
];

// ===== DEBUG =================================================================

if ( false ) {

// Simple start
var dt = aq.table({
    'a': [1,2,3,-1],
    'b': [7,8,-1,9],
    'c': [null,null,null,null]
  })

dt.print();

// ----- for dropEmpty:

var dt = aq.table({
    'a': [1,2,3,-1],
    'b': [7,8,-1,9],
    'c': [null,null,null,null]
  })

var countObj = validCount(dt).object(0)
// {a: 4, b: 4, c: 0}

var validNames = [];
for (const [key, value] of Object.entries(countObj)) {
  if ( value > 0 ) validNames.push(key);
}

dt.select(validNames).print();

// ----- for combine

// This combines airnow, airsis and wrcc incredibly fast but drops any
// datetimes that are not shared. We should fluff up incoming arrays to the
// full extent before joining.
var dd = d1.join(d2, on = 'datetime').join(d3, on = 'datetime');



}

// CREATE A FEATURE
if ( false ) {

  let exampleGeoJSON = 
  {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": [-119.784, 37.6745]
        },
        "properties": {
          "deviceDeploymentID": "121fad25495a747a_apcd.1020",
          "AQSID": "MMNPS1020",
          "fullAQSID": "840MMNPS1020",
          "locationName": "MMNPS1020",
          "timezone": "America/Los_Angeles",
          "dataIngestSource": "AIRSIS",
          "dataIngestUnitID": "1020",
          "currentStatus_processingTime": "2022-12-01 21:04:50",
          "last_validTime": "2022-12-01 16:00:00",
          "last_validLocalTimestamp": "2022-12-01 08:00:00 PST",
          "last_nowcast": " 2.4",
          "last_PM2.5": " 0.0",
          "last_latency": "  3",
          "yesterday_PM2.5_avg": "4.9"
        }
      },
    ]
  };

  rowToFeature = function(obj) {

    let feature = {
      type: "Feature",
      geometry: {
        coordinates: [obj.longitude, obj.latitude]
      },
      properties: {
        deviceDeploymentID: obj.deviceDeploymentID,
        AQSID :obj.AQSID,
        fullAQSID: obj.fullAQSID,
        locationName: obj.locationName,
        timezone: obj.timezone,
        dataIngnestSource: obj.dataIngestSource,
        dataIngestUnitID: null,
        currentStatus_processingTime: null,
        last_validTime: boj.lastValidDatetime,
        last_validLocalTimestamp: null,
        last_nowcast: null,
        last_PM2_5: obj.lastValidPM_25,
        last_latency: null,
        yesterday_PM2_5_avg: null
      }
    }

    return feature

  }

 // // //features = monitor.meta.objects().map(rowToFeature);

}

// LAST VALID TIME
if ( false ) {

  // TODO:  arrange by datetime
  let a = monitor.data.select(aq.not('datetime')); // remove 'datetime'
  // find last two valid values


  a = aq.table({
    'a': [1,2,3,1,null,7,3,null,5,3],
    'b': [7,8,1,9,3,3,2,6,3,2],
    'c': [null,null,null,null,3,5,6,2,3,null]
  })

  lastValidIndex = function(dt) {

    let ids = dt.columnNames().slice(1);

    // NOTE:  op.row_number() starts at 1
    let dataBrick = dt.select(aq.not('datetime')).derive({index: d => op.row_number() - 1});

    // Programmatically create a values object that replaces valid values with a row index
    let values1 = {}
    ids.map(id => values1[id] = "d => op.is_finite(d['" + id + "']) ? d.index : 0");

    // Programmatically create a values object that finds the max for each columnm
    let values2 = {}
    ids.map(id => values2[id] = "d => op.max(d['" + id + "'])");

    // Create and return the dt with all negative values replaced
    let lastValidIndexObj = dataBrick.derive(values1).rollup(values2).object(0);

    let lastValidIndex = Object.values(lastValidIndexObj);

    let lastValidDatetime = lastValidIndex.map(index => dt.array('datetime')[index]);

    let lastValidPM_25 = ids.map((id, index) => dt.get(id, lastValidIndex[index]));

    let lastValidDT = aq.table({
      lastValidDatetime: lastValidDatetime,
      lastValidPM_25: lastValidPM_25
    })

    let metaPlus = monitor.meta.assign(lastValidDT)

    return(new_dt)

  }



}

