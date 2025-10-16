export const shared_color = "#2e83be";
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

export const habitat_colours = {
    "Billabongs": "#585858",
    "Brackish Rivers": "#0600a3",
    "Coastal Lagoons": "#8b8b8b",
    "Coastal Wetlands": "#dabb77",
    "Estuaries": "#793f00",
    "Estuarine Systems": "#b45d00ff",
    "Flooded Savannas": "#7ad800ff",
    "Forest Rivers": "#00a39c",
    "Forest Swamps": "#be9100",
    "Freshwater Marshes": "#ffc200",
    "Freshwater Rivers": "#00fff4",
    "Freshwater Wetlands": "#b6a671ff",
    "Gorges": "#ff00dc",
    "Lagoons": "#009f18",
    "Lakes": "#00fd26",
    "Large Rivers": "#00aaff",
    "Mangroves": "#8200c1",
    "Marshes": "#d58000",
    "Oases": "#006300ff",
    "Oxbow Lakes": "#75b407ff",
    "Ponds": "#26fd8e",
    "Reservoirs": "#610091",
    "Rivers": "#65ccff",
    "Shaded Forest Rivers": "#004eff",
    "Slow Rivers": "#6588ff",
    "Slow Streams": "#760000",
    "Small Streams": "#ff0000",
    "Swamps": "#614a00",
    "Tidal Rivers": "#2b8eb6ff"
}

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
        .style("fill", "#555")
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