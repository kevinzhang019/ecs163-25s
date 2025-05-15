// Initial Setup - Global constants for SVG dimensions, margins, and colors.
const topMargin = 10;
const svgWidth = window.innerWidth;
const actualWindowHeight = window.innerHeight - 10;

const pokemonTypeColors = {
    "Normal": "#A8A77A", "Fire": "#EE8130", "Water": "#6390F0", "Electric": "#F7D02C",
    "Grass": "#7AC74C", "Ice": "#96D9D6", "Fighting": "#C22E28", "Poison": "#A33EA1",
    "Ground": "#E2BF65", "Flying": "#A98FF3", "Psychic": "#F95587", "Bug": "#A6B91A",
    "Rock": "#B6A136", "Ghost": "#735797", "Dragon": "#6F35FC", "Dark": "#705746",
    "Steel": "#B7B7CE", "Fairy": "#D685AD", "Unknown": "#68A090"
};

const mainLegendEstimatedHeight = 70;
const plotGap = 20;

const plottingAreaBaseHeight = actualWindowHeight - topMargin - mainLegendEstimatedHeight;

// Chart Dimension & Position Calculations - Defines sizes and positions for each chart area.

// Star Plot Area (Top-Left) Dimensions & Positioning
let starPlotAreaMargin = {top: 35, right: 20, bottom: 10, left: 70};
let starPlotAreaWidth = Math.max(330, svgWidth * 0.38 - starPlotAreaMargin.left - starPlotAreaMargin.right);
let starPlotAreaHeight = Math.max(270, (plottingAreaBaseHeight / 2) - starPlotAreaMargin.top - starPlotAreaMargin.bottom - (plotGap / 2));
let starPlotArea_g_x = starPlotAreaMargin.left;
let starPlotArea_g_y = topMargin + starPlotAreaMargin.top;

// Scatter Plot (Bottom-Left) Dimensions & Positioning
let scatterPlotMargin = {top: 0, right: 20, bottom: 50, left: 70};
let scatterPlotWidth = starPlotAreaWidth;
let scatterPlotHeight = Math.max(240, (plottingAreaBaseHeight / 2) - scatterPlotMargin.top - scatterPlotMargin.bottom - (plotGap / 2));
let scatterPlot_g_x = scatterPlotMargin.left;
let scatterPlot_g_y = starPlotArea_g_y + starPlotAreaHeight + starPlotAreaMargin.bottom + plotGap + scatterPlotMargin.top;

// Streamgraph (Right) Dimensions & Positioning
let streamGraphMargin = {top: 30, right: 50, bottom: 60, left: 70};
let streamGraphLeftPos = starPlotArea_g_x + starPlotAreaWidth + starPlotAreaMargin.right + 40;
let streamGraphWidth = Math.max(370, svgWidth - streamGraphLeftPos - streamGraphMargin.left - streamGraphMargin.right - 20);
let streamGraphHeight = Math.max(330, plottingAreaBaseHeight * 0.85 - streamGraphMargin.top - streamGraphMargin.bottom);
let streamGraphBlockTotalHeight = streamGraphHeight + streamGraphMargin.top + streamGraphMargin.bottom;
let streamGraph_g_y_top_edge_within_content_block = topMargin + (plottingAreaBaseHeight - streamGraphBlockTotalHeight) / 2;
streamGraph_g_y_top_edge_within_content_block = Math.max(topMargin + streamGraphMargin.top, streamGraph_g_y_top_edge_within_content_block);


