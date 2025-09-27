export const font = "12px sans-serif";
export const font_padding = 10;
export const shared_color = "#2e83be"

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
        .style("pointer-events", "none")
        .style("background-color", "rgba(255, 255, 255)");
    return tooltip;
}