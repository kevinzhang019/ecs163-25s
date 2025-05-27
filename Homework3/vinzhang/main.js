// Global constants for SVG dimensions, margins, and colors.
const topMargin = 10;
const svgWidth = window.innerWidth;
const actualWindowHeight = window.innerHeight - 10;

// Color mapping for Pokémon types.
const pokemonTypeColors = {
    "Normal": "#A8A77A", "Fire": "#EE8130", "Water": "#6390F0", "Electric": "#F7D02C",
    "Grass": "#7AC74C", "Ice": "#96D9D6", "Fighting": "#C22E28", "Poison": "#A33EA1",
    "Ground": "#E2BF65", "Flying": "#A98FF3", "Psychic": "#F95587", "Bug": "#A6B91A",
    "Rock": "#B6A136", "Ghost": "#735797", "Dragon": "#6F35FC", "Dark": "#705746",
    "Steel": "#B7B7CE", "Fairy": "#D685AD"
};

// Color mapping for Pokémon stats.
const statAttributeColors = {
    "HP": "#77DD77", "Attack": "#FF6961", "Defense": "#77B5FE",
    "Sp. Atk": "#C377E0", "Sp. Def": "#A7D7A7", "Speed": "#FDFD96"
};

// Estimated height for the main legend at the bottom.
const mainLegendEstimatedHeight = 70;
const plotGap = 20;
const plottingAreaBaseHeight = actualWindowHeight - topMargin - mainLegendEstimatedHeight;

// Chart Dimension & Position Calculations (Star Plot - Top-Left)
let starPlotAreaMargin = {top: 35, right: 20, bottom: 10, left: 70};
let starPlotAreaWidth = Math.max(330, svgWidth * 0.38 - starPlotAreaMargin.left - starPlotAreaMargin.right);
let starPlotAreaHeight = Math.max(270, (plottingAreaBaseHeight / 2) - starPlotAreaMargin.top - starPlotAreaMargin.bottom - (plotGap / 2));
let starPlotArea_g_x = starPlotAreaMargin.left;
let starPlotArea_g_y = topMargin + starPlotAreaMargin.top;

// Bar Graph (Bottom-Left) Dimensions & Positioning
let barGraphMargin = {top: 0, right: 20, bottom: 50, left: 70};
let barGraphWidth = starPlotAreaWidth;
let barGraphHeight = Math.max(240, (plottingAreaBaseHeight / 2) - barGraphMargin.top - barGraphMargin.bottom - (plotGap / 2));
let barGraph_g_x = barGraphMargin.left;
let barGraph_g_y = starPlotArea_g_y + starPlotAreaHeight + starPlotAreaMargin.bottom + plotGap + barGraphMargin.top;

// Scatter Plot (Right) Dimensions & Positioning
let rightScatterMargin = {top: 50, right: 50, bottom: 60, left: 70};
let rightScatterLeftPos = starPlotArea_g_x + starPlotAreaWidth + starPlotAreaMargin.right + 40;
let rightScatterWidth = Math.max(370, svgWidth - rightScatterLeftPos - rightScatterMargin.left - rightScatterMargin.right - 20);
let rightScatterHeight = Math.max(330, plottingAreaBaseHeight * 0.85 - rightScatterMargin.top - rightScatterMargin.bottom);
let rightScatterBlockTotalHeight = rightScatterHeight + rightScatterMargin.top + rightScatterMargin.bottom;
let rightScatter_g_y_top_edge = topMargin + (plottingAreaBaseHeight - rightScatterBlockTotalHeight) / 2;
rightScatter_g_y_top_edge = Math.max(topMargin + rightScatterMargin.top, rightScatter_g_y_top_edge);

// Constants for the Reset Button.
const resetButtonWidth = 100;
const resetButtonHeight = 30;
const resetButtonPadding = 20;
const resetButtonText = "Reset View";

let selectedPokemonData = [];
let selectionMode = 'brush';

