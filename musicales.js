// Se definen los parámetros de dimensiones
const WIDTH = document.getElementById('vertical-flex-container').clientWidth,
HEIGHT = 700;
const margin = { top: 50, bottom: 50, left: 50, right: 50 };
const width = WIDTH - margin.left - margin.right,
height = HEIGHT - margin.top - margin.bottom;

// Lista de años y de shows
const domainYears = []
for (let y = 0; y < 31; y++) {
  domainYears.push(Number(1990+y).toString());
}

// Se definen los SVG
var svgYearAvgBarPlot = d3.select("#yearly-avg-barplot-container")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)

const svgBubbleChart = d3.select('svg#bubble-chart')
                .attr('width', WIDTH)
                .attr('height', HEIGHT);


// Se cargan los archivos CSV
async function initialLoad() {
  const musicals = await d3.csv("https://raw.githubusercontent.com/tacookson/data/master/broadway-grosses/grosses.csv");
  const wages = await d3.csv("/data/US_Wages.csv");
  const plot = await d3.csv("/data/synopses.csv");
  return {musicals, wages, plot};
}

// [MAIN]  Se utilizan los archivos cargados
initialLoad().then(({musicals, wages, plot}) => {
  dat = musicals.filter(d => d.show == "Cats")
  // Se procesa data para que Musicales estén organizados por año
  var dataByYear = []
  for (let x = 0; x < 31; x++) {
    dataByYear.push(musicals.filter(d => d.week_ending.slice(0,4) == (1990+x).toString()));
  }
  var setShows = new Set();
  musicals.forEach(d => {
    setShows.add( d.show );
  })
  var dataByShow = []  // hay 1122 shows posibles
  setShows.forEach( s => {
    dataByShow.push(musicals.filter(d => d.show === s))
  })
  // dataByShow es un Array de Arrays
  

  // Se sacan promedios de TicketPrice y Wages
  const yearlyAvgList = SumarTicketsAño(dataByYear);
  const yearlyWagesList = SumarWagesAño(wages);
  const jointListTicketsWages = MergeTicketsWages(yearlyAvgList, yearlyWagesList);

  // Sacar Overall Gross del Show y ordenar por mejores 25
  const overallGrossShow = SumarGrossShow(dataByShow);
  const topShows = ShowsMasGross(overallGrossShow);

  // Colores
  const color = d3.scaleOrdinal(["#FCF5C7", "#ADF7B6"]);

  // EscalaX y EscalaY
  var x0  = d3.scaleBand()
    .domain(domainYears)
    .range([margin.left, width-margin.right])
    .padding(0.2);
  var x1  = d3.scaleBand();
  var y   = d3
    .scaleLinear()
    .domain([0, d3.max(jointListTicketsWages, function(year) { return d3.max(year.values, function(d) { return d})})])
    .range([height, 0]);

  // Ejes
  var xAxis = d3.axisBottom()
    .scale(x0)
    // .tickSize(0)
    .tickValues(jointListTicketsWages.map(d=>d.year));
    
  var yAxis = d3.axisLeft()
    .scale(y);

  var ticks = [0,10,20,30,40,50,60,70,80,90,100,110,120];
  var tickLabels = ['0k','10k','20k','30k','40k','50k','60k','70k','80k','90k','100k','110k','120k'];
  
  var yAxis2 = d3.axisRight()
    .scale(y)
    .tickValues(ticks)
    .tickFormat(function(d,i){ return tickLabels[i] });

  // Mapping of domain
  var categoriesNames = jointListTicketsWages.map(function(d) { return d.year; });
  var rateNames       = jointListTicketsWages[0].values.map(function(d) { return d.grpName; });

  x0.domain(categoriesNames);
  x1.domain(rateNames).rangeRound([0, x0.bandwidth()]);
  y.domain([0, d3.max(jointListTicketsWages, function(year) { return d3.max(year.values, function(d) { return d.grpValue; }); })]);


  var slice = svgYearAvgBarPlot.selectAll(".slice")
    .data(jointListTicketsWages)
    .enter().append("g")
    .attr("class", "g")
    .attr("transform",function(d) { return "translate(" + (x0(d.year) + margin.left)+ ","+ (25)+")"; });

  slice.selectAll("rect")
    .data(function(d) { return d.values; })
      .enter().append("rect")
          .attr("width", x1.bandwidth())
          .attr("x", function(d) { return x1(d.grpName); })
            .style("fill", function(d) { return color(d.grpName) })
            .attr("y", function(d) { return y(0); })
            .attr("height", function(d) { return height - y(0); })
            .attr("stroke", "black")
            .attr('stroke-width', '1')
            .on("mouseover", (d, i) => {mouseover(d, i, jointListTicketsWages)})
            .on("mouseleave", (d, i) => {mouseleave(d, i)});

  slice.selectAll("rect")
    .transition()
    .delay(function (d) {return Math.random()*1000;})
    .duration(1000)
    .attr("y", function(d) { return y(d.grpValue); })
    .attr("height", function(d) { return height - y(d.grpValue); });

  svgYearAvgBarPlot
    .append("g")
    .attr("class", "x axis")
    .attr("id", "eje")
    .attr("transform", `translate(${margin.left}, ${height+25})`)
    .call(xAxis)
    .selectAll("text")
    .attr("transform", "translate(-5,0)rotate(-45)")
    .style("text-anchor", "end");

  svgYearAvgBarPlot.append("g")
    .attr("class", "y axis")
    .attr("id", "eje-y")
    .attr("transform", `translate(${margin.left+margin.right}, ${25})`)
    .call(yAxis)
      .append("text")
          .attr("transform", "rotate(-90)")
          .attr("y", 6)
          .style("text-anchor", "end")
          .style('font-weight','bold')
          .text("Value");

  svgYearAvgBarPlot.append("g")
  .attr("class", "y axis")
  .attr("id", "eje-y-2")
  .attr("transform", `translate(${width }, ${25})`)
  .call(yAxis2)
    .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .style("text-anchor", "end")
        .style('font-weight','bold')
        .text("Value" + "hi");

  // Se generan los labels de los ejes
  svgYearAvgBarPlot
    .append("g")
    .append("text")
    .attr("class", "x label")
    .attr("id", "eje-y-label")
    .attr("transform", `translate(${margin.left+margin.right}, ${0})`)
    .attr("y", 6)
    .attr("dy", ".75em")
    .text("Precio en Dólares $");
  svgYearAvgBarPlot
    .append("g")
    .append("text")
    .attr("class", "x label")
    .attr("id", "eje-y-label-2")
    .attr("transform", `translate(${width}, ${0})`)
    .attr("y", 6)
    .attr("dy", ".75em")
    .text("Salario en Dólares $");

  d3.select("#yearly-avg-barplot-container")
    .append("div")
    .style("opacity", 0)
    .attr("class", "tooltip")

  // Now I will create a BubbleChart where the more it grossed over the years, the bigger it is
  bubbleChart = BubbleChart(topShows, dataByShow, yearlyWagesList, plot, {
    label: d => d.show,
    value: d => d.grossTotal,
    group: d => d.show,
    width: width + margin.left + margin.right,
    height: height + margin.top + margin.bottom
  })
  document.getElementById("bubble-chart").appendChild(bubbleChart);

}).catch((error) => {
  console.log(error);
});

