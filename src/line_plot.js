import {dataCSV, shared_color, duration, create_svg, create_tooltip, filter_by_countries, find_closest_date, filter_by_date, filter_by_date_range, get_date_observations_by_granularity, get_text_width} from "./stuff.js";

const container = d3.select("#line")
const margin = { top: 60, right: 20, bottom: 50, left: 40 };
const padding = 20;
const svg = create_svg(container, margin);

//defaults
let selectedCountries = [];
let countryFilter;
let selectedGranularity = "month";
let dateObservations;
var filteredData;

var width = container.node().getBoundingClientRect().width;
var height = container.node().getBoundingClientRect().height;

const radioContainer = container
    .append("div")
    .attr("class", "radioContainer");

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

dataCSV.then(function (data) {
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
                .attr("x", - margin.left)
                .attr("y", -20)
                .attr("fill", "currentColor")
                .attr("text-anchor", "start")
                .text("Observations"));

    
    function brushed(event) {
        if(!event.selection) return;
        const [x0, x1] = event.selection;
        
        filteredData = filter_by_countries(data, selectedCountries);
        filteredData = filter_by_date_range(filteredData, find_closest_date(dateObservations, x, x0), find_closest_date(dateObservations, x, x1));

        window.dispatchEvent(new CustomEvent("dateChanged", { detail: filteredData }));
        dateObservations = get_date_observations_by_granularity(filteredData, selectedGranularity);
        updateVis(dateObservations);
    }

    checkboxContainer.append("input")
        .attr("type", "checkbox")
        .attr("id", "globalDisplay")
        .property("checked", true)
        .on("change", function() {
            updateVis(dateObservations);
        });

    checkboxContainer.append("label")
        .attr("for", "globalDisplay")
        .text("Merge data");

    function updateVis(dateObservations) {
        height = container.node().getBoundingClientRect().height;
        width = container.node().getBoundingClientRect().width;

        svg.selectAll(".lines").remove();
        svg.selectAll(".dot").remove();

        const globalDisplay = d3.select("#globalDisplay").property("checked");
        let filteredDateObservations = globalDisplay
            ? dateObservations.filter(d => d.country === "global")
            : dateObservations.filter(d => d.country !== "global");
        
        x = d3.scaleUtc(d3.extent(filteredDateObservations, d => d.date), [0, width - margin.left - margin.right]);
        y = d3.scaleLinear([0, d3.max(filteredDateObservations, d => d.observations)], [height - margin.top - margin.bottom, 0]);

        const points = filteredDateObservations.map((d) => [x(d.date), y(d.observations), d.country]);
        const groups = d3.rollup(points, v => Object.assign(v, {z : v[0][2]}), d => d[2]);
        
        const brush = d3.brushX()
            .extent([[0, y(0) - 20], [width - margin.left - margin.right, y(0) + 20]])
            .on("end", brushed);
        svg.select(".brush").remove();
        svg.append("g")
            .attr("class", "brush")
            .call(brush);

        const colorScale = d3.scaleOrdinal()
            .domain(Array.from(groups.keys()))
            .range(d3.schemeCategory10);

        const line = d3.line();

        svg.append("g")
            .attr("class", "lines")
            .attr("fill", "none")
            .attr("stroke-width", 1.5)
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .selectAll("path")
            .data(groups.values())
            .join("path")
                .style("mix-blend-mode", "multiply")
                .attr("stroke", d => colorScale(d.z))
                .on("click", function(event, d) {
                    const clickedCountry = d.z;
                    if(clickedCountry != "global") {
                        selectedCountries = [clickedCountry];
                        window.dispatchEvent(new CustomEvent("lineCountrySelect", { detail: selectedCountries }));
                        filteredData = filter_by_countries(data, selectedCountries);
                        dateObservations = get_date_observations_by_granularity(filteredData, selectedGranularity);
                        updateVis(dateObservations);
                    }
                })
                .on("mouseover", function(event, d) {
                    d3.select(this)
                        .attr("stroke-width", 4);
                })
                .on("mouseout", function() {
                    d3.select(this)
                        .attr("stroke-width", 1.5);
                })
                .attr("d", d => {
                const points = d.map(point => [point[0], y(0)]);
                return line(points);
                })
                .transition()
                .duration(duration)
                .attr("d", line);
            
         svg.select(".x.axis")
            .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
            .transition()
            .duration(duration)
            .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0));

        svg.selectAll(".y.axis")
            .attr("transform", `translate(0,0)`)
            .transition()
            .duration(duration)
            .call(d3.axisLeft(y).ticks(height / 40).tickFormat(d3.format("d")));

        const dotMap = new Map();
        filteredDateObservations.forEach(d => {
            const key = `${x(d.date)},${y(d.observations)}`;
            if (!dotMap.has(key))
                dotMap.set(key, []);
            dotMap.get(key).push(d);
        });

        svg.selectAll(".dot")
            .data(filteredDateObservations, d => d.date)
            .join(
                enter => enter.append("circle")
                .attr("class", "dot")
                .attr("cx", d => x(d.date))
                .attr("cy", d => y(0))
                .attr("r", 3)
                .attr("fill", d => colorScale(d.country))
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
                        tooltip_text = `${overlappingDots.length} Observations:<br/>`;
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
                    tooltip.transition()
                        .duration(duration / 2)
                        .style("opacity", 0);
                })
                .on("click", function(event, d) {
                    if(selectedGranularity === "year") {
                        const selectedDate = d;
                        selectedGranularity = "month";
                        radioContainer.selectAll(".radioOption input[value='month']")
                            .property("checked", true);
                        filteredData = filter_by_countries(data, selectedCountries);
                        filteredData = filter_by_date(filteredData, null, selectedDate.date.getFullYear());
                        window.dispatchEvent(new CustomEvent("dateChanged", { detail: filteredData }));
                        filteredDateObservations = get_date_observations_by_granularity(filteredData, selectedGranularity);
                    }
                    else if(selectedGranularity === "month") {
                        const selectedDate = d;
                        selectedGranularity = "day";
                        radioContainer.selectAll(".radioOption input[value='day']")
                            .property("checked", true);
                        filteredData = filter_by_countries(data, selectedCountries);
                        filteredData = filter_by_date(filteredData, selectedDate.date.getMonth() + 1, selectedDate.date.getFullYear());
                        window.dispatchEvent(new CustomEvent("dateChanged", { detail: filteredData }));
                        filteredDateObservations = get_date_observations_by_granularity(filteredData, selectedGranularity);
                    }
                    tooltip.transition()
                        .duration(duration / 2)
                        .style("opacity", 0);
                    updateVis(filteredDateObservations);
                }),
                update => update,
                exit => exit.remove()
            )
            .transition().duration(duration)
                .attr("cx", d => x(d.date))
                .attr("cy", d => y(d.observations));
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
                .property("checked", option.value === selectedGranularity)
                .property("disabled", option.value === "day")
                .on("change", function() {
                    selectedGranularity = this.value;
                    // countryFilter = selectedCountry === "global" ? null : d => d.country === selectedCountry;
                    // let filteredData = countryFilter ? data.filter(countryFilter) : data;
                    dateObservations = get_date_observations_by_granularity(filteredData, this.value)
                    updateVis(dateObservations);
                });
            div.append("label")
                .attr("for", `granularity_radio_${i}`)
                .text(option.label);
        });
    
    window.addEventListener("click", function(event) {
        if(event.target.nodeName==="rect"){
            selectedGranularity = "month"
            radioContainer.selectAll(".radioOption input[value='month']")
                            .property("checked", true);
            radioContainer.property("value", selectedGranularity);
            radioContainer.dispatch("change");
            window.dispatchEvent(new CustomEvent("dateChanged", { detail: data }));

            filteredData = filter_by_countries(data, selectedCountries);
            dateObservations = get_date_observations_by_granularity(filteredData, selectedGranularity);
            updateVis(dateObservations);
        }
    });

    window.addEventListener("filterByValue", function(event) {
        const { value, attribute } = event.detail;
        filteredData = data.filter(row => row[attribute] === value);

        dateObservations = get_date_observations_by_granularity(filteredData, selectedGranularity);
        updateVis(dateObservations);
    });

    window.addEventListener("filterByColour", function(event) {
        filteredData = event.detail;

        dateObservations = get_date_observations_by_granularity(filteredData, selectedGranularity);
        updateVis(dateObservations);
    });

    window.addEventListener("countryChanged", (event) => {
        selectedCountries = event.detail;
        filteredData = filter_by_countries(data, selectedCountries);

        dateObservations = get_date_observations_by_granularity(filteredData, selectedGranularity);
        updateVis(dateObservations);
    });

    window.addEventListener("filterReset", (event) => {
        dateObservations = get_date_observations_by_granularity(data, selectedGranularity);
        updateVis(dateObservations);
    });
    
    const whyWouldYouDoThisToMe = new ResizeObserver(() => {
        updateVis(dateObservations);
        //updateXLabel();
    });
    whyWouldYouDoThisToMe.observe(container.node());

    //updateXLabel();
    updateVis(dateObservations);

});