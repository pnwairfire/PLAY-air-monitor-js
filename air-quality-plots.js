// Plotting functions for air quality data.

// https://github.com/pnwairfire/airfire-smoke-maps/blob/master/src/scripts/graphs.js

/**
 * Creates a "USFS AirFire standard" time series plot of hourly PM2.5 and Nowcast data.
 * 
 * @param {String} figureID CSS identifier for the DOM element where the chart will appear.
 * @param {Array} datetime UTC time values.
 * @param {Array} pm25 Hourly PM2.5 values.
 * @param {Array} nowcast Hourly Nowcast values.
 * @param {String} locationName Human readable location name.
 * @param {String} timezone Olsen timezone.
 * @returns 
 */
 function pm25_timeseriesPlot(
  figureID,
  datetime,
  pm25,
  nowcast,
  locationName,
  timezone
) {
 
  let startTime = datetime[0];
  let title = "Hourly PM2.5 Values and Nowcast<br/>Site: " + locationName;
  let xAxis_title = "Time (" + timezone + ")";

  // Default to well defined y-axis limits for visual stability
  // See:  https://github.com/MazamaScience/AirMonitorPlots/blob/5482843e8e0ccfe1e30ccf21509d0df01fe45bca/R/custom_pm25TimeseriesScales.R#L103
  let max_pm25 = Math.max(...pm25);
  let ymin = 0;
  let ymax = 
    max_pm25 <= 50 ? 50 :
    max_pm25 <= 100 ? 100 :
    max_pm25 <= 200 ? 200 :
    max_pm25 <= 400 ? 500 :
    max_pm25 <= 600 ? 600 :
    max_pm25 <= 1000 ? 1000 :
    max_pm25 <= 1500 ? 1500 : 1.05 * max_pm25

  const chart = Highcharts.chart(figureID, {
    chart: {
      animation: false
    },
    plotOptions: {
      series: {
        animation: false
      },
      scatter: {
        animation: false,
        marker: { radius: 3, symbol: 'circle', fillColor: '#bbbbbb'}
      },
      line: {
        animation: false,
        color: '#000000',
        lineWidth: 1,
        marker: { radius: 1, symbol: 'square', fillColor: 'transparent'}
      }
    },
    title: {
      text: title
    },
    time: {
      timezone: timezone
    },
    xAxis: {
      type: 'datetime',
      title: {margin: 20, style: { "color": "#333333", "fontSize": "16px" }, text: xAxis_title},
      gridLineColor: '#cccccc',
      gridLineDashStyle: 'Dash',
      gridLineWidth: 1,
      minorTicks: true,
      minorTickInterval: 3 * 3600 * 1000, // every 3 hrs
      minorGridLineColor: '#dddddd',
      minorGridLineDashStyle: 'Dot',
      minorGridLineWidth: 1
    },
    yAxis: {
      min: ymin,
      max: ymax,
      gridLineColor: '#cccccc',
      gridLineDashStyle: 'Dash',
      gridLineWidth: 1,
      title: {
        text: 'PM2.5 (\u00b5g/m\u00b3)',
      },
      plotLines: [
        // AQI lines
        {color: 'rgb(255,255,0)', width: 2, value: 12},
        {color: 'rgb(255,126,0)', width: 2, value: 35.5},
        {color: 'rgb(255,0,0)', width: 2, value: 55.5},
        {color: 'rgb(143,63,151)', width: 2, value: 150.5},
        {color: 'rgb(126,0,35)', width: 2, value: 250.5},
      ]
    },
    legend: {
      enabled: true,
      verticalAlign: 'top'
    },
    series: [
      {
        name: 'Hourly PM2.5 Values',
        type: 'scatter',
        pointInterval: 3600 * 1000,
        pointStart: startTime.valueOf(),
        data: pm25
      },
      {
        name: 'Nowcast',
        type: 'line',
        lineWidth: 2,
        pointInterval: 3600 * 1000,
        pointStart: startTime.valueOf(),
        data: nowcast
      }
    ]
  });

  return(chart);

}

