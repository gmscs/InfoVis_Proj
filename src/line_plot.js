import {dataCSV, stroke_width, duration, create_svg, create_tooltip, filter_by_countries, 
        filter_by_date, filter_by_date_range, get_date_observations_by_granularity, 
        symbol_size, dot_opacity, update_legend_title, filter_by_length_range,
        shared_color_light, shared_color_dark} from "./stuff.js";

const container = d3.select("#line")
const margin = { top: 60, right: 20, bottom: 50, left: 40 };
const padding = 20;
const svg = create_svg(container, margin);

//defaults
let selectedCountries = [];
let selectedGranularity = "month";
let dateObservations;
let selectedChart = "line";
var filteredData;
var shared_color = shared_color_light;
var blendMode = "multiply";

var selectedVariable = "commonname";
var clevFilter = null;
var selectedDate = [];
var selectedDateRange = [];
var selectedSizeRange = [];
var sexApplied = "";
var globalDisplay = true;
var showLines = true;

var width = container.node().getBoundingClientRect().width;
var height = container.node().getBoundingClientRect().height;

const legendTitle = svg.append("text")
    .attr("class", "legend-title");

const radioContainer = container
    .append("div")
    .attr("class", "radioContainer");

const linesContainer = container
    .append("div")
    .attr("class", "linesContainer");

const checkboxContainer = container
    .append("div")
    .attr("class", "checkboxContainer")
    .style("margin-bottom", "10px");

const granularityOptions = [
    { value: "day", label: "Daily" },
    { value: "month", label: "Monthly" },
    { value: "year", label: "Yearly" }
];

svg.append("rect")
    .attr("class", "background")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "transparent")
    .style("pointer-events", "all")
    .lower();

const labelStuff = svg.append("g")
    .attr("class", "labelStuff");

