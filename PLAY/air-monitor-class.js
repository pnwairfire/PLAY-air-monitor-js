// https://uwdata.github.io/arquero/

class Monitor {

  meta = null;
  data = null;

  constructor() {
    this.meta = 'meta';
    this.data = 'data';
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
