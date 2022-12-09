// Highcharts lotting functions for air quality data.

// Requires:
//  * https://www.highcharts.com
//  * https://uwdata.github.io/arquero/
//  * https://momentjs.com
//  * https://momentjs.com/timezone/

// See also: https://github.com/pnwairfire/airfire-smoke-maps/blob/master/src/scripts/graphs.js


class AirQualityPlot {

  figureID = null;

  constructor(
    figureID = null
  ) {
    this.figureID = figureID;
  }

  // ----- Timeseries Plot -------------------------------------------------------

  /**
   * Creates a "USFS AirFire standard" time series plot of hourly PM2.5 and Nowcast data.
   * 
   * @param {String} figureID CSS identifier for the DOM element where the chart will appear.
   * @param {Array} datetime UTC time values.
   * @param {Array} pm25 Hourly PM2.5 values.
   * @param {Array} nowcast Hourly Nowcast values.
   * @param {String} locationName Human readable location name.
   * @param {String} timezone Olsen timezone.
   * @param {String} title Optional chart title. 
   * @returns 
   */
  pm25_timeseriesPlot(
    figureID,
    datetime,
    pm25,
    nowcast,
    locationName,
    timezone,
    title = ''
  ) {
  
    let startTime = datetime[0];
    let xAxis_title = "Time (" + timezone + ")";

    // Default to well defined y-axis limits for visual stability
    let ymin = 0;
    let ymax = this.pm25ToYMax(Math.max(...pm25));

    const chart = Highcharts.chart(figureID, {
      accessibility: { enabled: false },
      chart: {
        animation: false,
        plotBorderColor: '#ddd',
        plotBorderWidth: 1      
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
          color: '#000',
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
        // title: {margin: 20, style: { "color": "#333", "fontSize": "16px" }, text: xAxis_title},
        gridLineColor: '#ddd',
        gridLineDashStyle: 'Dash',
        gridLineWidth: 1,
        minorTicks: true,
        minorTickInterval: 3 * 3600 * 1000, // every 3 hrs
        minorGridLineColor: '#eee',
        minorGridLineDashStyle: 'Dot',
        minorGridLineWidth: 1
      },
      yAxis: {
        min: ymin,
        max: ymax,
        gridLineColor: '#ddd',
        gridLineDashStyle: 'Dash',
        gridLineWidth: 1,
        title: {
          text: 'PM2.5 (\u00b5g/m\u00b3)',
        },
        plotLines: this.AQI_pm25_lines // horizontal colored lines
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

  };

  // ----- Daily Barplot ---------------------------------------------------------

  /**
   * Creates a "USFS AirFire standard" daily barplot of PM2.5 data.
   * 
   * @param {String} figureID CSS identifier for the DOM element where the chart will appear.
   * @param {Array} daily_datetime UTC time values.
   * @param {Array} daily_avg_pm25 Daily average PM2.5 values.
   * @param {String} locationName Human readable location name.
   * @param {String} timezone Olsen timezone.
   * @param {String} title Optional chart title.
   * @returns 
   */
  pm25_dailyBarplot(
    figureID,
    daily_datetime,
    daily_avg_pm25,
    locationName,
    timezone,
    title = ''
  ) {

    // let title = "Daily Average PM2.5<br/>Site: " + locationName;

    // Default to well defined y-axis limits for visual stability
    let ymin = 0;
    let ymax = this.pm25ToYMax(Math.max(...daily_avg_pm25));

    // Crreate colored series data
    // See:  https://stackoverflow.com/questions/35854947/how-do-i-change-a-specific-bar-color-in-highcharts-bar-chart
    let seriesData = [];
    for ( let i = 0; i < daily_avg_pm25.length; i++ ) {
      seriesData[i] = {y: daily_avg_pm25[i], color: this.pm25ToColor(daily_avg_pm25[i])};
    } 

    let days = daily_datetime.map(x => moment.tz(x, timezone).format("MMM DD"));

    const chart = Highcharts.chart(figureID, {
      accessibility: { enabled: false },
      chart: {
        plotBorderColor: '#ddd',
        plotBorderWidth: 1      
      },
      plotOptions: {
        column: {
          animation: false,
          allowPointSelect: true,
          borderColor: '#666'
        }
      },
      title: {
        text: title
      },
      xAxis: {
        categories: days,
      },
      yAxis: {
        min: ymin,
        max: ymax,
        gridLineColor: '#ddd',
        gridLineDashStyle: 'Dash',
        gridLineWidth: 1,
        title: {
          text: 'PM2.5 (\u00b5g/m\u00b3)',
        },
        plotLines: this.AQI_pm25_lines // horizontal colored lines
      },
      legend: {
        enabled: true,
        verticalAlign: 'top'
      },
      // legend: {
      //   enabled: false
      // },
      series: [{
        name: 'Daily Avg PM2.5',
        type: 'column',
        data: seriesData
      }]  

    });

    return(chart);

  };

  // ----- Diurnal Plot --------------------------------------------------------

  /**
   * Creates a "USFS AirFire standard" diurnal plot of PM2.5 data.
   * 
   * @param {String} figureID CSS identifier for the DOM element where the chart will appear.
   * @param {Array} hour Hours (0-23).
   * @param {Array} hour_mean Average pm25 at for a specific hour.
   * @param {Array} yesterday Yesterday pm25 values.
   * @param {Array} hour_mean Today pm25 values.
   * @param {String} locationName Human readable location name.
   * @param {String} timezone Olsen timezone.
   * @param {Number} sunrise Decimal hour of local time sunrise.
   * @param {Number} sunset Decimal hour of local time sunset.
   * @param {String} title Optional chart title. 
   * @returns 
   */
   pm25_diurnalPlot(
    figureID,
    hour,
    hour_mean,
    yesterday,
    today,
    locationName,
    timezone, 
    sunrise, 
    sunset,
    title = ''
  ) {

    // let title = "Nowcast by Time of Day<br/>Site: " + locationName;

    // Default to well defined y-axis limits for visual stability
    let ymin = 0;
    let ymax = this.pm25ToYMax(Math.max(...yesterday, ...today));

    // Crreate colored series data
    // See:  https://stackoverflow.com/questions/35854947/how-do-i-change-a-specific-bar-color-in-highcharts-bar-chart
    let yesterdayData = [];
    for ( let i = 0; i < yesterday.length; i++ ) {
      yesterdayData[i] = {y: yesterday[i], color: this.pm25ToColor(yesterday[i])};
    } 
    let todayData = [];
    for ( let i = 0; i < today.length; i++ ) {
      todayData[i] = {y: today[i], color: this.pm25ToColor(today[i])};
    } 

    const chart = Highcharts.chart(figureID, {
      accessibility: { enabled: false },
      chart: {
        plotBorderColor: '#ddd',
        plotBorderWidth: 1      
      },
      plotOptions: {
        line: {
          animation: false
        }
      },
      title: {
        text: title
      },
      xAxis: {
        tickInterval: 3,
        labels: {
          formatter: function () {
              var label = this.axis.defaultLabelFormatter.call(this);
              label = 
                label == '0' ? 'Midnight' :
                label == '3' ? '3am' :
                label == '6' ? '6am' :
                label == '9' ? '9am' :
                label == '12' ? 'Noon' :
                label == '15' ? '3pm' :
                label == '18' ? '5pm' :
                label == '21' ? '9pm' : label;
              return label;
          }
        },   
        plotBands: [
          { color: 'rgb(0,0,0,0.1)', from: 0, to: sunrise },
          { color: 'rgb(0,0,0,0.1)', from: sunset, to: 24 },
        ]
      },
      yAxis: {
        min: ymin,
        max: ymax,
        gridLineColor: '#ddd',
        gridLineDashStyle: 'Dash',
        gridLineWidth: 1,
        title: {
          text: 'PM2.5 (\u00b5g/m\u00b3)',
        },
        plotLines: this.AQI_pm25_lines // horizontal colored lines
      },
      legend: {
        enabled: true,
        verticalAlign: 'top'
      },
      series: [
        {
          name: '7 Day Mean',
          type: 'line',
          data: hour_mean,
          color: '#aaa',
          lineWidth: 10,
          marker: { radius: 1, symbol: 'square', fillColor: 'transparent'}
        },
        {
          name: 'Yesterday',
          type: 'line',
          data: yesterdayData,
          color: '#888',
          lineWidth: 1,
          marker: { radius: 4, symbol: 'circle', lineColor: '#888', lineWidth: 1 }
        },
        {
          name: 'Today',
          type: 'line',
          data: todayData,
          color: '#333',
          lineWidth: 2,
          marker: { radius: 8, symbol: 'circle', lineColor: '#333', lineWidth: 1 }
        }        
      ]  

    });

    return(chart);

  };

  // ----- Utility functions -----------------------------------------------------

  /**
   * Draws a stacked bar indicating AQI levels on one side of a plot.
   * @param {Highchart} chart 
   */
   addAQIStackedBar(chart) {

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
   * Returns the AQI color associated with a PM2.5 level.
   * @param {Number} pm25 PM2.5 value in ug/m3.
   */
   pm25ToColor(pm25) {

    let color = 
      pm25 <= 12 ? 'rgb(0,255,0)' : 
      pm25 <= 35.5 ? 'rgb(255,255,0)' : 
      pm25 <= 55.5 ? 'rgb(255,126,0)' : 
      pm25 <= 105.5 ? 'rgb(255,0,0)' : 
      pm25 <= 250 ? 'rgb(143,63,151)' : 'rgb(126,0,35)';

    return(color);

  };

  /**
   * Returns the ymax value appropriate for a maximum PM2.5 level.
   * Having a finite set of ymax values prevents the yscale from jumping around too much.
   * @param {Number} pm25 Maximum PM2.5 value in ug/m3.
   */
   pm25ToYMax(pm25) {

    // See:  https://github.com/MazamaScience/AirMonitorPlots/blob/5482843e8e0ccfe1e30ccf21509d0df01fe45bca/R/custom_pm25TimeseriesScales.R#L103
    let ymax = 
      pm25 <= 50 ? 50 :
      pm25 <= 100 ? 100 :
      pm25 <= 200 ? 200 :
      pm25 <= 400 ? 500 :
      pm25 <= 600 ? 600 :
      pm25 <= 1000 ? 1000 :
      pm25 <= 1500 ? 1500 : 1.05 * pm25;

    return(ymax);

  };

  // ----- Constants -----------------------------------------------------------

  //let AQI_colors = ['rgb(0,255,0)', 'rgb(255,255,0)', 'rgb(255,126,0)', 'rgb(255,0,0)', 'rgb(143,63,151)', 'rgb(126,0,35)'];

  AQI_pm25_lines = [
    {color: 'rgb(255,255,0)', width: 2, value: 12},
    {color: 'rgb(255,126,0)', width: 2, value: 35.5},
    {color: 'rgb(255,0,0)', width: 2, value: 55.5},
    {color: 'rgb(143,63,151)', width: 2, value: 150.5},
    {color: 'rgb(126,0,35)', width: 2, value: 250.5},
  ];

}