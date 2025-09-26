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

//defaults
let selectedVariable = "commonname"
let selectedCountry = "global"

dataCSV.then(function (data) {

    function get_counts(varName, filter) {
        const filteredData = filter ? data.filter(filter) : data;
        return d3.rollup(filteredData, v => v.length, d => d[selectedVariable]);
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
        .style("width", "15px")
        .style("position", "absolute")
        .style("pointer-events", "none")
        .style("background-color", "rgba(255, 255, 255, 0.5)")

    var mouseover = function (d) {
        tooltip.style("opacity", 2).style("s");
    }

    var mouseleave = function (d) {
        tooltip.transition().duration(200).style("opacity", 0);
    }

    var mousemove = (event, d) => {
        tooltip.html(counts.get(d[selectedVariable]))
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY) + "px");
    }

    svg.append("g")
        .attr("class","x axis")
        .attr("transform", `translate(0,${height})`);

    svg.append("g")
        .attr("class","y axis");

    function updateVis() {
        const countryFilter = selectedCountry === "global" ? null : d => d.country === selectedCountry;
        counts = get_counts(selectedVariable, countryFilter);
        const maxCount = d3.max(Array.from(counts.values()));
        
        const x = d3.scaleLinear()
            .domain([0, maxCount])
            .range([0, width]);
        svg.select(".x.axis")
            .transition()
            .duration(2000)
            .call(d3.axisBottom(x));

        const y = d3.scaleBand()
            .range([0, height])
            .domain(data.map(function (d) { return d[selectedVariable]; })).padding(1);
        svg.select(".y.axis")
            .transition()
            .duration(1000)
            .call(d3.axisLeft(y));

        svg.selectAll("line")
            .data(data, d => `${d[selectedVariable]}`)
            .join(
                enter => enter
                    .append("line")
                    .attr("stroke", "grey")
                    .attr("stroke-width", "1px"),
                update => update,
                exit => exit.remove()
            )
            .transition()
            .duration(1000)
            .attr("x1", 0)
            .attr("x2", function (d) { return x(counts.get(d[selectedVariable])); })
            .attr("y1", function (d) { return y(d[selectedVariable]); })
            .attr("y2", function (d) { return y(d[selectedVariable]); });

        svg.selectAll("circle")
            .data(data, d => `${d[selectedVariable]}`)
            .join(
                enter => enter
                    .append("circle")
                    .attr("r", "6")
                    .style("fill", "#d13100ff")
                    .on("mouseover", mouseover)
                    .on("mousemove", mousemove)
                    .on("mouseleave", mouseleave),
                update => update,
                exit => exit.remove()
            )
            .transition()
            .duration(1000)
            .attr("cx", function (d) { return x(counts.get(d[selectedVariable])); })
            .attr("cy", function (d) { return y(d[selectedVariable]); });
    }

    d3.select("#col_select").on("change", function () {
        selectedVariable = this.value;
        updateVis();
    });

    d3.select("#country_select").on("change", function () {
        selectedCountry = this.value;
        updateVis();
    });
    updateVis();
});