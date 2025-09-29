import {dataCSV, shared_color, get_visible_categories, create_svg, create_tooltip, get_counts} from "./stuff.js";

const container = d3.select("#clev")
const margin = { top: 20, right: 20, bottom: 50, left: 200 };
const padding = 20;
const svg = create_svg(container, margin);

//defaults
let selectedCountry = "global"
let selectedVariable = "commonname"

var width = container.node().getBoundingClientRect().width;
var height = container.node().getBoundingClientRect().height;

const radioContainer = container.append("div").attr("class", "radioContainer");
const radioOptions = [
    { label:"Species", value:"commonname" },
    { label:"Age", value:"age" },
    { label:"Sex", value:"sex" },
    { label:"Habitat", value:"habitat" },
    { label:"Conservation Status", value:"conservation" }
];

dataCSV.then(function (data) {
    let counts = get_counts(data, selectedVariable)

    const tooltip = create_tooltip("#clev");

    var mouseover = function (d) {
        tooltip.style("opacity", 2).style("s");
    }

    var mouseleave = function (d) {
        tooltip.transition().duration(200).style("opacity", 0);
    }

    var mousemove = (event, d) => {
        const key = typeof d === "string" ? d : d[selectedVariable];
        const containerRect = container.node().getBoundingClientRect();
        tooltip.html(counts.get(key))
            .style("left", (event.pageX - containerRect.left + 10) + "px")
            .style("top", (event.pageY - containerRect.top + 10) + "px");
    }

    svg.append("g")
        .attr("class","x axis")
        .attr("transform", `translate(0,${height})`);

    svg.append("g")
        .attr("class","y axis");

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
        const countryFilter = selectedCountry === "global" ? null : d => d.country === selectedCountry;
        counts = get_counts(data, selectedVariable, countryFilter);
        const maxCount = d3.max(Array.from(counts.values()));

        height = container.node().getBoundingClientRect().height;
        width = container.node().getBoundingClientRect().width;

        const innerWidth = width - margin.left - margin.right - padding;
        const innerHeight = height - margin.top - margin.bottom;
        
        const x = d3.scaleLinear()
            .domain([0, maxCount])
            .range([0, innerWidth]);
        const visibleCategories = get_visible_categories(selectedVariable, counts);
        const y = d3.scaleBand()
            .range([0, innerHeight])
            .domain(visibleCategories).padding(1);

        svg.select(".x.axis")
            .attr("transform", `translate(0,${innerHeight})`)
            .transition()
            .duration(2000)
            .call(d3.axisBottom(x).ticks(Math.min(maxCount, 10)).tickFormat(d3.format("d")));

        svg.selectAll(".y.axis")
            .transition()
            .duration(1000)
            .call(d3.axisLeft(y));

        svg.selectAll(".stem")
            .data(visibleCategories, d => d)
            .join(
              enter => enter.append("line").attr("class","stem").attr("stroke","grey").attr("stroke-width","1px"),
              update => update,
              exit => exit.remove()
            )
            .transition().duration(1000)
            .attr("x1", 0)
            .attr("x2", d => x(counts.get(d) || 0))
            .attr("y1", d => y(d) + y.bandwidth()/2)
            .attr("y2", d => y(d) + y.bandwidth()/2);
          
        svg.selectAll(".dot")
            .data(visibleCategories, d => d)
            .join(
              enter => enter.append("circle")
                .attr("class","dot")
                .attr("r", 6)
                .style("fill", shared_color)
                .on("mouseover", mouseover)
                .on("mousemove", mousemove)
                .on("mouseleave", mouseleave)
                .on("click", function(event, d) {
                    const filterVal = d;
                    const filterEvent = new CustomEvent("filterByValue", {
                        detail: { value: filterVal, attribute: selectedVariable}
                    });
                    window.dispatchEvent(filterEvent);
                }),
              update => update,
              exit => exit.remove()
            )
            .transition().duration(1000)
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
            .property("checked", d.value === selectedVariable)
            .on("change", function() {
                selectedVariable = this.value;
                updateVis();
            });
            div.append("label")
            .attr("for", `radio_${i}`)
            .text(d.label);
    });

    window.addEventListener("countryChanged", (event) => {
        selectedCountry = event.detail;
        updateVis();
    });

    const whyWouldYouDoThisToMe = new ResizeObserver(() => {
        updateVis();
        updateXLabel();
    });
    whyWouldYouDoThisToMe.observe(container.node());

    updateVis();
    updateXLabel();
});