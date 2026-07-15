// ---------- Formatters ----------
const formatCurrency = d3.format("$,.0f");
const formatNumber = d3.format(",");
const parseDate = d3.timeParse("%d-%m-%Y");

// ---------- State (Task 5: filters) ----------
const state = {
  store: "All",
  holiday: "All",
  year: "All"
};

const tooltip = d3.select("#tooltip");
const holidayColor = d3.scaleOrdinal()
  .domain(["Holiday Week", "Non-Holiday Week"])
  .range(["#f97316", "#2563eb"]);

let fullData = [];

// ---------- Load data ----------
d3.csv("Walmart_Sales.csv", d3.autoType).then(raw => {
  fullData = raw.map(d => ({
    ...d,
    date: parseDate(String(d.Date)),
    weeklySales: +d.Weekly_Sales,
    holidayFlag: +d.Holiday_Flag,
    fuelPrice: +d.Fuel_Price
  })).filter(d => d.date);

  buildFilters(fullData);
  updateDashboard(fullData);

  d3.select("#storeFilter").on("change", e => { state.store = e.target.value; updateDashboard(fullData); });
  d3.select("#holidayFilter").on("change", e => { state.holiday = e.target.value; updateDashboard(fullData); });
  d3.select("#yearFilter").on("change", e => { state.year = e.target.value; updateDashboard(fullData); });

  d3.select("#resetBtn").on("click", () => {
    state.store = "All"; state.holiday = "All"; state.year = "All";
    d3.select("#storeFilter").property("value", "All");
    d3.select("#holidayFilter").property("value", "All");
    d3.select("#yearFilter").property("value", "All");
    updateDashboard(fullData);
  });
}).catch(err => {
  console.error("Error loading Walmart_Sales.csv", err);
  d3.select("body").insert("p", ":first-child")
    .style("color", "red")
    .style("padding", "12px 36px")
    .text("Could not load Walmart_Sales.csv - make sure it is in the same folder as index.html.");
});

// ---------- Filters setup (Task 5) ----------
function buildFilters(data) {
  const stores = ["All", ...Array.from(new Set(data.map(d => d.Store))).sort((a, b) => a - b)];
  const holidayOptions = ["All", "Holiday Week", "Non-Holiday Week"];
  const years = ["All", ...Array.from(new Set(data.map(d => d.date.getFullYear()))).sort()];

  fillSelect("#storeFilter", stores, d => (d === "All" ? "All Stores" : `Store ${d}`));
  fillSelect("#holidayFilter", holidayOptions);
  fillSelect("#yearFilter", years);
}

function fillSelect(selector, values, labelFn = d => d) {
  d3.select(selector)
    .selectAll("option")
    .data(values)
    .join("option")
    .attr("value", d => d)
    .text(d => labelFn(d));
}

function getFilteredData(data) {
  return data.filter(d => {
    const storeOk = state.store === "All" || d.Store === +state.store;
    const holidayOk =
      state.holiday === "All" ||
      (state.holiday === "Holiday Week" && d.holidayFlag === 1) ||
      (state.holiday === "Non-Holiday Week" && d.holidayFlag === 0);
    const yearOk = state.year === "All" || d.date.getFullYear().toString() === state.year.toString();
    return storeOk && holidayOk && yearOk;
  });
}

// ---------- Master update ----------
function updateDashboard(data) {
  const filtered = getFilteredData(data);
  updateKPIs(filtered);
  drawLineChart(filtered);
  drawBarChart(filtered);
  drawDonutChart(filtered);
  drawScatterChart(filtered);
}

function updateKPIs(data) {
  const totalSales = d3.sum(data, d => d.weeklySales);
  const avgSales = d3.mean(data, d => d.weeklySales) || 0;
  const holidayCount = data.filter(d => d.holidayFlag === 1).length;

  const byStore = Array.from(
    d3.rollup(data, v => d3.sum(v, d => d.weeklySales), d => d.Store),
    ([store, sales]) => ({ store, sales })
  ).sort((a, b) => b.sales - a.sales);
  const topStore = byStore.length ? `Store ${byStore[0].store}` : "-";

  d3.select("#kpiSales").text(formatCurrency(totalSales));
  d3.select("#kpiAvg").text(formatCurrency(avgSales));
  d3.select("#kpiTopStore").text(topStore);
  d3.select("#kpiHoliday").text(formatNumber(holidayCount));
}