function mouseover(d, data, jointlist) {
  const ticketlist = jointlist.filter(d => d.values[0] == data);
  const wagelist = jointlist.filter(d => d.values[1] == data);
  // Una de las dos listas anteriores tiene lo que quiero
  let workingObj = []
  if (ticketlist.length === 0) {
    workingObj = wagelist[0]
  }
  else {
    // ticketList has what I want
    workingObj = ticketlist[0]
  }
  const boleto = workingObj.values[0].grpValue.toString()
  const salario = workingObj.values[1].grpValue.toString()
  const diferencia = (workingObj.values[0].grpValue - workingObj.values[1].grpValue) / ((workingObj.values[0].grpValue + workingObj.values[1].grpValue)/2) * 100

  d3.selectAll(".tooltip")
    .style("left", d.pageX + "px")
    .style("top", (d.pageY-margin.top+25)+ "px")
    .style("opacity", 1)
    .append("p")
    .attr("id", "tooltip-p-ano")
    .text(workingObj.year)
    
  d3.selectAll(".tooltip")
    .append("p")
    .attr("id", "tooltip-p")
    .text("Precio de Boleto: $" + boleto.slice(0,5))
  d3.selectAll(".tooltip")
    .append("p")
    .attr("id", "tooltip-p")
    .text("Salario Anual: $" + salario.slice(0,5) + "k");
  d3.selectAll(".tooltip")
    .append("p")
    .attr("id", "tooltip-p")
    .text("Diferencia: " + diferencia.toString().slice(0,5) + "%");

}

