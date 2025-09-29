import {dataCSV, font, font_padding, create_svg, create_tooltip, get_colour_scale, get_counts_by_country, get_text_width} from "./aux.js";

const margin = { top: -20, right: 0, left: -10, bottom: 0 };
const container = d3.select("#map");
const svg = create_svg(container, margin);

let selectedVariable = "commonname";
let counts;
let colorScale;

var width = container.node().getBoundingClientRect().width;
var height = container.node().getBoundingClientRect().height;
var zoomDefault = new d3.ZoomTransform(1,-10,-20)

Promise.all([
    d3.json("./dataset/geo.json"),
    dataCSV
]).then(([geo, dataCSV]) => {
    counts = get_counts_by_country(dataCSV, selectedVariable);

    const tooltip = create_tooltip("#map");

    function updateMap(counts) {
        colorScale = get_colour_scale(counts);
        height = container.node().getBoundingClientRect().height;
        width = container.node().getBoundingClientRect().width;

        svg.attr("width", width).attr("height", height)
        const proj = d3.geoMercator().fitSize([width, height], geo);
        const path = d3.geoPath().projection(proj);

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
        d3.select("#filter_label").text("Active filter: " + value)
        updateMap(counts);
    });

    window.addEventListener("click", function(event) {
        //non important click, essencially "losing focus"
        if(event.target.nodeName==="svg"){
            d3.select("#country_select").property("value","global")
            d3.select("#country_select").dispatch("change");

            counts = get_counts_by_country(dataCSV, selectedVariable)
            d3.select("#filter_label").text("Active filter: None")
            updateMap(counts);
            svg.call(zoom.transform,zoomDefault)
        }
    });

    const whyWouldYouDoThisToMe = new ResizeObserver(() => {
        updateMap(counts);
    });
    whyWouldYouDoThisToMe.observe(container.node());

    const zoom = d3.zoom()
    .scaleExtent([1 , 4])
    .on("zoom", zoomed);

    svg.call(zoom);

    function zoomed(event) {
        const {transform} = event;
        svg.attr("transform", transform);
    }

});