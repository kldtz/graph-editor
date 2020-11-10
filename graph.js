class Graph {
    constructor(opts) {
        this.nodes = opts.nodes;
        // map source and target id to respective node
        var edgeId = 1;
        this.edges = opts.edges.map(
            e => {
                return {
                    id: edgeId++,
                    source: this.nodes.find(n => n.id == e.source),
                    target: this.nodes.find(n => n.id == e.target)
                }
            });
        this.element = opts.element;
        this.draw();
    }

    draw() {
        this.width = 1000;
        this.height = 800;

        const svg = this.element.append('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .style("border", "solid 1px");

        // add zoom behavior to whole svg
        const zoom = d3.zoom()
            .on('zoom', (event) => {
                this.plot.attr('transform', event.transform);
            });
        svg.call(zoom);

        // drag behavior
        const graph = this;
        this.drag = d3.drag()
            //.subject(d => { return { x: d.x, y: d.y } })
            .on("drag", function (event, d) {
                d.x = event.x;
                d.y = event.y;
                d3.select(this).raise().attr("transform", d => "translate(" + [d.x, d.y] + ")");
                graph.addEdges();
            });

        // populate svg
        this.plot = svg.append('g');

        // circles need to be added last to be drawn above the paths
        this.paths = this.plot.append('g').classed('edges', true);
        this.circles = this.plot.append('g').classed('nodes', true);

        this.update();
    }

    update() {
        this.addEdges();
        this.addNodes();
    }

    addNodes() {
        // enter node groups
        const nodes = this.circles.selectAll("g")
            .data(this.nodes)
            .enter()
            .append("g")
            .attr("class", "nodes")
            .attr("transform", d => { return "translate(" + d.x + "," + d.y + ")"; })
            .call(this.drag);
        // enter circles
        nodes.append("circle")
            .attr("r", "10px")
            .attr("stroke", "black")
            .attr("fill", "white")
        // enter labels
        nodes.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", 5)
            .text(d => { return d.title; });
        // remove old groups
        nodes.exit().remove();
    }

    addEdges() {
        this.paths.selectAll("path")
            .data(this.edges)
            // update existing paths
            .attr("d", d => {
                return "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;
            })
            // add new paths
            .enter()
            .append("path")
            .attr("d", d => {
                return "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;
            })
            .style("stroke", "red")
            .exit()
            .remove();
    }
}

const chart = new Graph({
    element: d3.select("#graph"),
    nodes: [{ id: 1, title: "A", x: 30, y: 50 },
    { id: 2, title: "B", x: 150, y: 80 },
    { id: 3, title: "C", x: 90, y: 120 }],
    edges: [
        { source: 1, target: 2 },
        { source: 2, target: 3 }
    ]
})