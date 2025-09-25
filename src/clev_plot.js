const margin = {top: 30, right: 30, left:200, bottom: 30};

const width = 800 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const svg = d3.select("#clev_dot")
    .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
    .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

var dataCSV = d3.csv("../dataset/crocodile_dataset_processed.csv");
dataCSV.then(function(data) {
    const x = d3.scaleLinear()
        .domain([0,100])
        .range([0, width]);
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x))

    const y = d3.scaleBand()
        .range([0, height])
        .domain(data.map(function(d) { return d.commonname; })).padding(1);
    svg.append("g")
        .call(d3.axisLeft(y))

    const counts = d3.rollup(
        data,
        v => v.length,
        d => d.commonname
    );

    svg.selectAll("lines")
        .data(data)
        .enter()
        .append("line")
            .attr("x1", function(d) { return 0; })
            .attr("x2", function(d) { return x(counts.get(d.commonname)); })
            .attr("y1", function(d) { return y(d.commonname); })
            .attr("y2", function(d) { return y(d.commonname); })
            .attr("stroke", "grey")
            .attr("stroke-width", "1px")

    svg.selectAll("circles")
        .data(data)
        .enter()
        .append("circle")
            .attr("cx", function(d) { return x(counts.get(d.commonname)); })
            .attr("cy", function(d) { return y(d.commonname); })
            .attr("r", "6")
            .style("fill", "#d13100ff")
});