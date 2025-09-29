import {dataCSV, font, font_padding, create_svg, create_tooltip, get_colour_scale, get_counts_by_country, get_text_width} from "./aux.js";

const margin = { top: -20, right: 0, left: -10, bottom: 0 };
const container = d3.select("#map");
const svg = create_svg(container, margin);

const mapStuff = svg.append("g")
    .attr("class", "mapStuff")

const labelStuff = svg.append("g")
    .attr("class", "labelStuff");

let selectedVariable = "commonname";
let selectedCountry = "global";
let counts;
let colorScale;

var width = container.node().getBoundingClientRect().width;
var height = container.node().getBoundingClientRect().height;
var zoomDefault = new d3.ZoomTransform(1, 0, 0);

Promise.all([
    d3.json("./dataset/geo.json"),
    dataCSV
]).then(([geo, dataCSV]) => {
    counts = get_counts_by_country(dataCSV, selectedVariable);

    labelStuff.append("text")
        .attr("class", "filterLabel")
        .attr("x", 20)
        .attr("y", height + margin.bottom)
        .style("z-index", 100)
        .text("Active filter: None")

    const countries = Array.from(new Set(dataCSV.map(d => d.country)));
    countries.sort();
    const tooltip = create_tooltip("body");
    const countryDropdown = container.append("select").attr("class", "dropContainer")
    .style("position", "absolute")
    .style("top", "10px")
    .style("right", "10px")
    .style("z-index", "10")
    .on("change", function() {
        selectedCountry = d3.select(this).property("value");
        window.dispatchEvent(new CustomEvent("countryChanged", { detail: selectedCountry }));
    });

    countryDropdown.append("option").attr("value", "global").text("All Countries");
    countryDropdown.selectAll("countryOptions")
        .data(countries)
        .join("option")
        .attr("class", "countryOption")
        .attr("value", d => d)
        .text(d => d);

    function updateMap(counts) {
        colorScale = get_colour_scale(counts);
        height = container.node().getBoundingClientRect().height;
        width = container.node().getBoundingClientRect().width;

        svg.attr("width", width).attr("height", height)
        const proj = d3.geoMercator().fitSize([width, height], geo);
        const path = d3.geoPath().projection(proj);

        mapStuff.selectAll("path")
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
                const containerRect = container.node().getBoundingClientRect();
                tooltip.style("left", (event.pageX - containerRect.left + 30) + "px")
                    .style("top", (event.pageY - containerRect.top + 30) + "px");
            })
            .on("mouseout", function() {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            })
            .on("click", function(event, d) {
                selectedCountry = d.properties.name;
                countryDropdown.property("value", selectedCountry);
                countryDropdown.dispatch("change");
                window.dispatchEvent(new CustomEvent("countryChanged", { detail: selectedCountry }));
            });
    }
    updateMap(counts);

    window.addEventListener("filterByValue", function(event) {
        const { value, attribute } = event.detail;
        const filteredData = dataCSV.filter(row => row[attribute] === value);

        counts = get_counts_by_country(filteredData);
        d3.select("text").text("Active filter: " + value)
        updateMap(counts);
    });

    window.addEventListener("click", function(event) {
        if(event.target.nodeName==="svg"){
            countryDropdown.property("value", "global");
            countryDropdown.dispatch("change");
            window.dispatchEvent(new CustomEvent("countryChanged", { detail: "global" }));

            counts = get_counts_by_country(dataCSV, selectedVariable)
            d3.select("text").text("Active filter: None")
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
        .on("zoom", function(event) {
            mapStuff.attr("transform", event.transform);
        });

    svg.call(zoom);

});