function mouseleave() {
  d3.selectAll("#tooltip-p").remove()
  d3.selectAll("#tooltip-p-ano").remove()
  d3.selectAll(".tooltip")
    .style("opacity", 0)
}

function ShowsMasGross(data) {
  var listaReturn = [];
  var listaOriginal = data.slice();
  data.sort((a, b) => a.grossTotal - b.grossTotal);
  // Entonces, data está sorted
  const listaChicaSorted = data.slice(-25);
  listaOriginal.forEach( s => {
    if (listaChicaSorted.includes(s)) {
      listaReturn.push(s)
    }
  })
  return listaReturn;
}

function SumarGrossShow(data) {
  let showGrossList = [];
  data.forEach( showArray => {
    var sumTotal = 0;
    showArray.forEach( s => {
      sumTotal += Number(s.weekly_gross)
    })
    let transObj = {show: showArray[0].show, grossTotal: sumTotal};
    showGrossList.push(transObj);
  })
  return showGrossList;
}

function MergeTicketsWages(data1, data2) {
  // Receives two Arrays
  // Processes them to find the porcentage increase
  // Returns array of objects with ticket and cpi
  returnList = [];
  for (let iter = 0; iter < 31; iter++) {
    let transObj = {year: data1[iter].year, values: [{grpName: 'Ticket Price', grpValue: data1[iter].value}, {grpName: 'Average Wage', grpValue: data2[iter].value}]}
    returnList.push(transObj);
  }
  return returnList;
}

function SumarWagesAño(data) {
  let yearlyWageList = [];
  data.forEach(year => {
    let transObj = {year: year.Time, value: Number(year.Value)/1000}
    yearlyWageList.push(transObj);
  })
  return yearlyWageList;
}

function SumarCPIAño(data) {
  // Receives Array of Objects
  // Sums all of the CPI and then divides by number
  let yearlyCPIList = [];
  let yearlySum = 0;
  let iter = 0;
  const anoBase = 924;
  let anoActual = 0;
  data.forEach(month => {
    if (anoActual >= anoBase) {
      yearlySum += Number(month.CPI);
      iter += 1;
      if (iter == 12) {
        let yearlyAvg = yearlySum / 12;
        let transitionObj = {year: month.Yearmon.slice(6,10), value: yearlyAvg};
        yearlyCPIList.push(transitionObj);
        yearlySum = 0;
        iter = 0;
      }
    }
    anoActual += 1;
  })
  return yearlyCPIList;
}

function SumarTicketsAño(data) {
  // Receives Array of Arrays
  // Sums all of the avg_ticket_price and then divides by number
  // Returns a List with [{year: 1990, value: yearlyAvg}, {year:..., value:...}]
  let yearlyAvgList = [];
  data.forEach(year => {
    let yearlySum = 0;
    year.forEach(show => {
      yearlySum += Number(show.avg_ticket_price);
    })
    let yearlyAvg = yearlySum / year.length
    let transitionObj = {year: year[0].week_ending.slice(0,4), value: yearlyAvg};
    yearlyAvgList.push(transitionObj);
  })
  return yearlyAvgList;
}


// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/bubble-chart
function BubbleChart(data, dByShow, wagesData, plot, {
  name = ([x]) => x, // alias for label
  label = name, // given d in data, returns text to display on the bubble
  value = ([, y]) => y, // given d in data, returns a quantitative size
  group, // given d in data, returns a categorical value for color
  title, // given d in data, returns text to show on hover
  link, // given a node d, its link (if any)
  linkTarget = "_blank", // the target attribute for links, if any
  width = 640, // outer width, in pixels
  height = width, // outer height, in pixels
  padding = 3, // padding between circles
  margin = 1, // default margins
  marginTop = margin, // top margin, in pixels
  marginRight = margin, // right margin, in pixels
  marginBottom = margin, // bottom margin, in pixels
  marginLeft = margin, // left margin, in pixels
  groups, // array of group names (the domain of the color scale)
  colors = ['red', 'lightred', 'blue', 'lightblue', 'green'], // an array of colors (for groups)
  // ['#D11821', '#FFF3C8', '#9BAD63', '#543D26']
  fill = "#ccc", // a static fill color, if no group channel is specified
  fillOpacity = 1, // the fill opacity of the bubbles
  stroke, // a static stroke around the bubbles
  strokeWidth, // the stroke width around the bubbles, if any
  strokeOpacity, // the stroke opacity around the bubbles, if any
} = {}) {
  // Compute the values.
  const D = d3.map(data, d => d);
  const V = d3.map(data, value);
  const G = group == null ? null : d3.map(data, group);
  const I = d3.range(V.length).filter(i => V[i] > 0);

  // Unique the groups.
  if (G && groups === undefined) groups = I.map(i => G[i]);
  groups = G && new d3.InternSet(groups);

  // Construct scales.
  const color = G && d3.scaleOrdinal(groups, colors);

  // Compute labels and titles.
  const L = label == null ? null : d3.map(data, label);
  const T = title === undefined ? L : title == null ? null : d3.map(data, title);

  // Compute layout: create a 1-deep hierarchy, and pack it.
  const root = d3.pack()
      .size([width - marginLeft - marginRight, height - marginTop - marginBottom])
      .padding(padding)
    (d3.hierarchy({children: I})
      .sum(i => V[i]));

  const svg = d3.create("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [-marginLeft, -marginTop, width, height])
      .attr("style", "max-width: 100%; height: auto; height: intrinsic;")
      .attr("fill", "currentColor")
      .attr("font-size", 10)
      .attr("font-family", "sans-serif")
      .attr("text-anchor", "middle");

  const leaf = svg.selectAll("a")
    .data(root.leaves())
    .join("a")
      .attr("xlink:href", link == null ? null : (d, i) => link(D[d.data], i, data))
      .attr("target", link == null ? null : linkTarget)
      .attr("transform", d => `translate(${d.x},${d.y})`);

  var tooltipBubbles = d3.select("#bubble-chart")
      .append("div")
      .style("opacity", 0)
      .attr("class", "tooltip")

  leaf.append("circle")
      .attr("id", "bubble-circle")
      .attr("stroke", "#FFF3C8")
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 1)
      .attr("fill", 'transparent')
      .attr("fill-opacity", fillOpacity)
      .attr("value", d => d) 
      .attr("r", d => d.r)
      .on("mouseover", (d, i) => {mouseOverBubbles(d, i, data)})
      .on("mouseleave", mouseleaveBubbles)
      .on("click", (d, i) => {clickBubble(d,i, data, dByShow, wagesData, plot)});

  // Add images to bubbles
  data.forEach( (showbubble, i) => {
    
    const bubbleNoImage = svg.selectAll("#bubble-circle")
        .filter(d => (d.value == showbubble.grossTotal));

    if (showbubble === data[i]) {
      svgBubbleChart.append('clipPath')
        .attr('id','clipObj'+i)
        .append('circle')
        .attr('cx', (bubbleNoImage._groups[0][0].__data__.x))
        .attr('cy', bubbleNoImage._groups[0][0].__data__.y)
        .attr('r', bubbleNoImage._groups[0][0].__data__.r);
      
      svgBubbleChart.append('image')
        .attr('id', 'bubble-image')
        .attr('xlink:href', '/caratulas/' + i + '.jpg')
        .attr('width', bubbleNoImage._groups[0][0].__data__.r*2)
        .attr('x', (bubbleNoImage._groups[0][0].__data__.x - bubbleNoImage._groups[0][0].__data__.r))
        .attr('y', bubbleNoImage._groups[0][0].__data__.y - bubbleNoImage._groups[0][0].__data__.r)
        .attr('clip-path','url(#clipObj' + i + ')');
      
    }
  })

  if (L) {
    // A unique identifier for clip paths (to avoid conflicts).
    const uid = `O-${Math.random().toString(16).slice(2)}`;

    leaf.append("clipPath")
        .attr("id", d => `${uid}-clip-${d.data}`)
        .append("circle")
        .attr("r", d => d.r);
  }

  return Object.assign(svg.node(), {scales: {color}});
}

