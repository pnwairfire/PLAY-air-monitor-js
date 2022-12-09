// Functions available in the global scope that prepare data from a Monitor object
// and send this to an AirQualityPlot method.

// Requires:
//  * https://uwdata.github.io/arquero
//  * https://momentjs.com
//  * https://momentjs.com/timezone
//  * https://github.com/mourner/suncalc
//  * ./air-monitor.js
//  * ./air-quality-plots.js

/**
 * Creates a Highcharts timeseries plot with PM2.5 hourly and Nowcast values.
 * @param {String} figureID CSS selector identifying the <div> where the plot will appear.
 * @param {Monitor} monitor Monitor object.
 * @param {String} id Unique timeseries identifier (deviceDeploymentID).)
 */
 const timeseriesPlot = function(figureID, monitor, id) {

  let AQP = new AirQualityPlot;

  const locationName = monitor.getMetadata(id, 'locationName');
  const timezone = monitor.getMetadata(id, 'timezone');
  const datetime = monitor.getDatetime();
  const pm25 = monitor.getPM25(id);
  const nowcast = monitor.getNowcast(id);

  const chart = AQP.pm25_timeseriesPlot(figureID, datetime, pm25, nowcast, locationName, timezone);
  
  AQP.addAQIStackedBar(chart);

};

/**
 * Creates a Highcharts daily barplot plot with PM2.5 daily average values.
 * @param {String} figureID CSS selector identifying the <div> where the plot will appear.
 * @param {Monitor} monitor Monitor object.
 * @param {String} id Unique timeseries identifier (deviceDeploymentID).)
 */
 const dailyBarplot = function(figureID, monitor, id) {

  let AQP = new AirQualityPlot;

  const locationName = monitor.getMetadata(id, 'locationName');
  const timezone = monitor.getMetadata(id, 'timezone');

  const {datetime, avg_pm25} = monitor.getDailyAverageObject(id);

  const chart = AQP.pm25_dailyBarplot(figureID, datetime, avg_pm25, locationName, timezone);
  
  AQP.addAQIStackedBar(chart);

}; 

/**
 * Creates a Highcharts diurnal plot with average, yesterday and today values.
 * @param {String} figureID CSS selector identifying the <div> where the plot will appear.
 * @param {Monitor} monitor Monitor object.
 * @param {String} id Unique timeseries identifier (deviceDeploymentID).)
 */
 const diurnalPlot = function(figureID, monitor, id) {

  let AQP = new AirQualityPlot;

  const locationName = monitor.getMetadata(id, 'locationName');
  const timezone = monitor.getMetadata(id, 'timezone');
  const longitude = monitor.getMetadata(id, 'longitude');
  const latitude = monitor.getMetadata(id, 'latitude');

  const datetime = monitor.getDatetime();
  const pm25 = monitor.getPM25(id);
  const nowcast = monitor.getNowcast(id);
  const localHours = datetime.map(o => moment.tz(o, timezone).hours());

  // Day/Night shading
  let middleDatetime = datetime[Math.round(datetime.length/2)];
  let times = SunCalc.getTimes(middleDatetime.valueOf(), latitude, longitude);
  let sunriseHour = 
    moment.tz(times.sunrise, timezone).hour() + 
    moment.tz(times.sunrise, timezone).minute() / 60; 
  let sunsetHour = 
    moment.tz(times.sunset, timezone).hour() + 
    moment.tz(times.sunset, timezone).minute() / 60; 
    
  // Get yeserday/today start/end
  let lastHour = localHours[localHours.length - 1];
  let today_end = localHours.length;
  let today_start = localHours.length - 1 - lastHour;
  let yesterday_end = today_start;
  let yesterday_start = today_start - 24;

  let yesterday = nowcast.slice(yesterday_start, yesterday_end);
  let today = nowcast.slice(today_start, today_end);
 
  // Create the average by local_hour data table
  // NOTE:  Start by trimming to full days in the local timezone
  let dt_mean = monitor
    .trimDate(timezone).data     // full days only
    .slice(-(7*24))              // last 7 full days
    .select(['datetime', id])
    .rename(aq.names('datetime', 'pm25'))
    .derive({local_hour: aq.escape(d => moment.tz(d.datetime, timezone).hours())})
    .groupby('local_hour').rollup({hour_mean: aq.op.mean('pm25')});

  // NOTE:  Hightcharts will error out if any values are undefined. But null is OK.
  let hour = dt_mean.array('local_hour');
  let hour_mean = dt_mean.array('hour_mean').map(x => x === undefined ? null : Math.round(10 * x) / 10);
  
  const chart = AQP.pm25_diurnalPlot(figureID, hour, hour_mean, yesterday, today, locationName, timezone, sunriseHour, sunsetHour);
  
  AQP.addAQIStackedBar(chart);


};

