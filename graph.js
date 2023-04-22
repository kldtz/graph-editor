class Graph {
  constructor(opts) {
    this.svg = opts.svg;
    this.nodes = opts.nodes;
    this.edges = this.#mapEdges(opts.edges);
    // current id == maximum id
    this.nodeId = this.nodes.reduce(
      (acc, curr) => (acc > curr.id ? acc : curr.id),
      0
    );
    this.state = {
      mouseOverNode: null,
      shiftNodeDrag: false,
      selectedNode: null,
      selectedEdge: null,
    };
    this.consts = {
      BACKSPACE_KEY: 8,
      DELETE_KEY: 46,
      NODE_RADIUS: 50,
      CLICK_DISTANCE: 5,
      ENTER_KEY: 13,
    };
    this.#draw();
  }

  #mapEdges(edges) {
    // map source and target id to respective node
    return edges.map((e) => ({
      source: this.nodes.find((n) => n.id == e.source),
      target: this.nodes.find((n) => n.id == e.target),
      label: e.label,
    }));
  }

  /* Deletes selected node and adjacent edges */
  deleteNode(node) {
    this.nodes = this.nodes.filter((n) => node !== n);
    this.edges = this.edges.filter(
      (e) => e.source !== node && e.target !== node
    );
    this.redraw();
  }

  deleteEdge(edge) {
    this.edges = this.edges.filter((e) => edge !== e);
    this.redrawEdges();
  }

  clearSelection() {
    this.state.selectedNode = null;
    this.state.selectedEdge = null;
    this.redraw();
  }

  addNode(title, x, y) {
    this.nodes.push({
      id: ++this.nodeId,
      title,
      x,
      y,
    });
    this.redrawNodes();
  }

  #draw() {
    d3.select(window).on("keydown", (event) => {
      switch (event.keyCode) {
        case this.consts.BACKSPACE_KEY:
        case this.consts.DELETE_KEY:
          if (this.state.selectedNode) {
            event.preventDefault();
            this.deleteNode(this.state.selectedNode);
          } else if (this.state.selectedEdge) {
            event.preventDefault();
            this.deleteEdge(this.state.selectedEdge);
          }
          break;
      }
    });

    // add zoom behavior to whole svg
    const zoom = d3
      .zoom()
      .clickDistance(this.consts.CLICK_DISTANCE)
      .on("zoom", (event) => {
        this.plot.attr("transform", event.transform);
      });
    // prepare SVG
    this.svg
      .on("mousedown", (event, d) => {
        if (event.shiftKey) {
          // current pointer position
          const pos = d3.pointer(event, graph.plot.node());
          this.addNode((this.nodeId + 1).toString(), pos[0], pos[1]);
        }
      })
      // click outside of elements
      .on("click", () => {
        this.clearSelection();
      })
      .call(zoom);

    this.#defineMarkers();

    // drag behavior
    const graph = this;
    this.drag = d3
      .drag()
      .clickDistance(this.consts.CLICK_DISTANCE)
      .on("drag", function (event, d) {
        if (graph.state.shiftNodeDrag) {
          // update temporary drag line
          const pos = d3.pointer(event, graph.plot.node());
          graph.dragLine.attr(
            "d",
            "M" + d.x + "," + d.y + "L" + pos[0] + "," + pos[1]
          );
        } else {
          // update position of dragged node and update adjacent edges
          d.x = event.x;
          d.y = event.y;
          d3.select(this)
            .raise()
            .attr("transform", (d) => "translate(" + [d.x, d.y] + ")");
          graph.redrawEdges();
        }
      })
      .on("end", (event, source) => {
        this.state.shiftNodeDrag = false;
        // hide line, remove arrow tip
        this.dragLine.classed("hidden", true);

        const target = this.state.mouseOverNode;

        if (!source || !target) return;

        // source and target are different
        if (source !== target) {
          // remove edge between source and target (any order)
          this.edges = this.edges.filter(
            (edge) =>
              !(edge.source === source && edge.target === target) &&
              !(edge.source === target && edge.target === source)
          );
          var newEdge = { source: source, target: target };
          this.edges.push(newEdge);
          this.redrawEdges();
        }
      });

    // populate svg
    this.plot = this.svg.append("g");

    // displayed when dragging between nodes
    this.dragLine = this.plot
      .append("path")
      .classed("line", true)
      .classed("dragline", true)
      .classed("hidden", true)
      .attr("d", "M0,0L0,0");

    // circles need to be added last to be drawn above the paths
    this.paths = this.plot.append("g").classed("edges", true);
    this.circles = this.plot.append("g").classed("nodes", true);

    this.redraw();
  }

  #defineMarkers() {
    const defs = this.svg.append("defs");
    // arrow marker for edge
    defs
      .append("marker")
      .attr("id", "end-arrow")
      // keep same scale
      .attr("markerUnits", "userSpaceOnUse")
      .attr("viewBox", "-20 -10 20 20")
      .attr("markerWidth", 20)
      .attr("markerHeight", 20)
      // tip of marker at circle (cut off part of tip that is thinner than line)
      .attr("refX", this.consts.NODE_RADIUS - 3)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M-20,-10L0,0L-20,10");
    // arrow marker for selected edge (to allow separate CSS styling)
    defs
      .append("marker")
      .attr("id", "selected-end-arrow")
      // keep same scale
      .attr("markerUnits", "userSpaceOnUse")
      .attr("viewBox", "-20 -10 20 20")
      .attr("markerWidth", 20)
      .attr("markerHeight", 20)
      // tip of marker at circle (cut off part of tip that is thinner than line)
      .attr("refX", this.consts.NODE_RADIUS - 3)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M-20,-10L0,0L-20,10");
    // arrow marker for leading arrow
    defs
      .append("marker")
      .attr("id", "mark-end-arrow")
      // keep same scale
      .attr("markerUnits", "userSpaceOnUse")
      .attr("viewBox", "-20 -10 20 20")
      .attr("markerWidth", 20)
      .attr("markerHeight", 20)
      // tip of marker at end of line
      .attr("refX", -5)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M-20,-10L0,0L-20,10");
  }

  redraw() {
    this.redrawEdges();
    this.redrawNodes();
  }

  redrawNodes() {
    this.circles
      .selectAll("g")
      .data(this.nodes, (d) => d.id)
      .join(
        (enter) => this.#enterNodes(enter),
        (update) => this.#updateNodes(update),
        (exit) => exit.remove()
      );
  }

  #enterNodes(enter) {
    const nodes = enter
      .append("g")
      .attr("class", "node")
      .attr("transform", (d) => "translate(" + d.x + "," + d.y + ")")
      .on("mousedown", (event, d) => {
        event.stopPropagation();
        if (event.shiftKey) {
          this.state.shiftNodeDrag = true;
          this.dragLine
            .classed("hidden", false)
            .attr("d", "M" + d.x + "," + d.y + "L" + d.x + "," + d.y);
        }
      })
      .on("mouseover", (event, d) => {
        this.state.mouseOverNode = d;
      })
      .on("mouseout", () => {
        this.state.mouseOverNode = null;
      })
      .on("click", (event, d) => {
        event.stopPropagation();
        if (event.shiftKey) {
          this.#editNodeLabel(d);
        } else {
          this.state.selectedNode = d;
          this.state.selectedEdge = null;
          this.redraw();
        }
      })
      .call(this.drag);

    nodes.append("circle").attr("r", String(this.consts.NODE_RADIUS));
    nodes.append("text").text((d) => d.title);
  }

  #editNodeLabel(d) {
    const selection = this.circles
      .selectAll("g")
      .filter((dval) => dval.id === d.id);
    // hide current label
    const text = selection.selectAll("text").classed("hidden", true);
    // add intermediate editable paragraph
    const d3txt = this.plot
      .selectAll("foreignObject")
      .data([d])
      .enter()
      .append("foreignObject")
      .attr("x", d.x - this.consts.NODE_RADIUS)
      .attr("y", d.y - this.consts.NODE_RADIUS / 2)
      .attr("height", 2 * this.consts.NODE_RADIUS)
      .attr("width", 2 * this.consts.NODE_RADIUS)
      .append("xhtml:div")
      .attr("id", "editable-p")
      .attr("contentEditable", "true")
      .style("text-align", "center")
      //.style("border", "1px solid")
      .text(d.title)
      .on("mousedown", (event, d) => {
        event.stopPropagation();
      })
      .on("keydown", (event, d) => {
        event.stopPropagation();
        if (event.keyCode == this.consts.ENTER_KEY) {
          event.target.blur();
        }
      })
      .on("blur", (event, d) => {
        d.title = event.target.textContent;
        d3.select(event.target.parentElement).remove();
        this.redrawNodes();
        text.classed("hidden", false);
      });
    d3txt.node().focus();
  }

  #updateNodes(update) {
    update
      .attr("transform", (d) => "translate(" + d.x + "," + d.y + ")")
      .classed("selected", (d) => d === this.state.selectedNode);

    update.select("text").text((d) => d.title);
  }

  redrawEdges() {
    this.paths
      .selectAll(".edge")
      .data(this.edges, this.#edgeId)
      .join(
        (enter) => this.#enterEdges(enter),
        (update) => this.#updateEdges(update),
        (exit) => exit.remove()
      );
  }

  #enterEdges(enter) {
    const edges = enter
      .append("g")
      .classed("edge", true)
      .on("click", (event, d) => {
        event.stopPropagation();
        if (event.shiftKey) {
          this.#editEdgeLabel(d);
        } else {
          this.state.selectedEdge = d;
          this.state.selectedNode = null;
          this.redraw();
        }
      })
      .on("mousedown", (event, d) => {
        event.stopPropagation();
      });

    edges
      .append("path")
      .attr("id", this.#edgeId)
      .classed("line", true)
      .attr(
        "d",
        (d) => `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`
      );

    edges
      .append("text")
      .attr("class", "edge-label")
      .attr("dy", -15)
      .append("textPath")
      .attr("xlink:href", (d) => "#" + this.#edgeId(d))
      .attr("text-anchor", "middle")
      .attr("startOffset", "50%")
      .text((d) => d.label);
  }

  #editEdgeLabel(d) {
    const selection = this.paths
      .selectAll("g")
      .filter((dval) => this.#edgeId(dval) === this.#edgeId(d));
    // hide current label
    const text = selection.selectAll("text").classed("hidden", true);
    // add intermediate editable paragraph
    const d3txt = this.plot
      .selectAll("foreignObject")
      .data([d])
      .enter()
      .append("foreignObject")
      // TODO: rotate via transform: rotate(20deg);
      .attr("x", d.target.x - (d.target.x - d.source.x) / 2)
      .attr("y", d.target.y - (d.target.y - d.source.y) / 2)
      .attr("height", 100)
      .attr("width", 100)
      .append("xhtml:div")
      //.style("transform", "rotate(20deg)")
      .attr("id", "editable-p")
      .attr("contentEditable", "true")
      .style("text-align", "center")
      //.style("border", "1px solid")
      .text(d.label)
      .on("mousedown", (event, d) => {
        event.stopPropagation();
      })
      .on("keydown", (event, d) => {
        event.stopPropagation();
        if (event.keyCode == this.consts.ENTER_KEY) {
          event.target.blur();
        }
      })
      .on("blur", (event, d) => {
        d.label = event.target.textContent;
        d3.select(event.target.parentElement).remove();
        this.redrawEdges();
        text.classed("hidden", false);
      });
    d3txt.node().focus();
  }

  #updateEdges(update) {
    update.classed("selected", (d) => d === this.state.selectedEdge);

    update
      .select("path")
      .attr(
        "d",
        (d) => `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`
      );

    update
      .select("text")
      .select("textPath")
      .text((d) => d.label);
  }

  #edgeId(d) {
    return String(d.source.id) + "+" + String(d.target.id);
  }

  clear() {
    const doDelete = window.confirm(
      "Do you really want to delete the whole graph?"
    );
    if (doDelete) {
      this.nodes = [];
      this.edges = [];
      this.redraw();
    }
  }

  load(nodes, edges) {
    this.nodeId = nodes.reduce((prev, curr) =>
      prev.id > curr.id ? prev.id : curr.id
    );
    this.nodes = nodes;
    this.edges = this.#mapEdges(edges);
    this.redraw();
  }

  serialize() {
    const saveEdges = this.edges.map((edge) => ({
      source: edge.source.id,
      target: edge.target.id,
      label: edge.label,
    }));
    return new window.Blob(
      [window.JSON.stringify({ nodes: this.nodes, edges: saveEdges })],
      { type: "text/plain;charset=utf-8" }
    );
  }
}
