
const margin = { top: 30, right: 30, left: 250, bottom: 30 };

const width = 800 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const svg = d3.select("#clev_dot")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

var dataCSV = d3.csv("../dataset/crocodile_dataset_processed.csv");

//defaults
let selectedVariable = "commonname"
let selectedCountry = "global"

dataCSV.then(function (data) {

    function get_counts(varName, filter) {
        const allKeys = Array.from(new Set(data.map(d => d[varName])));
        const filteredData = filter ? data.filter(filter) : data;

        const countMap = d3.rollup(filteredData, v => v.length, d => d[varName]);
        const counts = new Map();

        allKeys.forEach(key => { counts.set(key, countMap.get(key) || 0 )});
        return counts;
    }
    let counts = get_counts(selectedVariable)

    var tooltip = d3.select("#clev_dot")
        .append("div")
        .style("opacity", 0)
        .attr("class", "tooltip")
        .style("border", "solid")
        .style("border-width", "1px")
        .style("border-radius", "5px")
        .style("padding", "10px")
        .style("width", "15px")
        .style("position", "absolute")
        .style("pointer-events", "none")
        .style("background-color", "rgba(255, 255, 255, 0.5)")

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

    function updateVis() {
        const countryFilter = selectedCountry === "global" ? null : d => d.country === selectedCountry;
        counts = get_counts(selectedVariable, countryFilter);
        const maxCount = d3.max(Array.from(counts.values()));
        
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

        function getVisibleCategories(varName, countsMap) {
            if (varName === "commonname" || varName === "habitat") {
                return Array.from(countsMap.entries())
                    .filter(([k, v]) => v > 0)
                    .map(([k]) => k)
                    .sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: "base" }));
            }
            else if (varName === "country") {
                return Array.from(countsMap.keys())
                .sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: "base" }));
            }
            else {
                let order;
                if (varName === "age") {
                    order = ["Adult", "Subadult", "Juvenile", "Hatchling"];
                }
                if (varName === "sex") {
                    order = ["Male", "Female", "Unknown"];
                }
                if (varName === "conservation") {
                    order = ["Critically Endangered", "Endangered", 
                                    "Vulnerable", "Least Concern", "Data Deficient"];
                }
                return Array.from(countsMap.keys())
                .sort((a, b) => order.indexOf(a) - order.indexOf(b));
            }
        };
        
        const visibleCategories = getVisibleCategories(selectedVariable, counts);

        const y = d3.scaleBand()
            .range([0, height])
            .domain(visibleCategories).padding(1);

        svg.select(".y.axis")
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
                            .style("fill", "#d13100ff")
                            .on("mouseover", mouseover)
                            .on("mousemove", mousemove)
                            .on("mouseleave", mouseleave),
              update => update,
              exit => exit.remove()
            )
            .transition().duration(1000)
            .attr("cx", d => x(counts.get(d) || 0))
            .attr("cy", d => y(d) + y.bandwidth()/2);

    }

    d3.select("#col_select").on("change", function () {
        selectedVariable = this.value;
        console.log(selectedVariable);
        updateVis();
    });

    d3.select("#country_select").on("change", function () {
        selectedCountry = this.value;
        updateVis();
    });
    updateVis();
});