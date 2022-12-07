// Functions available in the global scope that prepare data from a Monitor object
// and send this to an AirQualityPlot method.

// Requires:
//  * https://uwdata.github.io/arquero/
//  * https://momentjs.com
//  * https://momentjs.com/timezone/
//  * ./air-monitor.js
//  * ./air-quality-plots.js


const timeseriesPlot = function(figureID, monitor, id) {

  let AQP = new AirQualityPlot;
  let index = null;
  let ids = monitor.getIDs();

  if ( Number.isInteger(id) ) {
    index = id;
    id = ids[index];
  } else {
    index = ids.indexOf(id);
  }

  let locationName = monitor.meta.array('locationName')[index];
  let timezone = monitor.meta.array('timezone')[index];

  // Create a new table with NowCast values for this monitor
  let dt = monitor.data
    .select(['datetime', id])
    .rename(aq.names('datetime', 'pm25'))
    .derive({ nowcast: aq.rolling(d => op.average(d.pm25), [-2, 0]) })

  // NOTE:  Hightcharts will error out if any values are undefined. But null is OK.
  let datetime = dt.array('datetime');
  let pm25 = dt.array('pm25').map(x => x === undefined ? null : Math.round(10 * x) / 10);
  let nowcast = dt.array('nowcast').map(x => x === undefined ? null : Math.round(10 * x) / 10);

  const chart = AQP.pm25_timeseriesPlot(figureID, datetime, pm25, nowcast, locationName, timezone);
  
  AQP.addAQIStackedBar(chart);

};

const dailyBarplot = function(figureID, monitor, id) {

  let AQP = new AirQualityPlot;
  let index = null;
  let ids = monitor.getIDs();

  if ( Number.isInteger(id) ) {
    index = id;
    id = ids[index];
  } else {
    index = ids.indexOf(id);
  }

  let locationName = monitor.meta.array('locationName')[index];
  let timezone = monitor.meta.array('timezone')[index];


  // Create a new table with 24-rolling average values for this monitor
  // NOTE:  Start by trimming to full days in the local timezone
  let dt = monitor.trimDate(timezone).data
    .select(['datetime', id])
    .rename(aq.names('datetime', 'pm25'))
    .derive({ avg_24hr: aq.rolling(d => op.average(d.pm25), [-23, 0]) })

  // NOTE:  Hightcharts will error out if any values are undefined. But null is OK.
  let datetime = dt.array('datetime');
  let pm25 = dt.array('pm25').map(x => x === undefined ? null : Math.round(10 * x) / 10);
  let avg_24hr = dt.array('avg_24hr').map(x => x === undefined ? null : Math.round(10 * x) / 10);

  let dayCount = avg_24hr.length / 24;
  let time_indices = [];
  let avg_indices = [];
  for (let i = 0; i < dayCount; i++) { 
    time_indices[i] = 24 * i;     // avg assigned to beginning of day
    avg_indices[i] = 24 * i + 23; // avg calculated at end of day
  }

  let daily_datetime = time_indices.map(x => datetime[x]);
  let daily_avg_pm25 = avg_indices.map(x => avg_24hr[x]);

  const chart = AQP.pm25_dailyBarplot(figureID, daily_datetime, daily_avg_pm25, locationName, timezone);
  
  AQP.addAQIStackedBar(chart);

}; 

const diurnalPlot = function(figureID, monitor, id) {

  let AQP = new AirQualityPlot;
  let index = null;
  let ids = monitor.getIDs();

  if ( Number.isInteger(id) ) {
    index = id;
    id = ids[index];
  } else {
    index = ids.indexOf(id);
  }

  let locationName = monitor.meta.array('locationName')[index];
  let timezone = monitor.meta.array('timezone')[index];

  // Pull out the yesterday and today hourly timeseries
  let dt = monitor.data
    .select(['datetime', id])
    .rename(aq.names('datetime', 'pm25'))
    .derive({local_hour: aq.escape(d => moment.tz(d.datetime, timezone).hours())});

  let localHours = dt.array('local_hour');
  let pm25 = dt.array('pm25').map(x => x === undefined ? null : Math.round(10 * x) / 10);

  // Calculate local time hours and yeserday/today start/end
  let lastHour = localHours[localHours.length - 1];
  let today_end = localHours.length;
  let today_start = localHours.length - 1 - lastHour;
  let yesterday_end = today_start;
  let yesterday_start = today_start - 24;

  let yesterday = pm25.slice(yesterday_start, yesterday_end);
  let today = pm25.slice(today_start, today_end);
 
  // Create the average by local_hour data table
  // NOTE:  Start by trimming to full days in the local timezone
  let dt_mean = monitor.trimDate(timezone).data
    .select(['datetime', id])
    .rename(aq.names('datetime', 'pm25'))
    .derive({local_hour: aq.escape(d => moment.tz(d.datetime, timezone).hours())})
    .groupby('local_hour').rollup({hour_mean: aq.op.mean('pm25')});

  // NOTE:  Hightcharts will error out if any values are undefined. But null is OK.
  let hour = dt_mean.array('local_hour');
  let hour_mean = dt_mean.array('hour_mean').map(x => x === undefined ? null : Math.round(10 * x) / 10);
  
  const chart = AQP.pm25_diurnalPlot(figureID, hour, hour_mean, yesterday, today, locationName, timezone);
  
  AQP.addAQIStackedBar(chart);

};

