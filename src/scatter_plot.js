import {dataCSV, symbol_size, duration, create_svg, create_tooltip, filter_by_countries, filter_by_length_range, stroke_width, 
    dot_opacity, update_legend_title, calculate_R_squared, quadratic_regression, sex_shapes, sex_symbols, habitat_colours_light, habitat_colours_dark,
     filter_by_date_range, filter_by_date, filter_by_weight_range,
     shared_color_light, shared_color_dark, age_colours, status_colours} from "./stuff.js";

const container = d3.select("#scatter");
const margin = { top: 40, right: 40, bottom: 50, left: 40 };
const svg = create_svg(container, margin);

var width = container.node().getBoundingClientRect().width;
var height = container.node().getBoundingClientRect().height;

const legendTitle = svg.append("text")
    .attr("class", "legend-title");

const labelStuff = container.append("div")
    .attr("class", "labelStuff");

const radioContainer = container
    .append("div")
    .attr("class", "radioContainer");

let selectedCountries = [];
var filteredData;
var regressionLine = true;
var sexApplied = "";
var habitat_colours = habitat_colours_light;
var colorList = age_colours;

var selectedVariable = "commonname";
var clevFilter = null;
var selectedDate = [];
var selectedDateRange = [];
var selectedSizeRange = [];
var selectedWeightRange = [];
var shared_color = shared_color_light;
var selectedColourVar = "age";

const colourOptions = [
    { value: "age", label: "Age" },
    { value: "conservation", label: "Conservation Status" },
    { value: "habitat", label: "Habitat" }
];

svg.append("rect")
    .attr("id", "clearBox")
    .attr("class", "background")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "transparent")
    .style("pointer-events", "all")
    .lower();

const labelStuffReset = svg.append("g")
    .attr("class", "labelStuff");