// Constants for Star Plot drawing.
const statsForStarPlot = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def"];
const starPlotRadius = Math.min(starPlotAreaWidth, starPlotAreaHeight) / 2 * 0.80;
const angleSliceStar = Math.PI * 2 / statsForStarPlot.length;
const starLevels = 5;
const rScaleStar = d3.scaleLinear().range([0, starPlotRadius]).domain([0, 100]);

// Data Loading and Initial Processing
d3.csv("data/pokemon_alopez247.csv").then(rawData =>{
    const cleanedData = rawData.filter(d => {
        return d.Name && d.Type_1 && d.Attack && d.Defense && d.Sp_Atk && d.Sp_Def && d.HP && d.Generation && d.Speed &&
               !isNaN(parseFloat(d.Attack)) && !isNaN(parseFloat(d.Defense)) &&
               !isNaN(parseFloat(d.Sp_Atk)) && !isNaN(parseFloat(d.Sp_Def)) &&
               !isNaN(parseFloat(d.HP)) && !isNaN(parseInt(d.Generation)) && !isNaN(parseFloat(d.Speed));
    }).map((d, i) => {
        const type1 = d.Type_1.trim();
        return {
            id: `pokemon_${i}_${d.Name.replace(/\s+/g, '_')}`,
            Name: d.Name, Type_1: type1, Type_2: d.Type_2 ? d.Type_2.trim() : null,
            Attack: Number(d.Attack), Defense: Number(d.Defense), Sp_Atk: Number(d.Sp_Atk),
            Sp_Def: Number(d.Sp_Def), HP: Number(d.HP), Speed: Number(d.Speed), Total: Number(d.Total),
            Generation: parseInt(d.Generation),
            isLegendary: d.isLegendary === 'True' || d.isLegendary === '1' || d.isLegendary === true
        };
    });

    const svg = d3.select("svg")
                  .attr("width", svgWidth)
                  .attr("height", actualWindowHeight);
    const mainContainer = svg.append("g").attr("id", "mainContentContainer");

    // Color Scales
    const typeColorScale = d3.scaleOrdinal()
        .domain([...new Set(cleanedData.map(d => d.Type_1))].sort())
        .range([...new Set(cleanedData.map(d => d.Type_1))].sort().map(type => pokemonTypeColors[type] || pokemonTypeColors["Unknown"]));

    const generationPlotColorScale = d3.scaleOrdinal(d3.schemeTableau10)
                                      .domain([...new Set(cleanedData.map(d => d.Generation))].sort((a,b)=>a-b));

    // Star Plot Data Preparation
    const generationsForStarPlotDefaults = [...new Set(cleanedData.map(d => d.Generation))].sort((a,b)=>a-b);
    const avgStatsByGenerationForDefaults = generationsForStarPlotDefaults.map(gen => {
        const genData = cleanedData.filter(d => d.Generation === gen);
        let avgStats = { generation: gen };
        statsForStarPlot.forEach(stat => { avgStats[stat] = d3.mean(genData, d => d[stat]); });
        return avgStats;
    });


    // Bar Graph Data & Scales Preparation
    const overallAvgStatsOrder = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];
    const defaultOverallAvgStats = overallAvgStatsOrder.map(statKey => {
        return {
            stat: statKey.replace("Sp_", "Sp. "),
            value: d3.mean(cleanedData, d => d[statKey])
        };
    });
    const x_bar = d3.scaleBand()
        .domain(overallAvgStatsOrder.map(s => s.replace("Sp_", "Sp. ")))
        .range([0, barGraphWidth])
        .padding(0.2);
    const y_bar = d3.scaleLinear().range([barGraphHeight, 0]);
    const statBarColors = d3.scaleOrdinal()
        .domain(overallAvgStatsOrder.map(s => s.replace("Sp_", "Sp. ")))
        .range(overallAvgStatsOrder.map(s => statAttributeColors[s.replace("Sp_", "Sp. ")] || statAttributeColors["Unknown"]));


    // Star Plot (Top-Left)
    const g_starPlot_container = mainContainer.append("g")
        .attr("transform", `translate(${starPlotArea_g_x}, ${starPlotArea_g_y})`);
    const starPlotTitleText = g_starPlot_container.append("text")
        .attr("x", starPlotAreaWidth / 2)
        .attr("y", -starPlotAreaMargin.top / 2 - 0)
        .attr("text-anchor", "middle")
        .style("font-size", "16px").style("font-weight", "bold")
        .text("Average Stats by Generation");

    // Axes, polygons.
    const g_starPlot = g_starPlot_container.append("g")
        .attr("transform", `translate(${starPlotAreaWidth / 2}, ${starPlotAreaHeight / 2 + 5})`);

    // Generation colors.
    const g_starLegend = g_starPlot_container.append("g")
        .attr("transform", `translate(${starPlotAreaWidth - 60 - 10}, ${-starPlotAreaMargin.top/2 + 25 })`);

    // Creates legend items for each generation.
    generationPlotColorScale.domain().forEach((gen, i) => {
        const legendRow = g_starLegend.append("g").attr("transform", `translate(0, ${i * 15})`);
        legendRow.append("rect").attr("x", 0).attr("y", 0).attr("width", 10).attr("height", 10).style("fill", generationPlotColorScale(gen));
        legendRow.append("text").attr("x", 15).attr("y", 9).text(`Gen ${gen}`).style("font-size", "10px").attr("alignment-baseline", "middle");
    });
    const starPlotPolygonsGroup = g_starPlot.append("g").attr("class", "star-polygons-group");

    // Helper function to draw/update star plot axes and grid.
    function drawOrUpdateStarPlotAxesAndGrid(currentMaxForScale) {
        g_starPlot.selectAll(".star-grid").remove();
        g_starPlot.selectAll(".star-axis-line").remove();
        g_starPlot.selectAll(".star-axis-label").remove();

        // Draws concentric grid circles.
        for (let j = 0; j < starLevels; j++) {
            const radiusValue = (currentMaxForScale / starLevels) * (j + 1);
            g_starPlot.append("circle").attr("class", "star-grid")
                .attr("cx", 0).attr("cy", 0)
                .attr("r", rScaleStar(radiusValue > 0 ? radiusValue : 0))
                .style("fill", "none").style("stroke", "grey")
                .style("stroke-dasharray", "2,2").style("stroke-width", "0.5px");
        }

        // Draws axis lines and labels for each stat.
        statsForStarPlot.forEach((statName, idx) => {
            const angle = angleSliceStar * idx - Math.PI / 2;
            const lineEndPoint = rScaleStar(currentMaxForScale > 0 ? currentMaxForScale : 0);
            const labelPosition = rScaleStar((currentMaxForScale > 0 ? currentMaxForScale : 0) * 1.10);

            g_starPlot.append("line").attr("class", "star-axis-line")
                .attr("x1", 0).attr("y1", 0)
                .attr("x2", lineEndPoint * Math.cos(angle))
                .attr("y2", lineEndPoint * Math.sin(angle))
                .style("stroke", "grey").style("stroke-width", "1px");

            g_starPlot.append("text").attr("class", "star-axis-label")
                .attr("x", labelPosition * Math.cos(angle))
                .attr("y", labelPosition * Math.sin(angle))
                .text(statName.replace("Sp_", "Sp.").replace("_"," "))
                .style("font-size", "10px").attr("text-anchor", "middle").attr("dominant-baseline", "middle");
        });
    }


    // Bar Graph (Bottom-Left)
    const g_barGraph = mainContainer.append("g")
        .attr("transform", `translate(${barGraph_g_x}, ${barGraph_g_y})`);

    // Bar graph title.
    const barGraphTitleText = g_barGraph.append("text")
        .attr("x", barGraphWidth / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle").style("font-size", "16px").style("font-weight", "bold");

    // Bar graph X-axis.
    g_barGraph.append("g").attr("class", "x-axis bar-axis")
        .attr("transform", `translate(0, ${barGraphHeight})`)
        .call(d3.axisBottom(x_bar))
        .selectAll("text").style("font-size", "10px").attr("text-anchor", "middle");

    // Bar graph Y-axis.
    const yAxis_bar_group = g_barGraph.append("g").attr("class", "y-axis bar-axis");

    // Bar graph Y-axis label
    g_barGraph.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -(barGraphHeight / 2))
        .attr("y", -barGraphMargin.left + 20)
        .attr("text-anchor", "middle").style("font-size", "14px").text("Average Value");

    // Add bars
    const barsGroup = g_barGraph.append("g").attr("class", "bars-group");

    // Add values above bars.
    const barValuesGroup = g_barGraph.append("g").attr("class", "bar-values-group");


    // Scatter Plot (Right)
    const g_rightScatterPlot = mainContainer.append("g")
        .attr("transform", `translate(${rightScatterLeftPos + rightScatterMargin.left}, ${rightScatter_g_y_top_edge + rightScatterMargin.top})`);

    // Scatter plot title.
    g_rightScatterPlot.append("text")
        .attr("class", "plot-title")
        .attr("x", rightScatterWidth / 2)
        .attr("y", -rightScatterMargin.top + 35)
        .attr("text-anchor", "middle").style("font-size", "16px").style("font-weight", "bold")
        .text("Attack vs. Defense (Click or Drag to Select)");

    // X-axis scale for the scatter plot (linear scale for Attack values).
    const x_rightScatter = d3.scaleLinear().domain([0, d3.max(cleanedData, d => d.Attack) * 1.05]).range([0, rightScatterWidth]);

    // Scatter plot X-axis.
    g_rightScatterPlot.append("g").attr("transform", `translate(0, ${rightScatterHeight})`).call(d3.axisBottom(x_rightScatter).ticks(5))
        .selectAll("text").style("font-size", "10px");
    
    // Scatter plot X-axis label.
    g_rightScatterPlot.append("text").attr("x", rightScatterWidth / 2).attr("y", rightScatterHeight + rightScatterMargin.bottom - 15)
        .attr("text-anchor", "middle").style("font-size", "14px").text("Attack");

    // Y-axis scale for the scatter plot (linear scale for Defense values).
    const y_rightScatter = d3.scaleLinear().domain([0, d3.max(cleanedData, d => d.Defense) * 1.05]).range([rightScatterHeight, 0]);

    // Scatter plot Y-axis.
    g_rightScatterPlot.append("g").call(d3.axisLeft(y_rightScatter).ticks(5))
        .selectAll("text").style("font-size", "10px");
    
    // Scatter plot Y-axis label.
    g_rightScatterPlot.append("text").attr("transform", "rotate(-90)").attr("x", -(rightScatterHeight / 2)).attr("y", -rightScatterMargin.left + 20)
        .attr("text-anchor", "middle").style("font-size", "14px").text("Defense");

    // Selects all circles and binds data.
    g_rightScatterPlot.selectAll(".dotRight")
        .data(cleanedData, d => d.id)
        .enter().append("circle").attr("class", "dotRight")
            .attr("cx", d => x_rightScatter(d.Attack))
            .attr("cy", d => y_rightScatter(d.Defense))
            .attr("r", 4)
            .attr("fill", d => typeColorScale(d.Type_1))
            .attr("opacity", 0.7)
            .style("stroke-width", 1.5).style("stroke", "none").style("cursor", "pointer")
            .append("title")
                .text(d => {
                    const header = `${d.Name} (Gen ${d.Generation}, ${d.Type_1})`;
                    const statsList = statsForStarPlot.map(statKey => {
                        const statNameDisplay = statKey.replace("Sp_", "Sp.").replace("_", " ");
                        const statValue = d[statKey] || 'N/A';
                        return `${statNameDisplay}: ${statValue}`;
                    }).join('\n');
                    return `${header}\n${statsList}`;
                });

    // D3 brush functionality.
    let brush_scatter;
    let g_brush_scatter;

    // Initializes D3 brush.
    brush_scatter = d3.brush()
        .extent([[0, 0], [rightScatterWidth, rightScatterHeight]])
        .on("end", brushed_scatter);

    // Appends a <g> element to the scatter plot for the brush.
    g_brush_scatter = g_rightScatterPlot.append("g")
        .attr("class", "brush")
        .call(brush_scatter);

    // Delegated click handler on the scatter plot group for individual point selection.
    g_rightScatterPlot.on("click", function(event) {
        const [mx, my] = d3.pointer(event, this);
        let clickedPokemon = null;
        const baseRadius = 4;
        const radiusSquared = baseRadius * baseRadius;

        // Manual hit detection: Iterate through Pokémon data to find if a circle was clicked.
        for (const pokemon of cleanedData) {
            const cx = x_rightScatter(pokemon.Attack);
            const cy = y_rightScatter(pokemon.Defense);
            const dx = mx - cx;
            const dy = my - cy;
            if (dx * dx + dy * dy <= radiusSquared) {
                clickedPokemon = pokemon;
                break;
            }
        }

        // Handle clicks
        if (clickedPokemon) {
            processPokemonClick(clickedPokemon);
        } else {
            if (selectionMode === 'multiClick') {
                selectedPokemonData = [];
                selectionMode = 'brush';
                activateBrush();
                updateAllVisuals();
            }
        }
    });

    // Text to display selected pokemon
    mainContainer.append("text")
        .attr("id", "selected-pokemon-list")
        .attr("x", rightScatterLeftPos + rightScatterMargin.left)
        .attr("y", rightScatter_g_y_top_edge + rightScatterBlockTotalHeight + 30)
        .style("font-size", "14px")
        .style("fill", "#333")
        .text("selected pokemon: None");


    // Main Legend for Pokémon Types (Bottom)
    let leftColumnActualBottomY = barGraph_g_y + barGraphHeight + barGraphMargin.bottom;
    let scatterPlotBlockBottomWithNewText = rightScatter_g_y_top_edge + rightScatterBlockTotalHeight + 30 + 20;
    let rightColumnActualBottomY = Math.max(
        rightScatter_g_y_top_edge + rightScatterBlockTotalHeight,
        scatterPlotBlockBottomWithNewText
    );
    let legend_g_y_within_container = Math.max(leftColumnActualBottomY, rightColumnActualBottomY) + 25;

    const legendContainer = mainContainer.append("g")
        .attr("class", "legend-container")
        .attr("transform", `translate(${barGraphMargin.left}, ${legend_g_y_within_container})`);

    // Defines layout for legend items.
    const legendItemWidth = 100;
    const legendItemsPerRow = Math.max(1,Math.floor((svgWidth-barGraphMargin.left*2)/legendItemWidth));
    const legendMaxRows = 2;
    const typeLegendDomain = typeColorScale.domain();

    // Creates legend items for each Pokémon type.
    typeLegendDomain.forEach((type, i) => {
        const currentRow = Math.floor(i / legendItemsPerRow);
        if (currentRow >= legendMaxRows) return;
        const col = i % legendItemsPerRow;
        const legendItem = legendContainer.append("g").attr("transform", `translate(${col * legendItemWidth}, ${currentRow * 20})`);
        legendItem.append("rect").attr("width", 15).attr("height", 15).style("fill", typeColorScale(type));
        legendItem.append("text").attr("x", 20).attr("y", 9).attr("dy", ".35em").style("text-anchor", "start").style("font-size", "12px").text(type);
    });

    // Reset Button
    const resetButtonX = svgWidth - resetButtonWidth - resetButtonPadding;
    const resetButtonY = topMargin;

    const resetButton = mainContainer.append("g")
        .attr("class", "reset-button-group")
        .attr("transform", `translate(${resetButtonX}, ${resetButtonY})`)
        .style("cursor", "pointer")
        .on("click", () => {
            selectedPokemonData = [];
            selectionMode = 'brush';
            activateBrush();

            if (g_brush_scatter && brush_scatter && d3.brushSelection(g_brush_scatter.node())) {
                brush_scatter.on("end", null);
                g_brush_scatter.call(brush_scatter.move, null);
                brush_scatter.on("end", brushed_scatter);
            }
            updateAllVisuals();
        });

    // Button outline
    resetButton.append("rect")
        .attr("width", resetButtonWidth).attr("height", resetButtonHeight)
        .attr("rx", 5).attr("ry", 5)
        .style("fill", "#f0f0f0").style("stroke", "#adadad").style("stroke-width", "1px");

    // Button label.
    resetButton.append("text")
        .attr("x", resetButtonWidth / 2).attr("y", resetButtonHeight / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .style("fill", "#333333").style("font-size", "12px").style("font-family", "sans-serif")
        .text(resetButtonText);

    // Button tooltip.
    resetButton.append("title")
        .text("Reset all selections and return to the default view");

    // Helper function for brush activation/deactivation
    function activateBrush() {
        if (g_brush_scatter) {
            g_brush_scatter.style("display", null);
        }
        const plotTitle = g_rightScatterPlot.select("text.plot-title");
        if (!plotTitle.empty()) {
            plotTitle.text("Attack vs. Defense (Click or Drag to Select)");
        }
        selectionMode = 'brush';
    }

    // Helper function for brush deactivation, updates scatter plot for multiclick mode
    function deactivateBrush() {
        if (g_brush_scatter) {
            g_brush_scatter.style("display", "none"); 
        }
        const plotTitle = g_rightScatterPlot.select("text.plot-title");
        if (!plotTitle.empty()) {
            plotTitle.text("Attack vs. Defense (Multi-Click Select Mode)");
        }
    }

    // Interaction and Update Functions
    function processPokemonClick(d_clicked) {
        if (g_brush_scatter && brush_scatter && d3.brushSelection(g_brush_scatter.node())) {
            brush_scatter.on("end", null);
            g_brush_scatter.call(brush_scatter.move, null);
            brush_scatter.on("end", brushed_scatter);
        }

        if (selectionMode === 'brush') {
            selectedPokemonData = [d_clicked];
            selectionMode = 'multiClick';
            deactivateBrush();
        } else {
            const index = selectedPokemonData.findIndex(p => p.id === d_clicked.id);
            if (index > -1) {
                selectedPokemonData.splice(index, 1);
            } else {
                selectedPokemonData.push(d_clicked);
            }

            if (selectedPokemonData.length === 0) {
                selectionMode = 'brush';
                activateBrush();
            }
        }
        updateAllVisuals();
    }

    // Handles the "end" event of a brush selection on the scatter plot.
    function brushed_scatter(event) {
        if (selectionMode !== 'brush') {
            activateBrush();
        }

        const selection = event.selection;
        let newSelectedPokemon = [];

        if (selection) {
            const [[x0, y0], [x1, y1]] = selection;
            newSelectedPokemon = cleanedData.filter(d => {
                const cx = x_rightScatter(d.Attack);
                const cy = y_rightScatter(d.Defense);
                return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
            });
        }
        selectedPokemonData = newSelectedPokemon;
        updateAllVisuals();
    }

    // Updates the text list of selected Pokémon names.
    function updateSelectedPokemonList() {
        const listElement = d3.select("#selected-pokemon-list");
        if (!listElement.empty()) {
            if (selectedPokemonData.length === 0) {
                listElement.text("selected pokemon: None");
            } else {
                const names = selectedPokemonData.map(p => p.Name);
                let displayText;
                if (names.length <= 10) {
                    displayText = names.join(", ");
                } else {
                    const firstTen = names.slice(0, 10).join(", ");
                    const remainingCount = names.length - 10;
                    displayText = `${firstTen}, and ${remainingCount} more`;
                }
                listElement.text("selected pokemon: " + displayText);
            }
        }
    }

    // Main function to update all visual components.
    function updateAllVisuals() {
        updateScatterPlotSelectionVisuals();
        updateBarGraph();
        updateStarPlot();
        updateSelectedPokemonList();
    }

    // Updates the visual appearance of scatter plot points based on selection.
    function updateScatterPlotSelectionVisuals() {
        g_rightScatterPlot.selectAll(".dotRight")
            .style("stroke", d_circle => selectedPokemonData.find(p => p.id === d_circle.id) ? "black" : "none")
            .style("opacity", d_circle => selectedPokemonData.find(p => p.id === d_circle.id) ? 1 : 0.6)
            .attr("r", d_circle => selectedPokemonData.find(p => p.id === d_circle.id) ? 6 : 4);
    }

    // Updates the bar graph based on selected Pokémon or overall averages.
    function updateBarGraph() {
        let dataForBarGraph;
        if (selectedPokemonData.length > 0) {
            barGraphTitleText.text(`Avg Stats (Selected: ${selectedPokemonData.length})`);
            dataForBarGraph = overallAvgStatsOrder.map(statKey => {
                return {
                    stat: statKey.replace("Sp_", "Sp. "),
                    value: d3.mean(selectedPokemonData, d => d[statKey])
                };
            });
        } else {
            barGraphTitleText.text("Overall Average Stats");
            dataForBarGraph = defaultOverallAvgStats;
        }

        // Updates the Y-axis domain based on the current data.
        const maxCurrentAvg = d3.max(dataForBarGraph, d => d.value);
        y_bar.domain([0, maxCurrentAvg * 1.1 || 10]);
        yAxis_bar_group.transition().duration(300).call(d3.axisLeft(y_bar).ticks(5));

        // Selects all bars, binds new data, and handles enter/update/exit selections.
        barsGroup.selectAll(".bar").data(dataForBarGraph, d => d.stat)
            .join(
                enter => enter.append("rect").attr("class", "bar")
                    .attr("x", d => x_bar(d.stat))
                    .attr("width", x_bar.bandwidth())
                    .attr("fill", d => statBarColors(d.stat))
                    .attr("y", y_bar(0))
                    .attr("height", 0)
                    .append("title").text(d => `${d.stat}: ${d.value ? d.value.toFixed(1) : 'N/A'}`),
                update => update,
                exit => exit.transition().duration(300)
                    .attr("y", y_bar(0)).attr("height", 0).remove() 
            )
            .transition().duration(300)
            .attr("y", d => y_bar(d.value || 0))
            .attr("height", d => barGraphHeight - y_bar(d.value || 0))
            .select("title").text(d => `${d.stat}: ${d.value ? d.value.toFixed(1) : 'N/A'}`);

        // Selects all bar value texts, binds data, and handles enter/update/exit.
        barValuesGroup.selectAll(".bar-value").data(dataForBarGraph, d => d.stat)
            .join(
                enter => enter.append("text").attr("class", "bar-value")
                    .attr("x", d => x_bar(d.stat) + x_bar.bandwidth() / 2)
                    .attr("text-anchor", "middle")
                    .style("font-size", "10px").style("fill", "#333")
                    .attr("y", d => y_bar(0) - 5)
                    .text(d => (d.value ? d.value.toFixed(1) : "")),
                update => update,
                exit => exit.transition().duration(300)
                    .attr("y", y_bar(0) - 5).text("").remove()
            )
            .transition().duration(300)
            .attr("y", d => y_bar(d.value || 0) - 5)
            .text(d => (d.value ? d.value.toFixed(1) : ""));
    }

    // Updates the star plot based on selected Pokémon or generation averages.
    function updateStarPlot() {
        starPlotPolygonsGroup.selectAll(".pokemon-stat-polygon").remove();
        starPlotPolygonsGroup.selectAll(".generation-average-polygon").remove();
        g_starPlot_container.select(".star-plot-message").remove();

        let dataForScaleCalculation;
        let calculatedRawMax = 0;

        if (selectedPokemonData.length > 0) {
            starPlotTitleText.text(`Selected Pokémon Stats (Count: ${selectedPokemonData.length})`);
            g_starLegend.style("display", "none");
            dataForScaleCalculation = selectedPokemonData;
            dataForScaleCalculation.forEach(p => {
                statsForStarPlot.forEach(stat => {
                    if ((p[stat] || 0) > calculatedRawMax) calculatedRawMax = (p[stat] || 0);
                });
            });
        } else {
            starPlotTitleText.text("Average Stats by Generation");
            g_starLegend.style("display", null);
            dataForScaleCalculation = avgStatsByGenerationForDefaults;
            dataForScaleCalculation.forEach(genAvg => {
                statsForStarPlot.forEach(stat => {
                    if ((genAvg[stat] || 0) > calculatedRawMax) calculatedRawMax = (genAvg[stat] || 0);
                });
            });
        }

        // Determine radial scale (rScaleStar).
        let currentMaxStatValue;
        if (calculatedRawMax > 0) {
            currentMaxStatValue = Math.max(50, Math.ceil(calculatedRawMax / 25) * 25);
        } else {
            let allDisplayValuesAreZero = false;
            if (dataForScaleCalculation && dataForScaleCalculation.length > 0) {
                allDisplayValuesAreZero = dataForScaleCalculation.every(d =>
                    statsForStarPlot.every(stat => (d[stat] || 0) === 0)
                );
            }
            currentMaxStatValue = allDisplayValuesAreZero ? 25 : 100;
        }

        // Update radial scale
        rScaleStar.domain([0, currentMaxStatValue]);
        drawOrUpdateStarPlotAxesAndGrid(currentMaxStatValue);

        // Draw polygons for selected Pokémon or generational averages.
        if (selectedPokemonData.length > 0) {
            selectedPokemonData.forEach(pokemon => {
                const dataPoints = statsForStarPlot.map((statName, idx) => {
                    const angle = angleSliceStar * idx - Math.PI / 2;
                    const value = pokemon[statName] || 0;
                    return [rScaleStar(value) * Math.cos(angle), rScaleStar(value) * Math.sin(angle)];
                });
                starPlotPolygonsGroup.append("polygon")
                    .datum(pokemon)
                    .attr("class", "pokemon-stat-polygon")
                    .attr("points", dataPoints.map(p => p.join(",")).join(" "))
                    .style("fill", "none")
                    .style("stroke", typeColorScale(pokemon.Type_1))
                    .style("stroke-width", "2px").attr("opacity", 0.7)
                    .append("title").text(d => `${d.Name} (Gen ${d.Generation}, ${d.Type_1})\n` + statsForStarPlot.map(s => `${s.replace("Sp_", "Sp.").replace("_"," ")}: ${d[s] || 'N/A'}`).join('\n'));
            });
        } else {
            avgStatsByGenerationForDefaults.forEach(genData => {
                const dataPoints = statsForStarPlot.map((statName, idx) => {
                    const angle = angleSliceStar * idx - Math.PI / 2;
                    const value = genData[statName] || 0;
                    return [rScaleStar(value) * Math.cos(angle), rScaleStar(value) * Math.sin(angle)];
                });
                // Appends a <polygon> for each generation's average stats.
                starPlotPolygonsGroup.append("polygon")
                    .datum(genData)
                    .attr("class", "generation-average-polygon")
                    .attr("points", dataPoints.map(p => p.join(",")).join(" "))
                    .style("fill", "none")
                    .style("stroke", generationPlotColorScale(genData.generation))
                    .style("stroke-width", "2px").attr("opacity", 0.7)
                    .append("title").text(d => `Gen ${d.generation}\n` + statsForStarPlot.map(s => `${s.replace("Sp_", "Sp.").replace("_"," ")}: ${d[s] ? d[s].toFixed(1) : 'N/A'}`).join('\n'));
            });
        }
    }

    // Initialize visuals
    activateBrush();
    updateAllVisuals();
    updateAllVisuals(); // 2 calls are needed to properly draw all graphs for some reason

}).catch(function(error){
    console.log(error);
});