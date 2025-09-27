import {get_counts_by_country} from "./aux.js";

const margin = { top: 30, right: 30, left: 250, bottom: 30 };

const width = 800 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const svg = d3.select("#map")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

let selectedVariable = "commonname"
let csvData = [];
let counts;

Promise.all([
    d3.json("./dataset/geo.json"),
    d3.csv("./dataset/crocodile_dataset_processed.csv")
]).then(([geo, csvRows]) => {
    csvData = csvRows;
    counts = get_counts_by_country(csvData, selectedVariable);

    const colorDomain = Array.from(counts.values()).sort((a, b) => a - b);
    const colorScale = d3.scaleThreshold()
    .domain(colorDomain.filter((d, i) => i % Math.ceil(colorDomain.length / 5) === 0))
    .range(d3.schemeBlues[5]);

    const proj = d3.geoMercator().fitSize([width, height], geo);
    const path = d3.geoPath().projection(proj);

    function updateMap(varName) {        
        counts = get_counts_by_country(csvData, varName);
        const newColors = Array.from(counts.values()).sort((a, b) => a - b);
        colorScale.domain(newColors.filter((d, i) => i % Math.ceil(newColors.length / 5) === 0));

        svg.selectAll("path")
            .data(geo.features)
            .join("path")
            .attr("d", path)
            .attr("fill", function (d) {
                const key = d.properties.code;
                const count = counts.get(csvData, varName)
                return colorScale(count)
            });
    }
    updateMap(selectedVariable);

    document.getElementById("col_select").addEventListener("change", function () {
        selectedVariable = this.value;
        updateMap(selectedVariable);
    });

});