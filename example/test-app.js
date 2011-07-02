$(document).ready(function() {
    MITHGrid.Presentation.Flow = function(container, options) {
        var that = MITHGrid.Presentation.initView("Flow", container, options),
        _floor_0 = function(x) {
            return (x < 0 ? 0: x);
        },
        paper,
        items = {};

        var fn2num = function(fn) {
            if ($.isFunction(fn)) {
                return fn();
            }
            else {
                return fn;
            }
        };

        var calc_width = function(width, x) {
            return _floor_0(
            width - fn2num(that.options.margins.right)
            - fn2num(that.options.margins.left)
            - x
            );
        }

        var calc_height = function(height, x) {
            return _floor_0(
            height - fn2num(that.options.margins.top)
            - fn2num(that.options.margins.bottom)
            - x
            );
        }

        that.selfRender = function() {
            var width = window.innerWidth,
            height = window.innerHeight;
            paper = Raphael($(container).attr('id'), calc_width(width, 2), calc_height(height, 2));
            $(container).width(calc_width(width, 0));
            $(container).height(calc_height(height, 0));
            that.startDisplayUpdate();
            var views = [],
            transitions = [];
            $.each(that.options.source.items(),
            function(idx, id) {
                var t = that.options.source.getItem(id);
                if (t) {
                    t = t.type[0];
                    if (t == 'View') {
                        views.push(id);
                    }
                    else if (t == 'Transition') {
                        transitions.push(id);
                    }
                }
            });
            that.renderItems(that.options.source, views);
            that.renderItems(that.options.source, transitions);
            that.finishDisplayUpdate();
        };
        that.startDisplayUpdate = function() {};
        that.finishDisplayUpdate = function() {};

        var viewLens = {
            render: function(container, view, model, itemId) {
                var that = {},
                ox,
                oy;
                item = model.getItem(itemId);
                var x = item['position-x'][0],
                y = item['position-y'][0],
                width = 100,
                height = 40;
                var c = paper.rect(x, y, width, height, 10);
                c.attr({
                    fill: "#888888",
                    opacity: 0.75
                });
                var ox,
                oy;
                var start = function() {
                    ox = c.attr("x");
                    oy = c.attr("y");
                    c.attr({
                        opacity: 1
                    });
                },
                move = function(dx, dy) {
                    var targets = {};
                    model.updateItems([{
                        id: itemId,
                        'position-x': ox + dx,
                        'position-y': oy + dy
                    }])
                },
                up = function() {
                    c.attr({
                        opacity: 0.75
                    });
                };

                var transition_id_exprs = model.prepare(['!transition-to', '!transition-from']);

                that.update = function(item) {
                    c.attr({
                        x: item['position-x'][0],
                        y: item['position-y'][0]
                    });
                    // TODO: we need to find all transitions to/from this view and redraw them
                    // Get all transitions pointing to this View
                    // if rendered, call their update function
                    var transition_ids = $.unique(model.evaluate(itemId, transition_id_exprs));

                    $.each(transition_ids,
                    function(idx, id) {
                        var r = view.renderingFor(id);
                        if (r) {
                            r.update(model.getItem(id));
                        }
                        else {
                            that.renderItems([id]);
                        }
                    });
                }

                that.x = function() {
                    return c.attr("x");
                };
                that.y = function() {
                    return c.attr("y");
                };
                that.width = function() {
                    return width;
                };
                that.height = function() {
                    return height;
                };
                c.drag(move, start, up);
                that.shape = c;
                return that;
            }
        };

        var transitionLens = {
            render: function(container, view, model, itemId) {
                var that = {},
                item = model.getItem(itemId),
                s = view.renderingFor(item['transition-from'][0]),
                d = view.renderingFor(item['transition-to'][0]);

                if (!s || !d) {
                    return;
                }

                // the anchors are in the middle of the sides facing the other shape
                var anchors = function() {
                    if (s.x() + s.width() < d.x()) {
                        // s is to the left of d
                        return {
                            left: s,
                            right: d,
                            orient: 'horiz',
                            target: 'right'
                        };
                    }
                    else if (d.x() + d.width() < s.x()) {
                        // d is to the left of s
                        return {
                            left: d,
                            right: s,
                            orient: 'horiz',
                            target: 'left'
                        };
                    }
                    else if (s.y() + s.height() < d.y()) {
                        // s is above d
                        return {
                            top: s,
                            bottom: d,
                            orient: 'vert',
                            target: 'bottom'
                        };
                    }
                    else {
                        // d is above s (or d and s are on top of each other)
                        return {
                            top: d,
                            bottom: s,
                            orient: 'vert',
                            target: 'top'
                        };
                    }
                };

                var draw_path = function() {
                    var a = anchors();
                    var tl,
                    br,
                    c1,
                    c2,
                    c;

                    if (a.orient == "vert") {
                        // vertical
                        tl = [a.top.x() + a.top.width() / 2, a.top.y() + a.top.height()];
                        br = [a.bottom.x() + a.bottom.width() / 2, a.bottom.y()];
                        if (a.target == 'top') {
                            tl[0] -= a.top.width() / 4;
                            br[0] += a.bottom.width() / 4;
                        }
                        else {
                            tl[0] += a.top.width() / 4;
                            br[0] -= a.bottom.width() / 4;
                        }
                        c = [(tl[0] + br[0]) / 2, (tl[1] + br[1]) / 2];
                        c1 = [tl[0], c[1]];
                        c2 = [br[0], c[1]];
                        if (c1[1] > tl[1] + 50) c1[1] = tl[1] + 50;
                        if (c2[1] < br[1] - 50) c2[1] = br[1] - 50;
                    }
                    else {
                        // horizontal
                        tl = [a.left.x() + a.left.width(), a.left.y() + a.left.height() / 2];
                        br = [a.right.x(), a.right.y() + a.right.height() / 2];
                        if (a.target == 'left') {
                            tl[1] -= a.left.height() / 4;
                            br[1] += a.right.height() / 4;
                        }
                        else {
                            tl[1] += a.left.height() / 4;
                            br[1] -= a.right.height() / 4;
                        }
                        c = [(tl[0] + br[0]) / 2, (tl[1] + br[1]) / 2];
                        c1 = [c[0], tl[1]];
                        c2 = [c[0], br[1]];
                        if (c1[0] > tl[0] + 50) c1[0] = tl[0] + 50;
                        if (c2[0] < br[0] - 50) c2[0] = br[0] - 50;
                    }
                    that.shape = paper.path("M" + tl[0] + " " + tl[1] +
                    " C" + c1[0] + " " + c1[1] + " " +
                    c2[0] + " " + c2[1] + " " +
                    br[0] + " " + br[1]);
                    that.shape.attr({
                        'stroke-width': '3',
                        'stroke': '#888888'
                    })
                    $(that.shape.node).hover(function() {
                        that.shape.attr({
                            'stroke': '#ff8822'
                        });
                    },
                    function() {
                        that.shape.attr({
                            'stroke': '#888888'
                        });
                    });
                };

                that.update = function(item) {
                    that.shape.remove();
                    draw_path();
                };

                draw_path();
                return that;
            }
        };

        var lenses = {
            View: viewLens,
            Transition: transitionLens
        };

        that.getLens = function(item) {
            if (item.type[0] in lenses) {
                return lenses[item.type[0]];
            }
            return false;
        };

        $(window).resize(function() {
            var width = window.innerWidth,
            height = window.innerHeight;
            if (!paper) {
                return;
            }
            $(container).width(calc_width(width, 0));
            $(container).height(calc_height(height, 0));
            paper.setSize(calc_width(width, 2), calc_height(height, 2));
        });

        return that;
    };

    // app won't have presentations populated until the document is ready
    var app = MITHGrid.Application({
        dataSources: [{
            label: 'internal',
            types: [{
                label: 'Application'
            },
            {
                label: 'View'
            },
            {
                label: 'Transition'
            }],
            properties: [{
                label: 'view',
                valueType: 'item'
            },
            {
                label: 'transition-from',
                valueType: 'item'
            },
            {
                label: 'transition-to',
                valueType: 'item'
            },
            {
                label: 'transition',
                valueType: 'item'
            },
            {
                label: 'initialization-action',
                valueType: 'item'
            },
            {
                label: 'position-x',
                valueType: 'numeric'
            },
            {
                label: 'position-y',
                valueType: 'numeric'
            }]
        }],
        dataViews: [{
            label: 'internal',
            dataSource: 'internal'
        }],
        presentations: [{
            type: MITHGrid.Presentation.Flow,
            container: '#edit-canvas',
            label: 'sheet',
            dataView: 'internal',
            options: {
                margins: {
                    right: 0,
                    left: 0,
                    top: function() {
                        return $('#header').outerHeight()
                    },
                    bottom: 0
                }
            }
        }]
    });

    app.ready(function() {
        var views_counter = 0;
        var create_view = function(label, x, y) {
            var id = 'view-' + views_counter;
            views_counter += 1;
            app.dataSource.internal.loadItems([{
                label: label,
                id: id,
                "position-x": x,
                "position-y": y,
                type: 'View'
            }]);
            return id;
        };
        var create_transition = function(from, to) {
            var id = 'transition-' + views_counter;
            views_counter += 1;
            app.dataSource.internal.loadItems([{
                label: 'transition from ' + from + ' to ' + to,
                id: id,
                "transition-from": from,
                "transition-to": to,
                type: "Transition"
            }]);
            return id;
        };
        var view0 = create_view('start', 10, 20);
        var view1 = create_view('done', 220, 120);
		var view2 = create_view('more', 10, 120);
		var view3 = create_view('most', 200, 400);
        var trans0 = create_transition(view0, view1);
		var trans1 = create_transition(view2, view0);
		var trans2 = create_transition(view1, view2);
		var trans3 = create_transition(view0, view3);
    });
});