// ---------- Task 1: Sales Trend Line Chart ----------
function drawLineChart(data) {
  const svg = d3.select("#lineChart");
  svg.selectAll("*").remove();
  const { width, height } = getSvgSize(svg);
  const margin = { top: 20, right: 30, bottom: 45, left: 80 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const weekly = Array.from(
    d3.rollup(data, v => d3.sum(v, d => d.weeklySales), d => +d.date),
    ([time, sales]) => ({ date: new Date(+time), sales })
  ).sort((a, b) => a.date - b.date);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleTime().domain(d3.extent(weekly, d => d.date)).range([0, innerWidth]);
  const y = d3.scaleLinear().domain([0, d3.max(weekly, d => d.sales) || 1]).nice().range([innerHeight, 0]);

  g.append("g").attr("class", "grid").call(d3.axisLeft(y).tickSize(-innerWidth).tickFormat(""));
  g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(x).ticks(8));
  g.append("g").attr("class", "axis").call(d3.axisLeft(y).tickFormat(d3.format("$.2s")));

  const line = d3.line().x(d => x(d.date)).y(d => y(d.sales)).curve(d3.curveMonotoneX);

  g.append("path")
    .datum(weekly)
    .attr("fill", "none")
    .attr("stroke", "#2563eb")
    .attr("stroke-width", 2.5)
    .attr("d", line);

  g.selectAll("circle.point")
    .data(weekly)
    .join("circle")
    .attr("class", "point")
    .attr("cx", d => x(d.date))
    .attr("cy", d => y(d.sales))
    .attr("r", 3.5)
    .attr("fill", "#2563eb")
    .on("mousemove", (event, d) => showTooltip(event,
      `<b>${d3.timeFormat("%d %b %Y")(d.date)}</b><br>Weekly Sales: ${formatCurrency(d.sales)}`))
    .on("mouseleave", hideTooltip);
}

// ---------- Task 2: Store-wise Sales Bar Chart ----------
function drawBarChart(data) {
  const svg = d3.select("#barChart");
  svg.selectAll("*").remove();
  const { width, height } = getSvgSize(svg);
  const margin = { top: 10, right: 25, bottom: 45, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const byStore = Array.from(
    d3.rollup(data, v => d3.sum(v, d => d.weeklySales), d => d.Store),
    ([store, sales]) => ({ store, sales })
  ).sort((a, b) => a.store - b.store);

  const maxSales = d3.max(byStore, d => d.sales) || 1;
  const topStore = byStore.reduce((a, b) => (b.sales > a.sales ? b : a), byStore[0] || { store: null });

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand().domain(byStore.map(d => d.store)).range([0, innerWidth]).padding(0.25);
  const y = d3.scaleLinear().domain([0, maxSales]).nice().range([innerHeight, 0]);

  g.append("g").attr("class", "grid").call(d3.axisLeft(y).tickSize(-innerWidth).tickFormat(""));
  g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).tickFormat(d => "S" + d));
  g.append("g").attr("class", "axis").call(d3.axisLeft(y).tickFormat(d3.format("$.2s")));

  g.selectAll("rect")
    .data(byStore)
    .join("rect")
    .attr("x", d => x(d.store))
    .attr("width", x.bandwidth())
    .attr("y", d => y(d.sales))
    .attr("height", d => innerHeight - y(d.sales))
    .attr("rx", 4)
    .attr("fill", d => (topStore && d.store === topStore.store) ? "#f97316" : "#6366f1")
    .on("mousemove", (event, d) => showTooltip(event,
      `<b>Store ${d.store}</b>${d.store === topStore.store ? " ⭐ Top store" : ""}<br>Total Sales: ${formatCurrency(d.sales)}`))
    .on("mouseleave", hideTooltip);
}