dataCSV.then(function (data) {
    const tooltip = create_tooltip("#scatter");
    filteredData = filter_by_countries(data, selectedCountries);
    
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    labelStuffReset.append("text")
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
    
    let x = d3.scaleLinear()
        .domain(d3.extent(filteredData, d => d.lengthM))
        .range([0, innerWidth]);
    let y = d3.scaleLinear()
        .domain([0, d3.max(filteredData, d => d.weight)])
        .range([innerHeight, 0]);

    svg.append("g")
        .attr("class","x axis")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(g => g.append("text")
                .attr("x", -10)
                .attr("y", 27)
                .attr("fill", "currentColor")
                .attr("text-anchor", "start")
                .text("Length (m)"));

    svg.append("g")
        .attr("class","y axis")
        .call(g => g.append("text")
                .attr("x", -20)
                .attr("y", -5)
                .attr("fill", "currentColor")
                .attr("text-anchor", "start")
                .text("Weight (kg)"));

    labelStuff.append("text")
        .attr("class", "legend fem_legend")
        .attr("x", innerWidth / 2.3)
        .attr("y", 0)
        .style("z-index", 100)
        .style("cursor", "pointer")
        .style("opacity", 1)
        .text("Female: ✚")
        .on("click", function(event) {
            if(sexApplied != "Female") {
                sexApplied = "Female";
                labelStuff.selectAll(".legend")
                    .style("opacity", 0.3);
                d3.select(this)
                    .style("opacity", 1);
            } else {
                sexApplied = "";
                labelStuff.selectAll(".legend")
                    .style("opacity", 1);
            }
            window.dispatchEvent(new CustomEvent("sexChanged", { detail: sexApplied }));
            updateVis();
        })
    labelStuff.append("text")
        .attr("class", "legend mal_legend")
        .attr("y", 0)
        .attr("x", innerWidth / 2.69)
        .style("z-index", 100)
        .style("cursor", "pointer")
        .style("opacity", 1)
        .text("Male: ▲")
        .on("click", function(event) {
            if(sexApplied != "Male") {
                sexApplied = "Male";
                labelStuff.selectAll(".legend")
                    .style("opacity", 0.3);
                d3.select(this)
                    .style("opacity", 1);
            } else {
                sexApplied = "";
                labelStuff.selectAll(".legend")
                    .style("opacity", 1);
            }
            window.dispatchEvent(new CustomEvent("sexChanged", { detail: sexApplied }));
            updateVis();
        })
    labelStuff.append("text")
        .attr("class", "legend idk_legend")
        .attr("y", 0)
        .attr("x", innerWidth / 1.95)
        .style("z-index", 100)
        .style("cursor", "pointer")
        .style("opacity", 1)
        .text("Unknown: ●")
        .on("click", function(event) {
            if(sexApplied != "Unknown") {
                sexApplied = "Unknown";
                labelStuff.selectAll(".legend")
                    .style("opacity", 0.3);
                d3.select(this)
                    .style("opacity", 1);
            } else {
                sexApplied = "";
                labelStuff.selectAll(".legend")
                    .style("opacity", 1);
            }
            window.dispatchEvent(new CustomEvent("sexChanged", { detail: sexApplied }));
            updateVis();
        })
    
    function resetChart() {
        selectedSizeRange = [];
        selectedWeightRange = [];
        sexApplied = "";
        labelStuff.selectAll(".legend")
            .style("opacity", 1);
            
        window.dispatchEvent(new CustomEvent("sexChanged", { detail: sexApplied }));
        window.dispatchEvent(new CustomEvent("sizeChangedBrushed", {
            detail: [selectedSizeRange, selectedWeightRange]
        }));
        updateVis();
    }

    function updateVis() {
        const newWidth = container.node().getBoundingClientRect().width;
        const newHeight = container.node().getBoundingClientRect().height;
        const innerWidth = newWidth - margin.left - margin.right;
        const innerHeight = newHeight - margin.top - margin.bottom - 16;

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
        }
        if (selectedDateRange.length > 0) {
            filteredData = filter_by_date_range(filteredData, selectedDateRange[0], selectedDateRange[1]);
        }
        if (selectedSizeRange.length > 0) {
            filteredData = filter_by_length_range(filteredData, selectedSizeRange[0], selectedSizeRange[1]);
        }
        if (selectedWeightRange.length > 0) {
            filteredData = filter_by_weight_range(filteredData, selectedWeightRange[0], selectedWeightRange[1]);
        }

        labelStuffReset.select(".activeFilterLabel")
            .attr("x", -36)
            .attr("y", newHeight - 53)
            .text("");
        
        let filterBool = false;
        const label = labelStuffReset.select(".activeFilterLabel");
        if (sexApplied != "") { 
            filterText = sexApplied;
            filterBool = true;
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
        if (selectedSizeRange.length > 0) { 
            filterText = " " + selectedSizeRange[0] + "m - " + selectedSizeRange[1] + "m";
            if(filterBool) {
                label.append("tspan")
                    .text(" " + filterText)
                    .attr("fill", "black");
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

        
        labelStuff.select(".fem_legend")
            .attr("x", innerWidth / 2.3)
            .on("mouseover", function() {
                tooltip.style("opacity", .9);
                tooltip.html("Click to only show females");
            });
        
        labelStuff.select(".mal_legend")
            .attr("x", innerWidth / 2.69)
            .on("mouseover", function() {
                tooltip.style("opacity", .9);
                tooltip.html("Click to only show males");
            });
        
        labelStuff.select(".idk_legend")
            .attr("x", innerWidth / 1.95)
            .on("mouseover", function() {
                tooltip.style("opacity", .9);
                tooltip.html("Click to only show unknown sexes");
            });
        
        labelStuff.select(".habitats_legend")
            .attr("x", innerWidth / 1.67)
            .on("mouseover", function() {
                tooltip.style("opacity", .9);
                tooltip.html("Click to show habitat colours on the left");
            });

        labelStuff.selectAll(".legend")
            .on("mousemove", function(event) {
                const containerRect = container.node().getBoundingClientRect();
                tooltip.style("left", (event.pageX - containerRect.left + 10) + "px")
                    .style("top", (event.pageY - containerRect.top + 10) + "px");
                const tooltipWidth = tooltip.node().getBoundingClientRect().width;
                let leftPos = event.pageX - containerRect.left + 10;
                if (leftPos + tooltipWidth > containerRect.width) {
                    leftPos = event.pageX - containerRect.left - tooltipWidth - 10;
                }
                tooltip.style("left", leftPos + "px")
                    .style("top", (event.pageY - containerRect.top + 10) + "px");
            })
            .on("mouseout", function() {
                tooltip.style("opacity", 0);
            });
        
        labelStuff.select()
            
                    
        update_legend_title(legendTitle, innerWidth, newHeight - margin.bottom - margin.top, -30, 4, "Weight-Length Correlation");

        const {type, a, b, c} = quadratic_regression(filteredData);
        let lineData;
        if(type === "Quadratic") {
            lineData = filteredData.map(({ lengthM }) => ({
                lengthM: lengthM,
                weight: a + b * lengthM + c * Math.pow(lengthM, 2),
            }))
            .sort((a, b) => a.lengthM - b.lengthM);
            regressionLine = true;
        } else if (type === "Linear") {
            lineData = filteredData.map(({ lengthM }) => ({
                lengthM,
                weight: a  + b * lengthM,
            }))
            .sort((a, b) => a.lengthM - b.lengthM);
            regressionLine = true;
        } else {
            regressionLine = false;
        }
        
        svg.attr("width", newWidth).attr("height", newHeight);

        x = d3.scaleLinear()
            .domain(d3.extent(filteredData, d => d.lengthM))
            .range([0, innerWidth]);
        y = d3.scaleLinear()
            .domain([0, d3.max(filteredData, d => d.weight * 1.1)])
            .range([innerHeight, 0]);

        svg.selectAll(".dot").remove();

        const brush = d3.brush()
            .extent([[0, 5], [innerWidth, innerHeight - 1]])
            .on("end", ({selection}) => {
                if(!selection) return;
                const [[x0, y0], [x1, y1]] = selection;
                brushedDots = filteredData.filter(d => {
                    const cx = x(d.lengthM);
                    const cy = y(d.weight);
                    return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
                });
                if (brushedDots.length > 0) {
                    const brushedLengths = brushedDots.map(d => d.lengthM);
                    const brushedWeights = brushedDots.map(d => d.weight);

                    const minLength = d3.min(brushedLengths);
                    const maxLength = d3.max(brushedLengths);

                    const minWeight = d3.min(brushedWeights);
                    const maxWeight = d3.max(brushedWeights);
                    
                    selectedSizeRange = [minLength, maxLength];
                    selectedWeightRange = [minWeight, maxWeight];

                } else {
                    selectedSizeRange = [];
                    selectedWeightRange = [];
                }
                console.log(selectedSizeRange, selectedWeightRange);
                console.log(brushedDots);
                window.dispatchEvent(new CustomEvent("sizeChangedBrushed", {
                    detail: [selectedSizeRange, selectedWeightRange]
                }));
                updateVis();
            });

        svg.select(".brush").remove();
        svg.append("g")
            .attr("class", "brush")
            .call(brush);

        svg.select(".x.axis")
            .attr("transform", `translate(0,${innerHeight})`)
            .transition()
            .duration(duration)
            .call(d3.axisBottom(x));
        
        svg.selectAll(".y.axis")
            .transition()
            .duration(duration)
            .call(d3.axisLeft(y));

        svg.selectAll(".regression-line").remove(); 
        if(regressionLine) {
            const line = d3.line()
                .x(d => x(d.lengthM))
                .y(d => y(d.weight));
            const rSquared = calculate_R_squared(filteredData, [a, b, c], type);
            let sign = [];
            sign[0] = Math.sign(b) === -1 ? " - " : " + ";
            sign[1] = Math.sign(c) === -1 ? " - " : " + ";
                
            svg.append("path")
                .datum(lineData)
                .attr("class", "regression-line")
                .attr("fill", "none")
                .attr("stroke", "red")
                .attr("stroke-width", stroke_width)
                .attr("d", line)
                .on("mouseover", function() {
                    tooltip.style("opacity", .9);
                    tooltip.html(`R²: ${rSquared.toFixed(4)}</br>Regression: ${type}</br>Form: y = ${a.toFixed(2)}${sign[0]}${Math.abs(b.toFixed(2))}x${sign[1]}${Math.abs(c.toFixed(2))}x²`);
                    d3.select(this).attr("stroke-width", stroke_width * 2);
                })
                .on("mousemove", function(event) {
                    const containerRect = container.node().getBoundingClientRect();
                    tooltip.style("left", (event.pageX - containerRect.left + 10) + "px")
                        .style("top", (event.pageY - containerRect.top + 10) + "px");
                    const tooltipWidth = tooltip.node().getBoundingClientRect().width;
                    let leftPos = event.pageX - containerRect.left + 10;
                    if (leftPos + tooltipWidth > containerRect.width) {
                        leftPos = event.pageX - containerRect.left - tooltipWidth - 10;
                    }
                    tooltip.style("left", leftPos + "px")
                        .style("top", (event.pageY - containerRect.top + 10) + "px");
                })
                .on("mouseout", function() {
                    tooltip.style("opacity", 0);
                    d3.select(this).attr("stroke-width", stroke_width);
                });
        }

        const dotMap = new Map();
        filteredData.forEach(d => {
            const key = `${x(d.lengthM)},${y(d.weight)}`;
            if (!dotMap.has(key))
                dotMap.set(key, []);
            dotMap.get(key).push(d);
        });

        svg.selectAll(".dot")
        .data(filteredData)
        .join(
            enter => enter.append("path")
            .attr("class", "dot")
            .attr("r", symbol_size)
            .style("fill", d => colorList[d[selectedColourVar]])
            .style("opacity", dot_opacity)
            .style("cursor", "pointer")
            .on("mouseover", function(event, d) {
                tooltip.style("opacity", .9);
                d3.select(this)
                    .attr("r", symbol_size * 1.5)
                    .style("opacity", 1);
            })
            .on("mousemove", function(event, d) {
                tooltip.transition().duration(duration / 5).style("opacity", .9);
                const key = `${x(d.lengthM)},${y(d.weight)}`;
                const overlappingDots = dotMap.get(key);

                const containerRect = container.node().getBoundingClientRect();
                
                let tooltip_text;
                if (overlappingDots.length > 1) {
                    tooltip_text = `${overlappingDots.length} Species:<br/><br/>`;
                    overlappingDots.forEach(dot => {
                        let info = "";
                        if(selectedColourVar == "habitat") {
                            info = `Species: ${dot.commonname}<br/>
                                Age: ${dot.age}<br/>
                                Sex: ${sex_symbols[dot.sex]} ${dot.sex}<br/>
                                Habitat: <span style="display: inline-block; width: 10px; height: 10px; background-color: ${colorList[dot[selectedColourVar]]}; margin-right: 5px;"></span>${dot[selectedColourVar]}<br/>
                                Status: ${d.conservation}<br/>
                                ${dot.lengthM}m, ${dot.weight}kg<br/><br/>`;
                        } else if (selectedColourVar == "age") {
                            info = `Species: ${dot.commonname}<br/>
                                Age: <span style="display: inline-block; width: 10px; height: 10px; background-color: ${colorList[dot[selectedColourVar]]}; margin-right: 5px;"></span>${dot[selectedColourVar]}<br/>
                                Sex: ${sex_symbols[dot.sex]} ${dot.sex}<br/>
                                Habitat: ${dot.habitat}<br/>
                                Status: ${dot.conservation}<br/>
                                ${dot.lengthM}m, ${dot.weight}kg<br/><br/>`;
                        } else {
                            info = `Species: ${dot.commonname}<br/>
                                Age: ${dot.age}<br/>
                                Sex: ${sex_symbols[dot.sex]} ${dot.sex}<br/>
                                Habitat: ${dot.habitat}<br/>
                                Status: <span style="display: inline-block; width: 10px; height: 10px; background-color: ${colorList[dot[selectedColourVar]]}; margin-right: 5px;"></span>${dot[selectedColourVar]}<br/>
                                ${dot.lengthM}m, ${dot.weight}kg<br/><br/>`;
                        }
                        tooltip_text += info;
                    });
                } else {
                    if(selectedColourVar == "habitat") {
                        tooltip_text = `Species: ${d.commonname}<br/>
                            Age: ${d.age}<br/>
                            Sex: ${sex_symbols[d.sex]} ${d.sex}<br/>
                            Habitat: <span style="display: inline-block; width: 10px; height: 10px; background-color: ${colorList[d[selectedColourVar]]}; margin-right: 5px;"></span>${d[selectedColourVar]}<br/>
                            Status: ${d.conservation}<br/>
                            ${d.lengthM}m, ${d.weight}kg<br/>`;
                    } else if (selectedColourVar == "age") {
                        tooltip_text = `Species: ${d.commonname}<br/>
                            Age: <span style="display: inline-block; width: 10px; height: 10px; background-color: ${colorList[d[selectedColourVar]]}; margin-right: 5px;"></span>${d[selectedColourVar]}<br/>
                            Sex: ${sex_symbols[d.sex]} ${d.sex}<br/>
                            Habitat: ${d.habitat}<br/>
                            Status: ${d.conservation}<br/>
                            ${d.lengthM}m, ${d.weight}kg<br/>`;
                    } else {
                        tooltip_text = `Species: ${d.commonname}<br/>
                            Age: ${d.age}<br/>
                            Sex: ${sex_symbols[d.sex]} ${d.sex}<br/>
                            Habitat: ${d.habitat}<br/>
                            Status: <span style="display: inline-block; width: 10px; height: 10px; background-color: ${colorList[d[selectedColourVar]]}; margin-right: 5px;"></span>${d[selectedColourVar]}<br/>
                            ${d.lengthM}m, ${d.weight}kg<br/>`;
                    }
                }
                
                tooltip.html(tooltip_text);
                const tooltipRect = tooltip.node().getBoundingClientRect();
                const tooltipHeight = tooltipRect.height;
                const tooltipWidth = tooltipRect.width;
                let leftPos = event.pageX - containerRect.left + 10;
                if (leftPos + tooltipWidth > containerRect.width) {
                    leftPos = event.pageX - containerRect.left - tooltipWidth - 10;
                }

                const mouseY = event.pageY - containerRect.top;
                const spaceBelow = containerRect.height - mouseY;
                const flipTooltip = spaceBelow < tooltipHeight;

                let topPos = flipTooltip ? mouseY - tooltipHeight : mouseY + 20;

                tooltip.style("left", leftPos + "px")
                    .style("top", topPos + "px");
            })
            .on("mouseout", function(d) {
                d3.select(this)
                    .attr("r", symbol_size)
                    .style("opacity", dot_opacity);
                tooltip.transition()
                    .duration(duration / 2)
                    .style("opacity", 0);
            })
            .on("click", function(d) {
                const clickedSpecies = d.target.__data__.commonname;
                tooltip.transition()
                    .duration(duration / 2)
                    .style("opacity", 0);
                window.dispatchEvent(new CustomEvent("filterByValue", {
                    detail: { value: clickedSpecies, attribute: "commonname"}
                }));
            }),
        update => update,
        exit => exit.remove()
        )
        .transition()
        .duration(duration)
        .attr("d", d => {
            const shape = sex_shapes[d.sex];
            if (shape === "circle") {
                return d3.symbol().type(d3.symbolCircle).size(symbol_size * 10)();
            } else if (shape === "triangle") {
                return d3.symbol().type(d3.symbolTriangle).size(symbol_size * 10)();
            } else if (shape === "cross") {
                return d3.symbol().type(d3.symbolCross).size(symbol_size * 10)();
            }
        })
        .attr("transform", d => `translate(${x(d.lengthM || 0)},${y(d.weight)})`);
    }

    radioContainer.selectAll(".colourOptions")
        .data(colourOptions)
        .join("div")
        .attr("class", "colourOptions")
        .each(function(option, i) {
            const div = d3.select(this);
            div.append("input")
                .attr("type", "radio")
                .attr("id", `colour_radio_${i}`)
                .attr("name", "colourGroup")
                .attr("value", option.value)
                .style("cursor", "pointer")
                .property("checked", option.value === selectedColourVar)
                .on("change", function() {
                    selectedColourVar = this.value;
                    if(selectedColourVar == "age") colorList = age_colours;
                    else if(selectedColourVar == "conservation") colorList = status_colours;
                    else colorList = habitat_colours;
                    window.dispatchEvent(new CustomEvent("filterByValueScatter", { detail: selectedColourVar }));
                    updateVis();
                });
            div.append("label")
                .attr("for", `colour_radio_${i}`)
                .style("cursor", "pointer")
                .text(option.label)
                .on("mouseover", function(event) {
                    tooltip.style("opacity", 2).style("s");
                })
                .on("mousemove", function(event) {
                    const containerRect = container.node().getBoundingClientRect();
                    tooltip.html("Colour legends can be toggled on the chart to the left")
                        .style("left", (event.pageX - containerRect.left + 10) + "px")
                        .style("top", (event.pageY - containerRect.top + 10) + "px");
                })
                .on("mouseout", function() {
                    tooltip.transition().duration(duration / 5).style("opacity", 0);
                });
        });

    window.addEventListener("dateChanged", function(event) {
        selectedDate = event.detail;

        updateVis();
    });

    window.addEventListener("dateChangedBrushed", function(event) {
        selectedDateRange = event.detail[0];

        updateVis();
    });

    window.addEventListener("filterByValue", function(event) {
        const { value, attribute } = event.detail;
        selectedVariable = attribute;
        clevFilter = value;

        updateVis();
    });

    window.addEventListener("scatterChange", function(event) {
        if(event.detail == "age" || event.detail == "conservation" || event.detail == "habitat") {
            selectedColourVar = event.detail;

            if(selectedColourVar == "age") {
                colorList = age_colours;
            } else if (selectedColourVar == "conservation") {
                colorList = status_colours;
            } else {
                colorList = habitat_colours;
            }

            radioContainer.selectAll(".colourOptions input[type='radio']")
                .property("checked", function(d) {
                    return d.value === selectedColourVar;
                });

            updateVis();
        }
    });

    window.addEventListener("countryChanged", (event) => {
        selectedCountries = event.detail;

        updateVis();
    });

    window.addEventListener("filterByColour", function(event) {
        selectedCountries = event.detail;

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
        updateVis();
    });
    whyWouldYouDoThisToMe.observe(container.node());

    updateVis(data);
});