/**
 * Creates a "USFS AirFire standard" daily barplot of PM2.5 data.
 * 
 * @param {String} figureID CSS identifier for the DOM element where the chart will appear.
 * @param {Array} daily_datetime UTC time values.
 * @param {Array} daily_avg_pm25 Daily average PM2.5 values.
 * @param {String} locationName Human readable location name.
 * @param {String} timezone Olsen timezone.
 * @returns 
 */
 function pm25_dailyBarplot(
  figureID,
  daily_datetime,
  daily_avg_pm25,
  locationName,
  timezone
) {

  let title = "Daily Average PM2.5<br/>Site: " + locationName;
  let xAxis_title = "Time (" + timezone + ")";

  // Default to well defined y-axis limits for visual stability
  // See:  https://github.com/MazamaScience/AirMonitorPlots/blob/5482843e8e0ccfe1e30ccf21509d0df01fe45bca/R/custom_pm25TimeseriesScales.R#L103
  let max_pm25 = Math.max(...daily_avg_pm25);
  let ymin = 0;
  let ymax = 
    max_pm25 <= 50 ? 50 :
    max_pm25 <= 100 ? 100 :
    max_pm25 <= 200 ? 200 :
    max_pm25 <= 400 ? 500 :
    max_pm25 <= 600 ? 600 :
    max_pm25 <= 1000 ? 1000 :
    max_pm25 <= 1500 ? 1500 : 1.05 * max_pm25

  // Crreate colored series data
  // See:  https://stackoverflow.com/questions/35854947/how-do-i-change-a-specific-bar-color-in-highcharts-bar-chart
  let seriesData = [];
  for ( let i = 0; i < daily_avg_pm25.length; i++ ) {
    seriesData[i] = {y: daily_avg_pm25[i], color: pm25ToColor(daily_avg_pm25[i])};
  } 

  let days = daily_datetime.map(x => moment.tz(x, timezone).format("MMM DD"));

  const chart = Highcharts.chart(figureID, {
    chart: {
    },
    plotOptions: {
      column: {
        animation: false,
        allowPointSelect: true,
        borderColor: '#666666'
      }
    },
    title: {
      text: title
    },
    xAxis: {
      categories: days,
      title: {margin: 20, style: { "color": "#333333", "fontSize": "16px" }, text: xAxis_title}
    },
    yAxis: {
      min: ymin,
      max: ymax,
      gridLineColor: '#cccccc',
      gridLineDashStyle: 'Dash',
      gridLineWidth: 1,
      title: {
        text: 'PM2.5 (\u00b5g/m\u00b3)',
      },
      plotLines: [
        // AQI lines
        {color: 'rgb(255,255,0)', width: 2, value: 12},
        {color: 'rgb(255,126,0)', width: 2, value: 35.5},
        {color: 'rgb(255,0,0)', width: 2, value: 55.5},
        {color: 'rgb(143,63,151)', width: 2, value: 150.5},
        {color: 'rgb(126,0,35)', width: 2, value: 250.5},
      ]
    },
    legend: {
      enabled: false
    },
    series: [{
      name: 'Daily Avg PM2.5',
      type: 'column',
      data: seriesData
    }]  

  });

  return(chart);

}

// ----- Utility functions -----------------------------------------------------

/**
 * Draws a stacked bar indicating AQI levels on one side of a plot.
 * @param {Highchart} chart 
 */
function addAQIStackedBar(chart) {

 // NOTE:  0, 0 is at the top left of the graphic with y increasing downward

  let xmin = chart.xAxis[0].min;
  let ymin = chart.yAxis[0].min;
  let ymax = chart.yAxis[0].max;
  let ymax_px = chart.yAxis[0].toPixels(ymax);

  let xlo = chart.xAxis[0].left; // leftmost pixel of the plot area
  let xhi = xlo + 8;
  let width = Math.abs(xhi - xlo);


  // Green
  let yhi = chart.yAxis[0].toPixels(0);
  let ylo = Math.max(chart.yAxis[0].toPixels(12), ymax_px);
  let height = Math.abs(yhi - ylo);
  chart.renderer.rect(xlo, ylo, width, height, 1).attr({fill: 'rgb(0,255,0)', stroke: 'transparent'}).add();
  
  // Yellow
  yhi = chart.yAxis[0].toPixels(12);
  if ( yhi > ymax_px ) {
    ylo = Math.max(chart.yAxis[0].toPixels(35.5), ymax_px);
    height = Math.abs(yhi - ylo);
    chart.renderer.rect(xlo, ylo, width, height, 1).attr({fill: 'rgb(255,255,0)', stroke: 'transparent'}).add();
  }
  
  // Orange
  yhi = chart.yAxis[0].toPixels(35.5);
  if ( yhi > ymax_px ) {
    ylo = Math.max(chart.yAxis[0].toPixels(55.5), ymax_px);
    height = Math.abs(yhi - ylo);
    chart.renderer.rect(xlo, ylo, width, height, 1).attr({fill: 'rgb(255,126,0)', stroke: 'transparent'}).add();
  }
  
  // Red
  yhi = chart.yAxis[0].toPixels(55.5);
  if ( yhi > ymax_px ) {
    ylo = Math.max(chart.yAxis[0].toPixels(105.5), ymax_px);
    height = Math.abs(yhi - ylo);
    chart.renderer.rect(xlo, ylo, width, height, 1).attr({fill: 'rgb(255,0,0)', stroke: 'transparent'}).add();
  }
  
  // Purple
  yhi = chart.yAxis[0].toPixels(105.5);
  if ( yhi > ymax_px ) {
    ylo = Math.max(chart.yAxis[0].toPixels(250), ymax_px);
    height = Math.abs(yhi - ylo);
    chart.renderer.rect(xlo, ylo, width, height, 1).attr({fill: 'rgb(143,63,151)', stroke: 'transparent'}).add(); 
  }
  
  // Maroon
  yhi = chart.yAxis[0].toPixels(250);
  if ( yhi > ymax_px ) {
    ylo = Math.max(chart.yAxis[0].toPixels(5000), ymax_px);
    height = Math.abs(yhi - ylo);
    chart.renderer.rect(xlo, ylo, width, height, 1).attr({fill: 'rgb(126,0,35)', stroke: 'transparent'}).add(); 
  }
  
}

/**
 * Return the AQI color associated with a PM2.5 level.
 * @param {Number} pm25 PM2.5 value in ug/m3.
 */
function pm25ToColor(pm25) {

  let color = 
    pm25 <= 12 ? 'rgb(0,255,0)' : 
    pm25 <= 35.5 ? 'rgb(255,255,0)' : 
    pm25 <= 55.5 ? 'rgb(255,126,0)' : 
    pm25 <= 105.5 ? 'rgb(255,0,0)' : 
    pm25 <= 250 ? 'rgb(143,63,151)' : 'rgb(126,0,35)';

  return(color);

}

let AQI_colors = ['rgb(0,255,0)', 'rgb(255,255,0)', 'rgb(255,126,0)', 'rgb(255,0,0)', 'rgb(143,63,151)', 'rgb(126,0,35)'];

