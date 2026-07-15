// --------------------------------------------------
// 1. Timeline Dataset
// --------------------------------------------------
const timelineData = [
  {
    date: "2026-01-10",
    event: "Project Started",
    category: "Planning",
    description: "The project topic and objectives were finalized."
  },
  {
    date: "2026-02-05",
    event: "Dataset Collected",
    category: "Data",
    description: "The required dataset was collected and inspected."
  },
  {
    date: "2026-02-25",
    event: "Data Cleaned",
    category: "Data",
    description: "Missing and incorrect values were handled."
  },
  {
    date: "2026-03-20",
    event: "Model Developed",
    category: "Development",
    description: "The first version of the model was completed."
  },
  {
    date: "2026-04-10",
    event: "Model Evaluated",
    category: "Evaluation",
    description: "The model was tested using several evaluation metrics."
  },
  {
    date: "2026-05-01",
    event: "Report Submitted",
    category: "Submission",
    description: "The final project report was submitted."
  }
];

// --------------------------------------------------
// 2. Convert Date Strings into JavaScript Date Objects
// --------------------------------------------------
const parseDate = d3.timeParse("%Y-%m-%d");
timelineData.forEach(item => {
  item.date = parseDate(item.date);
});

// --------------------------------------------------
// 3. Set Chart Dimensions
// --------------------------------------------------
const width = 1000;
const height = 430;
const margin = {
  top: 80,
  right: 70,
  bottom: 80,
  left: 70
};
const timelineY = 220;

// --------------------------------------------------
// 4. Create the SVG
// --------------------------------------------------
const svg = d3
  .select("#timeline")
  .append("svg")
  .attr("viewBox", `0 0 ${width} ${height}`)
  .attr("width", "100%")
  .attr("height", height);

// --------------------------------------------------
// 5. Create the Time Scale
// --------------------------------------------------
const xScale = d3
  .scaleTime()
  .domain(d3.extent(timelineData, d => d.date))
  .range([margin.left, width - margin.right]);

// --------------------------------------------------
// 6. Create and Display the Time Axis
// --------------------------------------------------
const xAxis = d3
  .axisBottom(xScale)
  .ticks(d3.timeMonth.every(1))
  .tickFormat(d3.timeFormat("%b %Y"));

svg.append("g")
  .attr("class", "axis")
  .attr("transform", `translate(0, ${timelineY + 80})`)
  .call(xAxis);

// --------------------------------------------------
// 7. Draw the Main Timeline Line
// --------------------------------------------------
svg.append("line")
  .attr("class", "timeline-line")
  .attr("x1", margin.left)
  .attr("x2", width - margin.right)
  .attr("y1", timelineY)
  .attr("y2", timelineY);

// --------------------------------------------------
// 8. Create a Color Scale
// --------------------------------------------------
const colorScale = d3
  .scaleOrdinal()
  .domain([
    "Planning",
    "Data",
    "Development",
    "Evaluation",
    "Submission"
  ])
  .range([
    "#2563eb",
    "#059669",
    "#7c3aed",
    "#ea580c",
    "#dc2626"
  ]);

// --------------------------------------------------
// 9. Select the Tooltip
// --------------------------------------------------
const tooltip = d3.select("#tooltip");

// --------------------------------------------------
// 10. Create a Group for Each Timeline Event
// --------------------------------------------------
const events = svg
  .selectAll(".event")
  .data(timelineData)
  .enter()
  .append("g")
  .attr("class", "event")
  .attr(
    "transform",
    d => `translate(${xScale(d.date)}, ${timelineY})`
  );

// --------------------------------------------------
// 11. Draw Vertical Connector Lines
// Alternate Labels Above and Below the Timeline
// --------------------------------------------------
events.append("line")
  .attr("class", "event-line")
  .attr("x1", 0)
  .attr("x2", 0)
  .attr("y1", 0)
  .attr(
    "y2",
    (d, index) => index % 2 === 0 ? -75 : 75
  );

// --------------------------------------------------
// 12. Draw Event Circles
// --------------------------------------------------
events.append("circle")
  .attr("class", "event-circle")
  .attr("r", 0)
  .attr("fill", d => colorScale(d.category))
  .on("mouseover", function (event, d) {
    d3.select(this)
      .transition()
      .duration(150)
      .attr("r", 12);

    tooltip
      .style("display", "block")
      .html(`
        <strong>${d.event}</strong><br>
        Date: ${d3.timeFormat("%d %B %Y")(d.date)}<br>
        Category: ${d.category}<br>
        ${d.description}
      `);
  })
  .on("mousemove", function (event) {
    tooltip
      .style("left", `${event.pageX + 15}px`)
      .style("top", `${event.pageY + 15}px`);
  })
  .on("mouseout", function () {
    d3.select(this)
      .transition()
      .duration(150)
      .attr("r", 9);
    tooltip.style("display", "none");
  })
  .transition()
  .duration(700)
  .attr("r", 9);

// --------------------------------------------------
// 13. Add Event Names
// --------------------------------------------------
events.append("text")
  .attr("class", "event-label")
  .attr("x", 0)
  .attr(
    "y",
    (d, index) => index % 2 === 0 ? -92 : 105
  )
  .text(d => d.event);

// --------------------------------------------------
// 14. Add Date Labels
// --------------------------------------------------
events.append("text")
  .attr("class", "date-label")
  .attr("x", 0)
  .attr(
    "y",
    (d, index) => index % 2 === 0 ? -72 : 125
  )
  .text(d => d3.timeFormat("%d %b")(d.date));

