let abFilter = 25;
const width = window.innerWidth;
const height = window.innerHeight;

// Visualization 1: Bar Chart - Average Stats of Legendary Pokemon
let statsLeft = width/2, statsTop = 0;
let statsMargin = {top: 50, right: 30, bottom: 80, left: 80},
    statsWidth = width/2 - statsMargin.left - statsMargin.right,
    statsHeight = height/2 - statsMargin.top - statsMargin.bottom;

// Visualization 2: Scatter Plot - Attack vs Special Attack for each Pokemon
let scatterLeft = 0, scatterTop = 0;
let scatterMargin = {top: 50, right: 30, bottom: 80, left: 80},
    scatterWidth = width/2 - scatterMargin.left - scatterMargin.right,
    scatterHeight = height/2 - scatterMargin.top - scatterMargin.bottom;

// Define Pokemon type colors
const typeColors = {
    "Bug": "#A8B820",
    "Dark": "#000000",
    "Dragon": "#7038F8",
    "Electric": "#F8D030",
    "Fairy": "#EE99AC",
    "Fighting": "#C03028",
    "Fire": "#F08030",
    "Flying": "#B3B3C8",
    "Ghost": "#705898",
    "Grass": "#78C850",
    "Ground": "#E0C068",
    "Ice": "#98D8D8",
    "Normal": "#A8A878",
    "Poison": "#A040A0",
    "Psychic": "#F85888",
    "Rock": "#B8A038",
    "Steel": "#B8B8D0",
    "Water": "#6890F0"
};

// Global interaction state
let selectedPokemon = [];
let filteredData = [];
let currentBarData = [];

