// Plotting functions for air-monitor data.

// https://github.com/pnwairfire/airfire-smoke-maps/blob/master/src/scripts/graphs.js

function monitor_timeseriesPlot(figureID, monitor, id) {

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
        animation: false
      },
      plotOptions: {
        series: {
          animation: false
        },
        scatter: {
          animation: false,
          marker: { radius: 2.5, symbol: 'circle', fillColor: '#bbbbbb'}
        }
      },
      title: {
        text: title
      },
      xAxis: {
        type: 'datetime'
      },
      yAxis: {
        title: {
          text: 'PM2.5 ug/m3'
        }
      },
      legend: {
        enabled: false
      },
      series: [{
          name: 'PM2.5',
          type: 'scatter',
          pointInterval: 3600 * 1000,
          pointStart: startTime.valueOf(),
          data: data
      }]
  });

};

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
