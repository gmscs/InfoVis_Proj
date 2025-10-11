import {dataCSV, duration, stroke_width, create_svg, create_tooltip, get_colour_scale, get_counts_by_country, shared_color, update_legend_title} from "./stuff.js";

const margin = { top: -20, right: 0, left: -10, bottom: 0 };

const container = d3.select("#map");
const customDropdownContainer = container.append("div")
  .attr("id", "customDropdownContainer")
  .style("position", "absolute")
  .style("top", "10px")
  .style("right", "10px")
  .style("z-index", "1000")
  .style("width", "210px");
const svg = create_svg(container, margin);

const searchInput = customDropdownContainer.append("input")
  .attr("type", "text")
  .attr("id", "countrySearch")
  .attr("placeholder", "Search countries...")
  .style("width", "200px")
  .style("padding", "5px");

const countryList = customDropdownContainer.append("div")
  .attr("id", "countryList")
  .style("border", "1px solid #ccc")
  .style("max-height", "320px")
  .style("max-width", "210px")
  .style("overflow-y", "auto")
  .style("background-color", "#ffffff")
  .style("display", "none");

const mapStuff = svg.append("g")
    .attr("class", "mapStuff")

const labelStuff = svg.append("g")
    .attr("class", "labelStuff");

const legendTitle = svg.append("text")
    .attr("class", "legend-title");

const legendItemSize = 20;
const legendSpacing = 4;
    
let selectedVariable = "commonname";
let selectedCountries = [];
let selectedColour = false;
let counts;
let isFocused = false;

var colourScale;
var width = container.node().getBoundingClientRect().width;
var height = container.node().getBoundingClientRect().height;
var zoomDefault = new d3.ZoomTransform(1, 0, 0);

svg.append("rect")
    .attr("class", "zoomable")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "transparent")
    .style("pointer-events", "all")
    .lower();