function mouseOverBubbles(d, i, dataShows) {
  if (d3.selectAll('#selected-bubble')._groups[0].length > 0) {
    // A circle is big
  }
  else {
    dataShows.forEach( s => {
      if (s.grossTotal === i.value) {
        d3.selectAll(".tooltip")
          .style("left", d.pageX + "px")
          .style("top", (d.pageY-margin.top+25)+ "px")
          .style("opacity", 1)
          .append("p")
          .attr("id", "tooltip-bubble")
          .text(s.show);
      }
    })
  }
}

function mouseleaveBubbles() {
  d3.selectAll("#tooltip-bubble").remove()
  d3.selectAll(".tooltip")
    .style("opacity", 0)
}

function clickBubble(d, i, dataShows, dByShow, wagesData, plot) {
  if (d3.selectAll('#selected-bubble')._groups[0].length > 0) {
    return
  }
  dataShows.forEach( s => {
    if (s.grossTotal === i.value) {
      // This means we click the circle and it becomes bigger
      d3.selectAll('#bubble-circle')
        .filter(d => (d.value == i.value))
        .transition().duration(1000)
        .attr('id', 'selected-bubble')
        .attr("transform", `translate(${width - i.x}, ${height - i.y})`)
        .attr("r", '150px');

      d3.selectAll('#bubble-circle')
        .filter(d => (d.value != i.value))
        .transition().duration(1000)
        .attr("opacity", 0)
        .transition().duration(0)
        .attr("transform", `translate(${10000}, ${10000})`)

      d3.selectAll('#bubble-image')
        .transition().duration(1000)
        .attr("opacity", 0)
        .transition().duration(0)

      dByShow.forEach( sData => {
        if (sData[0].show == s.show) {
          var dataByYearShow = [];
          for (let x = 0; x < 31; x++) {
            dataByYearShow.push(sData.filter(d => d.week_ending.slice(0,4) == (1990+x).toString()));
          }

          tickets = TicketsAñoShow(dataByYearShow);
          const jointListTicketsWages = MergeTicketsWagesShow(tickets, wagesData.slice(0,31));
          const domainBubble = FindDomain(jointListTicketsWages);

          // Ahora, se genera el gráfico
          // Create diagram for this guy
          // Select SVG bubble-chart

          // const widthBubbleGraph = document.getElementById('bubble-chart').clientWidth*0.5 - 20,
          // heightBubbleGraph = document.getElementById('bubble-chart').clientWidth*0.5 - margin.top - margin.bottom;
          const color = d3.scaleOrdinal(["#FCF5C7", "#ADF7B6"]);

          // EscalaX y EscalaY
          var x0  = d3.scaleBand()
            .domain(domainBubble)
            .range([(width + margin.left + margin.right)/4 + margin.left, width-margin.right])
            .padding(0.2);
          var x1  = d3.scaleBand();
          var y   = d3
            .scaleLinear()
            .domain([0, d3.max(jointListTicketsWages, function(year) { return d3.max(year.values, function(d) { return d})})])
            .range([height, margin.top*2]);

          // Ejes
          var xAxis = d3.axisBottom()
            .scale(x0)
            // .tickSize(0)
            .tickValues(jointListTicketsWages.map(d=>d.year));
          var yAxis = d3.axisLeft()
            .scale(y);
          
          var yAxis2 = d3.axisRight()
            .scale(y)
            // .tickValues(ticks)
            .tickFormat(function(d,i){ return d + "k" });

          // Mapping of domain
          var categoriesNames = jointListTicketsWages.map(function(d) { return d.year; });
          var rateNames       = jointListTicketsWages[0].values.map(function(d) { return d.grpName; });

          x0.domain(categoriesNames);
          x1.domain(rateNames).rangeRound([0, x0.bandwidth()]);
          y.domain([0, d3.max(jointListTicketsWages, function(year) { return d3.max(year.values, function(d) { return d.grpValue; }); })]);


          var slice = svgBubbleChart.selectAll(".slice")
            .data(jointListTicketsWages)
            .enter().append("g")
            .attr("class", "g")
            .attr("transform",function(d) { return "translate(" + (x0(d.year)) + ","+ ( margin.top)+")"; });

          slice.selectAll("rect")
            .data(function(d) { return d.values; })
              .enter().append("rect")
                  .attr("width", x1.bandwidth())
                  .attr("x", function(d) { return x1(d.grpName); })
                    .style("fill", function(d) { return color(d.grpName) })
                    .attr("stroke", "black")
                    .attr('stroke-width', '1')
                    .attr("y", function(d) { return y(0); })
                    .attr("height", function(d) { return height - y(0); })
                    .on("mouseover", (d, i) => {mouseover(d, i, jointListTicketsWages)})
                    .on("mouseleave", (d, i) => {mouseleave(d, i)});

          slice.selectAll("rect")
            .transition()
            .delay(function (d) {return Math.random()*1000 + 1000;})
            .duration(1000)
            .attr("y", function(d) { return y(d.grpValue); })
            .attr("height", function(d) { return height - y(d.grpValue); });

          svgBubbleChart
            .append("g")
            .attr("class", "x axis")
            .attr("id", "eje")
            .attr("transform", `translate(${0}, ${height+margin.top})`)
            .call(xAxis)
            .selectAll("text")
            .attr("transform", "translate(-5,0)rotate(-45)")
            .style("text-anchor", "end");

          svgBubbleChart.append("g")
            .attr("class", "y axis")
            .attr("id", "eje-y")
            .attr("transform", `translate(${(width + margin.left + margin.right)/4 + margin.left}, ${margin.top})`)
            .call(yAxis)
              .append("text")
                  .attr("transform", "rotate(-90)")
                  .attr("y", 6)
                  .style("text-anchor", "end")
                  .style('font-weight','bold')
                  .text("Value");


          svgBubbleChart.append("g")
          .attr("class", "y axis")
          .attr("id", "eje-y-2")
          .attr("opacity", 1)
          .attr("transform", `translate(${width-margin.right}, ${margin.top})`)
          .call(yAxis2)
            .append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", 6)
                .style("text-anchor", "end")
                .style('font-weight','bold')
                .text("Value" + "hi");

          // Se generan los labels de los ejes
          svgBubbleChart
            .append("g")
            .append("text")
            .attr("class", "x label")
            .attr("id", "eje-y-label")
            .attr("transform", `translate(${(width + margin.left + margin.right)/4 + margin.left}, ${margin.top*2+15})`)
            .attr("y", 6)
            .attr("dy", ".75em")
            .text("Precio en Dólares $");
          svgBubbleChart
            .append("g")
            .append("text")
            .attr("class", "x label")
            .attr("id", "eje-y-label-2")
            .attr("transform", `translate(${width - margin.right}, ${margin.top*2+15})`)
            .attr("y", 6)
            .attr("dy", ".75em")
            .text("Salario en Dólares $");

          svgBubbleChart
            .append("g")
            .attr("text-anchor", "middle")
            .append("text")
            .attr("id", "bubble-title")
            .attr("transform", `translate(${WIDTH/2}, ${20})`)
            .attr("font-size", 50 + "px")
            .attr("y", 6)
            .attr("dy", ".75em")
            .text(s.show);

          plot.forEach( showPlot => {
            if (showPlot.show == s.show) {
              svgBubbleChart
                .append("g").append("text")
                .attr("id", "bubble-plot")
                .attr("transform", `translate(${margin.left/2}, ${margin.top*2+15})`)
                .attr("y", 6)
                .attr("dy", ".75em")
                .text("Sinopsis");

              svgBubbleChart
                .append("g")
                .append("text")
                .attr("id", "bubble-plot")
                .attr("transform", `translate(${margin.left/2}, ${margin.top*2+45})`)
                .attr("y", 6)
                .attr("dy", ".75em")
                .attr('font-size', function() {if (showPlot.synopsis.length > 500) {return '14px'} else {return '15px'} } )
                .text(showPlot.synopsis)
                .call(wrap, width/5);
            }
          })

          svgBubbleChart
              .append("g")
              .attr("id", "back-button")
              .append("rect")
              .attr("width", "20px")
              .attr("x", (width+margin.left-25)+"px")
              .attr("y", (height+margin.top+23)+ "px")
              .attr("rx", "5px")
              .attr("height", "20px")
              .attr("width", "60px")
              .on("click", function() {clickBack(i);});

          d3.select("#back-button")
            .append("text")
            .attr("id", "text-back-button")
            .attr("transform", `translate(${width+margin.left-15}, ${height+margin.top+margin.bottom-10})`)
            .text("Volver")
            .on("click", function() {clickBack(i);});

          svgBubbleChart.selectAll("g")
            .attr("opacity", 0)
            .transition()
            .duration(1000)
            .attr("opacity", 1);

          d3.select("#bubble-chart-container")
            .append("div")
            .style("opacity", 0)
            .attr("class", "tooltip")
        }
      })
    }
  })
}

