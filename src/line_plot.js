import {dataCSV, shared_color, duration, create_svg, create_tooltip, find_closest_date, filter_by_date, filter_by_date_range, get_date_observations_by_granularity} from "./stuff.js";

const container = d3.select("#line")
const margin = { top: 60, right: 20, bottom: 50, left: 40 };
const padding = 20;
const svg = create_svg(container, margin);

//defaults
let selectedCountry = "global";
let countryFilter;
let selectedGranularity = "month";
let dateObservations;

var width = container.node().getBoundingClientRect().width;
var height = container.node().getBoundingClientRect().height;

const radioContainer = container
    .append("div")
    .attr("class", "radioContainer");

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
    countryFilter = selectedCountry === "global" ? null : d => d.country === selectedCountry;
    let filteredData = countryFilter ? data.filter(countryFilter) : data;
    dateObservations = get_date_observations_by_granularity(filteredData, selectedGranularity);

    svg.append("g")
        .attr("class","x axis")
        .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)

    svg.append("g")
            .attr("class","y axis")
            .attr("transform", `translate(0,0)`)

    let x = d3.scaleUtc(d3.extent(dateObservations, d => d.date), [0, width - margin.left - margin.right]);
    let y = d3.scaleLinear([0, d3.max(dateObservations, d => d.observations)], [height - margin.top - margin.bottom, 0]);

    function brushed(event) {
        if(!event.selection) return;
        const [x0, x1] = event.selection;
        
        countryFilter = selectedCountry === "global" ? null : d => d.country === selectedCountry;
        let filteredData = countryFilter ? data.filter(countryFilter) : data;
        filteredData = filter_by_date_range(filteredData, find_closest_date(dateObservations, x, x0), find_closest_date(dateObservations, x, x1));

        window.dispatchEvent(new CustomEvent("dateChanged", { detail: filteredData }));
        dateObservations = get_date_observations_by_granularity(filteredData, selectedGranularity);
        updateVis(dateObservations);
    }
    
    function updateXLabel() {
        svg.selectAll(".x.label")
            .data(["Observations"])
            .join("text")
            .attr("class", "x label")
            .attr("text-anchor", "middle")
            .attr("x", 0)
            .attr("y", innerHeight / 2.35)
            .text(d => d);
    }

    function updateVis(dateObservations) {
        height = container.node().getBoundingClientRect().height;
        width = container.node().getBoundingClientRect().width;

        x = d3.scaleUtc(d3.extent(dateObservations, d => d.date), [0, width - margin.left - margin.right]);
        y = d3.scaleLinear([0, d3.max(dateObservations, d => d.observations)], [height - margin.top - margin.bottom, 0]);
        
        const brush = d3.brushX()
            .extent([[0, y(0) - 20], [width - margin.left - margin.right, y(0) + 20]])
            .on("end", brushed);
        svg.select(".brush").remove();
        svg.append("g")
            .attr("class", "brush")
            .call(brush);

        const line = d3.line()
            .x(d => x(d.date))
            .y(d => y(d.observations));

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

        svg.selectAll("path")
            .data([dateObservations], d => d)
            .join(
                enter => enter.append("path")
                    .attr("fill", "none")
                    .attr("stroke", shared_color)
                    .attr("stroke-width", 1)
                    .attr("d", d3.line()
                        .x(d => x(d.date))
                        .y(() => y(0))),
                update => update,
                exit => exit.remove()
            )
            .transition().duration(duration)
                .attr("d", line(dateObservations));
            
        svg.selectAll(".dot")
            .data(dateObservations, d => d.date)
            .join(
                enter => enter.append("circle")
                .attr("class", "dot")
                .attr("cx", d => x(d.date))
                .attr("cy", d => y(0))
                .attr("r", 3)
                .attr("fill", shared_color)
                .on("mouseover", function(event, d) {
                    tooltip.style("opacity", .9);
                })
                .on("mousemove", function(event, d) {
                    tooltip.transition()
                        .duration(duration / 5)
                        .style("opacity", .9);
                    const formatDate = selectedGranularity === 'year' 
                        ? d3.timeFormat("%Y")
                        : selectedGranularity === 'month'
                        ? d3.timeFormat("%b %Y")
                        : d3.timeFormat("%d %b %Y");
                    const containerRect = container.node().getBoundingClientRect();
                    tooltip.html(`Date: ${formatDate(d.date)}<br/>Observations: ${d.observations}`)
                        .style("left", (event.pageX - containerRect.left - 135) + "px")
                        .style("top", (event.pageY - containerRect.top + 13) + "px");
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
                        countryFilter = selectedCountry === "global" ? null : d => d.country === selectedCountry;
                        let filteredData = countryFilter ? data.filter(countryFilter) : data;
                        filteredData = filter_by_date(filteredData, null, selectedDate.date.getFullYear());
                        window.dispatchEvent(new CustomEvent("dateChanged", { detail: filteredData }));
                        dateObservations = get_date_observations_by_granularity(filteredData, selectedGranularity);
                    }
                    else if(selectedGranularity === "month") {
                        const selectedDate = d;
                        selectedGranularity = "day";
                        radioContainer.selectAll(".radioOption input[value='day']")
                            .property("checked", true);
                        countryFilter = selectedCountry === "global" ? null : d => d.country === selectedCountry;
                        let filteredData = countryFilter ? data.filter(countryFilter) : data;
                        filteredData = filter_by_date(filteredData, selectedDate.date.getMonth(), selectedDate.date.getFullYear());
                        window.dispatchEvent(new CustomEvent("dateChanged", { detail: filteredData }));
                        dateObservations = get_date_observations_by_granularity(filteredData, selectedGranularity);
                    }
                    updateVis(dateObservations);
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
                    countryFilter = selectedCountry === "global" ? null : d => d.country === selectedCountry;
                    let filteredData = countryFilter ? data.filter(countryFilter) : data;
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

            countryFilter = selectedCountry === "global" ? null : d => d.country === selectedCountry;
            let filteredData = countryFilter ? data.filter(countryFilter) : data;

            dateObservations = get_date_observations_by_granularity(filteredData, selectedGranularity);
            updateVis(dateObservations);
        }
    });

    window.addEventListener("countryChanged", (event) => {
        selectedCountry = event.detail;
        countryFilter = selectedCountry === "global" ? null : d => d.country === selectedCountry;
        let filteredData = countryFilter ? data.filter(countryFilter) : data;

        dateObservations = get_date_observations_by_granularity(filteredData, selectedGranularity);
        updateVis(dateObservations);
    });
    
    const whyWouldYouDoThisToMe = new ResizeObserver(() => {
        updateVis(dateObservations);
        updateXLabel();
    });
    whyWouldYouDoThisToMe.observe(container.node());

    updateXLabel();
    updateVis(dateObservations);

});