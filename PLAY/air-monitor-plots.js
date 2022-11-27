// Plotting functions for air-monitor data.

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
          zoomType: 'x'
      },
      title: {
          text: title
      },
      subtitle: {
          text: document.ontouchstart === undefined ?
              'Click and drag in the plot area to zoom in' : 'Pinch the chart to zoom in'
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
      // plotOptions: {
      //     area: {
      //         fillColor: {
      //             linearGradient: {
      //                 x1: 0,
      //                 y1: 0,
      //                 x2: 0,
      //                 y2: 1
      //             },
      //             stops: [
      //                 [0, Highcharts.getOptions().colors[0]],
      //                 [1, Highcharts.color(Highcharts.getOptions().colors[0]).setOpacity(0).get('rgba')]
      //             ]
      //         },
      //         marker: {
      //             radius: 2
      //         },
      //         lineWidth: 1,
      //         states: {
      //             hover: {
      //                 lineWidth: 1
      //             }
      //         },
      //         threshold: null
      //     }
      // },

      series: [{
          type: 'area',
          name: 'PM2.5',
          pointInterval: 3600 * 1000,
          pointStart: startTime.valueOf(),
          data: data
      }]
  });

};