// plots
d3.csv("pokemon_alopez247.csv").then(rawData => {
    console.log("rawData", rawData);
    // Convert string values to numbers
    rawData.forEach(function(d) {
        d.HP = +d.HP;
        d.Attack = +d.Attack;
        d.Defense = +d.Defense;
        d.Sp_Atk = +d.Sp_Atk;
        d.Sp_Def = +d.Sp_Def;
        d.Speed = +d.Speed;
        d.Total = +d.Total;
        d.Generation = +d.Generation;
        d.Height_m = +d.Height_m;
        d.Weight_kg = +d.Weight_kg;
        d.Catch_Rate = +d.Catch_Rate;
        d.Number = +d.Number;
    });

    // Initialize filtered data
    filteredData = rawData;

    // Select the SVG element
    const svg = d3.select("svg");
    
    // Select the tooltip div that's already in the HTML
    const tooltip = d3.select("#tooltip");

    //-------------------------------------------------------------------
    // Visualization 1: Interactive Bar Chart with Animations
    //-------------------------------------------------------------------
    const g2 = svg.append("g")
        .attr("width", statsWidth + statsMargin.left + statsMargin.right)
        .attr("height", statsHeight + statsMargin.top + statsMargin.bottom)
        .attr("transform", `translate(${statsLeft + statsMargin.left}, ${statsTop + statsMargin.top})`);
    
    // Add title (will be updated dynamically)
    const barTitle = g2.append("text")
        .attr("x", statsWidth / 2)
        .attr("y", -20)
        .attr("font-size", "18px")
        .attr("text-anchor", "middle")
        .text("Bar Graph: Average Stats of Legendary Pokemon");

    // Filter for legendary Pokemon initially
    const legendaryPokemon = rawData.filter(d => d.isLegendary === "True" || d.isLegendary === true);
    console.log(`Number of Legendary Pokemon: ${legendaryPokemon.length}`);
    currentBarData = legendaryPokemon;

    // Log all legendary Pokemon
    console.log("List of Legendary Pokemon:");
    legendaryPokemon.forEach(pokemon => {
        console.log(`#${pokemon.Number} - ${pokemon.Name} (${pokemon.Type_1}${pokemon.Type_2 ? "/" + pokemon.Type_2 : ""})`);
    });
    
    // Function to update bar chart with animation
    function updateBarChart(data, title) {
        // Calculate average stats
        const statNames = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];
        const displayNames = ["HP", "Attack", "Defense", "Sp. Atk", "Sp. Def", "Speed"];

        const stats = statNames.map((stat, i) => {
            return {
                name: stat,
                displayName: displayNames[i],
                value: data.length > 0 ? d3.mean(data, d => d[stat]) : 0
            };
        });

        // Update title with fade animation
        barTitle.transition()
            .duration(300)
            .style("opacity", 0)
            .transition()
            .duration(300)
            .style("opacity", 1)
            .text(title);

        // Update Y scale
        const y2 = d3.scaleLinear()
            .domain([0, d3.max(stats, d => d.value) * 1.1])
            .range([statsHeight, 0]);

        // Update Y axis with animation
        g2.select(".y-axis")
            .transition()
            .duration(750)
            .call(d3.axisLeft(y2));

        // Update bars with data join
        const bars = g2.selectAll(".stat-bar")
            .data(stats, d => d.name);

        // Remove old bars
        bars.exit()
            .transition()
            .duration(500)
            .attr("height", 0)
            .attr("y", statsHeight)
            .style("opacity", 0)
            .remove();

        // Update existing bars
        bars.transition()
            .duration(750)
            .attr("y", d => y2(d.value))
            .attr("height", d => statsHeight - y2(d.value));

        // Add new bars
        bars.enter()
            .append("rect")
            .attr("class", "stat-bar")
            .attr("x", d => x2(d.name))
            .attr("y", statsHeight)
            .attr("width", x2.bandwidth())
            .attr("height", 0)
            .attr("fill", "steelblue")
            .style("opacity", 0)
            .on("mouseover", function(d) {
                d3.select(this).attr("opacity", 0.8);
                tooltip
                    .style("opacity", 0.9)
                    .style("left", (d3.event.pageX + 10) + "px")
                    .style("top", (d3.event.pageY - 28) + "px")
                    .html(`<strong>${d.displayName}</strong><br>Average: ${Math.round(d.value)}`);
            })
            .on("mouseout", function() {
                d3.select(this).attr("opacity", 1);
                tooltip.style("opacity", 0);
            })
            .transition()
            .duration(750)
            .delay((d, i) => i * 100) // Staggered animation
            .attr("y", d => y2(d.value))
            .attr("height", d => statsHeight - y2(d.value))
            .style("opacity", 1);

        // Update value labels
        const labels = g2.selectAll(".stat-label")
            .data(stats, d => d.name);

        labels.exit()
            .transition()
            .duration(500)
            .style("opacity", 0)
            .remove();

        labels.transition()
            .duration(750)
            .attr("y", d => y2(d.value) - 5)
            .text(d => Math.round(d.value));

        labels.enter()
            .append("text")
            .attr("class", "stat-label")
            .attr("x", d => x2(d.name) + x2.bandwidth() / 2)
            .attr("y", statsHeight)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .style("opacity", 0)
            .transition()
            .duration(750)
            .delay((d, i) => i * 100)
            .attr("y", d => y2(d.value) - 5)
            .style("opacity", 1)
            .text(d => Math.round(d.value));
    }

    // Set up initial scales and axes
    const statNames = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];
    const displayNames = ["HP", "Attack", "Defense", "Sp. Atk", "Sp. Def", "Speed"];

    const x2 = d3.scaleBand()
        .domain(statNames)
        .range([0, statsWidth])
        .padding(0.3);

    // X axis with nice display names
    g2.append("g")
        .attr("transform", `translate(0, ${statsHeight})`)
        .call(d3.axisBottom(x2).tickFormat((d, i) => displayNames[i]))
        .selectAll("text")
        .attr("y", "10")
        .attr("x", "-5")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-40)");

    // Y axis (will be updated dynamically)
    g2.append("g")
        .attr("class", "y-axis");

    // Axis labels
    g2.append("text")
        .attr("x", statsWidth / 2)
        .attr("y", statsHeight + 50)
        .attr("font-size", "14px")
        .attr("text-anchor", "middle")
        .text("Stat");

    g2.append("text")
        .attr("x", -statsHeight / 2)
        .attr("y", -50)
        .attr("font-size", "14px")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Average Stats");

    // Initialize bar chart
    updateBarChart(legendaryPokemon, "Bar Graph: Average Stats of Legendary Pokemon");

    //-------------------------------------------------------------------
    // Visualization 2: Interactive Scatter Plot with Selection and Brushing
    //-------------------------------------------------------------------
    
    // Create main group for the scatter plot
    const g1 = svg.append("g")
        .attr("transform", `translate(${scatterLeft + scatterMargin.left}, ${scatterTop + scatterMargin.top})`);
    
    // Add title
    g1.append("text")
        .attr("x", scatterWidth / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .text("Scatter Plot: Pokemon Attack vs. Special Attack (Overview)");
    
    // X scale - Attack
    const x1 = d3.scaleLinear()
        .domain([0, d3.max(rawData, d => d.Attack) * 1.05])
        .range([0, scatterWidth]);
    
    // Y scale - Special Attack
    const y1 = d3.scaleLinear()
        .domain([0, d3.max(rawData, d => d.Sp_Atk) * 1.05])
        .range([scatterHeight, 0]);
    
    // X axis
    g1.append("g")
        .attr("transform", `translate(0, ${scatterHeight})`)
        .call(d3.axisBottom(x1))
        .selectAll("text")
        .attr("y", "10")
        .attr("x", "-5")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-40)");
    
    // Y axis
    g1.append("g")
        .call(d3.axisLeft(y1));
    
    // X label
    g1.append("text")
        .attr("x", scatterWidth / 2)
        .attr("y", scatterHeight + 50)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .text("Attack");
    
    // Y label
    g1.append("text")
        .attr("x", -scatterHeight / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("font-size", "14px")
        .text("Special Attack");

    // Add brushing functionality
    const brush = d3.brush()
        .extent([[0, 0], [scatterWidth, scatterHeight]])
        .on("brush end", brushed);

    const brushGroup = g1.append("g")
        .attr("class", "brush")
        .call(brush);
    
    // Add circles for each Pokemon with selection capability
    const circles = g1.selectAll(".pokemon-circle")
        .data(rawData)
        .enter()
        .append("circle")
        .attr("class", "pokemon-circle")
        .attr("cx", d => x1(d.Attack))
        .attr("cy", d => y1(d.Sp_Atk))
        .attr("r", 4)
        .attr("fill", d => typeColors[d.Type_1])
        .attr("stroke", "#333")
        .attr("stroke-width", 0.5)
        .attr("opacity", 0.7)
        .on("click", function(d) {
            // Selection interaction
            const isSelected = selectedPokemon.includes(d);
            
            if (isSelected) {
                // Deselect
                selectedPokemon = selectedPokemon.filter(p => p !== d);
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("stroke", "#333")
                    .attr("stroke-width", 0.5)
                    .attr("r", 4);
            } else {
                // Select
                selectedPokemon.push(d);
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("stroke", "#ff0000")
                    .attr("stroke-width", 3)
                    .attr("r", 6);
            }
            
            // Update focus views based on selection
            if (selectedPokemon.length > 0) {
                const pokemonNames = selectedPokemon.map(p => p.Name).join(", ");
                const title = selectedPokemon.length === 1 ? 
                    `Selected Pokemon: ${pokemonNames}` : 
                    `Selected Pokemon (${selectedPokemon.length}): ${pokemonNames}`;
                updateBarChart(selectedPokemon, title);
                updateParallelCoordinates(selectedPokemon);
            } else {
                updateBarChart(currentBarData, "Bar Graph: Average Stats of Legendary Pokemon");
                updateParallelCoordinates(rawData);
            }
        })
        .on("mouseover", function(d) {
            if (!selectedPokemon.includes(d)) {
                d3.select(this)
                    .transition()
                    .duration(100)
                    .attr("r", 6)
                    .attr("opacity", 1)
                    .attr("stroke-width", 1.5);
            }
            
            tooltip
                .style("opacity", 0.9)
                .style("left", (d3.event.pageX + 10) + "px")
                .style("top", (d3.event.pageY - 10) + "px")
                .html(`
                    <strong>${d.Name} #${d.Number}</strong><br>
                    <span style="color:${typeColors[d.Type_1]}">●</span> ${d.Type_1}${d.Type_2 ? ' / ' + d.Type_2 : ''}<br>
                    Attack: ${d.Attack}<br>
                    Sp. Attack: ${d.Sp_Atk}<br>
                    HP: ${d.HP}<br>
                    Defense: ${d.Defense}<br>
                    Sp. Defense: ${d.Sp_Def}<br>
                    Speed: ${d.Speed}<br>
                    Total: ${d.Total}
                `);
        })
        .on("mouseout", function(d) {
            if (!selectedPokemon.includes(d)) {
                d3.select(this)
                    .transition()
                    .duration(100)
                    .attr("r", 4)
                    .attr("opacity", 0.7)
                    .attr("stroke-width", 0.5);
            }
            tooltip.style("opacity", 0);
        });

    // Brushing function
    function brushed() {
        const selection = d3.event.selection;
        if (selection) {
            const [[x0, y0], [x1_brush, y1_brush]] = selection;
            
            // Filter data based on brush selection
            filteredData = rawData.filter(d => {
                const x = x1(d.Attack);
                const y = y1(d.Sp_Atk);
                return x0 <= x && x <= x1_brush && y0 <= y && y <= y1_brush;
            });
            
            // Highlight brushed circles with animation
            circles.transition()
                .duration(300)
                .attr("opacity", d => {
                    const x = x1(d.Attack);
                    const y = y1(d.Sp_Atk);
                    const inBrush = x0 <= x && x <= x1_brush && y0 <= y && y <= y1_brush;
                    return inBrush ? 1 : 0.2;
                })
                .attr("r", d => {
                    const x = x1(d.Attack);
                    const y = y1(d.Sp_Atk);
                    const inBrush = x0 <= x && x <= x1_brush && y0 <= y && y <= y1_brush;
                    return inBrush ? 5 : 3;
                });
            
            // Update focus views with filtered data (if no selection active)
            if (selectedPokemon.length === 0) {
                updateBarChart(filteredData, `Brushed Pokemon (${filteredData.length})`);
                updateParallelCoordinates(filteredData);
            }
        } else {
            // Reset when brush is cleared
            filteredData = rawData;
            circles.transition()
                .duration(300)
                .attr("opacity", 0.7)
                .attr("r", 4);
            
            if (selectedPokemon.length === 0) {
                updateBarChart(currentBarData, "Bar Graph: Average Stats of Legendary Pokemon");
                updateParallelCoordinates(rawData);
            }
        }
    }
    
    // Add legend for types
    const types = Array.from(new Set(rawData.map(d => d.Type_1)));
    
    const legend = svg.append("g")
        .attr("transform", `translate(40, ${scatterTop + scatterMargin.top + scatterHeight + 70})`);

    legend.append("text")
        .attr("x", 170)  
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("font-weight", "bold")
        .text("Pokemon Types");
    
    const columnsCount = 3;
    const legendItemsPerColumn = Math.ceil(types.length / columnsCount);
    
    types.forEach((type, i) => {
        const column = Math.floor(i / legendItemsPerColumn);
        const row = i % legendItemsPerColumn;
        
        legend.append("circle")
            .attr("cx", column * 150 + 10)
            .attr("cy", row * 20 + 0)
            .attr("r", 5)
            .attr("fill", typeColors[type]);
        
        legend.append("text")
            .attr("x", column * 150 + 20)
            .attr("y", row * 20 + 4)
            .attr("font-size", "12px")
            .text(type);
    });

    //-------------------------------------------------------------------
    // VISUALIZATION 3: Enhanced Parallel Coordinates with Animation
    //-------------------------------------------------------------------
    
    const parallelMargin = {top: 140, right: 70, bottom: -30, left: 70};
    const parallelWidth = width - parallelMargin.left - parallelMargin.right;
    const parallelHeight = height/2.5 - parallelMargin.top - parallelMargin.bottom;
    
    const g3 = svg.append("g")
        .attr("transform", `translate(${parallelMargin.left}, ${height/2 + parallelMargin.top})`);
    
    const parallelTitle = g3.append("text")
        .attr("x", parallelWidth / 2)
        .attr("y", -40)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .text("Pokemon Stats by Type (Parallel Coordinates)");
    
    // Dimensions for parallel coordinates
    const dimensions = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];
    const dimensionLabels = ["HP", "Attack", "Defense", "Sp. Atk", "Sp. Def", "Speed"];
    
    // Create scales for each dimension
    const y3 = {};
    dimensions.forEach((dimension) => {
        y3[dimension] = d3.scaleLinear()
            .domain([0, d3.max(rawData, d => d[dimension])])
            .range([parallelHeight, 0]);
    });
    
    const x3 = d3.scalePoint()
        .range([0, parallelWidth])
        .domain(dimensions);
    
    // Create axis for each dimension
    const axes = [];
    dimensions.forEach((dimension, i) => {
        const axis = g3.append("g")
            .attr("class", `axis-${dimension}`)
            .attr("transform", `translate(${x3(dimension)}, 0)`)
            .call(d3.axisLeft(y3[dimension]));
            
        axis.append("text")
            .attr("x", 0)
            .attr("y", -10)
            .attr("text-anchor", "middle")
            .attr("fill", "#000")
            .attr("font-size", "12px")
            .text(dimensionLabels[i]);
        
        axes.push(axis);
    });
    
    // Add vertical guides
    dimensions.forEach(dimension => {
        g3.append("g")
            .attr("transform", `translate(${x3(dimension)}, 0)`)
            .append("line")
            .attr("y1", 0)
            .attr("y2", parallelHeight)
            .attr("stroke", "#ddd")
            .attr("stroke-width", 1);
    });
    
    const line = d3.line()
        .defined(d => !isNaN(d[1]))
        .x(d => x3(d[0]))
        .y(d => y3[d[0]](d[1]));
    
    // Function to update parallel coordinates with animation
    function updateParallelCoordinates(data) {
        // Update scales
        dimensions.forEach(dimension => {
            y3[dimension].domain([0, d3.max(data.length > 0 ? data : rawData, d => d[dimension])]);
        });

        // Update axes with animation
        dimensions.forEach((dimension) => {
            g3.select(`.axis-${dimension}`)
                .transition()
                .duration(750)
                .call(d3.axisLeft(y3[dimension]));
        });

        // Update lines
        const lines = g3.selectAll(".pokemon-line")
            .data(data, d => d.Number);

        // Remove old lines
        lines.exit()
            .transition()
            .duration(500)
            .style("opacity", 0)
            .remove();

        // Update existing lines
        lines.transition()
            .duration(750)
            .attr("d", d => line(dimensions.map(dimension => [dimension, +d[dimension]])))
            .style("opacity", 0.5);

        // Add new lines
        lines.enter()
            .append("path")
            .attr("class", "pokemon-line")
            .attr("d", d => line(dimensions.map(dimension => [dimension, 0])))
            .attr("fill", "none")
            .attr("stroke", d => typeColors[d.Type_1])
            .attr("stroke-width", 1.2)
            .style("opacity", 0)
            .on("mouseover", function(d) {
                d3.select(this)
                    .attr("stroke-width", 3)
                    .style("opacity", 1);
                
                tooltip
                    .style("opacity", 0.9)
                    .style("left", (d3.event.pageX + 10) + "px")
                    .style("top", (d3.event.pageY - 28) + "px")
                    .html(`<strong>${d.Name}</strong><br>Type: ${d.Type_1}${d.Type_2 ? "/" + d.Type_2 : ""}`);
            })
            .on("mouseout", function() {
                d3.select(this)
                    .attr("stroke-width", 1.2)
                    .style("opacity", 0.5);
                tooltip.style("opacity", 0);
            })
            .transition()
            .duration(750)
            .delay((d, i) => Math.min(i * 5, 1000)) // Cap delay to prevent long waits
            .attr("d", d => line(dimensions.map(dimension => [dimension, +d[dimension]])))
            .style("opacity", 0.5);
    }
    
    // Initialize parallel coordinates
    updateParallelCoordinates(rawData);

    // Enhanced interactive buttons with animations
    const buttonContainer = svg.append("g")
        .attr("transform", `translate(20, 20)`);

    // Clear selections button
    const clearButton = buttonContainer.append("g");
    
    clearButton.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 120)
        .attr("height", 30)
        .attr("fill", "#e74c3c")
        .attr("rx", 5)
        .attr("cursor", "pointer")
        .on("mouseover", function() {
            d3.select(this).attr("fill", "#c0392b");
        })
        .on("mouseout", function() {
            d3.select(this).attr("fill", "#e74c3c");
        })
        .on("click", function() {
            // Clear all selections with animation
            selectedPokemon = [];
            circles.transition()
                .duration(300)
                .attr("stroke", "#333")
                .attr("stroke-width", 0.5)
                .attr("r", 4)
                .attr("opacity", 0.7);
            
            // Clear brush
            brushGroup.call(brush.move, null);
            
            // Reset to original data
            updateBarChart(legendaryPokemon, "Bar Graph: Average Stats of Legendary Pokemon");
            updateParallelCoordinates(rawData);
        });

    clearButton.append("text")
        .attr("x", 60)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .attr("font-size", "12px")
        .text("Clear Selection")
        .attr("pointer-events", "none");

    // Instructions
    svg.append("text")
        .attr("x", 20)
        .attr("y", height - 40)
        .attr("font-size", "12px")
        .attr("fill", "#666")
        .text("Instructions:");

    svg.append("text")
        .attr("x", 20)
        .attr("y", height - 25)
        .attr("font-size", "11px")
        .attr("fill", "#666")
        .text("• Click Pokemon dots to select them • Drag to brush filter • Use Clear Selection to reset");
});