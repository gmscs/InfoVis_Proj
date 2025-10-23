import {dataCSV, stroke_width, duration, create_svg, create_tooltip, filter_by_countries, 
        find_closest_date, filter_by_date, filter_by_date_range, get_date_observations_by_granularity, 
        symbol_size, dot_opacity, update_legend_title, filter_by_length_range,
        shared_color_light, shared_color_dark, filter_by_weight_range, country_colours
    } from "./stuff.js";

const container = d3.select("#line")
const margin = { top: 60, right: 20, bottom: 50, left: 40 };
const padding = 20;
const svg = create_svg(container, margin);

const linesGroup = svg.append("g").attr("class", "lines-group");
const dotsGroup = svg.append("g").attr("class", "dots-group");

//defaults
let selectedCountries = [];
let selectedGranularity = "month";
let dateObservations;
let selectedChart = "line";
var filteredData;
var shared_color = shared_color_light;
var blendMode = "multiply";

var selectedVariable = "commonname";
var clevFilter = [];
var selectedDate = [];
var selectedDateRange = [];
var selectedSizeRange = [];
var selectedWeightRange = [];
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
        radioContainer.selectAll(".granularityOptions input[value='month']")
            .property("checked", true);
        updateVis();
    }
    
    function brushed(event) {
        if(!event.selection) return;
        const [x0, x1] = event.selection;

        filteredData = filter_by_countries(data, selectedCountries);
        let start = find_closest_date(dateObservations, x, x0);
        let end = find_closest_date(dateObservations, x, x1);
        
        selectedDateRange = [start, end];

        window.dispatchEvent(new CustomEvent("dateChangedBrushed", {
            detail: selectedDateRange
        }));
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
            updateVis(true);
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
            updateVis(true);
        });

    function updateVis(onlyLines = false) {
        height = container.node().getBoundingClientRect().height;
        width = container.node().getBoundingClientRect().width;
        let filterText = "";
        let filteredData = Array.from(data);
        if (selectedCountries.length > 0) {
            filteredData = filteredData.filter(row => selectedCountries.includes(row.country));
        }
        if (clevFilter.length > 0) {
            filteredData = filteredData.filter(row => clevFilter.includes(row[selectedVariable]));
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
        if (selectedWeightRange.length > 0) {
            filteredData = filter_by_weight_range(filteredData, selectedWeightRange[0], selectedWeightRange[1]);
        }
        var dateObservations = get_date_observations_by_granularity(filteredData, selectedGranularity);

        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        if (!onlyLines) {
            update_legend_title(legendTitle, innerWidth, innerHeight, -10, 4, "Observations over Time");
        }
        
        if (!onlyLines) {
            labelStuff.select(".activeFilterLabel")
                .attr("x", -36)
                .attr("y", height - 73)
                .text("");
        }

        if (!onlyLines) {
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
        }

        svg.selectAll(".lines").remove();


        let filteredDateObservations = globalDisplay
            ? dateObservations.filter(d => d.country === "global")
            : dateObservations.filter(d => d.country !== "global");
        
        x = d3.scaleUtc(d3.extent(filteredDateObservations, d => d.date), [0, width - margin.left - margin.right]);
        y = d3.scaleLinear([0, d3.max(filteredDateObservations, d => d.observations)], [height - margin.top - margin.bottom, 0]);

        const uniqueObservations = Array.from(new Set(filteredDateObservations.map(d => d.observations)));

        const points = filteredDateObservations.map((d) => [x(d.date), y(d.observations), d.country]);
        const groups = d3.rollup(points, v => Object.assign(v, {z : v[0][2]}), d => d[2]);
        
        if (!onlyLines) {
            const brush = d3.brushX()
                .extent([[0, 0], [innerWidth, innerHeight]])
                .on("end", brushed);
            svg.select(".brush").remove();
            svg.append("g")
                .attr("class", "brush")
                .call(brush);
        }

        if(showLines) {
            const line = d3.line();

            const lineSelection = linesGroup.append("g")
                .attr("class", "lines")
                .attr("fill", "none")
                .attr("stroke-width", stroke_width)
                .attr("stroke-linejoin", "round")
                .attr("stroke-linecap", "round")
                .style("cursor", "pointer")
                .selectAll("path")
                .data(Array.from(groups.values()), d => d.z)
                .join("path")
                    .style("mix-blend-mode", blendMode)
                    .attr("stroke", d => country_colours[d.z] || shared_color)
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
                        linesGroup.raise();
                        svg.selectAll(".lines path")
                            .style("opacity", 0.2);
                        d3.select(this)
                            .style("opacity", 1)
                            .attr("stroke-width", stroke_width * 2);
                        if(selectedCountries.length === 0)
                            window.dispatchEvent(new CustomEvent("lineCountryHighlight", { detail: [d[0][2]] }));
                    })
                    .on("mouseout", function() {
                        dotsGroup.raise();
                        svg.selectAll(".lines path")
                            .style("opacity", 1);
                        d3.select(this)
                            .attr("stroke-width", stroke_width);
                        if(selectedCountries.length === 0)
                            window.dispatchEvent(new CustomEvent("lineCountryHighlight", { detail: "global" }));
                    })
                    .attr("d", d => line(d.map(point => [point[0], point[1]])))
                .each(function() {
                        const totalLength = this.getTotalLength();
                        d3.select(this)
                            .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
                            .attr("stroke-dashoffset", totalLength)
                            .transition()
                    .delay(onlyLines ? 0 : duration)
                            .duration(duration)
                            .ease(d3.easeLinear)
                            .attr("stroke-dashoffset", 0);
                    });
        }
            
        if (!onlyLines) {
            svg.select(".x.axis")
                .attr("transform", `translate(0,${innerHeight})`)
                .transition()
                .duration(duration)
                .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0));
        }

        if (!onlyLines) {
            svg.selectAll(".y.axis")
                .attr("transform", `translate(0,0)`)
                .transition()
                .duration(duration)
                .call(d3.axisLeft(y).ticks(height / 40).tickFormat(d3.format("d")).ticks(uniqueObservations.length));
        }

        const dotMap = new Map();
        filteredDateObservations.forEach(d => {
            const key = `${d.country}-${d.date.getTime()}`;
            if (!dotMap.has(key))
                dotMap.set(key, []);
            dotMap.get(key).push(d);
        });

        if (!onlyLines) {
            dotsGroup.selectAll(".dot")
                .data(filteredDateObservations, d => `${d.country}-${d.date.getTime()}`)
                .join(
                    enter => enter.append("circle")
                    .attr("class", "dot")
                    .attr("cx", d => x(d.date))
                    .attr("cy", d => y(0))
                    .attr("r", symbol_size)
                    .attr("fill", d => country_colours[d.country] || shared_color)
                    .style("cursor", "pointer")
                    .style("opacity", dot_opacity)
                    .on("mouseover", function(event, d) {
                        tooltip.style("opacity", .9);
                    })
                    .on("mousemove", function(event, d) {
                        tooltip.transition().duration(duration / 5).style("opacity", .9);
                        const key = `${d.country}-${d.date.getTime()}`;
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
                                tooltip_text += `Date: ${formatDate(dot.date)}<br/>Country: ${dot.country}<br/>Observations: ${dot.observations}<br/><br/>`;
                            });
                        } else {
                            tooltip_text = `Date: ${formatDate(d.date)}<br/>Country: ${d.country}<br/>Observations: ${d.observations}`;
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
                        const key = `${d.country}-${d.date.getTime()}`;
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
                            radioContainer.selectAll(".granularityOptions input[value='month']")
                                .property("checked", true);
                            selectedDate = [null, clickedDate.date.getFullYear()]
                            window.dispatchEvent(new CustomEvent("dateChanged", { 
                                detail: selectedDate
                            }));
                        }
                        else if(selectedGranularity === "month") {
                            const clickedDate = d;
                            selectedGranularity = "day";
                            radioContainer.selectAll(".granularityOptions input[value='day']")
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
                    update => update
                        .attr("fill", d => country_colours[d.country] || shared_color),
                    exit => exit.transition()
                        .duration(duration)
                        .style("opacity", 0)
                        .attr("cy", d => y(0))
                        .remove()
                )
                .transition().duration(duration)
                    .style("opacity", dot_opacity)
                    .attr("cx", d => x(d.date))
                    .attr("cy", d => y(d.observations));
        }
        linesGroup.raise();
    }

    radioContainer.selectAll(".granularityOptions")
        .data(granularityOptions)
        .join("div")
        .attr("class", "granularityOptions")
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
        const { values, attribute } = event.detail;
        selectedVariable = attribute;
        clevFilter = values;

        updateVis();
    });

    window.addEventListener("sexChanged", function(event) {
        sexApplied = event.detail;

        updateVis();
    });

    window.addEventListener("sizeChangedBrushed", function(event) {
        selectedSizeRange = event.detail[0];
        selectedWeightRange = event.detail[1];
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

    window.addEventListener("lineCountryHighlight2", function(event) {
        const highlightedCountries = event.detail;
        if(!globalDisplay) {
            if (highlightedCountries.length === 0) {
                svg.selectAll(".lines path").style("opacity", 1).attr("stroke-width", stroke_width);
            } else {
                svg.selectAll(".lines path")
                    .style("opacity", d => highlightedCountries.includes(d.z) ? 1 : 0.2)
                    .attr("stroke-width", d => highlightedCountries.includes(d.z) ? stroke_width * 2 : stroke_width);
            }
        }
    });

    window.addEventListener("globalReset", resetChart);
    
    const whyWouldYouDoThisToMe = new ResizeObserver(() => {
        updateVis();
    });
    whyWouldYouDoThisToMe.observe(container.node());

    updateVis();

});