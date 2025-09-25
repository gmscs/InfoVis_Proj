const margin = { top: 30, right: 30, left: 200, bottom: 30 };

const width = 800 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const svg = d3.select("#clev_dot")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

var dataCSV = d3.csv("../dataset/crocodile_dataset_processed.csv");

let selectedVariable = "commonname" //default

dataCSV.then(function (data) {

    function get_counts(varName) {
        return d3.rollup(
            data,
            v => v.length,
            d => d[selectedVariable]
        );
    }
    let counts = get_counts(selectedVariable)

    var tooltip = d3.select("#clev_dot")
        .append("div")
        .style("opacity", 0)
        .attr("class", "tooltip")
        .style("border", "solid")
        .style("border-width", "1px")
        .style("border-radius", "5px")
        .style("padding", "10px")
        .style("width", "200px")

    var mouseover = function (d) {
        tooltip.style("opacity", 1);
    }

    var mouseleave = function (d) {
        tooltip.transition().duration(200).style("opacity", 0);
    }

    var mousemove = (event, d) => {
        tooltip.html(d[selectedVariable] + ", " + counts.get(d[selectedVariable]));
    }

    function updateVis() {
        const x = d3.scaleLinear()
            .domain([0, 100])
            .range([0, width]);
        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x))

        const y = d3.scaleBand()
            .range([0, height])
            .domain(data.map(function (d) { return d[selectedVariable]; })).padding(1);
        svg.append("g")
            .call(d3.axisLeft(y))

        svg.selectAll("lines")
            .data(data)
            .enter()
            .append("line")
            .attr("x1", 0)
            .attr("x2", function (d) { return x(counts.get(d[selectedVariable])); })
            .attr("y1", function (d) { return y(d[selectedVariable]); })
            .attr("y2", function (d) { return y(d[selectedVariable]); })
            .attr("stroke", "grey")
            .attr("stroke-width", "1px")

        svg.selectAll("circles")
            .data(data)
            .enter()
            .append("circle")
            .attr("cx", function (d) { return x(counts.get(d[selectedVariable])); })
            .attr("cy", function (d) { return y(d[selectedVariable]); })
            .attr("r", "6")
            .style("fill", "#d13100ff")
            .on("mouseover", mouseover)
            .on("mousemove", mousemove)
            .on("mouseleave", mouseleave)
    }

    d3.select("#col_select").on("change", function () {
        selectedVariable = this.value;
        counts = get_counts(selectedVariable);
        updateVis();
    });
    updateVis();
});