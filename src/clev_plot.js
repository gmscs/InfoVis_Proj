import {dataCSV, shared_color, symbol_size, duration, get_visible_categories, create_svg, create_tooltip, get_counts, dot_opacity, filter_by_countries, update_legend_title} from "./stuff.js";

const container = d3.select("#clev");
const margin = { top: 20, right: 20, bottom: 60, left: 210 };
const padding = 20;
const svg = create_svg(container, margin);

const labelStuff = svg.append("g")
    .attr("class", "labelStuff");

let selectedVariable = "commonname";
let selectedDot = null;
let selectedLabel = "Species";

var width = container.node().getBoundingClientRect().width;
var height = container.node().getBoundingClientRect().height;
var filterVal = null;

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

svg.append("rect")
    .attr("class", "background")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "transparent")
    .style("pointer-events", "all")
    .lower();

dataCSV.then(function (data) {
    let counts = get_counts(data, selectedVariable);

    const tooltip = create_tooltip("#clev");

    var mouseover = function (d) {
        tooltip.style("opacity", 2).style("s");
        d3.select(this).attr("r", symbol_size * 2);
        d3.select(this).style("opacity", 1);
    }

    var mouseleave = function (d) {
        tooltip.transition().duration(duration / 5).style("opacity", 0);
        if(selectedDot != d.target.__data__) {
            d3.select(this).attr("r", symbol_size);
            d3.select(this).style("opacity", dot_opacity);
        } else {
            d3.select(this).attr("r", symbol_size * 2);
            d3.select(this).style("opacity", 1);
        }
    }

    var mousemove = (event, d) => {
        const key = typeof d === "string" ? d : d[selectedVariable];
        const containerRect = container.node().getBoundingClientRect();
        tooltip.html("Observations: " + counts.get(key))
            .style("left", (event.pageX - containerRect.left + 10) + "px")
            .style("top", (event.pageY - containerRect.top + 10) + "px");
    }

    labelStuff.append("text")
        .attr("class", "filterLabel")
        .attr("x", 20)
        .attr("y", height + margin.bottom)
        .style("z-index", 100)
        .text("Active filter: None")

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

    function updateVis(counts) {
        const maxCount = d3.max(Array.from(counts.values()));

        if(filterVal != null) {
            labelStuff.select(".filterLabel").text("Active filter: " + filterVal);
        } else {
            labelStuff.select(".filterLabel").text("Active filter: None");
        }

        height = container.node().getBoundingClientRect().height;
        width = container.node().getBoundingClientRect().width;

        const innerWidth = width - margin.left - margin.right - padding;
        const innerHeight = height - margin.top - margin.bottom;

        labelStuff.select(".filterLabel")
            .attr("x", -200)
            .attr("y", innerHeight + margin.bottom / 1.5);

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
                .attr("r", d => (d == filterVal) ? symbol_size * 2 : symbol_size)
                .style("fill", shared_color)
                .style("opacity", d => (d == filterVal) ? 1 : dot_opacity)
                .style("cursor", "pointer")
                .on("mouseover", mouseover)
                .on("mousemove", mousemove)
                .on("mouseleave", mouseleave)
                .on("click", function(event, d) {
                    let filterEvent;
                    const prevDot = selectedDot;
                    selectedDot = d;
                    if (selectedDot != null && prevDot == selectedDot) {
                        svg.selectAll(".dot").style("opacity", dot_opacity);
                        selectedDot = null;
                        filterVal = null;
                        counts = get_counts(data, selectedVariable, filterVal);
                        filterEvent = new CustomEvent("filterReset");

                    }
                    else if(selectedDot != null) {
                        svg.selectAll(".dot")
                            .style("opacity", d => d === selectedDot ? 1 : dot_opacity);
                        filterVal = d;
                        counts = get_counts(data, selectedVariable, filterVal);
                        filterEvent = new CustomEvent("filterByValue", {
                            detail: { value: filterVal, attribute: selectedVariable}
                        });
                    }
                    window.dispatchEvent(filterEvent);
                    updateVis(counts);
                }),
              update => update,
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
                counts = get_counts(data, selectedVariable, filterVal);
                updateVis(counts);
            });
            div.append("label")
            .attr("for", `radio_${i}`)
            .style("cursor", "pointer")
            .text(d.label);
    });

    window.addEventListener("click", function(event) {
        if(event.target.nodeName==="rect"){
            filterVal = null;
            counts = get_counts(data, selectedVariable, filterVal);
            labelStuff.select(".filterLabel").text("Active filter: None");
            selectedDot = null;
            svg.selectAll(".dot")
                .style("opacity", 1);
            window.dispatchEvent(new CustomEvent("countryChanged", { detail: [] }));
            svg.selectAll(".dot").style("opacity", dot_opacity);
            svg.selectAll(".dot").attr("r", symbol_size);
            updateVis(counts);
        }
    });

    window.addEventListener("dateChanged", function(event) {
        let filteredData = event.detail;

        counts = get_counts(filteredData, selectedVariable, filterVal);
        updateVis(counts);
    });

    window.addEventListener("sizeChanged", function(event) {
        let filteredData = event.detail;

        counts = get_counts(filteredData, selectedVariable, filterVal);
        updateVis(counts);
    });

    window.addEventListener("countryChanged", (event) => {
        let selectedCountries = event.detail;
        let filteredData = filter_by_countries(data, selectedCountries);
        counts = get_counts(filteredData, selectedVariable, filterVal);
        updateVis(counts);
    });
    
    window.addEventListener("lineCountrySelect", (event) => {
        let selectedCountries = event.detail;
        let filteredData = filter_by_countries(data, selectedCountries);
        counts = get_counts(filteredData, selectedVariable, filterVal);
        updateVis(counts);
    });

    window.addEventListener("filterByColour", function(event) {
        let filteredData = event.detail;

        counts = get_counts(filteredData, selectedVariable, filterVal);
        updateVis(counts);
    });

    window.addEventListener("filterByValueScatter", function(event) {
        const { value, attribute } = event.detail;
        filterVal = value;
        selectedVariable = attribute;
        
        counts = get_counts(data, selectedVariable, filterVal);
        updateVis(counts);
    });

    const whyWouldYouDoThisToMe = new ResizeObserver(() => {
        counts = get_counts(data, selectedVariable, filterVal);
        updateVis(counts);
    });
    whyWouldYouDoThisToMe.observe(container.node());

    updateVis(counts);
});