function clickBack(i) {
  d3.select('#selected-bubble')
    .transition().duration(1000)
    .attr('id', 'bubble-circle')
    .attr("transform", `translate(${width/2 - i.parent.x + margin.left}, ${height/2 -i.parent.y + margin.bottom})`)
    .attr("r", i.r.toString() + "px");

  d3.selectAll('#bubble-circle')
    .attr("transform", `translate(${0}, ${0})`)
    .transition().duration(1000)
    .attr("opacity", 1)

  d3.selectAll('#bubble-image')
    .transition().duration(1000)
    .attr("opacity", 1)

  // Things to remove
  svgBubbleChart.selectAll("g").remove()
}

function TicketsAñoShow(data) {
  // Receives an array of array of objects that are the same show
  // Sums all of the avg_ticket_price and then divides by number
  // Returns a List with [{year: 1990, value: yearlyAvg}, {year:..., value:...}]
  let yearlyAvgList = [];
  data.forEach(year => {
    if (year.length === 0) {
      return
    }
    let yearlySum = 0;
    year.forEach(show => {
      yearlySum += Number(show.avg_ticket_price);
    })
    let yearlyAvg = yearlySum / year.length
    let transitionObj = {year: year[0].week_ending.slice(0,4), value: yearlyAvg};
    yearlyAvgList.push(transitionObj);
  })
  return yearlyAvgList;
}

