// https://uwdata.github.io/arquero/

class Monitor {

  meta = null;
  data = null;

  constructor(
    meta = null,
    data = null
  ) {
    this.meta = meta;
    this.data = data;
  }

  // ----- Data load -------------------------------------------------------------

  /**
   * Load latest Monitor objects from USFS AirFire repositories for 'airnow',
   * 'airsis' and 'wrcc' data.
   * 
   * This function replaces the 'meta' and 'data' properties of the 
   * 'monitorObj' with the latest available data. Data are updated every few minutes.
   * @param {String} provider One of "airnow|airsis|wrcc".
   * @archiveBaseUrl {String} Base URL for monitoring v2 data files.
   */
   async loadLatest(
    provider = null,
    archiveBaseUrl = "https://airfire-data-exports.s3.us-west-2.amazonaws.com/monitoring/v2",
  ) {
    try {
      await this.#provider_load(provider, 'latest', archiveBaseUrl);
    } catch (e) {
      console.error(e);
    }
  }

  async loadDaily(
    provider = null,
    archiveBaseUrl = "https://airfire-data-exports.s3.us-west-2.amazonaws.com/monitoring/v2",
  ) {
    try {
      await this.#provider_load(provider, 'daily', archiveBaseUrl);
    } catch (e) {
      console.error(e);
    }
  }

  async #provider_load(
    provider = null,
    timespan = 'latest',
    archiveBaseUrl = "https://airfire-data-exports.s3.us-west-2.amazonaws.com/monitoring/v2",
  ) {

    // TODO: support additional arguments
    const QC_negativeValues = "zero";
    const QC_removesuspectData = true;

    // * Load meta -----
    let url = archiveBaseUrl + "/" + timespan + "/data/" + provider + "_PM2.5_" + timespan + "_meta.csv";
    let dt = await aq.loadCSV(url);
    this.meta = this.#parseMeta(dt);

    // * Load data -----
    url = archiveBaseUrl + "/" + timespan + "/data/" + provider + "_PM2.5_" + timespan + "_data.csv";
    dt = await aq.loadCSV(url);
    this.data = this.#parseData(dt);

  }

  // ----- Monitor manipulation ------------------------------------------------

  /**
   * Combine another Monitor object with 'this' object.
   * 
   * A new Monitor object is returned containing all timeseries and metadata from
   * 'this' Monitor as well as the passed in 'monitor'. This allows for chaining to
   * combine multiple Monitor objects.
   * @param {Monitor} monitor A monitor object.
   * @returns {Monitor} A combined monitor object.
   */
  combine(monitor) {

    let meta = this.meta.concat(monitor.meta);
    let data = this.data.join(monitor.data); // automatically joins on 'datetime' as the only shared column

    // Return
    let return_monitor = new Monitor(meta, data);
    return(return_monitor);

  }

  /**
   * Subset and reorder time series within a monitor object.
   * @param {...String} ids deviceDeploymentIDs of the time series to select.
   * @returns {Monitor} A reordered (subset) of the incoming monitor object.
   */
select(ids) {

    let meta = this.meta
      .params({ids: ids})
      .filter( (d, $) => op.includes($.ids, d.deviceDeploymentID) );

    let data = this.data.select('datetime', ids);

    // Return
    let return_monitor = new Monitor(meta, data);
    return(return_monitor);

  }


  /**
   * Drop monitor object time series with all missing data.
   * @returns {Monitor} A subset of the incoming monitor object.
   */
  dropEmpty() {

    let validCount = function(dt) {
      // Programmatically create a values object that counts valid values
      const ids = dt.columnNames();
      let values = {}
      ids.map(id => values[id] = "d => op.valid(d['" + id + "'])");
      let new_dt = dt.rollup(values);
      return(new_dt)
    }

    // -----
    
    var meta = this.meta;
    var data = this.data;

    // Single row table with the count of valid values 
    var countObj = validCount(data).object(0);
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
    let return_monitor = new Monitor(meta, data);
    return(return_monitor);

  }


