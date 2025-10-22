export const shared_color_dark = "#6bb0d7";
export const shared_color_light = "#2e83be";
export const duration = 1000;
export const symbol_size = 4;
export const stroke_width = 1.5;
export const dot_opacity = 0.5;

export const dataCSV = d3.csv("../dataset/crocodile_dataset_processed.csv");

export const sex_shapes = {
    "Male": "triangle",
    "Female": "cross",
    "Unknown": "circle"
}

export const sex_symbols = {
    "Unknown": "●",
    "Male": "▲",
    "Female": "✚"
};

export const age_colours = {
    "Adult": "#0084ffff",
    "Subadult": "#c00000ff",
    "Juvenile": "#00a81cff",
    "Hatchling": "#d6af00ff"
}

export const status_colours = {
    "Critically Endangered": "#c20000ff",
    "Endangered": "#eb9a05ff",
    "Vulnerable": "#c2c500ff",
    "Least Concern": "#0eb616ff",
    "Data Deficient": "#ac1aa4ff"
}

export const habitat_colours_light = {
    "Billabongs": "#FF5733",
    "Brackish Rivers": "#4eb862ff",
    "Coastal Lagoons": "#3357FF",
    "Coastal Wetlands": "#b8aa35ff",
    "Estuaries": "#8B0000",
    "Estuarine Systems": "#008B8B",
    "Flooded Savannas": "#B8860B",
    "Forest Rivers": "#006400",
    "Forest Swamps": "#FF8C00",
    "Freshwater Marshes": "#d4b500ff",
    "Freshwater Rivers": "#00FFFF",
    "Freshwater Wetlands": "#8B4513",
    "Gorges": "#FF1493",
    "Lagoons": "#00a179ff",
    "Lakes": "#32CD32",
    "Large Rivers": "#4169E1",
    "Mangroves": "#800080",
    "Marshes": "#FF4500",
    "Oases": "#2E8B57",
    "Oxbow Lakes": "#82ad2aff",
    "Ponds": "#20B2AA",
    "Reservoirs": "#8A2BE2",
    "Rivers": "#46ad8bff",
    "Shaded Forest Rivers": "#556B2F",
    "Slow Rivers": "#FF69B4",
    "Slow Streams": "#DC143C",
    "Small Streams": "#00BFFF",
    "Swamps": "#420042ff",
    "Tidal Rivers": "#5e9b99ff"
};

export const habitat_colours_dark = {
    "Billabongs": "#FF8C61",
    "Brackish Rivers": "#66FF99",
    "Coastal Lagoons": "#6699FF",
    "Coastal Wetlands": "#FFF68F",
    "Estuaries": "#FF6E6E",
    "Estuarine Systems": "#00CCCC",
    "Flooded Savannas": "#E6C229",
    "Forest Rivers": "#00AA00",
    "Forest Swamps": "#FFB347",
    "Freshwater Marshes": "#FFEE93",
    "Freshwater Rivers": "#7FFFD4",
    "Freshwater Wetlands": "#CD853F",
    "Gorges": "#FF80BF",
    "Lagoons": "#7CFC00",
    "Lakes": "#90EE90",
    "Large Rivers": "#87CEFA",
    "Mangroves": "#DDA0DD",
    "Marshes": "#FF7F50",
    "Oases": "#98FB98",
    "Oxbow Lakes": "#BDB76B",
    "Ponds": "#AFEEEE",
    "Reservoirs": "#E6E6FA",
    "Rivers": "#B0E0E6",
    "Shaded Forest Rivers": "#C0FF3E",
    "Slow Rivers": "#FFB6C1",
    "Slow Streams": "#FF6347",
    "Small Streams": "#87CEEB",
    "Swamps": "#D8BFD8",
    "Tidal Rivers": "#20B2AA"
};

export function get_counts(data, varName, filter = null) {
    const allKeys = Array.from(new Set(data.map(d => d[varName])));
    let filteredData;
    if (filter != null) {
        filteredData = data.filter(row =>
            Object.values(row).some(val =>
                String(val) == filter
            )
        );
    } else filteredData = data;

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
    return filteredData;
}

export function filter_by_colour(data, colour, colourScale, counts) {
    const range = colourScale.range();
    const domain = colourScale.domain();

    if(!colour) return data;

    const colorIndex = range.indexOf(colour);
    
    let lower, upper;
    if (colorIndex === 0) {
        lower = d3.min(Array.from(counts.values()));
        upper = domain[colorIndex];
    } else {
        lower = domain[colorIndex - 1];
        upper = (domain[colorIndex] || d3.max(Array.from(counts.values())) + 1);
    }

    const filteredData = data.filter(d => {
        const countryCount = counts.get(d.country);
        return countryCount >= lower && countryCount < upper;
    });

    return(filteredData);
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
        .style("background-color", "rgba(255, 255, 255)")
        .style("color", "black");
    return tooltip;
}

