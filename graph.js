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
        }
        this.consts = {
            DELETE_KEY: 46,
        }
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
            // .on("keydown", (event, d) => {
            //     console.log("Keydown");
            //     switch (event.keyCode) {
            //         case this.consts.DELETE_KEY:
            //             event.preventDefault();
            //             this.nodes = this.nodes.filter(node => { return this.state.selectedNode !== node; });
            //             this.updateNodes();
            //             this.edges = this.edges.filter(edge => { return edge.source !== this.state.selectedNode && this.edge.target !== this.state.selectedNode; });
            //             this.updateEdges();
            //             break;
            //     }
            // })
            .call(zoom);

        // drag behavior
        const graph = this;
        this.drag = d3.drag()
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
            .on("end", (event, d) => {
                this.dragEnd(event, d);
            })
            ;

        // populate svg
        this.plot = svg.append('g');

        // displayed when dragging between nodes
        this.dragLine = this.plot.append('path')
            .attr('class', 'hidden')
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
            .enter()
            .append("g")
            .attr("class", "node")
            .attr("transform", d => { return "translate(" + d.x + "," + d.y + ")"; })
            .on("mousedown", (event, d) => this.nodeMouseDown(event, d))
            .on("mouseup", (event, d) => { console.log("MOUSEUP"); })
            .on("mouseover", (event, d) => { this.state.mouseOverNode = d; })
            .on("mouseout", () => { this.state.mouseOverNode = null; })
            .call(this.drag)
            ;
        // enter circles
        nodes.append("circle");
        // enter labels
        nodes.append("text")
            .attr("dy", 5)
            .text(d => { return d.title; });
        // remove old groups
        nodes.exit().remove();
    }

    nodeMouseDown(event, d) {
        event.stopPropagation();
        if (event.shiftKey) {
            this.state.shiftNodeDrag = true;
            this.dragLine.classed('hidden', false)
                .attr('d', 'M' + d.x + ',' + d.y + 'L' + d.x + ',' + d.y);
        }
    }

    //TODO: try to do node selection here (since mouseup doesn't work)
    dragEnd(event, source) {
        this.state.shiftNodeDrag = false;
        this.dragLine.classed("hidden", true);

        const target = this.state.mouseOverNode;
        this.state.selectedNode = target;

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
    }

    updateEdges() {
        this.paths.selectAll("path")
            .data(this.edges, d => {
                return String(d.source.id) + "+" + String(d.target.id);
            })
            .join(
                enter => enter.append("path")
                    .attr("d", d => {
                        return "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;
                    }),
                update => update.attr("d", d => {
                    return "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;
                }),
                exit => exit.remove()
            );
    }
}

const chart = new Graph({
    element: d3.select("#graph"),
    nodes: [{ id: 1, title: "A", x: 250, y: 150 },
    { id: 2, title: "B", x: 400, y: 250 },
    { id: 3, title: "C", x: 200, y: 300 }],
    edges: [
        { source: 1, target: 2 },
        { source: 2, target: 3 }
    ]
})