// ---------- Task 3: Holiday vs Non-Holiday Donut ----------
function drawDonutChart(data) {
  const svg = d3.select("#donutChart");
  svg.selectAll("*").remove();
  const { width, height } = getSvgSize(svg);
  const radius = Math.min(width, height) / 2 - 30;
  const g = svg.append("g").attr("transform", `translate(${width / 2},${height / 2 + 10})`);

  const totalSales = d3.sum(data, d => d.weeklySales);
  const grouped = [
    { label: "Holiday Week", sales: d3.sum(data.filter(d => d.holidayFlag === 1), d => d.weeklySales) },
    { label: "Non-Holiday Week", sales: d3.sum(data.filter(d => d.holidayFlag === 0), d => d.weeklySales) }
  ];

  const pie = d3.pie().value(d => d.sales).sort(null);
  const arc = d3.arc().innerRadius(radius * 0.58).outerRadius(radius);

  g.selectAll("path")
    .data(pie(grouped))
    .join("path")
    .attr("d", arc)
    .attr("fill", d => holidayColor(d.data.label))
    .attr("stroke", "white")
    .attr("stroke-width", 2)
    .on("mousemove", (event, d) => {
      const pct = totalSales ? (d.data.sales / totalSales) * 100 : 0;
      showTooltip(event, `<b>${d.data.label}</b><br>Sales: ${formatCurrency(d.data.sales)}<br>Share: ${pct.toFixed(1)}%`);
    })
    .on("mouseleave", hideTooltip);

  g.append("text").attr("text-anchor", "middle").attr("dy", "0.1em")
    .attr("font-size", 18).attr("font-weight", "bold")
    .text(formatCurrency(totalSales));
  g.append("text").attr("text-anchor", "middle").attr("dy", "1.6em")
    .attr("fill", "#6b7280").text("Total sales");

  const legend = svg.append("g").attr("transform", "translate(15,15)");
  grouped.forEach((d, i) => {
    const item = legend.append("g").attr("transform", `translate(0,${i * 22})`);
    item.append("rect").attr("width", 12).attr("height", 12).attr("fill", holidayColor(d.label));
    item.append("text").attr("x", 18).attr("y", 10).attr("class", "legend").text(d.label);
  });
}

// ---------- Task 4: Fuel Price vs Weekly Sales Scatter ----------
function drawScatterChart(data) {
  const svg = d3.select("#scatterChart");
  svg.selectAll("*").remove();
  const { width, height } = getSvgSize(svg);
  const margin = { top: 15, right: 30, bottom: 55, left: 80 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().domain(d3.extent(data, d => d.fuelPrice)).nice().range([0, innerWidth]);
  const y = d3.scaleLinear().domain([0, d3.max(data, d => d.weeklySales) || 1]).nice().range([innerHeight, 0]);

  g.append("g").attr("class", "grid").call(d3.axisLeft(y).tickSize(-innerWidth).tickFormat(""));
  g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).tickFormat(d3.format(".2f")));
  g.append("g").attr("class", "axis").call(d3.axisLeft(y).tickFormat(d3.format("$.2s")));

  g.append("text").attr("x", innerWidth / 2).attr("y", innerHeight + 42)
    .attr("text-anchor", "middle").attr("fill", "#6b7280").text("Fuel Price ($)");
  g.append("text").attr("transform", "rotate(-90)").attr("x", -innerHeight / 2).attr("y", -58)
    .attr("text-anchor", "middle").attr("fill", "#6b7280").text("Weekly Sales");

  g.selectAll("circle")
    .data(data)
    .join("circle")
    .attr("cx", d => x(d.fuelPrice))
    .attr("cy", d => y(d.weeklySales))
    .attr("r", 3.5)
    .attr("fill", d => d.holidayFlag === 1 ? holidayColor("Holiday Week") : holidayColor("Non-Holiday Week"))
    .attr("opacity", 0.55)
    .on("mousemove", (event, d) => showTooltip(event,
      `<b>Store ${d.Store}</b><br>Fuel Price: $${d.fuelPrice.toFixed(2)}<br>Weekly Sales: ${formatCurrency(d.weeklySales)}<br>${d.holidayFlag ? "Holiday Week" : "Non-Holiday Week"}`))
    .on("mouseleave", hideTooltip);

  const legend = svg.append("g").attr("transform", `translate(${width - 170},15)`);
  ["Holiday Week", "Non-Holiday Week"].forEach((label, i) => {
    const item = legend.append("g").attr("transform", `translate(0,${i * 20})`);
    item.append("circle").attr("r", 5).attr("cx", 5).attr("cy", 5).attr("fill", holidayColor(label));
    item.append("text").attr("x", 16).attr("y", 9).attr("class", "legend").text(label);
  });
}

// ---------- Helpers ----------
function getSvgSize(svg) {
  const node = svg.node();
  const width = node.clientWidth || 600;
  const height = node.clientHeight || 340;
  return { width, height };
}

function showTooltip(event, html) {
  tooltip
    .style("opacity", 1)
    .style("left", `${event.clientX}px`)
    .style("top", `${event.clientY}px`)
    .html(html);
}

function hideTooltip() {
  tooltip.style("opacity", 0);
}
