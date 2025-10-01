import {dataCSV, shared_color, get_visible_categories, create_svg, create_tooltip, get_counts, get_date_observations, get_date_observations_by_granularity} from "./stuff.js";

const container = d3.select("#line")
const margin = { top: 60, right: 20, bottom: 50, left: 50 };
const padding = 20;
const svg = create_svg(container, margin);

//defaults
let selectedCountry = "global";
let selectedVariable = "commonname";
let selectedGranularity = "month";

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


dataCSV.then(function (data) {
    const tooltip = create_tooltip("#line");

    svg.append("g")
        .attr("class","x axis")
        .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)

    svg.append("g")
            .attr("class","y axis")
            .attr("transform", `translate(0,0)`)
    
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
                .on("change", function() {
                    selectedGranularity = this.value;
                    updateVis();
                });
            div.append("label")
                .attr("for", `granularity_radio_${i}`)
                .text(option.label);
        });
    
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

    function updateVis() {
        height = container.node().getBoundingClientRect().height;
        width = container.node().getBoundingClientRect().width;

        const dateObservations = get_date_observations_by_granularity(data, selectedGranularity);

        let x = d3.scaleUtc(d3.extent(dateObservations, d => d.date), [0, width - margin.left - margin.right]);
        let y = d3.scaleLinear([0, d3.max(dateObservations, d => d.observations)], [height - margin.top - margin.bottom, 0]);

        const line = d3.line()
            .x(d => x(d.date))
            .y(d => y(d.observations));

        svg.select(".x.axis")
            .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
            .transition()
            .duration(1000)
            .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0));

        svg.selectAll(".y.axis")
            .attr("transform", `translate(0,0)`)
            .transition()
            .duration(1000)
            .call(d3.axisLeft(y).ticks(height / 40).tickFormat(d3.format("d")));

        svg.selectAll("path")
            .data([dateObservations], d => d)
            .join(
                enter => enter.append("path")
                    .attr("fill", "none")
                    .attr("stroke", shared_color)
                    .attr("stroke-width", 1.5)
                    .attr("d", d3.line()
                        .x(d => x(d.date))
                        .y(() => y(0))),
                update => update,
                exit => exit.remove()
            )
            .transition().duration(1000)
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
                        .duration(200)
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
                        .duration(500)
                        .style("opacity", 0);
                }),
                update => update,
                exit => exit.remove()
            )
            .transition().duration(1000)
                .attr("cx", d => x(d.date))
                .attr("cy", d => y(d.observations));
    }
    
    //window.updateVis = updateVis;
    const whyWouldYouDoThisToMe = new ResizeObserver(() => {
        updateVis();
        updateXLabel();
    });
    whyWouldYouDoThisToMe.observe(container.node());

    updateXLabel();
    updateVis();

});