// /**
//  * Augment monitor.meta with current status information derived from monitor.data
//  * @param {Monitor} monitor Monitor object with 'meta' and 'data'.
//  * @returns {Table} An enhanced version of monitor.meta.
//  */
//  monitor_getCurrentStatus = function(monitor) {

//   let data = monitor.data;

//   let ids = data.columnNames().slice(1);

//   // Create a data table with no 'datetime' but an added 'index' column
//   // NOTE:  op.row_number() starts at 1
//   let dataBrick = data.select(aq.not('datetime')).derive({index: d => op.row_number() - 1});

//   // Programmatically create a values object that replaces valid values with a row index
//   let values1 = {}
//   ids.map(id => values1[id] = "d => op.is_finite(d['" + id + "']) ? d.index : 0");

//   // Programmatically create a values object that finds the max for each columnm
//   let values2 = {}
//   ids.map(id => values2[id] = "d => op.max(d['" + id + "'])");

//   // Create a single-row dt with the row index of the last valid PM2.5 value
//   // Then extract the row as a an object with deviceID: index
//   let lastValidIndexObj = dataBrick.derive(values1).rollup(values2).object(0);

//   // Array of indices;
//   let lastValidIndex = Object.values(lastValidIndexObj);

//   // Map indices onto an array of datetimes
//   let lastValidDatetime = lastValidIndex.map(index => data.array('datetime')[index]);

//   // Map ids onto an array of PM2.5 values
//   let lastValidPM_25 = ids.map((id, index) => data.get(id, lastValidIndex[index]));

//   // Create a data table with current status columns
//   let lastValidDT = aq.table({
//     lastValidDatetime: lastValidDatetime,
//     lastValidPM_25: lastValidPM_25
//   })

//   // Return the enhanced metadata  
//   let metaPlus = monitor.meta.assign(lastValidDT)

//   return(metaPlus)

//  }

  // ----- Plot methods -----------------------------------------------------

  timeseriesPlot(figureID, id) {

    let index = null;
    let ids = this.getIDs();

    if ( Number.isInteger(id) ) {
      index = id;
      id = ids[index];
    } else {
      index = ids.indexOf(id);
    }

    // Create a new table with NowCast values for this monitor
    let dt = this.data
      .select(['datetime', id])
      .rename(aq.names('datetime', 'pm25'))
      .derive({ nowcast: aq.rolling(d => op.average(d.pm25), [-2, 0]) })

    // NOTE:  Hightcharts will error out if any values are undefined. But null is OK.
    let datetime = dt.array('datetime');
    let pm25 = dt.array('pm25').map(x => x === undefined ? null : Math.round(10 * x) / 10);
    let nowcast = dt.array('nowcast').map(x => x === undefined ? null : Math.round(10 * x) / 10);
    let title = this.meta.array('locationName')[index];
    let xAxis_title = "Time (" + this.meta.array('timezone')[index] + ")";

    const chart = pm25_timeseriesPlot(figureID, datetime, pm25, nowcast, title, xAxis_title);
    
    addAQIStackedBar(chart);

  };

  // ----- Utility methods -----------------------------------------------------

  /**
   * Returns an array of unique identifiers (deviceDeploymentIDs) found in a Monitor object
   * @returns {Array} An array of deviceDeploymentIDs.
   */
   getIDs() {
    return(this.meta.array('deviceDeploymentID'));
  }

  /**
   * Returns the number of individual time series found in a Monitor object
   * @returns {Int} Count of individual time series.
   */
   count() {
    return(this.meta.numRows());
  }

  // ----- Private methods -----------------------------------------------------

  /**
   * Automatic parsing works quite well. We help out with:
   *   1. replace 'NA' with null
   *   2. only retain core metadata columns
   */
  #parseMeta(dt) {
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
    return(dt.derive(values1).derive(values2).select(this.coreMetadataNames));
  }

  /** 
   * Automatic parsing doesn't automatically recognize 'NA' as null so data gets
   * parsed as text strings. We fix things by:
   *   1. replace 'NA' with null and convert to numeric
   *   2. lift any negative values to zero (matching the default R code behavior)
   */
  #parseData(dt) {
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

  // ----- Constants -----------------------------------------------------------

  coreMetadataNames = [
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


}
