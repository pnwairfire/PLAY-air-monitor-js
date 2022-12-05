// Plotting functions for air-monitor data.

// TODO:  use stackedColumn to add the AQI stacked colors

// https://github.com/pnwairfire/airfire-smoke-maps/blob/master/src/scripts/graphs.js

function monitor_timeseriesPlot(figureID, monitor, id) {

  let index = null;
  let ids = monitor.getIDs();

  let startTime = monitor.data.array('datetime')[0];
  let data = null;
  let nowcast = null;
  let title = null;

  if ( Number.isInteger(id) ) {
    index = id;
    id = ids[index];
  } else {
    index = ids.indexOf(id);
  }

  title = monitor.meta.array('locationName')[index];

  // Create a new table with NowCast values for this monitor
  let dt = monitor.data
    .select(['datetime', id])
    .rename(aq.names('datetime', 'pm25'))
    .derive({ nowcast: aq.rolling(d => op.average(d.pm25), [-2, 0]) })

  data = dt.array('pm25');
  nowcast = dt.array('nowcast');

  // Default to well defined y-axis limits for visual stability
  // See:  https://github.com/MazamaScience/AirMonitorPlots/blob/5482843e8e0ccfe1e30ccf21509d0df01fe45bca/R/custom_pm25TimeseriesScales.R#L103
  let max_pm25 = dt.rollup({max: d => op.max(d.pm25)}).array('max')[0];
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
          lineWidth: 1
        },
        spline: {
          animation: false,
          color: '#000000',
          lineWidth: 1
        }
      },
      title: {
        text: title
      },
      xAxis: {
        type: 'datetime',
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
        title: {
          text: 'PM2.5 ug/m3',
        },
        plotLines: [
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
      series: [
        {
          name: 'PM2.5',
          type: 'scatter',
          pointInterval: 3600 * 1000,
          pointStart: startTime.valueOf(),
          data: data
        },
        {
          name: 'Nowcast',
          type: 'line',
          pointInterval: 3600 * 1000,
          pointStart: startTime.valueOf(),
          data: nowcast
        }
      ]
  });

  addAQIStackedBar(chart);

};

function addAQIStackedBar(chart) {

 // NOTE:  0, 0 is at the top left of the graphic with y increasing downward

  let xmin = chart.xAxis[0].min;
  let ymin = chart.yAxis[0].min;
  let ymax = chart.yAxis[0].max;
  let ymax_px = chart.yAxis[0].toPixels(ymax);

  let xhi = chart.xAxis[0].toPixels(xmin);
  let xlo = xhi - 8;
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
    chart.renderer.rect(xlo, ylo, width, height, 1).attr({fill: 'rgb(143,63,151)', stroke: 'transparent'}).add();
  }
  
  // Purple
  yhi = chart.yAxis[0].toPixels(105.5);
  if ( yhi > ymax_px ) {
    ylo = Math.max(chart.yAxis[0].toPixels(250), ymax_px);
    height = Math.abs(yhi - ylo);
    chart.renderer.rect(xlo, ylo, width, height, 1).attr({fill: 'rgb(126,0,35)', stroke: 'transparent'}).add(); 
  }
  
}

// -----------------------------------------------------------------------------

// https://github.com/pnwairfire/airfire-smoke-maps/blob/master/src/scripts/graphs.js

// export function pm25PopupGraph(uniqueID, monitor, seriesData) {
//   Highcharts.setOptions({global: { useUTC: false } });
//   $('#pm25GraphContainer' + uniqueID).highcharts({


function monitor_pm25Plot(figureID, monitor, id) {

  id = Math.floor(Math.random() * monitor.meta.numRows());

  let ids = monitor.meta.array('deviceDeploymentID');

  let startTime = monitor.data.array('datetime')[0];
  let data = null;
  let title = null;

  if ( Number.isInteger(id) ) {
    data = monitor.data.array(ids[id]);
    title = monitor.meta.array('locationName')[id];
  } else {
    data = monitor.data.array(id);
    title = 
      monitor.meta
      .params({id: id})
      .filter((d, $) => d.deviceDeploymentID == $.id)
      .array('locationName');
  }

  const chart = Highcharts.chart(figureID, {
    chart: {
      type: 'spline',
      animation: false,
      backgroundColor:'',
      zoomType: 'x',
      resetZoomButton: {
          theme: {
              fill: 'white',
              stroke: 'silver',
              r: 0,
              states: {
                  hover: {
                      fill: '#41739D',
                      style: {
                          color: 'white'
                      }
                  }
              }
          },
          position: {
              align: 'left', // by default
              verticalAlign: 'top', // by default
              x: 0,
              y: -10
          }
      }
    },
    title: {
        text:   null,
        align: 'left',
        style: {
            color: 'rgba(0,0,0,0.6)',
            fontSize: 'small',
            fontWeight: 'bold',
            fontFamily: 'Open Sans, sans-serif'
        }
        //text: null
    },
    credits: {
        enabled: false
    },
    plotOptions: {
        spline: {
            marker: {
                enabled: false
            },
            color: "#525252"
        }
    },
    xAxis: {
        type: 'datetime',
        tickColor: '#4e4e4e',
        lineColor: '#4e4e4e',
        tickAmount: 10,
        tickWidth: 1,
        labels: {
            formatter: function () {
                return Highcharts.dateFormat('%b %d', this.value);
            },
            //rotation: -90,
            align: 'center'
        }
    },
    yAxis: {
        gridLineWidth: 0,
        title: {
            text: i18next.t('charts.hourly-pm'),
            style: {
                color: '#4e4e4e'
            }
        },
        labels: {
            format: '{value}',
            style: {
                color: '#4e4e4e'
            }
        }
    },
    series: [{
        showInLegend: false,
        pointInterval: 3600 * 1000,
        pointStart: startTime.valueOf(),
        // data: seriesData,
        type: "spline",
        dashStyle: 'shortdot',
        tooltip: {
            pointFormat: "PM2.5: {point.y}µg/m3",
            xDateFormat: '%b %d %Y at %l%p'
        }
    }]
  });
};
