import {shared_color, get_visible_categories, create_tooltip, get_counts} from "./aux.js";

const margin = { top: 30, right: 30, left: 250, bottom: 30 };
const width = 800 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;
const padding = 50;

//const dropdown = document.getElementById("col_select");
let selectedOptionText = document.querySelector(`input[name="att"]:checked + label`);

const svg = d3.select("#clev_dot")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom + padding)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

var dataCSV = d3.csv("../dataset/crocodile_dataset_processed.csv");

//defaults
let selectedVariable = "commonname"
let selectedCountry = "global"

dataCSV.then(function (data) {
    let counts = get_counts(data, selectedVariable)

    const tooltip = create_tooltip("#clev_dot");

    var mouseover = function (d) {
        tooltip.style("opacity", 2).style("s");
    }

    var mouseleave = function (d) {
        tooltip.transition().duration(200).style("opacity", 0);
    }

    var mousemove = (event, d) => {
        const key = typeof d === "string" ? d : d[selectedVariable];
        tooltip.html(counts.get(key))
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY) + "px");
    }

    svg.append("g")
        .attr("class","x axis")
        .attr("transform", `translate(0,${height})`);

    svg.append("g")
        .attr("class","y axis");

    svg.append("text")
        .attr("class", "x label")
        .attr("text-anchor", "end")
        .attr("x", width / 2)
        .attr("y", height + 30)
        .attr("dy", ".75em")
        .text("Observations");

    function updateYLabel() {
        const dropdown = document.getElementById("col_select");
        const selectedOptionText = document.querySelector(`input[name="att"]:checked + label`);

        svg.selectAll(".y.label")
            .data([selectedOptionText])
            .join("text")
            .attr("class", "y label")
            .attr("text-anchor", "end")
            .attr("x", -width/3)
            .attr("y", -height/2)
            .attr("dy", ".75em")
            .attr("transform", "rotate(-90)")
            .text(d => d);
        }   

    function updateVis() {
        const countryFilter = selectedCountry === "global" ? null : d => d.country === selectedCountry;
        counts = get_counts(data, selectedVariable, countryFilter);
        const maxCount = d3.max(Array.from(counts.values()));
        selectedOptionText = document.querySelector(`input[name="att"]:checked + label`);
        
        const x = d3.scaleLinear()
            .domain([0, maxCount])
            .range([0, width]);
        svg.select(".x.axis")
            .transition()
            .duration(2000)
            .call(
                d3.axisBottom(x)
                  .ticks(Math.min(maxCount, 10))             
                  .tickFormat(d3.format("d")) 
              );
        
        const visibleCategories = get_visible_categories(selectedVariable, counts);

        const y = d3.scaleBand()
            .range([0, height])
            .domain(visibleCategories).padding(1);

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

    document.querySelectorAll('input[name="att"]').forEach(radio => {
        radio.addEventListener("change", function() {
            if (this.checked) {
                selectedVariable = this.value;
                updateVis();
                updateYLabel();
            }
        });
    });


    document.getElementById("country_select").addEventListener("change", function () {
        selectedCountry = this.value;
        updateVis();
    });
    updateVis();
    updateYLabel();
});