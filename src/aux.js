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