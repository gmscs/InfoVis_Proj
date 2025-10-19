import {dataCSV, shared_color_light, shared_color_dark, symbol_size, duration, get_visible_categories, create_svg, create_tooltip, get_counts, dot_opacity, 
    filter_by_date, filter_by_date_range, update_legend_title, habitat_colours_light, habitat_colours_dark, 
    filter_by_length_range, filter_by_colour } from "./stuff.js";

const container = d3.select("#clev");
const margin = { top: 20, right: 20, bottom: 60, left: 210 };
const padding = 20;
const svg = create_svg(container, margin);

const labelStuff = svg.append("g")
    .attr("class", "labelStuff");

let selectedDot = null;
let selectedLabel = "Species";

var width = container.node().getBoundingClientRect().width;
var height = container.node().getBoundingClientRect().height;
var useHabitatColors = false;
var habitat_colours = habitat_colours_light;

var selectedCountries = [];
var selectedVariable = "commonname";
var clevFilter = null;
var selectedDate = [];
var selectedDateRange = [];
var selectedSizeRange = [];
var sexApplied = "";
var shared_color = shared_color_light;

const legendTitle = svg.append("text")
    .attr("class", "legend-title");

const radioContainer = container.append("div").attr("class", "radioContainer");
const radioOptions = [
    { label:"Species", value:"commonname" },
    { label:"Age", value:"age" },
    { label:"Sex", value:"sex" },
    { label:"Habitat", value:"habitat" },
    { label:"Conservation Status", value:"conservation" }
];

const habitatCheckboxContainer = container
    .append("div")
    .attr("class", "habitatCheckboxContainer")
    .style("margin-bottom", "10px"); 

svg.append("rect")
    .attr("class", "background")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "transparent")
    .style("pointer-events", "all")
    .lower();

