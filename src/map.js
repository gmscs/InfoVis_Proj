import {dataCSV, selectedVariable, font, font_padding, create_tooltip, get_counts_by_country, get_text_width} from "./aux.js";

const margin = { top: 30, right: 30, left: 20, bottom: 30 };

const width = 800 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const svg = d3.select("#map")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

let counts;

Promise.all([
    d3.json("./dataset/geo.json"),
    dataCSV
]).then(([geo, dataCSV]) => {
    counts = get_counts_by_country(dataCSV, selectedVariable);

    svg.append("text")
    .attr("x", 0)
    .attr("y", height + margin.bottom)
    .text("Active filter: None");

    const tooltip = create_tooltip("#map");

    const colorDomain = Array.from(counts.values()).sort((a, b) => a - b);
    const colorScale = d3.scaleThreshold()
    .domain(colorDomain.filter((d, i) => i % Math.ceil(colorDomain.length / 5) === 0))
    .range(d3.schemeBlues[5]);

    const proj = d3.geoMercator().fitSize([width, height], geo);
    const path = d3.geoPath().projection(proj);

    function updateMap(counts) {           
        const newColors = Array.from(counts.values()).sort((a, b) => a - b);
        colorScale.domain(newColors.filter((d, i) => i % Math.ceil(newColors.length / 5) === 0));

        svg.selectAll("path")
            .data(geo.features)
            .join("path")
            .attr("d", path)
            .attr("fill", function (d) {
                const key = d.properties.name;
                const count = counts.get(key);
                return count === (0 || undefined) ? "#c0c0c0ff" : colorScale(count);
            })
            
            .on("mouseover", function(event, d) {
                const countryName = d.properties.name;
                const count = counts.get(countryName) || 0;
                tooltip.transition()
                    .duration(200)
                    .style("opacity", 2).style("s");
                tooltip.html(`${countryName}<br>${count}`);

                const text = tooltip.node().textContent;
                const textWidth = get_text_width(text, font);
                tooltip.style("width", `${textWidth + font_padding}px`)
            })
            .on("mousemove", function(event) {
                tooltip.style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", function() {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            })
            .on("click", function(event, d) {
                const countryName = d.properties.name;
                d3.select("#country_select").property("value", countryName);
                d3.select("#country_select").dispatch("change");
            });
    }
    updateMap(counts);

    window.addEventListener("filterByValue", function(event) {
        const { value, attribute } = event.detail;
        const filteredData = dataCSV.filter(row => row[attribute] === value);

        counts = get_counts_by_country(filteredData);
        d3.select("text").text("Active filter: " + value)
        updateMap(counts);
    })

    window.addEventListener("click", function(event) {
        //non important click, essencially "losing focus"
        if(event.target.nodeName==="svg"){
            d3.select("#country_select").property("value","global")
            d3.select("#country_select").dispatch("change");

            counts = get_counts_by_country(dataCSV, selectedVariable)
            d3.select("text").text("Active filter: None")
            updateMap(counts);
        }
    })

});