function MergeTicketsWagesShow(data1, data2) {
  // Receives two Arrays
  // Processes them to find the porcentage increase
  // Returns array of objects with ticket and cpi
  // data1 and data2 could be different years, so we gotta filter them
  const initialYear = Number(data1[0].year);
  const finalYear = Number(data1[data1.length-1].year);

  returnList = [];
  var iter = 0;

  data2.forEach( wageYear => {
    if ((Number(wageYear.year) >= initialYear) && (Number(wageYear.year) <= finalYear)) {
      // if wageyear.year isn't in data1, then skip this year
      let isYearTrue = 0;
      data1.forEach( possibleYear => {
        if (possibleYear.year === wageYear.year) {
          isYearTrue = 1;
        }
      })
      if (isYearTrue === 1){
        let transObj = {year: wageYear.year, values: [{grpName: 'Ticket Price', grpValue: data1[iter].value}, {grpName: 'Average Wage', grpValue: wageYear.value}]}
        returnList.push(transObj);
        iter++;
      }
    }
  })
  return returnList;
}

function FindDomain(data) {
  var listDomainYears = [];
  data.forEach( y => {
    listDomainYears.push( y.year );
  })
  return listDomainYears;
}

// https://bl.ocks.org/mbostock/7555321
// Esto es para wrapping text y es propiedad de Mike Bostock
function wrap(text, width) {
  text.each(function() {
    var text = d3.select(this),
        words = text.text().split(/\s+/).reverse(),
        word,
        line = [],
        lineNumber = 0,
        lineHeight = 1.1, // ems
        y = text.attr("y"),
        dy = parseFloat(text.attr("dy")),
        tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
      }
    }
  });
}