dataCSV.then(function (data) {
    const tooltip = create_tooltip("#clev");

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
            tooltip.html("Click here to remove the filters applied by this chart")
                .style("left", (event.pageX - containerRect.left + 10) + "px")
                .style("top", (event.pageY - containerRect.top + 10) + "px");
        })
        .on("mouseleave", function (d) {
            tooltip.transition().duration(duration / 5).style("opacity", 0);
        })
    
    function resetChart() {
        clevFilter = null;
        selectedVariable = "commonname";
        svg.selectAll(".dot")
            .attr("r", symbol_size)
            .style("opacity", dot_opacity);

        window.dispatchEvent(new CustomEvent("filterByValue", {
            detail: { value: clevFilter, attribute: selectedVariable}
        }));
        updateVis();
    }

    svg.append("g")
        .attr("class","x axis")
        .attr("transform", `translate(0,${height})`)
        .call(g => g.append("text")
                .attr("x", -20)
                .attr("y", 30)
                .attr("fill", "currentColor")
                .attr("text-anchor", "start")
                .text("Observations"));

    svg.append("g")
        .attr("class","y axis");

    habitatCheckboxContainer.append("input")
        .attr("type", "checkbox")
        .attr("id", "habitatColorCheckbox")
        .style("cursor", "pointer")
        .on("change", function() {
            useHabitatColors = this.checked;
            radioContainer.selectAll(".radioOptions input[value='habitat']")
                .property("checked", true);
            selectedVariable = "habitat";
            updateVis();
        });

    habitatCheckboxContainer.append("label")
        .attr("for", "habitatColorCheckbox")
        .style("cursor", "pointer")
        .text("Show Habitat Colours");

    function updateVis() {

        // Data Stuff Here
        let filteredData = Array.from(data);
        if (sexApplied != "") {
            filteredData = filteredData.filter(row => row["sex"] === sexApplied);
        }
        if (selectedCountries.length > 0) {
            filteredData = filteredData.filter(row => selectedCountries.includes(row.country));
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
        var counts = get_counts(filteredData, selectedVariable, clevFilter);
        
        let totalCount = 0;
        counts.forEach((count, country) => {
            totalCount += count;
        });

        function mousemoveFunc(event, d) {
            const key = typeof d === "string" ? d : d[selectedVariable];
            const containerRect = container.node().getBoundingClientRect();
            tooltip.html("Observations: " + counts.get(key))
                .style("left", (event.pageX - containerRect.left + 10) + "px")
                .style("top", (event.pageY - containerRect.top + 10) + "px");
        }

        svg.selectAll(".dot")
            .on("mousemove", mousemoveFunc);

        const maxCount = d3.max(Array.from(counts.values()));

        height = container.node().getBoundingClientRect().height;
        width = container.node().getBoundingClientRect().width;

        const innerWidth = width - margin.left - margin.right - padding;
        const innerHeight = height - margin.top - margin.bottom;

        labelStuff.select(".activeFilterLabel")
            .attr("x", -206)
            .attr("y", innerHeight + margin.bottom / 1.3)
            .text("");
        
        const label = labelStuff.select(".activeFilterLabel");
        if(clevFilter != null) {
            label.append("tspan")
                .text("♻ ")
                .attr("fill", shared_color)
                .style("font-size", 20)
                .style("baseline-shift", "-3px");
            label.append("tspan")
                .text("Active filter: " + clevFilter)
        } else {
            label.append("tspan")
                .text("♻ ")
                .style("font-size", 20)
                .style("baseline-shift", "-3px");
            label.append("tspan")
                .text("Active filter: None")
        }
        label.append("tspan")
            .text(" (" + totalCount + " observations)")

        update_legend_title(legendTitle, innerWidth, innerHeight, -30, 5, `Observations by ${selectedLabel}`);
        
        const x = d3.scaleLinear()
            .domain([0, maxCount])
            .range([0, innerWidth * 0.98]);
        const visibleCategories = get_visible_categories(selectedVariable, counts);
        const y = d3.scaleBand()
            .range([0, innerHeight * 0.98])
            .domain(visibleCategories).padding(1);

        svg.select(".x.axis")
            .attr("transform", `translate(0,${innerHeight - 6.5})`)
            .transition()
            .duration(duration * 2)
            .call(d3.axisBottom(x).ticks(Math.min(maxCount, 10)).tickFormat(d3.format("d")));

        svg.selectAll(".y.axis")
            .transition()
            .duration(duration)
            .call(d3.axisLeft(y));

        svg.selectAll(".stem")
            .data(visibleCategories, d => d)
            .join(
              enter => enter.append("line").attr("class","stem").attr("stroke","grey").attr("stroke-width","1px"),
              update => update,
              exit => exit.remove()
            )
            .transition().duration(duration)
            .attr("x1", 0)
            .attr("x2", d => x(counts.get(d) || 0))
            .attr("y1", d => y(d) + y.bandwidth()/2)
            .attr("y2", d => y(d) + y.bandwidth()/2);
          
        svg.selectAll(".dot")
            .data(visibleCategories, d => d)
            .join(
              enter => enter.append("circle")
                .attr("class","dot")
                .attr("r", d => (d == clevFilter) ? symbol_size * 1.5 : symbol_size)
                .style("fill", d => useHabitatColors ? habitat_colours[d] || shared_color : shared_color)
                .style("opacity", d => (d == clevFilter) ? 1 : dot_opacity)
                .style("cursor", "pointer")
                .on("mouseover", function (d) {
                    tooltip.style("opacity", 2).style("s");
                    d3.select(this).attr("r", symbol_size * 1.5);
                    d3.select(this).style("opacity", 1);
                })
                .on("mousemove", mousemoveFunc)
                .on("mouseleave", function (d) {
                    tooltip.transition().duration(duration / 5).style("opacity", 0);
                    if(selectedDot != d.target.__data__) {
                        d3.select(this).attr("r", symbol_size);
                        d3.select(this).style("opacity", dot_opacity);
                    } else {
                        d3.select(this).attr("r", symbol_size * 1.5);
                        d3.select(this).style("opacity", 1);
                    }
                })
                .on("click", function(event, d) {
                    let filterEvent;
                    const prevDot = selectedDot;
                    selectedDot = d;
                    if (selectedDot != null && prevDot == selectedDot) {
                        svg.selectAll(".dot").style("opacity", dot_opacity);
                        selectedDot = null;
                        clevFilter = null;
                        filterEvent = new CustomEvent("filterByValue", {
                            detail: { value: clevFilter, attribute: selectedVariable}
                        });
                    }
                    else if(selectedDot != null) {
                        svg.selectAll(".dot")
                            .style("opacity", d => d === selectedDot ? 1 : dot_opacity)
                            .attr("r", d => (d == selectedDot) ? symbol_size * 1.5 : symbol_size);
                        clevFilter = d;
                        filterEvent = new CustomEvent("filterByValue", {
                            detail: { value: clevFilter, attribute: selectedVariable}
                        });
                    }
                    window.dispatchEvent(filterEvent);
                    updateVis();
                }),
              update => update
                .style("fill", d => useHabitatColors ? habitat_colours[d] || shared_color : shared_color),
              exit => exit.remove()
            )
            .transition().duration(duration)
                .attr("cx", d => x(counts.get(d) || 0))
                .attr("cy", d => y(d) + y.bandwidth()/2);
    }

    radioContainer.selectAll(".radioOptions")
        .data(radioOptions)
        .join("div")
        .attr("class", "radioOptions")
        .each(function(d, i) {
            const div = d3.select(this);
            div.append("input")
            .attr("type", "radio")
            .attr("id", `radio_${i}`)
            .attr("name", "radioGroup")
            .attr("value", d.value)
            .style("cursor", "pointer")
            .property("checked", d.value === selectedVariable)
            .on("change", function() {
                selectedVariable = this.value;
                selectedLabel = d.label;
                useHabitatColors = document.getElementById("habitatColorCheckbox").checked;
                updateVis();
            });
            div.append("label")
            .attr("for", `radio_${i}`)
            .style("cursor", "pointer")
            .text(d.label);
    });

    window.addEventListener("sexChanged", function(event) {
        sexApplied = event.detail;

        updateVis();
    });

    window.addEventListener("dateChanged", function(event) {
        selectedDate = event.detail;

        useHabitatColors = document.getElementById("habitatColorCheckbox").checked;
        updateVis();
    });

    window.addEventListener("dateChangedBrushed", function(event) {
        selectedDateRange = event.detail;

        useHabitatColors = document.getElementById("habitatColorCheckbox").checked;
        updateVis();
    });

    window.addEventListener("sizeChangedBrushed", function(event) {
        selectedSizeRange = event.detail;

        useHabitatColors = document.getElementById("habitatColorCheckbox").checked;
        updateVis();
    });

    window.addEventListener("countryChanged", (event) => {
        selectedCountries = event.detail;

        useHabitatColors = document.getElementById("habitatColorCheckbox").checked;
        updateVis();
    });

    window.addEventListener("filterByColour", function(event) {
        selectedCountries = event.detail;

        useHabitatColors = document.getElementById("habitatColorCheckbox").checked;
        updateVis();
    });

    window.addEventListener("showHabitats", function(event) {
        useHabitatColors = true;
        habitatCheckboxContainer.select("#habitatColorCheckbox")
            .property("checked", true);
        selectedVariable = "habitat";
        radioContainer.selectAll(".radioOptions input[value='habitat']")
            .property("checked", true);
        updateVis();
    });

    window.addEventListener("filterByValue", function(event) {
        const { value, attribute } = event.detail;
        clevFilter = value;
        selectedVariable = attribute;

        radioContainer.selectAll(".radioOptions input[type='radio']")
            .property("checked", function(d) {
                return d.value === selectedVariable;
            });
        
        useHabitatColors = document.getElementById("habitatColorCheckbox").checked;
        updateVis();
    });

    window.addEventListener("darkMode", function(event) {
        habitat_colours = habitat_colours_dark;
        shared_color = shared_color_dark;
        updateVis();
    });

    window.addEventListener("lightMode", function(event) {
        habitat_colours = habitat_colours_light;
        shared_color = shared_color_light;
        updateVis();
    });

    window.addEventListener("globalReset", resetChart);

    const whyWouldYouDoThisToMe = new ResizeObserver(() => {
        useHabitatColors = document.getElementById("habitatColorCheckbox").checked;
        updateVis();
    });
    whyWouldYouDoThisToMe.observe(container.node());

    updateVis();
});