// Data Loading and Initial Processing - Fetches and cleans the Pokémon dataset.
d3.csv("data/pokemon_alopez247.csv").then(rawData =>{
    const cleanedData = rawData.filter(d => {
        return d.Name && d.Type_1 && d.Attack && d.Defense && d.Sp_Atk && d.Sp_Def && d.HP && d.Generation &&
               !isNaN(parseFloat(d.Attack)) && !isNaN(parseFloat(d.Defense)) &&
               !isNaN(parseFloat(d.Sp_Atk)) && !isNaN(parseFloat(d.Sp_Def)) &&
               !isNaN(parseFloat(d.HP)) && !isNaN(parseInt(d.Generation));
    }).map(d => {
        const type1 = d.Type_1.trim();
        return {
            Name: d.Name, Type_1: type1, Type_2: d.Type_2 ? d.Type_2.trim() : null,
            Attack: Number(d.Attack), Defense: Number(d.Defense), Sp_Atk: Number(d.Sp_Atk),
            Sp_Def: Number(d.Sp_Def), HP: Number(d.HP), Speed: Number(d.Speed), Total: Number(d.Total),
            Generation: parseInt(d.Generation),
            isLegendary: d.isLegendary === 'True' || d.isLegendary === '1' || d.isLegendary === true
        };
    });

    // SVG Setup - Selects the SVG element and sets its dimensions.
    // Select the SVG element from the DOM.
    const svg = d3.select("svg")
                  .attr("width", svgWidth)  // Set SVG width to the calculated window width.
                  .attr("height", actualWindowHeight); // Set SVG height.

    // Add a main <g> element to the SVG to act as a container for all chart components.
    const mainContainer = svg.append("g")
                             .attr("id", "mainContentContainer");

    // Color Scales - Defines color mappings for Pokémon types and generations.
    // Create an ordinal scale for Pokémon types, mapping type names to predefined colors.
    const typeColorScale = d3.scaleOrdinal()
        .domain([...new Set(cleanedData.map(d => d.Type_1))].sort())
        .range([...new Set(cleanedData.map(d => d.Type_1))].sort().map(type => pokemonTypeColors[type] || pokemonTypeColors["Unknown"]));

    // Star Plot Data Preparation - Aggregates average stats for each Pokémon generation.
    const statsForStarPlot = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def"];
    const generationsForStarPlot = [...new Set(cleanedData.map(d => d.Generation))].sort((a,b)=>a-b);
    const avgStatsByGeneration = generationsForStarPlot.map(gen => {
        const genData = cleanedData.filter(d => d.Generation === gen);
        let avgStats = { generation: gen };
        statsForStarPlot.forEach(stat => { avgStats[stat] = d3.mean(genData, d => d[stat]); });
        avgStats.tooltipText = `Gen ${gen}\n` + statsForStarPlot.map(s => `${s.replace("Sp_", "Sp.").replace("_"," ")}: ${avgStats[s] ? avgStats[s].toFixed(1) : 'N/A'}`).join('\n');
        return avgStats;
    });
    let maxAvgStatValue = 0;
    avgStatsByGeneration.forEach(genEntry => { statsForStarPlot.forEach(stat => { if (genEntry[stat] > maxAvgStatValue) maxAvgStatValue = genEntry[stat]; }); });
    maxAvgStatValue = Math.max(50, Math.ceil(maxAvgStatValue / 10) * 10);
    // Create an ordinal scale to assign distinct colors to each generation for the star plot.
    const generationPlotColorScale = d3.scaleOrdinal(d3.schemeTableau10)
                                      .domain(generationsForStarPlot);

    // Star Plot (Top-Left) - Visualizes average stats per generation using overlaid radar charts.
    // Add a <g> element for the star plot's container and position it.
    const g_starPlot_container = mainContainer.append("g")
                                           .attr("transform", `translate(${starPlotArea_g_x}, ${starPlotArea_g_y})`);
    // Add a <text> element for the star plot's title.
    g_starPlot_container.append("text")
        .attr("x", starPlotAreaWidth / 2).attr("y", -starPlotAreaMargin.top / 2 - 0)
        .attr("text-anchor", "middle").style("font-size", "16px").style("font-weight", "bold")
        .text("Average Stats by Generation");

    // Add a <g> element for the star plot itself, centered within its container.
    const g_starPlot = g_starPlot_container.append("g")
        .attr("transform", `translate(${starPlotAreaWidth / 2}, ${starPlotAreaHeight / 2 + 5})`);

    const starPlotRadius = Math.min(starPlotAreaWidth, starPlotAreaHeight) / 2 * 0.85;
    const angleSliceStar = Math.PI * 2 / statsForStarPlot.length;
    // Create a linear scale for the radial distance of stats on the star plot.
    const rScaleStar = d3.scaleLinear().range([0, starPlotRadius]).domain([0, maxAvgStatValue]);

    const starLevels = 5;
    for(let j=0; j<starLevels; j++){
        // Add a <circle> element for each grid level of the star plot.
        g_starPlot.append("circle")
            .attr("cx", 0).attr("cy", 0).attr("r", (starPlotRadius/starLevels) * (j+1))
            .style("fill", "none").style("stroke", "grey").style("stroke-dasharray", "2,2").style("stroke-width", "0.5px");
    }
    statsForStarPlot.forEach((statName, idx) => {
        const angle = angleSliceStar * idx - Math.PI / 2;
        // Add a <line> element for each axis of the star plot.
        g_starPlot.append("line")
            .attr("x1", 0).attr("y1", 0)
            .attr("x2", rScaleStar(maxAvgStatValue) * Math.cos(angle)).attr("y2", rScaleStar(maxAvgStatValue) * Math.sin(angle))
            .style("stroke", "grey").style("stroke-width", "1px");
        // Add a <text> element for each axis label on the star plot.
        g_starPlot.append("text")
            .attr("x", rScaleStar(maxAvgStatValue * 1.15) * Math.cos(angle))
            .attr("y", rScaleStar(maxAvgStatValue * 1.15) * Math.sin(angle))
            .text(statName.replace("Sp_", "Sp.").replace("_"," "))
            .style("font-size", "10px").attr("text-anchor", "middle").attr("dominant-baseline", "middle");
    });

    // Add a <polygon> element for each generation, representing its average stats.
    avgStatsByGeneration.forEach(genData => {
        const dataPoints = statsForStarPlot.map((statName, idx) => {
            const angle = angleSliceStar * idx - Math.PI / 2;
            return [ rScaleStar(genData[statName] || 0) * Math.cos(angle), rScaleStar(genData[statName] || 0) * Math.sin(angle) ];
        });
        // Add the <polygon> with only a colored border.
        g_starPlot.append("polygon")
            .datum(dataPoints)
            .attr("points", d => d.map(p => p.join(",")).join(" "))
            .style("fill", "none")
            .style("stroke", generationPlotColorScale(genData.generation))
            .style("stroke-width", "2px")
            .append("title").text(genData.tooltipText);
    });

    const starLegendWidth = 60; const starLegendItemHeight = 15;
    // Add a <g> element for the star plot's generation legend.
    const g_starLegend = g_starPlot_container.append("g")
        .attr("transform", `translate(${starPlotAreaWidth - starLegendWidth - 10}, ${-starPlotAreaMargin.top/2 + 25 })`);
    generationsForStarPlot.forEach((gen, i) => {
        // Add a <g> element for each legend item (color swatch and text).
        const legendRow = g_starLegend.append("g").attr("transform", `translate(0, ${i * starLegendItemHeight})`);
        // Add a <rect> element for the legend color swatch.
        legendRow.append("rect").attr("x", 0).attr("y", 0).attr("width", 10).attr("height", 10).style("fill", generationPlotColorScale(gen));
        // Add a <text> element for the legend label.
        legendRow.append("text").attr("x", 15).attr("y", 9).text(`Gen ${gen}`).style("font-size", "10px").attr("alignment-baseline", "middle");
    });

    // Scatter Plot (Bottom-Left) - Displays Attack vs. Defense for individual Pokémon.
    // Add a <g> element for the scatter plot and position it.
    const g_scatterPlot = mainContainer.append("g")
                                    .attr("transform", `translate(${scatterPlot_g_x}, ${scatterPlot_g_y})`);
    // Add a <text> element for the scatter plot's title.
    g_scatterPlot.append("text")
        .attr("x", scatterPlotWidth / 2).attr("y", -scatterPlotMargin.top / 2 + 5)
        .attr("text-anchor", "middle").style("font-size", "16px").style("font-weight", "bold")
        .text("Attack vs. Defense");

    // Define X and Y linear scales for the scatter plot.
    const x_scatter = d3.scaleLinear().domain([0, d3.max(cleanedData, d => d.Attack) * 1.05]).range([0, scatterPlotWidth]);
    const y_scatter = d3.scaleLinear().domain([0, d3.max(cleanedData, d => d.Defense) * 1.05]).range([scatterPlotHeight, 0]);

    // Add a <g> element for the X-axis and draw it.
    g_scatterPlot.append("g").attr("transform", `translate(0, ${scatterPlotHeight})`).call(d3.axisBottom(x_scatter).ticks(5))
        .selectAll("text").style("font-size", "10px");
    // Add a <text> element for the X-axis label.
    g_scatterPlot.append("text").attr("x", scatterPlotWidth / 2).attr("y", scatterPlotHeight + scatterPlotMargin.bottom - 5)
        .attr("text-anchor", "middle").style("font-size", "14px").text("Attack");

    // Add a <g> element for the Y-axis and draw it.
    g_scatterPlot.append("g").call(d3.axisLeft(y_scatter).ticks(5))
        .selectAll("text").style("font-size", "10px");
    // Add a <text> element for the Y-axis label.
    g_scatterPlot.append("text").attr("transform", "rotate(-90)").attr("x", -(scatterPlotHeight / 2)).attr("y", -scatterPlotMargin.left + 20)
        .attr("text-anchor", "middle").style("font-size", "14px").text("Defense");

    // Add <circle> elements for each Pokémon, positioned by Attack/Defense and colored by Type 1.
    g_scatterPlot.selectAll(".dot").data(cleanedData).enter()
        .append("circle").attr("class", "dot")
            .attr("cx", d => x_scatter(d.Attack)).attr("cy", d => y_scatter(d.Defense))
            .attr("r", d => d.isLegendary ? 5 : 3)
            .attr("fill", d => typeColorScale(d.Type_1)).attr("opacity", 0.7)
            // Add a <title> element (HTML tooltip) to each circle.
            .append("title")
                .text(d => `${d.Name}\nType: ${d.Type_1}\nAttack: ${d.Attack}\nDefense: ${d.Defense}${d.isLegendary ? "\n(Legendary)" : ""}`);

    // Streamgraph (Right) - Shows the distribution of Pokémon types across generations.
    // Add a <g> element for the streamgraph and position it.
    const g2_stream = mainContainer.append("g")
        .attr("transform", `translate(${streamGraphLeftPos + streamGraphMargin.left}, ${streamGraph_g_y_top_edge_within_content_block + streamGraphMargin.top})`);

    // Prepare data for stacking (counts of types per generation).
    const allUniqueTypes = [...new Set(cleanedData.map(d => d.Type_1))].sort();
    const countsByGenerationAndType = d3.rollup(cleanedData, v => v.length, d => d.Generation, d => d.Type_1);
    const generationsForStream = [...new Set(cleanedData.map(d => d.Generation))].sort((a,b) => a-b);
    let streamData = generationsForStream.map(gen => {
        let genObj = { generation: gen };
        let typeCountsForGen = countsByGenerationAndType.get(gen) || new Map();
        allUniqueTypes.forEach(type => { genObj[type] = typeCountsForGen.get(type) || 0; });
        return genObj;
    });

    // Create the D3 stack layout generator.
    const stack = d3.stack().keys(allUniqueTypes).order(d3.stackOrderAppearance).offset(d3.stackOffsetWiggle);
    const stackedSeries = stack(streamData);

    // Add a <text> element for the streamgraph's title.
    g2_stream.append("text").attr("x", streamGraphWidth / 2).attr("y", -streamGraphMargin.top / 2 + 5)
        .attr("text-anchor", "middle").style("font-size", "16px").style("font-weight", "bold")
        .text("Pokémon Types over Generations");

    // Define X (point scale for generations) and Y (linear scale for stacked counts) scales.
    const x_stream = d3.scalePoint().domain(generationsForStream).range([0, streamGraphWidth]);
    const y_stream = d3.scaleLinear().domain([d3.min(stackedSeries,s=>d3.min(s,d=>d[0])), d3.max(stackedSeries,s=>d3.max(s,d=>d[1]))]).range([streamGraphHeight,0]);
    // Create a D3 area generator for drawing the stream layers.
    const area_stream = d3.area().x(d=>x_stream(d.data.generation)).y0(d=>y_stream(d[0])).y1(d=>y_stream(d[1])).curve(d3.curveBasis);

    // Add <path> elements for each layer of the streamgraph, colored by Pokémon type.
    g2_stream.selectAll(".stream-layer").data(stackedSeries).enter()
        .append("path").attr("class","stream-layer")
            .attr("d",area_stream)
            .style("fill",d=>typeColorScale(d.key))
            .attr("opacity",0.85)
            .append("title").text(d=>d.key);

    // Add a <g> element for the X-axis (Generations) and draw it.
    g2_stream.append("g").attr("transform",`translate(0,${streamGraphHeight})`).call(d3.axisBottom(x_stream).tickFormat(d3.format("d")))
        .selectAll("text").style("font-size","12px");
    // Add a <text> element for the X-axis label.
    g2_stream.append("text").attr("x",streamGraphWidth/2).attr("y",streamGraphHeight+streamGraphMargin.bottom-15)
        .attr("text-anchor","middle").style("font-size","14px").text("Generation");
    // Add a <text> element for the Y-axis label.
    g2_stream.append("text").attr("transform","rotate(-90)").attr("x",-(streamGraphHeight/2)).attr("y",-streamGraphMargin.left+20)
        .attr("text-anchor","middle").style("font-size","14px").text("Number of Pokémon");

    // Main Legend (Bottom) - Displays color mapping for Pokémon types.
    let leftColumnActualBottomY = scatterPlot_g_y + scatterPlotHeight + scatterPlotMargin.bottom;
    let rightColumnActualBottomY = streamGraph_g_y_top_edge_within_content_block + streamGraphMargin.top + streamGraphHeight + streamGraphMargin.bottom;
    let legend_g_y_within_container = Math.max(leftColumnActualBottomY, rightColumnActualBottomY) + 25;

    // Add a <g> element for the main legend container and position it at the bottom.
    const legendContainer = mainContainer.append("g")
        .attr("class", "legend-container")
        .attr("transform", `translate(${scatterPlotMargin.left}, ${legend_g_y_within_container})`);

    const legendItemWidth = 100; const legendItemsPerRow = Math.max(1,Math.floor((svgWidth-scatterPlotMargin.left*2)/legendItemWidth));
    const legendMaxRows = 2; const typeLegendDomain = typeColorScale.domain();
    // Create a legend item for each Pokémon type.
    typeLegendDomain.forEach((type, i) => {
        const currentRow = Math.floor(i / legendItemsPerRow);
        if (currentRow >= legendMaxRows) return;
        const col = i % legendItemsPerRow;
        // Add a <g> element for each legend item.
        const legendItem = legendContainer.append("g").attr("transform", `translate(${col * legendItemWidth}, ${currentRow * 20})`);
        // Add a <rect> element for the color swatch.
        legendItem.append("rect").attr("width", 15).attr("height", 15).style("fill", typeColorScale(type));
        // Add a <text> element for the type name.
        legendItem.append("text").attr("x", 20).attr("y", 9).attr("dy", ".35em").style("text-anchor", "start").style("font-size", "12px").text(type);
    });
    const totalTypeItemsThatFitInLegend = legendMaxRows * legendItemsPerRow;
    if (typeLegendDomain.length > totalTypeItemsThatFitInLegend && totalTypeItemsThatFitInLegend > 0) {
         // Add a <text> element indicating more types exist if the legend is truncated.
         legendContainer.append("text").attr("x", 0).attr("y", legendMaxRows * 20 + 15)
            .style("font-size", "10px").text(`(...and ${typeLegendDomain.length - totalTypeItemsThatFitInLegend} more types)`);
    }

}).catch(function(error){
    console.log(error);
});