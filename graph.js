class Graph {
    constructor(opts) {
        this.nodes = opts.nodes;
        // current id == maximum id
        this.nodeId = this.nodes.reduce((prev, curr) => {
            return (prev.id > curr.id) ? prev.id : curr.id
        });
        // map source and target id to respective node
        this.edges = opts.edges.map(
            e => {
                return {
                    source: this.nodes.find(n => n.id == e.source),
                    target: this.nodes.find(n => n.id == e.target)
                }
            });
        this.element = opts.element;
        this.state = {
            mouseOverNode: null,
            shiftNodeDrag: false,
            selectedNode: null,
            selectedEdge: null,
        }
        this.consts = {
            BACKSPACE_KEY: 8,
            DELETE_KEY: 46,
            NODE_RADIUS: 50,
            CLICK_DISTANCE: 5,
        }
        this.draw();
    }

    draw() {
        this.width = 1000;
        this.height = 800;

        d3.select(window).on("keydown", (event) => {
            switch (event.keyCode) {
                case this.consts.BACKSPACE_KEY:
                case this.consts.DELETE_KEY:
                    event.preventDefault();
                    if (this.state.selectedNode) {
                        const selected = this.state.selectedNode;
                        this.nodes = this.nodes.filter(node => { return selected !== node; });
                        this.edges = this.edges.filter(edge => { return edge.source !== selected && edge.target !== selected; });
                        this.update();
                    } else if (this.state.selectedEdge) {
                        const selected = this.state.selectedEdge;
                        this.edges = this.edges.filter(edge => { return selected !== edge; });
                        this.updateEdges();
                    }
                    break;
            }
        });

        const svg = this.element.append('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .style("border", "solid 1px");

        // add zoom behavior to whole svg
        const zoom = d3.zoom()
            .clickDistance(this.consts.CLICK_DISTANCE)
            .on('zoom', (event) => {
                this.plot.attr('transform', event.transform);
            });
        // prepare SVG
        svg
            .on("mousedown", (event, d) => {
                if (event.shiftKey) {
                    const pos = d3.pointer(event, graph.plot.node())
                    const node = { id: ++this.nodeId, title: this.nodeId.toString(), x: pos[0], y: pos[1] }
                    this.nodes.push(node);
                    this.updateNodes();
                }
            })
            .on('click', () => {
                this.state.selectedNode = null;
                this.state.selectedEdge = null;
                this.update();
            })
            .call(zoom);

        // define objects for later use
        const defs = svg.append('defs');
        // arrow marker for graph links
        defs.append('marker')
            .attr('id', 'end-arrow')
            // keep same scale
            .attr('markerUnits', 'userSpaceOnUse')
            .attr('viewBox', '-20 -10 20 20')
            .attr('markerWidth', 20)
            .attr('markerHeight', 20)
            // tip of marker at circle (cut off part of tip that is thinner than line)
            .attr('refX', this.consts.NODE_RADIUS - 3)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M-20,-10L0,0L-20,10');
        // arrow marker for leading arrow
        defs.append('marker')
            .attr('id', 'mark-end-arrow')
            // keep same scale
            .attr('markerUnits', 'userSpaceOnUse')
            .attr('viewBox', '-20 -10 20 20')
            .attr('markerWidth', 20)
            .attr('markerHeight', 20)
            // tip of marker at end of line
            .attr('refX', 0)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M-20,-10L0,0L-20,10');

        // drag behavior
        const graph = this;
        this.drag = d3.drag()
            .clickDistance(this.consts.CLICK_DISTANCE)
            .on("start", (event, d) => {
                if (graph.state.shiftNodeDrag) {
                    // add arrow tip
                    graph.dragLine.style('marker-end', 'url(#mark-end-arrow)');
                }
            })
            .on("drag", function (event, d) {
                if (graph.state.shiftNodeDrag) {
                    const pos = d3.pointer(event, graph.plot.node());
                    graph.dragLine.attr('d', 'M' + d.x + ',' + d.y + 'L' + pos[0] + ',' + pos[1]);
                } else {
                    d.x = event.x;
                    d.y = event.y;
                    d3.select(this).raise().attr("transform", d => "translate(" + [d.x, d.y] + ")");
                    graph.updateEdges();
                }
            })
            .on("end", (event, source) => {
                this.state.shiftNodeDrag = false;
                // hide line, remove arrow tip
                this.dragLine.classed("hidden", true).style("marker-end", "none");

                const target = this.state.mouseOverNode;

                if (!source || !target) return;

                // source and target are different
                if (source !== target) {
                    // remove edge between source and target (any order)
                    this.edges = this.edges.filter(edge => {
                        return !(edge.source === source && edge.target === target) &&
                            !(edge.source === target && edge.target === source);
                    });
                    var newEdge = { source: source, target: target };
                    this.edges.push(newEdge);
                    this.updateEdges();
                }
            });

        // populate svg
        this.plot = svg.append('g');

        // displayed when dragging between nodes
        this.dragLine = this.plot.append('path')
            .classed('edge', true)
            .classed('hidden', true)
            .attr('d', 'M0,0L0,0');

        // circles need to be added last to be drawn above the paths
        this.paths = this.plot.append('g').classed('edges', true);
        this.circles = this.plot.append('g').classed('nodes', true);

        this.update();
    }

    update() {
        this.updateEdges();
        this.updateNodes();
    }

    updateNodes() {
        // enter node groups
        const nodes = this.circles.selectAll("g")
            .data(this.nodes, d => { return d.id; })
            .join(
                enter => {
                    const nodes = enter.append("g")
                        .attr("class", "node")
                        .attr("transform", d => { return "translate(" + d.x + "," + d.y + ")"; })
                        .on("mousedown", (event, d) => {
                            event.stopPropagation();
                            if (event.shiftKey) {
                                this.state.shiftNodeDrag = true;
                                this.dragLine.classed('hidden', false)
                                    .attr('d', 'M' + d.x + ',' + d.y + 'L' + d.x + ',' + d.y);
                            }
                        })
                        .on("mouseover", (event, d) => { this.state.mouseOverNode = d; })
                        .on("mouseout", () => { this.state.mouseOverNode = null; })
                        .on("click", (event, d) => {
                            event.stopPropagation();
                            this.state.selectedNode = d;
                            this.state.selectedEdge = null;
                            this.update();
                        })
                        .call(this.drag);
                    // enter circles
                    nodes.append("circle")
                        .attr("r", String(this.consts.NODE_RADIUS));
                    // enter labels
                    nodes.append("text")
                        .attr("dy", 5)
                        .text(d => { return d.title; });
                },
                update => {
                    update.attr("transform", d => { return "translate(" + d.x + "," + d.y + ")"; })
                        .classed("selected", d => { return d === this.state.selectedNode; })
                },
                exit => exit.remove()
            );
    }

    updateEdges() {
        this.paths.selectAll(".edge")
            .data(this.edges, d => {
                return String(d.source.id) + "+" + String(d.target.id);
            })
            .join(
                enter => enter.append("path")
                    .classed("edge", true)
                    .attr("d", d => {
                        return "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;
                    })
                    .on("click", (event, d) => {
                        event.stopPropagation();
                        this.state.selectedEdge = d;
                        this.state.selectedNode = null;
                        this.update();
                    })
                    .style('marker-end', 'url(#end-arrow)'),
                update => update.attr("d", d => {
                    return "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;
                })
                    .classed("selected", d => { return d === this.state.selectedEdge; }),
                exit => exit.remove()
            );
    }
}

const chart = new Graph({
    element: d3.select("#graph"),
    nodes: [{ id: 1, title: "A", x: 250, y: 150 },
    { id: 2, title: "B", x: 800, y: 500 },
    { id: 3, title: "C", x: 200, y: 700 }],
    edges: [
        { source: 1, target: 2 },
        { source: 2, target: 3 }
    ]
})