// https://uwdata.github.io/arquero/
// https://uwdata.github.io/arquero/api/#loadCSV

// ----- Data load -------------------------------------------------------------

/**
 * Load latest Monitor objects from USFS AirFire repositories for 'airnow',
 * 'airsis' and 'wrcc' data.
 * 
 * This function has no return but has the side effect of calling the callback
 * function which is responsible for assigning dataframes to objects in the 
 * global namespace.
 * @param {Function} callback A callback function responsible for assigning the loaded data.
 * @param {String} provider One of "airnow|airsis|wrcc".
 * @archiveBaseUrl {String} Base URL for monitoring v2 data files.
 */
provider_loadLatest = function(
  callback = null,
  provider = null,
  archiveBaseUrl = "https://airfire-data-exports.s3.us-west-2.amazonaws.com/monitoring/v2",
) {

  // TODO: support additional arguments
  const QC_negativeValues = "zero";
  const QC_removesuspectData = true;

  // * Load meta -----
  var url = archiveBaseUrl + "/latest/data/" + provider + "_PM2.5_latest_meta.csv";
  // // //url = "http://127.0.0.1:8080/" + provider + "_PM2.5_latest_meta.csv";
  url = "/" + provider + "_PM2.5_latest_meta.csv";
  console.log("loading ... " + url);

  // Everything parses correctly except 'dataIngestUnitID'
  aq.loadCSV(url)
    .then(dt => {
      dt = dt.select(monitor_coreMetadataNames);
      callback(dt, provider, 'meta');
    })
    .catch(err => { console.log(err); });

  // * Load data -----
  url = archiveBaseUrl + "/latest/data/" + provider + "_PM2.5_latest_data.csv";
  // // // url = "http://127.0.0.1:8080/" + provider + "_PM2.5_latest_data.csv";
  url = "/" + provider + "_PM2.5_latest_data.csv";
  console.log("loading ... " + url);

  let data_parseObject = {
    datetime: Date,
  }

  aq.loadCSV(url)
    .then(dt => {
      dt = negativeToZero(dt);
      callback(dt, provider, 'data');
    })
    .catch(err => { console.log(err); });

    console.log("Finished loading " + provider + " meta + data.")

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


// ----- SPECIAL FOR THE UI ----------------------------------------------------

/**
 * Combine AirNow, AIRSIS and WRCC monitors into a single Monitor.
 * @param {Object} monitor_objects An object with 'airnow', 'airsis' and 'wrcc' Monitor objects.
 * @returns {Monitor} A combined monitor object.
 */
monitor_combineAAW = function(monitor_objects) {

  // Combining meta is easy as they are guaranteed to have the same columns
  let meta = 
    monitor_objects.airnow.meta
    .concat(monitor_objects.airsis.meta)
    .concat(monitor_objects.wrcc.meta);

  // Combining data is harder
  let data1 = monitor_objects.airnow.data;
  let data2 = monitor_objects.airsis.data;
  let data3 = monitor_objects.wrcc.data;

  let max_starttime = data1.array('datetime')[0];
  let starttime_2 =  data2.array('datetime')[0];
  let starttime_3 =  data3.array('datetime')[0];
  if (starttime_2 > max_starttime) max_starttime = starttime_2;
  if (starttime_3 > max_starttime) max_starttime = starttime_3;

  // TODO:  We should extend the short timespans rather than cut the long one
  let min_endtime = data1.array('datetime')[data1.numRows() - 1];
  let endtime_2 =  data2.array('datetime')[data2.numRows() - 1];
  let endtime_3 =  data3.array('datetime')[data3.numRows() - 1];
  if (endtime_2 < min_endtime) min_endtime = endtime_2;
  if (endtime_3 < min_endtime) min_endtime = endtime_3;

  data1 = data1
    .params({start: max_starttime, end: min_endtime})
    .filter((d, $) => d.datetime >= $.start)
    .filter((d, $) => d.datetime <= $.end)

  data2 = data2
    .params({start: max_starttime, end: min_endtime})
    .filter((d, $) => d.datetime >= $.start)
    .filter((d, $) => d.datetime <= $.end)
   .select(aq.not('datetime'))

  data3 = data3
    .params({start: max_starttime, end: min_endtime})
    .filter((d, $) => d.datetime >= $.start)
    .filter((d, $) => d.datetime <= $.end)
    .select(aq.not('datetime'))

  let data = data1.assign(data2).assign(data3);

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

negativeToZero = function(dt) {
  // Programmatically create a values object that replaces values
  const ids = dt.columnNames();
  let values = {}
  ids.map(id => values[id] = "d => d['" + id + "'] <= 0 ? 0 : d['" + id + "']");
  // Create and return the dt with all negative values replaced
  let new_dt = dt.derive(values);
  return(new_dt)
}

validCount = function(dt) {
  // Programmatically create a values object that replaces values
  const ids = dt.columnNames();
  let values = {}
  ids.map(id => values[id] = "d => opt.valid(d['" + id + "'])");
  // Create and return the dt with all negative values replaced
  let new_dt = dt.rollup(values);
  return(new_dt)
}



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