dataCSV.then(function (data) {
    
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

    const tooltip = create_tooltip("#line");
    filteredData = filter_by_countries(data, selectedCountries);
    dateObservations = get_date_observations_by_granularity(filteredData, selectedGranularity);

    let x = d3.scaleUtc(d3.extent(dateObservations, d => d.date), [0, width - margin.left - margin.right]);
    let y = d3.scaleLinear([0, d3.max(dateObservations, d => d.observations)], [height - margin.top - margin.bottom, 0]);

    svg.append("g")
        .attr("class","x axis")
        .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)

    svg.append("g")
            .attr("class","y axis")
            .call(d3.axisLeft(y))
            .call(g => g.select(".domain").remove())
            .call(g => g.append("text")
                .attr("x", -margin.left + 10)
                .attr("y", -15)
                .attr("fill", "currentColor")
                .attr("text-anchor", "start")
                .text("Observations"));
    
    function resetChart() {
        selectedDate = [];
        selectedDateRange = [];
        selectedGranularity = "month";

        window.dispatchEvent(new CustomEvent("dateChangedBrushed", {
            detail: []
        }));
        window.dispatchEvent(new CustomEvent("dateChanged", { 
            detail: selectedDate 
        }));
        radioContainer.selectAll(".radioOption input[value='month']")
            .property("checked", true);
        updateVis();
    }
    
   

    checkboxContainer.append("button")
        .attr("id", "toggleContainer")
        .style("width", "40px")
        .style("height", "20px")
        .style("background-color", globalDisplay ? shared_color : "#c1c1c1")
        .style("border-radius", "15px")
        .style("position", "relative")
        .style("cursor", "pointer")
        .style("top", "3px")
        .on("click", function() {
            globalDisplay = !globalDisplay;
            d3.select(this)
                .style("background-color", globalDisplay ? shared_color : "#c1c1c1");
            d3.select("#toggleCircle")
                .style("transform", globalDisplay ? "translateX(0px)" : "translateX(-20px)");
            updateVis();
        })
        .append("div")
        .attr("id", "toggleCircle")
        .style("width", "15px")
        .style("height", "15px")
        .style("background-color", "white")
        .style("border-radius", "50%")
        .style("position", "absolute")
        .style("top", "0px")
        .style("left", globalDisplay ? "20px" : "2.5px")
        .style("transition", "transform 0.3s");

    checkboxContainer.append("label")
        .attr("for", "globalDisplay")
        .style("cursor", "pointer")
        .style("padding-top", "6px")
        .text("Merge data")
        .on("click", function() {
            globalDisplay = !globalDisplay;
            d3.select("#toggleContainer")
                .style("background-color", globalDisplay ? shared_color : "#c1c1c1");
            d3.select("#toggleCircle")
                .style("transform", globalDisplay ? "translateX(0px)" : "translateX(-20px)");
            updateVis();
        });

    linesContainer.append("button")
        .attr("id", "toggleContainerLines")
        .style("width", "40px")
        .style("height", "20px")
        .style("background-color", showLines ? shared_color : "#c1c1c1")
        .style("border-radius", "15px")
        .style("position", "relative")
        .style("cursor", "pointer")
        .style("top", "3px")
        .on("click", function() {
            showLines = !showLines;
            d3.select(this)
                .style("background-color", showLines ? shared_color : "#c1c1c1");
            d3.select("#toggleCircleLines")
                .style("transform", showLines ? "translateX(0px)" : "translateX(-20px)");
            updateVis();
        })
        .append("div")
        .attr("id", "toggleCircleLines")
        .style("width", "15px")
        .style("height", "15px")
        .style("background-color", "white")
        .style("border-radius", "50%")
        .style("position", "absolute")
        .style("top", "0px")
        .style("left", showLines ? "20px" : "2.5px")
        .style("transition", "transform 0.3s");

    linesContainer.append("label")
        .attr("for", "showLines")
        .style("cursor", "pointer")
        .style("padding-top", "6px")
        .text("Show lines")
        .on("click", function() {
            showLines = !showLines;
            d3.select("#toggleContainerLines")
                .style("background-color", showLines ? shared_color : "#c1c1c1");
            d3.select("#toggleCircleLines")
                .style("transform", showLines ? "translateX(0px)" : "translateX(-20px)");
            updateVis();
        });

    function updateVis() {
        height = container.node().getBoundingClientRect().height;
        width = container.node().getBoundingClientRect().width;
        let filterText = "";
        let filteredData = Array.from(data);
        let brushedDots = [];
        if (selectedCountries.length > 0) {
            filteredData = filteredData.filter(row => selectedCountries.includes(row.country));
        }
        if (clevFilter != null) {
            filteredData = filteredData.filter(row => row[selectedVariable] === clevFilter);
        }
        if (sexApplied != "") {
            filteredData = filteredData.filter(row => row["sex"] === sexApplied);
        }
        if (selectedDate.length > 0) {
            filteredData = filter_by_date(filteredData, selectedDate[0], selectedDate[1]);
            if(selectedDate[0] != null) filterText = selectedDate[0] + "/" + selectedDate[1];
            else filterText = "" + selectedDate[1];
        }
        if (selectedDateRange.length > 0) {
            filteredData = filter_by_date_range(filteredData, selectedDateRange[0], selectedDateRange[1]);
            let month0 = selectedDateRange[0].getMonth() + 1;
            let month1 = selectedDateRange[1].getMonth() + 1;
            filterText =  month0 + "/" + selectedDateRange[0].getFullYear() + " - " + month1 + "/" + selectedDateRange[1].getFullYear();
        }
        if (selectedSizeRange.length > 0) {
            filteredData = filter_by_length_range(filteredData, selectedSizeRange[0], selectedSizeRange[1]);
        }
        var dateObservations = get_date_observations_by_granularity(filteredData, selectedGranularity);

        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        update_legend_title(legendTitle, innerWidth, innerHeight, -10, 4, "Observations over Time");
        
        labelStuff.select(".activeFilterLabel")
            .attr("x", -36)
            .attr("y", height - 73)
            .text("");

        const label = labelStuff.select(".activeFilterLabel");
        let filterBool = false;
        if (selectedDate.length > 0) {
            filterBool = true;
            if(selectedDate[0] != null) filterText = selectedDate[0] + "/" + selectedDate[1];
            else filterText = "" + selectedDate[1];
            label.append("tspan")
                .text("♻ ")
                .attr("fill", shared_color)
                .style("font-size", 20)
                .style("baseline-shift", "-3px");
            label.append("tspan")
                .text("Active filter: ")
            label.append("tspan")
                .text(" " + filterText)
        }
        if (selectedDateRange.length > 0) {
            let month0 = selectedDateRange[0].getMonth() + 1;
            let month1 = selectedDateRange[1].getMonth() + 1;
            filterText =  month0 + "/" + selectedDateRange[0].getFullYear() + " - " + month1 + "/" + selectedDateRange[1].getFullYear();
            if(filterBool) {
                label.append("tspan")
                    .text(" " + filterText)
            } else {
                label.append("tspan")
                    .text("♻ ")
                    .attr("fill", shared_color)
                    .style("font-size", 20)
                    .style("baseline-shift", "-3px");
                label.append("tspan")
                    .text("Active filter: ")
                label.append("tspan")
                    .text(" " + filterText)
            }
        }
        else if (filterText === "") {
            label.append("tspan")
                .text("♻ ")
                .style("font-size", 20)
                .style("baseline-shift", "-3px");
            label.append("tspan")
                .text("Active filter: ")

            label.append("tspan")
                .text("None")
        }

        svg.selectAll(".lines").remove();
        svg.selectAll(".dot").remove();

        let filteredDateObservations = globalDisplay
            ? dateObservations.filter(d => d.country === "global")
            : dateObservations.filter(d => d.country !== "global");
        
        x = d3.scaleUtc(d3.extent(filteredDateObservations, d => d.date), [0, width - margin.left - margin.right]);
        y = d3.scaleLinear([0, d3.max(filteredDateObservations, d => d.observations) + 1], [height - margin.top - margin.bottom, 0]);

        const uniqueObservations = Array.from(new Set(filteredDateObservations.map(d => d.observations)));

        const points = filteredDateObservations.map((d) => [x(d.date), y(d.observations), d.country]);
        const groups = d3.rollup(points, v => Object.assign(v, {z : v[0][2]}), d => d[2]);

        const colorScale = d3.scaleOrdinal()
            .domain(Array.from(groups.keys()))
            .range(globalDisplay ? [shared_color] : d3.schemeCategory10);

        if(showLines) {
            const line = d3.line();

            svg.append("g")
                .attr("class", "lines")
                .attr("fill", "none")
                .attr("stroke-width", stroke_width)
                .attr("stroke-linejoin", "round")
                .attr("stroke-linecap", "round")
                .style("cursor", "pointer")
                .selectAll("path")
                .data(groups.values())
                .join("path")
                    .style("mix-blend-mode", blendMode)
                    .attr("stroke", d => colorScale(d.z))
                    .on("click", function(event, d) {
                        const clickedCountry = d.z;
                        if(clickedCountry != "global") {
                            selectedCountries = [clickedCountry];
                            window.dispatchEvent(new CustomEvent("countryChanged", { detail: selectedCountries }));
                            filteredData = filter_by_countries(data, selectedCountries);
                            updateVis();
                        }
                    })
                    .on("mouseover", function(event, d) {
                        d3.select(this)
                            .attr("stroke-width", stroke_width * 2);
                        if(selectedCountries.length === 0)
                            window.dispatchEvent(new CustomEvent("lineCountryHighlight", { detail: [d[0][2]] }));
                    })
                    .on("mouseout", function() {
                        d3.select(this)
                            .attr("stroke-width", stroke_width);
                        if(selectedCountries.length === 0)
                            window.dispatchEvent(new CustomEvent("lineCountryHighlight", { detail: "global" }));
                    })
                    .attr("d", d => {
                    const points = d.map(point => [point[0], y(0)]);
                    return line(points);
                    })
                    .transition()
                    .duration(duration)
                    .attr("d", line);
        }
            
        svg.select(".x.axis")
            .attr("transform", `translate(0,${innerHeight})`)
            .transition()
            .duration(duration)
            .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0));

        svg.selectAll(".y.axis")
            .attr("transform", `translate(0,0)`)
            .transition()
            .duration(duration)
            .call(d3.axisLeft(y).ticks(height / 40).tickFormat(d3.format("d")).ticks(uniqueObservations.length));

        const dotMap = new Map();
        filteredDateObservations.forEach(d => {
            const key = `${x(d.date)},${y(d.observations)}`;
            if (!dotMap.has(key))
                dotMap.set(key, []);
            dotMap.get(key).push(d);
        });

        const dot = svg.selectAll(".dot")
            .data(filteredDateObservations, d => d.date)
            .join(
                enter => enter.append("circle")
                .attr("class", "dot")
                .attr("cx", d => x(d.date))
                .attr("cy", d => y(0))
                .attr("r", symbol_size)
                .attr("fill", d => colorScale(d.country))
                .style("cursor", "pointer")
                .style("opacity", dot_opacity)
                .on("mouseover", function(event, d) {
                    tooltip.style("opacity", .9);
                })
                .on("mousemove", function(event, d) {
                    tooltip.transition().duration(duration / 5).style("opacity", .9);
                    const key = `${x(d.date)},${y(d.observations)}`;
                    const overlappingDots = dotMap.get(key);

                    const formatDate = selectedGranularity === 'year' 
                        ? d3.timeFormat("%Y")
                        : selectedGranularity === 'month'
                        ? d3.timeFormat("%b %Y")
                        : d3.timeFormat("%d %b %Y");
                    const containerRect = container.node().getBoundingClientRect();
                    
                    let tooltip_text;
                    if (overlappingDots.length > 1) {
                        tooltip_text = `${overlappingDots.length} Countries:<br/><br/>`;
                        overlappingDots.forEach(dot => {
                        tooltip_text += `Country: ${dot.country}<br/>Date: ${formatDate(dot.date)}<br/>Observations: ${dot.observations}<br/><br/>`;
                        });
                    } else {
                        tooltip_text = `Country: ${d.country}<br/>Date: ${formatDate(d.date)}<br/>Observations: ${d.observations}`;
                    }
                    
                    tooltip.html(tooltip_text);
                    const tooltipWidth = tooltip.node().getBoundingClientRect().width;
                    let leftPos = event.pageX - containerRect.left + 10;
                    if (leftPos + tooltipWidth > containerRect.width) {
                        leftPos = event.pageX - containerRect.left - tooltipWidth - 10;
                    }
                    tooltip.style("left", leftPos + "px")
                        .style("top", (event.pageY - containerRect.top + 10) + "px");
                })
                .on("mouseout", function(d) {
                    d3.select(this)
                        .attr("r", symbol_size)
                        .style("opacity", dot_opacity);
                    tooltip.transition()
                        .duration(duration / 2)
                        .style("opacity", 0);
                    if(selectedCountries.length === 0)
                        window.dispatchEvent(new CustomEvent("lineCountryHighlight", { detail: "global" }));
                })
                .on("mouseover", function(event, d) {
                    const key = `${x(d.date)},${y(d.observations)}`;
                    const overlappingDots = dotMap.get(key);
                    let hoveredCountries = [];
                    overlappingDots.forEach(dot => {
                        hoveredCountries.push(dot.country);
                    });
                    d3.select(this)
                        .attr("r", symbol_size * 1.5)
                        .style("opacity", 1);
                    if(selectedCountries.length === 0)
                        window.dispatchEvent(new CustomEvent("lineCountryHighlight", { detail: hoveredCountries }));
                })
                .on("click", function(event, d) {
                    if(selectedGranularity === "year") {
                        const clickedDate = d;
                        selectedGranularity = "month";
                        radioContainer.selectAll(".radioOption input[value='month']")
                            .property("checked", true);
                        selectedDate = [null, clickedDate.date.getFullYear()]
                        window.dispatchEvent(new CustomEvent("dateChanged", { 
                            detail: selectedDate
                        }));
                    }
                    else if(selectedGranularity === "month") {
                        const clickedDate = d;
                        selectedGranularity = "day";
                        radioContainer.selectAll(".radioOption input[value='day']")
                            .property("checked", true);
                        selectedDate = [clickedDate.date.getMonth() + 1, clickedDate.date.getFullYear()]
                        window.dispatchEvent(new CustomEvent("dateChanged", { 
                            detail: selectedDate 
                        }));
                    }
                    tooltip.transition()
                        .duration(duration / 2)
                        .style("opacity", 0);
                    updateVis();
                }),
                update => update,
                exit => exit.remove()
            )
            .transition().duration(duration)
                .attr("cx", d => x(d.date))
                .attr("cy", d => y(d.observations));

            svg.call(d3.brush().on("end", ({selection}) => {
                if (!selection) return;
                const [[x0, y0], [x1, y1]] = selection;
                brushedDots = filteredDateObservations.filter(d => {
                    const cx = x(d.date);
                    const cy = y(d.observations);
                    return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
                });
                if (brushedDots.length > 0) {
                    const brushedDates = brushedDots.map(d => d.date);
                    const minDate = new Date(Math.min(...brushedDates));
                    const maxDate = new Date(Math.max(...brushedDates));
                    selectedDateRange = [minDate, maxDate];
                } else {
                    selectedDateRange = [];
                }
                console.log(selectedDateRange);
                window.dispatchEvent(new CustomEvent("dateChangedBrushed", {
                    detail: selectedDateRange
                }));
            }));
    }

    radioContainer.selectAll(".radioOption")
        .data(granularityOptions)
        .join("div")
        .attr("class", "radioOption")
        .each(function(option, i) {
            const div = d3.select(this);
            div.append("input")
                .attr("type", "radio")
                .attr("id", `granularity_radio_${i}`)
                .attr("name", "granularityGroup")
                .attr("value", option.value)
                .style("cursor", "pointer")
                .property("checked", option.value === selectedGranularity)
                .property("disabled", option.value === "day")
                .on("change", function() {
                    selectedGranularity = this.value;
                    updateVis();
                });
            div.append("label")
                .attr("for", `granularity_radio_${i}`)
                .style("cursor", "pointer")
                .text(option.label);
        });

    window.addEventListener("filterByValue", function(event) {
        const { value, attribute } = event.detail;
        selectedVariable = attribute;
        clevFilter = value;

        updateVis();
    });

    window.addEventListener("sexChanged", function(event) {
        sexApplied = event.detail;

        updateVis();
    });

    window.addEventListener("sizeChangedBrushed", function(event) {
        selectedSizeRange = event.detail;

        updateVis();
    });

    window.addEventListener("filterByColour", function(event) {
        selectedCountries = event.detail;

        updateVis();
    });

    window.addEventListener("countryChanged", (event) => {
        selectedCountries = event.detail;

        updateVis();
    });

    window.addEventListener("darkMode", function(event) {
        shared_color = shared_color_dark;
        blendMode = "screen";
        d3.select("#toggleContainer")
            .style("background-color", globalDisplay ? shared_color : "#c1c1c1");
        d3.select("#toggleContainerLines")
                .style("background-color", showLines ? shared_color : "#c1c1c1");
        updateVis();
    });

    window.addEventListener("lightMode", function(event) {
        shared_color = shared_color_light;
        blendMode = "multiply";
        d3.select("#toggleContainer")
            .style("background-color", globalDisplay ? shared_color : "#c1c1c1");
        d3.select("#toggleContainerLines")
                .style("background-color", showLines ? shared_color : "#c1c1c1");
        updateVis();
    });

    window.addEventListener("globalReset", resetChart);
    
    const whyWouldYouDoThisToMe = new ResizeObserver(() => {
        updateVis();
    });
    whyWouldYouDoThisToMe.observe(container.node());

    updateVis();

});