const colourLegend = svg.append("g")
  .attr("class", "legend")
  .attr("transform", `translate(20, ${height - ((legendItemSize + legendSpacing) * 5) - 20})`);

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

    const tooltip = create_tooltip("body");

    const countries = Array.from(new Set(dataCSV.map(d => d.country)));
    countries.push("All Countries");
    countries.sort();
    
    function updateCountryList(filter = "") {
        const filteredCountries = countries.filter(country =>
            country.toLowerCase().includes(filter.toLowerCase())
        );

        const options = countryList.selectAll(".countryOption")
            .data(filteredCountries, d => d);

        options.exit().remove();

        options.enter()
            .append("div")
            .attr("class", "countryOption")
            .style("padding", "5px")
            .style("cursor", "pointer")
            .text(d => d)
            .on("mousemove", function() {
                d3.select(this).style("background-color", "#6bb0d7");
            })
            .on("mouseleave", function(event, d) {
                d3.select(this).style("background-color",
                    (selectedCountries.includes(d) || (d === "All Countries" && selectedCountries.length === 0)) ? "#bed8e7" : "white");
            })
            .on("click", function(event, d) {
                if (d === "All Countries") {
                    selectedCountries = [];
                } else if (!selectedCountries.includes(d)) {
                    selectedCountries.push(d);
                } else {
                    selectedCountries = selectedCountries.filter(c => c !== d);
                }
                highlightSelectedCountry();
                window.dispatchEvent(new CustomEvent("countryChanged", { detail: selectedCountries }));
                updateCountryList(searchInput.property("value"));
            })
            .merge(options)
            .style("background-color", (d, i) => {
                if (selectedCountries.length === 0 && i === 0) return "#bed8e7"
                else if (selectedCountries.includes(d)) return "#bed8e7";
                else return "white";
            });
    }
    
    searchInput
        .on("click", () => {
            if(isFocused) {
                searchInput.node().blur();
                countryList.style("display", "none");
                isFocused = false;
            } else {
                searchInput.node().focus();
                countryList.style("display", "block");
                isFocused = true;
            }
        })
        .on("input", () => updateCountryList(searchInput.property("value")));

    function updateDropdownOptions() {
        customDropdownContainer.selectAll("option.countryOption")
            .classed("selected", d => selectedCountries.includes(d));
    }

    function highlightSelectedCountry() {
        mapStuff.selectAll("path")
            .attr("stroke", d => selectedCountries.includes(d.properties.name) ? "black" : "none")
            .attr("stroke-width", d => selectedCountries.includes(d.properties.name) ? stroke_width : null);
    }

    function filter_by_colour(colour) {
        selectedColour = true;
        const range = colourScale.range();
        const domain = colourScale.domain();
        const colorIndex = range.indexOf(colour);
        
        let lower, upper;
        if (colorIndex === 0) {
            lower = d3.min(Array.from(counts.values()));
            upper = domain[colorIndex];
        } else {
            lower = domain[colorIndex - 1];
            upper = (domain[colorIndex] || d3.max(Array.from(counts.values())) + 1);
        }

        const filteredData = dataCSV.filter(d => {
            const countryCount = counts.get(d.country);
                return countryCount >= lower && countryCount < upper;
        });

        return(filteredData);
    }

    function updateMap(counts, origin=null) {
        //console.log(origin);
        colourScale = get_colour_scale(counts);
        height = container.node().getBoundingClientRect().height;
        width = container.node().getBoundingClientRect().width;

        updateCountryList();

        update_legend_title(legendTitle, width, height, 1, 1, "Observations per Country");

        labelStuff.select(".filterLabel")
            .attr("x", 20)
            .attr("y", height + margin.bottom);

        colourLegend.attr("transform", `translate(20, ${height - ((legendItemSize + legendSpacing) * 5) - 20})`);

        const maxCount = d3.max(Array.from(counts.values()));
        const minCount = d3.min(Array.from(counts.values()));

        const legendItems = colourLegend
            .selectAll("g.legend-item")
            .style("cursor", "pointer")
            .data(colourScale.range(), (d) => d);

        const enterItems = legendItems
            .enter()
            .append("g")
            .attr("class", "legend-item")
            .attr("transform", (_, colour) => `translate(0, ${colour * (legendItemSize + legendSpacing)})`);

        enterItems.append("rect")
            .attr("width", legendItemSize)
            .attr("height", legendItemSize)
            .attr("fill", (d) => d)
            .attr("stroke", shared_color)
            .on("click", (event, d) => {
                if(!selectedColour) {
                    event.stopPropagation();
                    let filteredData = filter_by_colour(d);
                    counts = get_counts_by_country(filteredData);
                    const filterEvent = new CustomEvent("filterByColour", {
                        detail: filteredData
                    });
                    window.dispatchEvent(filterEvent);

                    updateMap(counts, "filterColour");
                }
            });

        enterItems.append("text")
            .attr("x", legendItemSize + 5)
            .attr("y", legendItemSize / 2)
            .attr("dy", "0.32em");

        legendItems.select("text")
            .text((_, i) => {
                const domain = colourScale.domain();
                const lower = Math.floor(domain[i - 1] || minCount);
                const upper = Math.floor(domain[i]) || maxCount;
                return `${lower} - ${upper}`;
            });

        legendItems.attr("transform", (_, i) => `translate(0, ${i * (legendItemSize + legendSpacing)})`);
        legendItems.exit().remove();

        svg.select(".zoomable")
            .attr("width", width)
            .attr("height", height);

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
                return count === (0 || undefined) ? "#c0c0c0ff" : colourScale(count);
            }).style("cursor", "pointer")
            
            .on("mouseover", function(event, d) {
                const countryName = d.properties.name;
                const count = counts.get(countryName) || 0;
                tooltip.transition()
                    .duration(duration / 5)
                    .style("opacity", 2).style("s");
                tooltip.html(`Country: ${countryName}<br>Observations: ${count}`);

                d3.select(this).classed("hovered", true);
            })
            .on("mousemove", function(event) {
                const containerRect = container.node().getBoundingClientRect();
                tooltip.style("left", (event.pageX - containerRect.left + 30) + "px")
                    .style("top", (event.pageY - containerRect.top + 30) + "px");
            })
            .on("mouseout", function() {
                tooltip.transition()
                    .duration(duration / 1000)
                    .style("opacity", 0);
                d3.select(this).classed("hovered", false);
            })
            .on("click", function(event, d) {
            if(countries.includes(d.properties.name)) {
                if(selectedCountries.includes(d.properties.name)) {
                    selectedCountries = selectedCountries.filter(c => c !== d.properties.name);
                    if(selectedCountries == []) {
                        window.dispatchEvent(new CustomEvent("countryChanged", { detail: selectedCountries }));
                    }
                } else {
                    selectedCountries.push(d.properties.name);
                }
                highlightSelectedCountry();
                updateDropdownOptions();
                updateCountryList();
                window.dispatchEvent(new CustomEvent("countryChanged", { detail: selectedCountries }));
            }
        })
            
    }
    updateMap(counts, "firstRun");
    updateDropdownOptions();
    highlightSelectedCountry();

    window.addEventListener("dateChanged", function(event) {
        const filteredData = event.detail;
        counts = get_counts_by_country(filteredData);
        updateMap(counts, "datechanged");
    });

    window.addEventListener("sizeChanged", function(event) {
        const filteredData = event.detail;
        counts = get_counts_by_country(filteredData);
        updateMap(counts, "sizechanged");
    });

    window.addEventListener("lineCountrySelect", function(event) {
        selectedCountries = event.detail;
        const filteredData = dataCSV.filter(row => row.country === selectedCountries[0]);
        counts = get_counts_by_country(filteredData);

        updateMap(counts, "lineCountrySelect");
    })

    window.addEventListener("lineCountryHighlight", function(event) {
        let highlightedCountries = event.detail;
        mapStuff.selectAll("path")
            .attr("stroke", d => highlightedCountries.includes(d.properties.name) ? "black" : "none")
            .attr("stroke-width", d => highlightedCountries.includes(d.properties.name) ? stroke_width : null);
    })

    window.addEventListener("filterByValue", function(event) {
        const { value, attribute } = event.detail;
        const filteredData = dataCSV.filter(row => row[attribute] === value);

        counts = get_counts_by_country(filteredData);
        d3.select("text").text("Active filter: " + value)
        updateMap(counts, "clevValueChanged");
    });

    window.addEventListener("filterReset", (event) => {
        selectedCountries = [];

        counts = get_counts_by_country(dataCSV, selectedVariable);
        d3.select("text").text("Active filter: None");
        selectedColour = false;
        selectedCountries = [];
        highlightSelectedCountry();
        updateDropdownOptions();
        updateMap(counts, "resetToGlobal");
        svg.call(zoom.transform,zoomDefault)
    });

    window.addEventListener("click", function(event) {
        if(event.target.nodeName==="rect"){
            selectedCountries = [];
            updateCountryList();
            window.dispatchEvent(new CustomEvent("countryChanged", { detail: selectedCountries }));

            counts = get_counts_by_country(dataCSV, selectedVariable);
            d3.select("text").text("Active filter: None");
            selectedColour = false;
            selectedCountries = [];
            highlightSelectedCountry();
            updateDropdownOptions();
            updateMap(counts, "resetToGlobal");
            svg.call(zoom.transform,zoomDefault)
        }
    });

    const whyWouldYouDoThisToMe = new ResizeObserver(() => {
        updateMap(counts, "resizeWindow");
    });
    whyWouldYouDoThisToMe.observe(container.node());

    const zoom = d3.zoom()
        .scaleExtent([1 , 10])
        .on("zoom", function(event) {
            mapStuff.attr("transform", event.transform);
        });

    svg.call(zoom);

});