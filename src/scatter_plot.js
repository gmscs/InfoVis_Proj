import {dataCSV, shared_color, symbol_size, duration, create_svg, create_tooltip, filter_by_countries, find_closest_length, filter_by_length_range, stroke_width, dot_opacity, update_legend_title, calculate_R_squared, quadratic_regression } from "./stuff.js";

const container = d3.select("#scatter");
const margin = { top: 20, right: 100, bottom: 50, left: 40 };
const svg = create_svg(container, margin);

var width = container.node().getBoundingClientRect().width;
var height = container.node().getBoundingClientRect().height;

const legendTitle = svg.append("text")
    .attr("class", "legend-title");

let selectedCountries = [];
var filteredData;
var regressionLine = true;

svg.append("rect")
    .attr("id", "clearBox")
    .attr("class", "background")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "transparent")
    .style("pointer-events", "all")
    .lower();

dataCSV.then(function (data) {
    const tooltip = create_tooltip("#scatter");
    filteredData = filter_by_countries(data, selectedCountries);
    
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
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
                .attr("x", -20)
                .attr("y", 30)
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
    
    function brushed(event) {
        if(!event.selection) return;
        const [x0, x1] = event.selection;

        filteredData = filter_by_countries(data, selectedCountries);
        filteredData = filter_by_length_range(filteredData, find_closest_length(data, x, x0), find_closest_length(data, x, x1));
        
        window.dispatchEvent(new CustomEvent("sizeChanged", { detail: filteredData }));
        updateVis(filteredData);
    }
    
    function updateVis(filteredData) {
        const newWidth = container.node().getBoundingClientRect().width;
        const newHeight = container.node().getBoundingClientRect().height;
        const innerWidth = newWidth - margin.left - margin.right;
        const innerHeight = newHeight - margin.top - margin.bottom;

        update_legend_title(legendTitle, innerWidth, innerHeight, -90, 4, "Weight-Length Correlation");

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

        const brush = d3.brushX()
            .extent([[0, 0 ], [innerWidth, innerHeight]])
            .on("end", brushed);
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
                    // tooltip.html(tooltip_text);
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
            enter => enter.append("circle")
            .attr("class", "dot")
            .attr("r", symbol_size)
            .style("fill", shared_color)
            .style("opacity", dot_opacity)
            .style("cursor", "pointer")
            .on("mouseover", function(event, d) {
                tooltip.style("opacity", .9);
                d3.select(this)
                    .attr("r", symbol_size * 2)
                    .style("opacity", 1);
            })
            .on("mousemove", function(event, d) {
                tooltip.transition().duration(duration / 5).style("opacity", .9);
                const key = `${x(d.lengthM)},${y(d.weight)}`;
                const overlappingDots = dotMap.get(key);

                const containerRect = container.node().getBoundingClientRect();
                
                let tooltip_text;
                if (overlappingDots.length > 1) {
                    tooltip_text = `${overlappingDots.length} Species:<br/>`;
                    overlappingDots.forEach(dot => {
                    tooltip_text += `Species: ${dot.commonname}<br/>${dot.lengthM}m, ${dot.weight}kg<br/>`;
                    });
                } else {
                    tooltip_text = `Species: ${d.commonname}<br/>${d.lengthM}m, ${d.weight}kg<br/>`;
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
        .transition().duration(duration)
            .attr("cx", d => x(d.lengthM || 0))
            .attr("cy", d => y(d.weight));
    }

    window.addEventListener("click", function(event) {
        if(event.target.id==="clearBox"){
            window.dispatchEvent(new CustomEvent("dateChanged", { detail: data }));

            filteredData = filter_by_countries(data, selectedCountries);
            updateVis(filteredData);
        }
    });

    window.addEventListener("dateChanged", function(event) {
        let filteredData = event.detail;
        updateVis(filteredData);
    });

    window.addEventListener("filterByValue", function(event) {
        const { value, attribute } = event.detail;
        filteredData = data.filter(row => row[attribute] === value);

        updateVis(filteredData);
    });

    window.addEventListener("countryChanged", (event) => {
        selectedCountries = event.detail;
        filteredData = filter_by_countries(data, selectedCountries);

        updateVis(filteredData);
    });

    window.addEventListener("lineCountrySelect", (event) => {
        selectedCountries = event.detail;
        filteredData = filter_by_countries(data, selectedCountries);

        updateVis(filteredData);
    });

    window.addEventListener("filterByColour", function(event) {
        let filteredData = event.detail;
        updateVis(filteredData);
    });

    window.addEventListener("filterReset", function(event) {
        filteredData = filter_by_countries(data, selectedCountries);
        updateVis(filteredData);
    });

    const whyWouldYouDoThisToMe = new ResizeObserver(() => {
        updateVis(data);
    });
    whyWouldYouDoThisToMe.observe(container.node());

    updateVis(data);
});