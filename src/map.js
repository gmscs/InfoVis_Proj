import {dataCSV, duration, stroke_width, create_svg, create_tooltip, get_colour_scale, get_counts_by_country, shared_color, 
    filter_by_colour, update_legend_title, filter_by_date,
    filter_by_date_range, filter_by_length_range} from "./stuff.js";

const margin = { top: -20, right: 0, left: -10, bottom: 0 };

const container = d3.select("#map");
const customDropdownContainer = container.append("div")
  .attr("id", "customDropdownContainer")
  .style("position", "absolute")
  .style("top", "10px")
  .style("right", "4px")
  .style("z-index", "1000")
  .style("width", "170px");
const svg = create_svg(container, margin);

const searchInput = customDropdownContainer.append("input")
  .attr("type", "text")
  .attr("id", "countrySearch")
  .attr("placeholder", "Search countries...")
  .style("width", "150px")
  .style("padding", "5px");

const countryList = customDropdownContainer.append("div")
  .attr("id", "countryList")
  .style("border", "1px solid #ccc")
  .style("max-height", "320px")
  .style("max-width", "162px")
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
    
let counts;
let isFocused = false;

var selectedCountries = [];
var selectedVariable = "commonname";
var clevFilter = null;
var selectedDate = [];
var selectedDateRange = [];
var selectedSizeRange = [];
var selectedColour = null;
var colourScale = null;
var sexApplied = "";

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
    labelStuff.append("text")
        .attr("class", "filterLabel activeFilterLabel")
        .attr("x", 20)
        .attr("y", height + margin.bottom)
        .style("z-index", 100)
        .style("cursor", "pointer")
        .text("Active filter: None")
        .on("click", function() {
            resetChart();
        })
        .on("mouseover", function (d) {
            tooltip.style("opacity", 2).style("s");
        })
        .on("mousemove", (event, d) => {
            const containerRect = container.node().getBoundingClientRect();
            tooltip.html("Click here to remove the filters applied by this map.")
                .style("left", (event.pageX - containerRect.left + 30) + "px")
                .style("top", (event.pageY - containerRect.top + 30) + "px");
        })
        .on("mouseleave", function (d) {
            tooltip.transition().duration(duration / 5).style("opacity", 0);
        })

    const tooltip = create_tooltip("body");

    function resetChart() {
        selectedCountries = [];
        selectedColour = null;
        
        colourLegend.selectAll("g.legend-item").style("opacity", 1);
        window.dispatchEvent(new CustomEvent("countryChanged", { detail: selectedCountries }));

        svg.call(zoom.transform,zoomDefault)
        highlightSelectedCountry();
        updateMap();
    }

    var countries = Array.from(new Set(dataCSV.map(d => d.country)));
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
                d3.select(this).style("background-color", "#bed8e7");
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
                searchInput.node().focus();
                countryList.style("display", "block");
                isFocused = true;
            })
        .on("input", () => updateCountryList(searchInput.property("value")));
    
    document.addEventListener("mousedown", function(event) {
        if (event.defaultPrevented) {
            console.log("Event was prevented");
            return;
        }
        const searchBox = searchInput.node();
        const dropdown = countryList.node();

        if (!searchBox.contains(event.target) && !dropdown.contains(event.target)) {
            searchInput.node().blur();
            countryList.style("display", "none");
            isFocused = false;
        }
    });

    svg.on("mousedown", function(event) {
        if (!searchInput.node().contains(event.target) && !countryList.node().contains(event.target)) {
            searchInput.node().blur();
            countryList.style("display", "none");
            isFocused = false;
        }
    });

    function updateDropdownOptions() {
        customDropdownContainer.selectAll("option.countryOption")
            .classed("selected", d => selectedCountries.includes(d));
    }

    function highlightSelectedCountry() {
        mapStuff.selectAll("path")
            .attr("stroke", d => selectedCountries.includes(d.properties.name) ? "black" : "none")
            .attr("stroke-width", d => selectedCountries.includes(d.properties.name) ? stroke_width : null);
    }
    let ogCounts = get_counts_by_country(dataCSV);
    const maxOGCount = d3.max(Array.from(ogCounts.values()));
    const minOGCount = d3.min(Array.from(ogCounts.values()));

    function updateMap(origin=null) {
        //console.log(origin);
        
        // Data Stuff Here
        let filterText = "";
        let filteredData = Array.from(dataCSV);
        if (clevFilter != null) {
            filteredData = filteredData.filter(row => row[selectedVariable] === clevFilter);
        }
        if (sexApplied != "") {
            filteredData = filteredData.filter(row => row["sex"] === sexApplied);
        }
        if (selectedDate.length > 0) {
            filteredData = filter_by_date(filteredData, selectedDate[0], selectedDate[1]);
        }
        if (selectedDateRange.length > 0) {
            filteredData = filter_by_date_range(filteredData, selectedDateRange[0], selectedDateRange[1]);
        }
        if (selectedSizeRange.length > 0) {
            filteredData = filter_by_length_range(filteredData, selectedSizeRange[0], selectedSizeRange[1]);
        }
        var counts = get_counts_by_country(filteredData);
        colourScale = get_colour_scale(counts);

        if (selectedColour != null) {
            filteredData = filter_by_colour(filteredData, selectedColour, colourScale, counts);
        }

        counts = get_counts_by_country(filteredData);

        countries = Array.from(new Set(filteredData.map(d => d.country)));
        countries.push("All Countries");
        countries.sort();
        
        height = container.node().getBoundingClientRect().height;
        width = container.node().getBoundingClientRect().width;

        const maxCount = d3.max(Array.from(counts.values()));
        const minCount = d3.min(Array.from(counts.values()));

        const colourCounts = [];
        counts.forEach((count, country) => {
            if(count > 0) {
                const colour = colourScale(count);
                colourCounts[colour] = (colourCounts[colour] || 0) + 1;
            }
        })
        const colourRanges = [];
        counts.forEach((count, country) => {
            if(count > 0) {
                const colour = colourScale(count);
                if (!colourRanges[colour]) {
                    colourRanges[colour] = { min: count, max: count };
                } else {
                    colourRanges[colour].min = Math.min(colourRanges[colour].min, count);
                    colourRanges[colour].max = Math.max(colourRanges[colour].max, count);
                }
            }
        })

        const legendData = colourScale.range();

        updateCountryList();

        update_legend_title(legendTitle, width, height, 1, 1, "Observations per Country");

        labelStuff.select(".activeFilterLabel")
            .attr("x", 14)
            .attr("y", height + 7)
            .text("");
        
        const label = labelStuff.select(".activeFilterLabel");
        label.append("tspan")
            .text("♻ ")
            .attr("fill", "black")
            .style("font-size", 20)
            .style("baseline-shift", "-3px");
        label.append("tspan")
            .text("Active filter: ")
            .attr("fill", "black");
        if (selectedColour != null) {
            filterText = "■";
            label.append("tspan")
                .text(filterText)
                .attr("fill", selectedColour)
                .style("font-size", 20)
                .style("baseline-shift", "-2px");
        }
        if (selectedCountries.length > 0) {
            filterText = selectedCountries.length + " selected countries";
            label.append("tspan")
                .text(" " + filterText)
                .attr("fill", "black");
        }
        if (filterText === "") {
            label.append("tspan")
                .text("None")
                .attr("fill", "black");
        }

        colourLegend.attr("transform", `translate(20, ${height - ((legendItemSize + legendSpacing) * 5) - 20})`);

        const legendItems = colourLegend
            .selectAll("g.legend-item")
            .style("cursor", "pointer")
            .data(legendData, (d) => d);

        legendItems.exit().remove();

        const enterItems = legendItems
            .enter()
            .append("g")
            .attr("class", "legend-item")
            .attr("transform", (_, i) => `translate(0, ${i * (legendItemSize + legendSpacing)})`);
        
        enterItems.append("rect")
            .attr("width", legendItemSize)
            .attr("height", legendItemSize)
            .attr("fill", (d) => d)
            .attr("stroke", shared_color)
            .on("click", (event, d) => {
                event.stopPropagation();
                const legendItem = d3.select(event.currentTarget.parentNode);
                if (selectedColour !== d) {
                    selectedColour = d;
                    colourLegend.selectAll("g.legend-item").style("opacity", 0.3);
                    legendItem.style("opacity", 1);
                } else {
                    selectedColour = null;
                    colourLegend.selectAll("g.legend-item").style("opacity", 1);
                }
                let newColourScale = get_colour_scale(counts);
                let newFilterData = filter_by_colour(filteredData, selectedColour, newColourScale, counts);
                const countriesArray = [...new Set(newFilterData.map(d => d.country))];

                console.log(colourScale)
                
                window.dispatchEvent(new CustomEvent("filterByColour", {
                    detail: countriesArray
                }));
                updateMap("filterColour");
            });

        enterItems.append("text")
            .attr("x", legendItemSize + 5)
            .attr("y", legendItemSize / 2)
            .attr("dy", "0.32em");

        legendItems.select("text")
            .text((d) => {
                const colour = d;
                const count = colourCounts[colour] || 0;
                const range = colourRanges[colour];

                if (!range) {
                    return "0";
                }

                const min = range.min;
                const max = range.max;

                if (min === max) {
                    return count > 0 ? `${min}` : "0";
                } else if (max == min + 1) {
                    return count > 0 ? `${min}, ${max}` : "0";
                } else {
                    return count > 0 ? `${min} ... ${max}` : "0";
                }
            });
        legendItems.select("rect")
            .attr("opacity", (d) => colourCounts[d] > 0 ? 1 : 0.3);

        legendItems.attr("transform", (_, i) => `translate(0, ${i * (legendItemSize + legendSpacing)})`);
        colourLegend.attr("transform", `translate(20, ${height - ((legendItemSize + legendSpacing) * legendData.length) - 20})`);

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
        selectedDate = event.detail;

        updateMap("datechanged");
    });

    window.addEventListener("sexChanged", function(event) {
        sexApplied = event.detail;

        updateMap("sexChanged");
    });

    window.addEventListener("dateChangedBrushed", function(event) {
        selectedDateRange = event.detail;

        updateMap("datechangedBrushed");
    });

    window.addEventListener("sizeChangedBrushed", function(event) {
        selectedSizeRange = event.detail;

        updateMap("sizechangedBrushed");
    });

    window.addEventListener("countryChanged", function(event) {
        selectedCountries = event.detail;
        updateMap("lineCountrySelect");
    })

    window.addEventListener("lineCountryHighlight", function(event) {
        let highlightedCountries = event.detail;
        mapStuff.selectAll("path")
            .attr("stroke", d => highlightedCountries.includes(d.properties.name) ? "black" : "none")
            .attr("stroke-width", d => highlightedCountries.includes(d.properties.name) ? stroke_width : null);
    })

    window.addEventListener("filterByValue", function(event) {
        const { value, attribute } = event.detail;
        selectedVariable = attribute;
        clevFilter = value;

        updateMap("clevValueChanged");
    });

    window.addEventListener("globalReset", resetChart);

    const whyWouldYouDoThisToMe = new ResizeObserver(() => {
        updateMap("resizeWindow");
    });
    whyWouldYouDoThisToMe.observe(container.node());

    const zoom = d3.zoom()
        .scaleExtent([1 , 10])
        .filter((event) => {
            return !event.ctrlKey && event.type !== "dblclick";
        })
        .on("zoom", function(event) {
            mapStuff.attr("transform", event.transform);
        });

    svg.call(zoom);

});