export function get_visible_categories(varName, countsMap) {
    if (varName === "commonname" || varName === "habitat") {
        return Array.from(countsMap.entries())
            // .filter(([k, v]) => v > 0)
            .map(([k]) => k)
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

export function filter_by_observations_range(data, minObs, maxObs) {
    let filteredData;
    filteredData = data.filter(row => {
        const observations = row.observations;
        return ((observations >= minObs) && (observations <= maxObs));
    });
    return filteredData;
}

export function filter_by_length_range(data, startPos, endPos) {
    let filteredData;
    
    filteredData = data.filter(row => {
        const lengthM = row.lengthM;
        return ((lengthM >= startPos) && ( lengthM <= endPos));
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

export function find_closest_length(data, x, xVal) {
    data.sort((a, b) => a.lengthM - b.lengthM);

    const bisect = d3.bisector(d => d.lengthM).left;
    const targetVal = x.invert(xVal);
    const index = bisect(data, targetVal, 1);

    if (index === 0) return data[0].date;
    if (index >= data.length) return data[data.length - 1].date;

    const left = data[index - 1];
    const right = data[index];

    return (Math.abs(targetVal - left.lengthM) < Math.abs(right.lengthM - targetVal))
        ? left.lengthM
        : right.lengthM;
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

export function update_legend_title(legendTitle, width, height, paddingX, paddingY, text) {
    legendTitle
        .attr("x", width - paddingX)
        .attr("y", height + 10 * paddingY)
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "ideographic")
        .style("font-weight", "bold")
        .text("Crocodile " + text);
}

export function calculate_R_squared(data, coefficients, type) {
    const n = data.length;
    let sumY = 0;
    let sumY2 = 0;
    let sumE2 = 0;
    let yMean = 0;

    data.forEach(({ lengthM, weight }) => {
        const y = parseFloat(weight);
        let yPred;
        const x = parseFloat(lengthM);

        if (type === "Quadratic") {
            yPred = coefficients[0] + coefficients[1] * x + coefficients[2] * x * x;
        } else if (type === "Linear") {
            yPred = coefficients[0] + coefficients[1] * x;
        } else {
            console.log("Error, Type (skip?): " + type);
        }

        sumY += y;
        sumY2 += y * y;
        sumE2 += Math.pow(y - yPred, 2);
    });

    yMean = sumY / n;
    const ssTot = sumY2 - n * yMean * yMean;
    return 1 - (sumE2 / ssTot);
}

export function quadratic_regression(data) {
    const n = data.length;
    let sumX = 0;
    let sumY = 0;
    let sumX2 = 0;
    let sumX3 = 0;
    let sumX4 = 0;
    let sumXY = 0;
    let sumX2Y = 0;

    data.forEach(({ lengthM, weight }) => {
        const x = parseFloat(lengthM);
        const y = parseFloat(weight);
        sumX += x;
        sumY += y;
        sumX2 += x * x;
        sumX3 += x * x * x;
        sumX4 += x * x * x * x;
        sumXY += x * y;
        sumX2Y += x * x * y;
    });

    const X = [
        [n, sumX, sumX2],
        [sumX, sumX2, sumX3],
        [sumX2, sumX3, sumX4]
    ];
    const Y = [sumY, sumXY, sumX2Y];
    const coefficients = leGauss(X, Y);

    return {
        type: coefficients[3],
        a: coefficients[0],
        b: coefficients[1],
        c: coefficients[2]
    };
}

function leGauss(matrix, vector) {
    const n = matrix.length;
    const augmy = matrix.map((row, i) => {
        return Array.from(row).concat(vector[i]);
    });
    
    for (let col = 0; col < n; col++) {
        let maxRow = col;
        for (let i = col + 1; i < n; i++) {
            if (Math.abs(augmy[i][col]) > Math.abs(augmy[maxRow][col])) {
                maxRow = i;
            }
        }
        [augmy[col], augmy[maxRow]] = [augmy[maxRow], augmy[col]];

        if (augmy[col][col] == 0) {
            if(augmy[col][0] == 0 && augmy[col][1] == 0 && augmy[col][2] == 0) {
                return { type: "skip", a: null, b: null, c: null };
            }
            const meanY = Math.exp(maxRow / n);
            return { type: "Linear", a: meanY, b: 0, c: null };
        }

        for (let i = col + 1; i < n; i++) {
            const factor = augmy[i][col] / augmy[col][col];
            for (let j = col; j <= n; j++) {
                augmy[i][j] -= factor * augmy[col][j];
            }
        }
    }

    const sol = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        sol[i] = augmy[i][n] / augmy[i][i];
        for (let j = i - 1; j >= 0; j--) {
            augmy[j][n] -= augmy[j][i] * sol[i];
        }
    }
    sol[3] = "Quadratic"
    return sol;
}