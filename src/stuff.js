export const font = "12px Arial sans-serif";
export const font_padding = 10;
export const shared_color = "#2e83be";
export const shared_color2 = "#bed8e7";
export const duration = 1000;
export const symbol_size = 6;
export const stroke_width = 1.5;

export const dataCSV = d3.csv("../dataset/crocodile_dataset_processed.csv");

export function get_counts(data, varName, filter = null) {
    const allKeys = Array.from(new Set(data.map(d => d[varName])));
    const filteredData = filter ? data.filter(filter) : data;

    const countMap = d3.rollup(filteredData, v => v.length, d => d[varName]);
    const counts = new Map();

    allKeys.forEach(key => { counts.set(key, countMap.get(key) || 0 )});
    return counts;
}

export function get_counts_by_country(data) {
    const countsByCountry = new Map();
    data.forEach(row => {
        const country = row.country;
        countsByCountry.set(country, (countsByCountry.get(country) || 0) + 1);
    });
    return countsByCountry;
}

export function get_text_width(text, font) {
    const canv = document.createElement("canvas");
    const context = canv.getContext("2d");
    context.font = font;
    return context.measureText(text).width;
}

export function filter_by_countries(data, selectedCountries) {
    let filteredData;
    if(selectedCountries.length === 0) {
        filteredData = data;
    } else {
        filteredData = data.filter(row => {
            const country = row.country;
            return (selectedCountries.includes(country));
        });
    }
    //console.log(filteredData);
    return filteredData;
}

export function create_svg(container, margin) {
    let svg = container.append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .style("display", "block")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

    return svg;
}

export function create_tooltip(id) {
    let tooltip = d3.select(id)
        .append("div")
        .style("opacity", 0)
        .attr("class", "tooltip")
        .style("border", "solid")
        .style("border-width", "1px")
        .style("border-radius", "5px")
        .style("padding", "10px")
        .style("position", "absolute")
        .style("z-index", 1000)
        .style("pointer-events", "none")
        .style("background-color", "rgba(255, 255, 255)");
    return tooltip;
}

export function get_visible_categories(varName, countsMap) {
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
}

export function get_colour_scale(counts) {
    let sortedColours = Array.from(counts.values()).sort((a, b) => a - b);
    let colorDomain = [
        d3.quantile(sortedColours, 0.2),
        d3.quantile(sortedColours, 0.4),
        d3.quantile(sortedColours, 0.6),
        d3.quantile(sortedColours, 0.8)
    ].filter(d => d !== undefined);
    return d3.scaleThreshold().domain(colorDomain).range(d3.schemeBlues[5]);
}

export function filter_by_date(data, filterMonth, filterYear) {
    let filteredData;
    if (filterMonth || filterYear) {
        filteredData = data.filter(row => {
            const dateParts = row.date.split('-');
            const month = dateParts[1];
            const year = dateParts[2];
            return (!filterMonth || month == filterMonth) && (!filterYear || year == filterYear);
        });
    }
    return filteredData;
}

export function filter_by_date_range(data, filterStartDate, filterEndDate) {
    let filteredData;

    filteredData = data.filter(row => {
        const dateParts = row.date.split('-');
        const month = dateParts[1];
        const year = dateParts[2];

        const startMonth = filterStartDate.getMonth();
        const startYear = filterStartDate.getFullYear();

        const endYear = filterEndDate.getFullYear();

        return ((month >= startMonth) && (year >= startYear && year <= endYear));
    });
    return filteredData;
}


export function find_closest_date(data, x, xVal) {
    const bisect = d3.bisector(d => d.date).left;
    const index = bisect(data, x.invert(xVal), 1);

    if (index === 0) return data[0].date;
    if (index >= data.length) return data[data.length - 1].date;

    const left = data[index - 1];
    const right = data[index];

    return (xVal - x(left.date) < x(right.date) - xVal) ? left.date : right.date;
}


export function get_date_observations_by_granularity(data, granularity = 'month') {
    const dateCountMap = new Map();
    data.forEach(row => {
        const date = row.date;
        const country = row.country;
        if (date && country) {
            const dateParts = date.split('-');
            const day = dateParts[0];
            const month = dateParts[1];
            const year = dateParts[2];
            
            let key, dateObj;
            
            switch(granularity) {
                case 'day':
                    key = `${day}-${month}-${year}`;
                    dateObj = new Date(`${year}-${month}-${day}`);
                    break;
                case 'month':
                    key = `${month}-${year}`;
                    dateObj = new Date(`${year}-${month}-01`);
                    break;
                case 'year':
                    key = year;
                    dateObj = new Date(`${year}-01-01`);
                    break;
                default:
                    key = `${month}-${year}`;
                    dateObj = new Date(`${year}-${month}-01`);
            }
            
            const mapKey = `${country}|${key}`
            if (!dateCountMap.has(mapKey)) {
                dateCountMap.set(mapKey, { country, date: dateObj, observations: 0 });
            }
            dateCountMap.get(mapKey).observations += 1;

            const globalKey = `global|${key}`;
            if (!dateCountMap.has(globalKey)) {
                dateCountMap.set(globalKey, { country: 'global', date: dateObj, observations: 0 });
            }
            dateCountMap.get(globalKey).observations += 1;
        }
    });
    
    const dateObservations = Array.from(dateCountMap.values());
    dateObservations.sort((a, b) => a.date - b.date || a.country.localeCompare(b.country));

    return dateObservations;
}