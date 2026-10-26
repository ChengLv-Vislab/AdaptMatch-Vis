var app = (function (d3$1) {
    'use strict';

    function noop() { }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function get_store_value(store) {
        let value;
        subscribe(store, _ => value = _)();
        return value;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        text.data = data;
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value == null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function select_option(select, value, mounting) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
        if (!mounting || value !== undefined) {
            select.selectedIndex = -1; // no option should be selected
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked');
        return selected_option && selected_option.__value;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    /**
     * Schedules a callback to run immediately after the component has been updated.
     *
     * The first time the callback runs will be after the initial `onMount`
     */
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    /**
     * Schedules a callback to run immediately before the component is unmounted.
     *
     * Out of `onMount`, `beforeUpdate`, `afterUpdate` and `onDestroy`, this is the
     * only one that runs inside a server-side component.
     *
     * https://svelte.dev/docs#run-time-svelte-ondestroy
     */
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    /**
     * Creates an event dispatcher that can be used to dispatch [component events](/docs#template-syntax-component-directives-on-eventname).
     * Event dispatchers are functions that can take two arguments: `name` and `detail`.
     *
     * Component events created with `createEventDispatcher` create a
     * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
     * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
     * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
     * property and can contain any type of data.
     *
     * https://svelte.dev/docs#run-time-svelte-createeventdispatcher
     */
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail, { cancelable = false } = {}) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail, { cancelable });
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
                return !event.defaultPrevented;
            }
            return true;
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        const updates = [];
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                // defer updates until all the DOM shuffling is done
                updates.push(() => block.p(child_ctx, dirty));
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        run_all(updates);
        return new_blocks;
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=} start
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0 && stop) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const ACCT_DEFAULT_PARAMETERS = Object.freeze({
      alpha: 0.08,
      beta: 0.45,
      gamma: 0.47,
    });

    const ACCT_PARAMETER_RANGES = Object.freeze({
      alpha: Object.freeze({ min: 0, max: 1, step: 0.01 }),
      beta: Object.freeze({ min: 0, max: 1, step: 0.01 }),
      gamma: Object.freeze({ min: 0, max: 1, step: 0.01 }),
    });

    function getRangePercent(value, range) {
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue)) return "0%";
      const ratio = (numericValue - range.min) / (range.max - range.min);
      return `${(Math.max(0, Math.min(1, ratio)) * 100).toFixed(2)}%`;
    }

    // Shared ordering drives logits, ACCT statistics, charts and sample images.
    const DATASETS = [
      { id: 'cifar10', name: 'CIFAR-10', numLabeled: 4000,
        classNames: ['airplane', 'automobile', 'bird', 'cat', 'deer', 'dog', 'frog', 'horse', 'ship', 'truck'] },
      { id: 'stl10', name: 'STL-10', numLabeled: 1000,
        classNames: ['airplane', 'bird', 'car', 'cat', 'deer', 'dog', 'horse', 'monkey', 'ship', 'truck'] },
    ];
    // Mutate in place on activation: existing draw modules retain this reference.
    const ACTIVE_CLASS_NAMES = [...DATASETS[0].classNames];
    const ORIGINAL_IMAGE_ROOT = '/assets/img/original-gallery';
    const ORIGINAL_IMAGES = [
      ['airplane.png', 'airplane'], ['bird.png', 'bird'],
      ['automobile.png', 'automobile'], ['cat.jpg', 'cat'], ['deer.png', 'deer'],
      ['dog.png', 'dog'], ['hours.png', 'horse'], ['ship.png', 'ship'], ['truck.png', 'truck'],
    ].map(([file, name]) => ({ file, class: name }));
    function activateClasses(names) {
      ACTIVE_CLASS_NAMES.splice(0, ACTIVE_CLASS_NAMES.length, ...names);
    }
    function demoImages(names, legacy = false) {
      return names.map((name) => ({ class: name,
        file: name === 'cat' ? 'cat.jpg' : legacy && name === 'horse' ? 'hours.png' : `${name}.png` }));
    }
    function demoImageURL(root, filename, version = '') {
      return `${root}/${filename}${version ? `?v=${encodeURIComponent(version)}` : ''}`;
    }

    const cnnStore = writable([]);
    const svgStore = writable(undefined);

    const vSpaceAroundGapStore = writable(undefined);
    const hSpaceAroundGapStore = writable(undefined);

    const nodeCoordinateStore = writable([]);
    const selectedScaleLevelStore = writable(undefined);

    const cnnLayerRangesStore = writable({});
    const cnnLayerMinMaxStore = writable([]);
    const modelColorDomainStore = writable(null);

    const needRedrawStore = writable([undefined, undefined]);

    const detailedModeStore = writable(true);

    const shouldIntermediateAnimateStore = writable(false);

    const isInSoftmaxStore = writable(false);
    const softmaxDetailViewStore = writable({});
    const allowsSoftmaxAnimationStore = writable(false);

    const hoverInfoStore = writable({});

    const modalStore = writable({});

    const intermediateLayerPositionStore = writable({});

    const model_nameStore = writable(undefined);
    const selectedImageStore = writable(undefined);
    const customImageStore = writable(undefined);

    // ACCT parameters
    const alphaStore = writable(ACCT_DEFAULT_PARAMETERS.alpha);
    const betaStore = writable(ACCT_DEFAULT_PARAMETERS.beta);
    const gammaStore = writable(ACCT_DEFAULT_PARAMETERS.gamma);

    const accuracyData = writable([]);
    const confusionData = writable([]);
    const lossData = writable([]);
    const weightConfigurationsStore = writable([]);
    const selectedWeightConfigurationStore = writable(null);
    const trainingDataPathStore = writable('/assets/data');
    const availableModelsStore = writable([]);
    const selectedEpochStore = writable(0);
    const lastEpochStore = writable(299);
    const runLoadingStore = writable(true);
    const modelLoadingStore = writable(true);
    const runErrorStore = writable('');
    const datasetsStore = writable(DATASETS.map((item) => ({ ...item, available: false })));
    const selectedDatasetStore = writable(null);
    const classNamesStore = writable([...DATASETS[0].classNames]);
    const imageOptionsStore = writable(ORIGINAL_IMAGES);
    const imageRootStore = writable(ORIGINAL_IMAGE_ROOT);
    const imagePreviewRootStore = writable(ORIGINAL_IMAGE_ROOT);
    const imageVersionStore = writable('');
    const datasetSelectionDisabledStore = writable(false);

    /**
     * Create a 2D array (matrix) with given size and default value.
     *
     * @param {int} height Height (number of rows) for the matrix
     * @param {int} width Width (number of columns) for the matrix
     * @param {int} fill Default value to fill this matrix
     */
    const init2DArray = (height, width, fill) => {
      let array = [];
      // Itereate through rows
      for (let r = 0; r < height; r++) {
        let row = new Array(width).fill(fill);
        array.push(row);
      }
      return array;
    };

    /**
     * Dot product of two matrices.
     * @param {[[number]]} mat1 Matrix 1
     * @param {[[number]]} mat2 Matrix 2
     */
    const matrixDot = (mat1, mat2) => {
      console.assert(mat1.length === mat2.length, "Dimension not matching");
      console.assert(mat1[0].length === mat2[0].length, "Dimension not matching");

      let result = 0;
      for (let i = 0; i < mat1.length; i++) {
        for (let j = 0; j < mat1[0].length; j++) {
          result += mat1[i][j] * mat2[i][j];
        }
      }

      return result;
    };

    /**
     * 2D slice on a matrix.
     * @param {[[number]]} mat Matrix
     * @param {int} xs First dimension (row) starting index
     * @param {int} xe First dimension (row) ending index
     * @param {int} ys Second dimension (column) starting index
     * @param {int} ye Second dimension (column) ending index
     */
    const matrixSlice = (mat, xs, xe, ys, ye) => {
      return mat.slice(xs, xe).map((s) => s.slice(ys, ye));
    };

    /**
     * Compute the maximum of a matrix.
     * @param {[[number]]} mat Matrix
     */
    const matrixMax = (mat) => {
      let curMax = -Infinity;
      for (let i = 0; i < mat.length; i++) {
        for (let j = 0; j < mat[0].length; j++) {
          if (mat[i][j] > curMax) {
            curMax = mat[i][j];
          }
        }
      }
      return curMax;
    };

    /**
     * Compute convolutions of one kernel on one matrix (one slice of a tensor).
     * @param {[[number]]} input Input, square matrix
     * @param {[[number]]} kernel Kernel weights, square matrix
     * @param {int} stride Stride size
     * @param {int} padding Padding size
     */
    const singleConv = (input, kernel, stride = 1, padding = 1) => {
      console.assert(input.length === input[0].length, "Conv input is not square");
      console.assert(
        kernel.length === kernel[0].length,
        "Conv kernel is not square"
      );

      let inputSize = input.length;
      let kernelSize = kernel.length;

      // Handle padding: if padding > 0, manually pad input matrix
      if (padding > 0) {
        let paddedSize = inputSize + 2 * padding;
        let paddedInput = init2DArray(paddedSize, paddedSize, 0);

        for (let i = 0; i < inputSize; i++) {
          for (let j = 0; j < inputSize; j++) {
            paddedInput[i + padding][j + padding] = input[i][j];
          }
        }
        input = paddedInput;
        inputSize = paddedSize; // Update size after padding
      }

      // Compute output size after convolution
      let outputSize = Math.floor((inputSize - kernelSize) / stride) + 1;

      let result = init2DArray(outputSize, outputSize, 0);

      // Window sliding
      for (let r = 0; r < outputSize; r++) {
        for (let c = 0; c < outputSize; c++) {
          let curWindow = matrixSlice(
            input,
            r * stride,
            r * stride + kernelSize,
            c * stride,
            c * stride + kernelSize
          );
          let dot = matrixDot(curWindow, kernel);
          result[r][c] = dot;
        }
      }

      return result;
    };

    /**
     * Activate matrix mat using ReLU (max(0, x)).
     * @param {[[number]]} mat Matrix
     */
    const singleRelu = (mat) => {
      // Only support square matrix
      console.assert(mat.length === mat[0].length, "Activating non-square matrix!");

      let width = mat.length;
      let result = init2DArray(width, width, 0);

      for (let i = 0; i < width; i++) {
        for (let j = 0; j < width; j++) {
          result[i][j] = Math.max(0, mat[i][j]);
        }
      }
      return result;
    };

    /**
     * Apply inference-time batch normalization to one feature-map channel.
     * y = gamma * (x - mean) / sqrt(variance + epsilon) + beta
     * @param {[[number]]} mat Input feature map
     * @param {number} mean Running mean for this channel
     * @param {number} variance Running variance for this channel
     * @param {number} gamma Learned scale for this channel
     * @param {number} beta Learned shift for this channel
     * @param {number} epsilon Numerical stability term
     */
    const singleBatchNorm = (
      mat,
      mean,
      variance,
      gamma,
      beta,
      epsilon = 1e-5
    ) => {
      const height = mat.length;
      const width = mat[0].length;
      const denominator = Math.sqrt(variance + epsilon);
      const result = init2DArray(height, width, 0);

      for (let row = 0; row < height; row++) {
        for (let column = 0; column < width; column++) {
          result[row][column] =
            gamma * ((mat[row][column] - mean) / denominator) + beta;
        }
      }
      return result;
    };

    /**
     * Max pool one matrix.
     * @param {[[number]]} mat Matrix
     * @param {int} kernelWidth Pooling kernel length (only supports 2)
     * @param {int} stride Pooling sliding stride (only supports 2)
     * @param {string} padding Pading method when encountering odd number mat,
     * currently this function only supports 'VALID'
     */
    const singleMaxPooling = (
      mat,
      kernelWidth = 2,
      stride = 2,
      padding = "VALID"
    ) => {
      console.assert(kernelWidth === 2, "Only supports kernen = [2,2]");
      console.assert(stride === 2, "Only supports stride = 2");
      console.assert(padding === "VALID", "Only support valid padding");

      // Handle odd length mat
      // 'VALID': ignore edge rows and columns
      // 'SAME': add zero padding to make the mat have even length
      if (mat.length % 2 === 1 && padding === "VALID") {
        mat = matrixSlice(mat, 0, mat.length - 1, 0, mat.length - 1);
      }

      let stepSize = (mat.length - kernelWidth) / stride + 1;
      let result = init2DArray(stepSize, stepSize, 0);

      for (let r = 0; r < stepSize; r++) {
        for (let c = 0; c < stepSize; c++) {
          let curWindow = matrixSlice(
            mat,
            r * stride,
            r * stride + kernelWidth,
            c * stride,
            c * stride + kernelWidth
          );
          result[r][c] = matrixMax(curWindow);
        }
      }
      return result;
    };

    function array1d(length, f) {
      return Array.from({length: length}, f ? ((v, i) => f(i)) : undefined);
    }

    function array2d(height, width, f) {
      return Array.from({length: height}, (v, i) => Array.from({length: width}, f ? ((w, j) => f(i, j)) : undefined));
    }

    function generateOutputMappings(stride, output, kernelLength, padded_input_size, dilation) {
      const outputMapping = array2d(output.length, output.length, (i, j) => array2d(kernelLength, kernelLength));
      for (let h_out = 0; h_out < output.length; h_out++) {
        for (let w_out = 0; w_out < output.length; w_out++) {
          for (let h_kern = 0; h_kern < kernelLength; h_kern++) {
            for (let w_kern = 0; w_kern < kernelLength; w_kern++) {
              const h_im = h_out * stride + h_kern * dilation;
              const w_im = w_out * stride + w_kern * dilation;
              outputMapping[h_out][w_out][h_kern][w_kern] = h_im * padded_input_size + w_im;
            }
          }
        }
      }
      return outputMapping;
    }

    function compute_input_multiplies_with_weight(hoverH, hoverW, 
                                                  padded_input_size, weight_dims, outputMappings, kernelLength) {
      const input_multiplies_with_weight = array1d(padded_input_size * padded_input_size);
      for (let h_weight = 0; h_weight < kernelLength; h_weight++) {
        for (let w_weight = 0; w_weight < kernelLength; w_weight++) {
          const flat_input = outputMappings[hoverH][hoverW][h_weight][w_weight];
          if (typeof flat_input === "undefined") continue;
          input_multiplies_with_weight[flat_input] = [h_weight, w_weight];
        }
      }
      return input_multiplies_with_weight;
    }

    function getMatrixSliceFromInputHighlights(matrix, highlights, kernelLength) {
      var indices = highlights.reduce((total, value, index) => {
      if (value != undefined) total.push(index);
        return total;
      }, []);
      return matrixSlice(matrix, Math.floor(indices[0] / matrix.length), Math.floor(indices[0] / matrix.length) + kernelLength, indices[0] % matrix.length, indices[0] % matrix.length + kernelLength);
    }

    function getMatrixSliceFromOutputHighlights(matrix, highlights) {
      var indices = highlights.reduce((total, value, index) => {
      if (value != false) total.push(index);
        return total;
      }, []);
      return matrixSlice(matrix, Math.floor(indices[0] / matrix.length), Math.floor(indices[0] / matrix.length) + 1, indices[0] % matrix.length, indices[0] % matrix.length + 1);
    }

    // Edit these values to change size of low-level conv visualization.
    function getVisualizationSizeConstraint(imageLength) {
      let sizeOfGrid = 150;
      let maxSizeOfGridCell = 20;
      return sizeOfGrid / imageLength > maxSizeOfGridCell ? maxSizeOfGridCell : sizeOfGrid / imageLength;
    }

    function getDataRange(image) {
      let maxRow = image.map(function(row){ return Math.max.apply(Math, row); });
      let max = Math.max.apply(null, maxRow);
      let minRow = image.map(function(row){ return Math.min.apply(Math, row); });
      let min = Math.min.apply(null, minRow);
      let range = {
        range: 2 * Math.max(Math.abs(min), Math.abs(max)),
        min: min,
        max: max
      };
      return range;
    }

    function gridData(
      image,
      constraint = getVisualizationSizeConstraint(image.length),
      precision = 2
    ) {
      // Constrain grids based on input image size.
      var data = new Array();
      var xpos = 1;
      var ypos = 1;
      var width = constraint;
      var height = constraint;
      const precisionScale = Math.pow(10, precision);
      for (var row = 0; row < image.length; row++) {
        data.push( new Array() );
        for (var column = 0; column < image[0].length; column++) {
          data[row].push({
            text: Math.round(image[row][column] * precisionScale) / precisionScale,
            row: row,
            col: column,
            x: xpos,
            y: ypos,
            width: width,
            height: height
          });
          xpos += width;
        }
        xpos = 1;
        ypos += height; 
      }
      return data;
    }

    /* src\detail-view\Dataview.svelte generated by Svelte v3.59.2 */

    function create_fragment(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			div.innerHTML = `<svg id="grid" width="100%" height="100%"></svg>`;
    			set_style(div, "display", "inline-block");
    			set_style(div, "vertical-align", "middle");
    			set_style(div, "margin-top", "5px");
    			attr(div, "class", "grid");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			/*div_binding*/ ctx[11](div);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			/*div_binding*/ ctx[11](null);
    		}
    	};
    }

    const textConstraintDivisor = 2.6;

    function instance($$self, $$props, $$invalidate) {
    	let { data } = $$props;
    	let { highlights } = $$props;
    	let { isKernelMath } = $$props;
    	let { constraint } = $$props;
    	let { dataRange } = $$props;
    	let { outputLength = undefined } = $$props;
    	let { stride = undefined } = $$props;
    	let { colorScale = d3.interpolateRdBu } = $$props;
    	let { isInputLayer = false } = $$props;
    	let { textFontSize = undefined } = $$props;
    	let grid_final;
    	const dispatch = createEventDispatcher();
    	let oldHighlight = highlights;
    	let oldData = data;

    	const redraw = () => {
    		d3.select(grid_final).selectAll("#grid > *").remove();
    		const constrainedSvgSize = data.length * constraint + 2;
    		var grid = d3.select(grid_final).select("#grid").attr("width", constrainedSvgSize + "px").attr("height", constrainedSvgSize + "px").append("svg").attr("width", constrainedSvgSize + "px").attr("height", constrainedSvgSize + "px");
    		var row = grid.selectAll(".row").data(data).enter().append("g").attr("class", "row");

    		row.selectAll(".square").data(function (d) {
    			return d;
    		}).enter().append("rect").attr("class", "square").attr("x", function (d) {
    			return d.x;
    		}).attr("y", function (d) {
    			return d.y;
    		}).attr("width", function (d) {
    			return d.width;
    		}).attr("height", function (d) {
    			return d.height;
    		}).style("opacity", 0.8).style("fill", function (d) {
    			let normalizedValue = d.text;

    			if (isInputLayer) {
    				normalizedValue = 1 - d.text;
    			} else {
    				normalizedValue = (d.text + dataRange / 2) / dataRange;
    			}

    			return colorScale(normalizedValue);
    		}).on('mouseover', function (d) {
    			if (data.length != outputLength) {
    				dispatch('message', {
    					hoverH: Math.min(Math.floor(d.row / stride), outputLength - 1),
    					hoverW: Math.min(Math.floor(d.col / stride), outputLength - 1)
    				});
    			} else {
    				dispatch('message', {
    					hoverH: Math.min(Math.floor(d.row / 1), outputLength - 1),
    					hoverW: Math.min(Math.floor(d.col / 1), outputLength - 1)
    				});
    			}
    		});

    		if (isKernelMath) {
    			var text = row.selectAll(".text").data(function (d) {
    				return d;
    			}).enter().append("text").attr("class", "text").style("font-size", (Number.isFinite(textFontSize)
    			? textFontSize
    			: Math.floor(constraint / textConstraintDivisor)) + "px").attr("x", function (d) {
    				return d.x + d.width / 2;
    			}).attr("y", function (d) {
    				return d.y + d.height / 2;
    			}).style("fill", function (d) {
    				let normalizedValue = d.text;

    				if (isInputLayer) {
    					normalizedValue = 1 - d.text;
    				} else {
    					normalizedValue = (d.text + dataRange / 2) / dataRange;
    				}

    				if (normalizedValue < 0.2 || normalizedValue > 0.8) {
    					return 'white';
    				} else {
    					return 'black';
    				}
    			}).style("text-anchor", "middle").style("dominant-baseline", "middle").text(function (d) {
    				return d.text.toString().replace('-', '－');
    			});
    		}
    	};

    	afterUpdate(() => {
    		if (data != oldData) {
    			redraw();
    			oldData = data;
    		}

    		if (highlights != oldHighlight) {
    			var grid = d3.select(grid_final).select('#grid').select("svg");

    			grid.selectAll(".square").style("stroke", d => isKernelMath || highlights.length && highlights[d.row * data.length + d.col]
    			? "black"
    			: null);

    			oldHighlight = highlights;
    		}
    	});

    	onMount(() => {
    		redraw();
    	});

    	function div_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			grid_final = $$value;
    			$$invalidate(0, grid_final);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('data' in $$props) $$invalidate(1, data = $$props.data);
    		if ('highlights' in $$props) $$invalidate(2, highlights = $$props.highlights);
    		if ('isKernelMath' in $$props) $$invalidate(3, isKernelMath = $$props.isKernelMath);
    		if ('constraint' in $$props) $$invalidate(4, constraint = $$props.constraint);
    		if ('dataRange' in $$props) $$invalidate(5, dataRange = $$props.dataRange);
    		if ('outputLength' in $$props) $$invalidate(6, outputLength = $$props.outputLength);
    		if ('stride' in $$props) $$invalidate(7, stride = $$props.stride);
    		if ('colorScale' in $$props) $$invalidate(8, colorScale = $$props.colorScale);
    		if ('isInputLayer' in $$props) $$invalidate(9, isInputLayer = $$props.isInputLayer);
    		if ('textFontSize' in $$props) $$invalidate(10, textFontSize = $$props.textFontSize);
    	};

    	return [
    		grid_final,
    		data,
    		highlights,
    		isKernelMath,
    		constraint,
    		dataRange,
    		outputLength,
    		stride,
    		colorScale,
    		isInputLayer,
    		textFontSize,
    		div_binding
    	];
    }

    class Dataview extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance, create_fragment, safe_not_equal, {
    			data: 1,
    			highlights: 2,
    			isKernelMath: 3,
    			constraint: 4,
    			dataRange: 5,
    			outputLength: 6,
    			stride: 7,
    			colorScale: 8,
    			isInputLayer: 9,
    			textFontSize: 10
    		});
    	}
    }

    /* src\detail-view\KernelMathView.svelte generated by Svelte v3.59.2 */

    function create_fragment$1(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			div.innerHTML = `<svg id="grid" width="100%" height="100%"></svg>`;
    			attr(div, "class", "grid svelte-1jehi29");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			/*div_binding*/ ctx[12](div);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			/*div_binding*/ ctx[12](null);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { data } = $$props;
    	let { kernel } = $$props;
    	let { constraint } = $$props;
    	let { dataRange } = $$props;
    	let { kernelRange } = $$props;
    	let { colorScale = d3.interpolateRdBu } = $$props;
    	let { kernelColorScale = d3.interpolateBrBG } = $$props;
    	let { resultColorScale = d3.interpolateRdBu } = $$props;
    	let { isInputLayer = false } = $$props;
    	let { result = undefined } = $$props;
    	let { displayPrecision = 3 } = $$props;
    	let gridFinal;
    	let oldData = data;
    	let oldKernel = kernel;
    	let oldResult = result;

    	const formatNumber = value => {
    		if (!Number.isFinite(Number(value))) return '0';
    		return Number(Number(value).toFixed(displayPrecision)).toString();
    	};

    	const redraw = () => {
    		const root = d3.select(gridFinal).select('#grid');
    		root.selectAll('*').remove();
    		const kernelSize = data.length;
    		const valueFontSize = 14;
    		const multiplicationFontSize = 11;
    		const symbolFontSize = 14;
    		const inputCellWidth = constraint * 1.45;
    		const inputCellHeight = constraint * 0.7;
    		const multiplicationGap = constraint * 0.46;
    		const kernelCellHeight = inputCellHeight;
    		const pairHeight = inputCellHeight + multiplicationGap + kernelCellHeight;
    		const horizontalOperatorGap = constraint * 0.78;
    		const termPitch = inputCellWidth + horizontalOperatorGap;
    		const rowGap = constraint * 0.56;
    		const rowPitch = pairHeight + rowGap;
    		const baseWidth = kernelSize * termPitch;
    		const horizontalPadding = constraint * 0.2;
    		const mainGridHeight = (kernelSize - 1) * rowPitch + pairHeight;
    		const hasResult = Number.isFinite(Number(result));
    		const resultWidth = constraint * 2.05;
    		const resultHeight = constraint * 1.02;
    		const resultRowGap = constraint * 0.28;
    		const equalsResultGap = constraint * 0.22;
    		const resultGroupWidth = symbolFontSize + equalsResultGap + resultWidth;
    		const svgWidth = baseWidth + horizontalPadding * 2 + 2;
    		const svgHeight = mainGridHeight + (hasResult ? resultRowGap + resultHeight : 0) + 2;
    		root.attr('width', `${svgWidth}px`).attr('height', `${svgHeight}px`);
    		const inputRange = dataRange || 1;
    		const weightRange = kernelRange && kernelRange.range ? kernelRange.range : 1;
    		const cornerRadius = 4;
    		const rows = root.selectAll('.row').data(data).enter().append('g').attr('class', 'row');
    		const cells = rows.selectAll('.term').data(d => d).enter().append('g').attr('class', 'term');
    		const cellX = d => horizontalPadding + d.col * termPitch;
    		const cellY = d => d.row * rowPitch;

    		cells.append('rect').attr('class', 'input-value-cell').attr('x', cellX).attr('y', cellY).attr('width', inputCellWidth).attr('height', inputCellHeight).attr('rx', cornerRadius).attr('ry', cornerRadius).style('opacity', 0.5).style('fill', d => {
    			let normalizedValue = d.text;

    			if (isInputLayer) {
    				normalizedValue = 1 - d.text;
    			} else {
    				normalizedValue = (d.text + inputRange / 2) / inputRange;
    			}

    			return colorScale(normalizedValue);
    		}).style('stroke', 'black');

    		cells.append('rect').attr('class', 'kernel-value-cell').attr('x', cellX).attr('y', d => cellY(d) + inputCellHeight + multiplicationGap).attr('width', inputCellWidth).attr('height', kernelCellHeight).attr('rx', cornerRadius).attr('ry', cornerRadius).style('opacity', 0.55).style('fill', d => {
    			const normalizedValue = (kernel[d.row][d.col].text + weightRange / 2) / weightRange;
    			const gap = 0.2;
    			return kernelColorScale(normalizedValue * (1 - 2 * gap) + gap);
    		});

    		cells.append('text').attr('class', 'math-text input-value').attr('data-value', d => d.text).style('font-size', `${valueFontSize}px`).attr('x', d => cellX(d) + inputCellWidth / 2).attr('y', d => cellY(d) + inputCellHeight / 2).attr('dy', '0.12em').style('fill', d => {
    			let normalizedValue = d.text;

    			if (isInputLayer) {
    				normalizedValue = 1 - d.text;
    			} else {
    				normalizedValue = (d.text + inputRange / 2) / inputRange;
    			}

    			if (normalizedValue < 0.2 || normalizedValue > 0.8) {
    				return isInputLayer && normalizedValue < 0.2
    				? 'black'
    				: 'white';
    			}

    			return 'black';
    		}).style('text-anchor', 'middle').style('dominant-baseline', 'middle').text(d => formatNumber(d.text));

    		cells.append('text').attr('class', 'math-text multiplication-symbol').style('font-size', `${multiplicationFontSize}px`).attr('font-weight', 600).attr('x', d => cellX(d) + inputCellWidth / 2).attr('y', d => cellY(d) + inputCellHeight + multiplicationGap / 2).attr('dy', '0.16em').style('fill', 'black').style('text-anchor', 'middle').style('dominant-baseline', 'middle').text('×');

    		cells.append('text').attr('class', 'math-text kernel-value').attr('data-value', d => kernel[d.row][d.col].text).style('font-size', `${valueFontSize}px`).attr('x', d => cellX(d) + inputCellWidth / 2).attr('y', d => cellY(d) + inputCellHeight + multiplicationGap + kernelCellHeight / 2).attr('dy', '0.12em').style('fill', d => {
    			const normalizedValue = (kernel[d.row][d.col].text + weightRange / 2) / weightRange;
    			const gap = 0.2;
    			const normalizedValueWithGap = normalizedValue * (1 - 2 * gap) + gap;

    			return normalizedValueWithGap < 0.2 || normalizedValueWithGap > 0.8
    			? 'white'
    			: 'black';
    		}).style('text-anchor', 'middle').style('dominant-baseline', 'middle').text(d => formatNumber(kernel[d.row][d.col].text));

    		cells.append('text').attr('class', 'math-text addition-symbol').style('font-size', `${symbolFontSize}px`).attr('x', d => cellX(d) + inputCellWidth + horizontalOperatorGap / 2).attr('y', d => cellY(d) + pairHeight / 2).attr('dy', '0.16em').style('text-anchor', 'middle').style('dominant-baseline', 'middle').text(d => d.row === kernelSize - 1 && d.col === kernelSize - 1
    		? ''
    		: '+');

    		if (hasResult) {
    			const resultGroupX = horizontalPadding + (baseWidth - resultGroupWidth) / 2;
    			const equalsX = resultGroupX + symbolFontSize / 2;
    			const resultX = resultGroupX + symbolFontSize + equalsResultGap;
    			const resultY = mainGridHeight + resultRowGap;
    			const resultLabel = formatNumber(result);
    			const resultFontSize = 16;
    			const resultNormalizedValue = Math.max(0, Math.min(1, (Number(result) + inputRange / 2) / inputRange));
    			root.append('text').attr('class', 'math-text result-equals').attr('x', equalsX).attr('y', resultY + resultHeight / 2).attr('dy', '0.16em').style('font-size', `${symbolFontSize}px`).style('font-weight', 600).style('fill', '#202020').style('text-anchor', 'middle').style('dominant-baseline', 'middle').text('=');
    			root.append('rect').attr('class', 'computation-result-cell').attr('x', resultX).attr('y', resultY).attr('width', resultWidth).attr('height', resultHeight).attr('rx', cornerRadius).attr('ry', cornerRadius).style('fill', resultColorScale(resultNormalizedValue)).style('stroke', '#333').style('stroke-width', 1.2);

    			root.append('text').attr('class', 'math-text computation-result').attr('data-value', result).attr('x', resultX + resultWidth / 2).attr('y', resultY + resultHeight / 2).style('font-size', `${resultFontSize}px`).style('font-weight', 600).style('fill', resultNormalizedValue < 0.16 || resultNormalizedValue > 0.84
    			? 'white'
    			: '#202020').style('text-anchor', 'middle').style('dominant-baseline', 'middle').text(resultLabel);
    		}
    	};

    	afterUpdate(() => {
    		if (data !== oldData || kernel !== oldKernel || result !== oldResult) {
    			redraw();
    			oldData = data;
    			oldKernel = kernel;
    			oldResult = result;
    		}
    	});

    	onMount(redraw);

    	function div_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			gridFinal = $$value;
    			$$invalidate(0, gridFinal);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('data' in $$props) $$invalidate(1, data = $$props.data);
    		if ('kernel' in $$props) $$invalidate(2, kernel = $$props.kernel);
    		if ('constraint' in $$props) $$invalidate(3, constraint = $$props.constraint);
    		if ('dataRange' in $$props) $$invalidate(4, dataRange = $$props.dataRange);
    		if ('kernelRange' in $$props) $$invalidate(5, kernelRange = $$props.kernelRange);
    		if ('colorScale' in $$props) $$invalidate(6, colorScale = $$props.colorScale);
    		if ('kernelColorScale' in $$props) $$invalidate(7, kernelColorScale = $$props.kernelColorScale);
    		if ('resultColorScale' in $$props) $$invalidate(8, resultColorScale = $$props.resultColorScale);
    		if ('isInputLayer' in $$props) $$invalidate(9, isInputLayer = $$props.isInputLayer);
    		if ('result' in $$props) $$invalidate(10, result = $$props.result);
    		if ('displayPrecision' in $$props) $$invalidate(11, displayPrecision = $$props.displayPrecision);
    	};

    	return [
    		gridFinal,
    		data,
    		kernel,
    		constraint,
    		dataRange,
    		kernelRange,
    		colorScale,
    		kernelColorScale,
    		resultColorScale,
    		isInputLayer,
    		result,
    		displayPrecision,
    		div_binding
    	];
    }

    class KernelMathView extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			data: 1,
    			kernel: 2,
    			constraint: 3,
    			dataRange: 4,
    			kernelRange: 5,
    			colorScale: 6,
    			kernelColorScale: 7,
    			resultColorScale: 8,
    			isInputLayer: 9,
    			result: 10,
    			displayPrecision: 11
    		});
    	}
    }

    /* src\detail-view\ConvolutionAnimator.svelte generated by Svelte v3.59.2 */

    function create_fragment$2(ctx) {
    	let div11;
    	let div9;
    	let section0;
    	let div3;
    	let div0;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let div1;
    	let t4;
    	let t5_value = /*image*/ ctx[1].length + "";
    	let t5;
    	let t6;
    	let t7_value = /*image*/ ctx[1][0].length + "";
    	let t7;
    	let t8;
    	let t9;
    	let div2;
    	let t11;
    	let dataview0;
    	let t12;
    	let section1;
    	let div4;
    	let kernelmathview;
    	let t13;
    	let section2;
    	let div8;
    	let div5;
    	let t15;
    	let div6;
    	let t16;
    	let t17_value = /*output*/ ctx[2].length + "";
    	let t17;
    	let t18;
    	let t19_value = /*output*/ ctx[2][0].length + "";
    	let t19;
    	let t20;
    	let t21;
    	let div7;
    	let t23;
    	let dataview1;
    	let t24;
    	let div10;
    	let current;

    	dataview0 = new Dataview({
    			props: {
    				data: /*testImage*/ ctx[11],
    				highlights: /*inputHighlights*/ ctx[8],
    				outputLength: /*output*/ ctx[2].length,
    				isKernelMath: false,
    				constraint: getVisualizationSizeConstraint(/*image*/ ctx[1].length),
    				dataRange: /*dataRange*/ ctx[3],
    				stride: /*stride*/ ctx[0],
    				colorScale: /*colorScale*/ ctx[4],
    				isInputLayer: /*isInputInputLayer*/ ctx[5]
    			}
    		});

    	dataview0.$on("message", /*handleMouseover*/ ctx[16]);

    	kernelmathview = new KernelMathView({
    			props: {
    				data: /*testInputMatrixSlice*/ ctx[10],
    				kernel: /*testKernel*/ ctx[13],
    				constraint: mathConstraint,
    				result: /*selectedConvolutionResult*/ ctx[14],
    				dataRange: /*dataRange*/ ctx[3],
    				kernelRange: /*currentKernelRange*/ ctx[7],
    				colorScale: /*colorScale*/ ctx[4],
    				isInputLayer: /*isInputInputLayer*/ ctx[5],
    				displayPrecision
    			}
    		});

    	dataview1 = new Dataview({
    			props: {
    				data: /*testOutput*/ ctx[12],
    				highlights: /*outputHighlights*/ ctx[9],
    				isKernelMath: false,
    				outputLength: /*output*/ ctx[2].length,
    				constraint: getVisualizationSizeConstraint(/*output*/ ctx[2].length),
    				dataRange: /*dataRange*/ ctx[3],
    				stride: /*stride*/ ctx[0]
    			}
    		});

    	dataview1.$on("message", /*handleMouseover*/ ctx[16]);

    	return {
    		c() {
    			div11 = element("div");
    			div9 = element("div");
    			section0 = element("section");
    			div3 = element("div");
    			div0 = element("div");
    			t0 = text("Input ");
    			t1 = text(/*inputChannelName*/ ctx[6]);
    			t2 = text(" Chanel");
    			t3 = space();
    			div1 = element("div");
    			t4 = text("(");
    			t5 = text(t5_value);
    			t6 = text(",");
    			t7 = text(t7_value);
    			t8 = text(",1)");
    			t9 = space();
    			div2 = element("div");
    			div2.textContent = "[H,W,C]";
    			t11 = space();
    			create_component(dataview0.$$.fragment);
    			t12 = space();
    			section1 = element("section");
    			div4 = element("div");
    			create_component(kernelmathview.$$.fragment);
    			t13 = space();
    			section2 = element("section");
    			div8 = element("div");
    			div5 = element("div");
    			div5.textContent = "Output Feature Map";
    			t15 = space();
    			div6 = element("div");
    			t16 = text("(");
    			t17 = text(t17_value);
    			t18 = text(",");
    			t19 = text(t19_value);
    			t20 = text(",1)");
    			t21 = space();
    			div7 = element("div");
    			div7.textContent = "[H,W,C]";
    			t23 = space();
    			create_component(dataview1.$$.fragment);
    			t24 = space();
    			div10 = element("div");

    			div10.innerHTML = `<small><strong>Convolution:</strong>
      Extracts features through element-wise multiplication and accumulation.</small>`;

    			attr(div0, "class", "matrix-heading-title svelte-v00ib4");
    			attr(div1, "class", "matrix-heading-shape svelte-v00ib4");
    			attr(div2, "class", "matrix-heading-dimensions svelte-v00ib4");
    			attr(div3, "class", "matrix-heading svelte-v00ib4");
    			attr(section0, "class", "visual-panel input-panel svelte-v00ib4");
    			attr(div4, "class", "math-section svelte-v00ib4");
    			attr(div4, "data-calculated-result", /*selectedConvolutionResult*/ ctx[14]);
    			attr(div4, "data-model-result", /*selectedModelResult*/ ctx[15]);
    			attr(section1, "class", "calculation-panel svelte-v00ib4");
    			attr(div5, "class", "matrix-heading-title svelte-v00ib4");
    			attr(div6, "class", "matrix-heading-shape svelte-v00ib4");
    			attr(div7, "class", "matrix-heading-dimensions svelte-v00ib4");
    			attr(div8, "class", "matrix-heading svelte-v00ib4");
    			attr(section2, "class", "visual-panel output-panel svelte-v00ib4");
    			attr(div9, "class", "computation-row svelte-v00ib4");
    			attr(div10, "class", "convolution-legend-note svelte-v00ib4");
    			attr(div11, "class", "convolution-layout svelte-v00ib4");
    		},
    		m(target, anchor) {
    			insert(target, div11, anchor);
    			append(div11, div9);
    			append(div9, section0);
    			append(section0, div3);
    			append(div3, div0);
    			append(div0, t0);
    			append(div0, t1);
    			append(div0, t2);
    			append(div3, t3);
    			append(div3, div1);
    			append(div1, t4);
    			append(div1, t5);
    			append(div1, t6);
    			append(div1, t7);
    			append(div1, t8);
    			append(div3, t9);
    			append(div3, div2);
    			append(section0, t11);
    			mount_component(dataview0, section0, null);
    			append(div9, t12);
    			append(div9, section1);
    			append(section1, div4);
    			mount_component(kernelmathview, div4, null);
    			append(div9, t13);
    			append(div9, section2);
    			append(section2, div8);
    			append(div8, div5);
    			append(div8, t15);
    			append(div8, div6);
    			append(div6, t16);
    			append(div6, t17);
    			append(div6, t18);
    			append(div6, t19);
    			append(div6, t20);
    			append(div8, t21);
    			append(div8, div7);
    			append(section2, t23);
    			mount_component(dataview1, section2, null);
    			append(div11, t24);
    			append(div11, div10);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (!current || dirty[0] & /*inputChannelName*/ 64) set_data(t1, /*inputChannelName*/ ctx[6]);
    			if ((!current || dirty[0] & /*image*/ 2) && t5_value !== (t5_value = /*image*/ ctx[1].length + "")) set_data(t5, t5_value);
    			if ((!current || dirty[0] & /*image*/ 2) && t7_value !== (t7_value = /*image*/ ctx[1][0].length + "")) set_data(t7, t7_value);
    			const dataview0_changes = {};
    			if (dirty[0] & /*testImage*/ 2048) dataview0_changes.data = /*testImage*/ ctx[11];
    			if (dirty[0] & /*inputHighlights*/ 256) dataview0_changes.highlights = /*inputHighlights*/ ctx[8];
    			if (dirty[0] & /*output*/ 4) dataview0_changes.outputLength = /*output*/ ctx[2].length;
    			if (dirty[0] & /*image*/ 2) dataview0_changes.constraint = getVisualizationSizeConstraint(/*image*/ ctx[1].length);
    			if (dirty[0] & /*dataRange*/ 8) dataview0_changes.dataRange = /*dataRange*/ ctx[3];
    			if (dirty[0] & /*stride*/ 1) dataview0_changes.stride = /*stride*/ ctx[0];
    			if (dirty[0] & /*colorScale*/ 16) dataview0_changes.colorScale = /*colorScale*/ ctx[4];
    			if (dirty[0] & /*isInputInputLayer*/ 32) dataview0_changes.isInputLayer = /*isInputInputLayer*/ ctx[5];
    			dataview0.$set(dataview0_changes);
    			const kernelmathview_changes = {};
    			if (dirty[0] & /*testInputMatrixSlice*/ 1024) kernelmathview_changes.data = /*testInputMatrixSlice*/ ctx[10];
    			if (dirty[0] & /*testKernel*/ 8192) kernelmathview_changes.kernel = /*testKernel*/ ctx[13];
    			if (dirty[0] & /*selectedConvolutionResult*/ 16384) kernelmathview_changes.result = /*selectedConvolutionResult*/ ctx[14];
    			if (dirty[0] & /*dataRange*/ 8) kernelmathview_changes.dataRange = /*dataRange*/ ctx[3];
    			if (dirty[0] & /*currentKernelRange*/ 128) kernelmathview_changes.kernelRange = /*currentKernelRange*/ ctx[7];
    			if (dirty[0] & /*colorScale*/ 16) kernelmathview_changes.colorScale = /*colorScale*/ ctx[4];
    			if (dirty[0] & /*isInputInputLayer*/ 32) kernelmathview_changes.isInputLayer = /*isInputInputLayer*/ ctx[5];
    			kernelmathview.$set(kernelmathview_changes);

    			if (!current || dirty[0] & /*selectedConvolutionResult*/ 16384) {
    				attr(div4, "data-calculated-result", /*selectedConvolutionResult*/ ctx[14]);
    			}

    			if (!current || dirty[0] & /*selectedModelResult*/ 32768) {
    				attr(div4, "data-model-result", /*selectedModelResult*/ ctx[15]);
    			}

    			if ((!current || dirty[0] & /*output*/ 4) && t17_value !== (t17_value = /*output*/ ctx[2].length + "")) set_data(t17, t17_value);
    			if ((!current || dirty[0] & /*output*/ 4) && t19_value !== (t19_value = /*output*/ ctx[2][0].length + "")) set_data(t19, t19_value);
    			const dataview1_changes = {};
    			if (dirty[0] & /*testOutput*/ 4096) dataview1_changes.data = /*testOutput*/ ctx[12];
    			if (dirty[0] & /*outputHighlights*/ 512) dataview1_changes.highlights = /*outputHighlights*/ ctx[9];
    			if (dirty[0] & /*output*/ 4) dataview1_changes.outputLength = /*output*/ ctx[2].length;
    			if (dirty[0] & /*output*/ 4) dataview1_changes.constraint = getVisualizationSizeConstraint(/*output*/ ctx[2].length);
    			if (dirty[0] & /*dataRange*/ 8) dataview1_changes.dataRange = /*dataRange*/ ctx[3];
    			if (dirty[0] & /*stride*/ 1) dataview1_changes.stride = /*stride*/ ctx[0];
    			dataview1.$set(dataview1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(dataview0.$$.fragment, local);
    			transition_in(kernelmathview.$$.fragment, local);
    			transition_in(dataview1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(dataview0.$$.fragment, local);
    			transition_out(kernelmathview.$$.fragment, local);
    			transition_out(dataview1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div11);
    			destroy_component(dataview0);
    			destroy_component(kernelmathview);
    			destroy_component(dataview1);
    		}
    	};
    }

    const mathConstraint = 32;
    const displayPrecision = 3;
    const legendPrecision = 2;

    function instance$2($$self, $$props, $$invalidate) {
    	let localKernelRange;
    	let currentKernelRange;
    	let kernelMinLabel;
    	let kernelMaxLabel;
    	let { stride } = $$props;
    	let { dilation } = $$props;
    	let { kernel } = $$props;
    	let { kernelMinMax = undefined } = $$props;
    	let { kernelColorRange = undefined } = $$props;
    	let { image } = $$props;
    	let { output } = $$props;
    	let { isPaused } = $$props;
    	let { dataRange } = $$props;
    	let { colorScale } = $$props;
    	let { isInputInputLayer = false } = $$props;
    	let { inputChannelName = 'Red' } = $$props;
    	const dispatch = createEventDispatcher();
    	let inputHighlights = [];
    	let outputHighlights = array1d(output.length * output.length, i => true);
    	let interval;
    	let counter = 0;
    	let testInputMatrixSlice = gridData(Array.from({ length: kernel.length }, () => Array(kernel.length).fill(0)), mathConstraint, displayPrecision);
    	let testImage = gridData(image);
    	let testOutput = gridData(output);
    	let testKernel = gridData(kernel, mathConstraint, displayPrecision);
    	let selectedConvolutionResult = 0;
    	let selectedModelResult = 0;

    	const roundTo = (value, precision) => {
    		const scale = Math.pow(10, precision);
    		return Math.round(value * scale) / scale;
    	};

    	const formatLegendValue = value => {
    		const roundedValue = roundTo(Number(value), legendPrecision);
    		const normalizedValue = Object.is(roundedValue, -0) ? 0 : roundedValue;

    		return Number.isFinite(normalizedValue)
    		? normalizedValue.toFixed(legendPrecision)
    		: '0.00';
    	};

    	const getPadding = () => {
    		const effectiveKernelSize = (kernel.length - 1) * dilation + 1;
    		const requiredInputSize = (output.length - 1) * stride + effectiveKernelSize;
    		return Math.max(0, Math.floor((requiredInputSize - image.length) / 2));
    	};

    	const getConvolutionWindow = (outputRow, outputColumn) => {
    		const padding = getPadding();

    		return Array.from({ length: kernel.length }, (_, kernelRow) => Array.from({ length: kernel[0].length }, (_, kernelColumn) => {
    			const inputRow = outputRow * stride + kernelRow * dilation - padding;
    			const inputColumn = outputColumn * stride + kernelColumn * dilation - padding;
    			const isInsideInput = inputRow >= 0 && inputRow < image.length && inputColumn >= 0 && inputColumn < image[0].length;
    			return isInsideInput ? image[inputRow][inputColumn] : 0;
    		}));
    	};

    	const getInputHighlights = (outputRow, outputColumn) => {
    		const padding = getPadding();
    		const highlights = array1d(image.length * image[0].length);

    		for (let kernelRow = 0; kernelRow < kernel.length; kernelRow++) {
    			for (let kernelColumn = 0; kernelColumn < kernel[0].length; kernelColumn++) {
    				const inputRow = outputRow * stride + kernelRow * dilation - padding;
    				const inputColumn = outputColumn * stride + kernelColumn * dilation - padding;

    				if (inputRow >= 0 && inputRow < image.length && inputColumn >= 0 && inputColumn < image[0].length) {
    					highlights[inputRow * image[0].length + inputColumn] = true;
    				}
    			}
    		}

    		return highlights;
    	};

    	const dotProduct = (inputWindow, kernelWeights) => {
    		let sum = 0;

    		for (let row = 0; row < inputWindow.length; row++) {
    			for (let column = 0; column < inputWindow[0].length; column++) {
    				sum += inputWindow[row][column] * kernelWeights[row][column];
    			}
    		}

    		return sum;
    	};

    	const updateFrame = (outputRow, outputColumn) => {
    		const safeRow = Math.max(0, Math.min(outputRow, output.length - 1));
    		const safeColumn = Math.max(0, Math.min(outputColumn, output[0].length - 1));
    		$$invalidate(9, outputHighlights = array1d(output.length * output[0].length, () => false));
    		$$invalidate(9, outputHighlights[safeRow * output[0].length + safeColumn] = true, outputHighlights);
    		$$invalidate(8, inputHighlights = getInputHighlights(safeRow, safeColumn));
    		const rawInputWindow = getConvolutionWindow(safeRow, safeColumn);
    		const displayedInputWindow = rawInputWindow.map(row => row.map(value => roundTo(value, displayPrecision)));
    		const displayedKernel = kernel.map(row => row.map(value => roundTo(value, displayPrecision)));
    		$$invalidate(10, testInputMatrixSlice = gridData(displayedInputWindow, mathConstraint, displayPrecision));
    		$$invalidate(14, selectedConvolutionResult = roundTo(dotProduct(displayedInputWindow, displayedKernel), displayPrecision));
    		$$invalidate(15, selectedModelResult = output[safeRow][safeColumn]);
    	};

    	function startConvolution(stride) {
    		if (stride <= 0) return;
    		if (interval) clearInterval(interval);
    		counter = 0;
    		updateFrame(0, 0);
    		counter = 1;

    		interval = setInterval(
    			() => {
    				if (isPaused) return;
    				const totalOutputCells = output.length * output[0].length;
    				const flat_animated = counter % totalOutputCells;
    				const animatedH = Math.floor(flat_animated / output[0].length);
    				const animatedW = flat_animated % output[0].length;
    				updateFrame(animatedH, animatedW);
    				counter++;
    			},
    			400
    		);
    	}

    	function handleMouseover(event) {
    		updateFrame(event.detail.hoverH, event.detail.hoverW);
    		$$invalidate(17, isPaused = true);
    		dispatch('message', { text: isPaused });
    	}

    	onDestroy(() => {
    		if (interval) clearInterval(interval);
    	});

    	$$self.$$set = $$props => {
    		if ('stride' in $$props) $$invalidate(0, stride = $$props.stride);
    		if ('dilation' in $$props) $$invalidate(18, dilation = $$props.dilation);
    		if ('kernel' in $$props) $$invalidate(19, kernel = $$props.kernel);
    		if ('kernelMinMax' in $$props) $$invalidate(20, kernelMinMax = $$props.kernelMinMax);
    		if ('kernelColorRange' in $$props) $$invalidate(21, kernelColorRange = $$props.kernelColorRange);
    		if ('image' in $$props) $$invalidate(1, image = $$props.image);
    		if ('output' in $$props) $$invalidate(2, output = $$props.output);
    		if ('isPaused' in $$props) $$invalidate(17, isPaused = $$props.isPaused);
    		if ('dataRange' in $$props) $$invalidate(3, dataRange = $$props.dataRange);
    		if ('colorScale' in $$props) $$invalidate(4, colorScale = $$props.colorScale);
    		if ('isInputInputLayer' in $$props) $$invalidate(5, isInputInputLayer = $$props.isInputInputLayer);
    		if ('inputChannelName' in $$props) $$invalidate(6, inputChannelName = $$props.inputChannelName);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*kernel, stride, image, output*/ 524295) {
    			 {
    				const displayedKernel = kernel.map(row => row.map(value => roundTo(value, displayPrecision)));
    				startConvolution(stride);
    				$$invalidate(11, testImage = gridData(image));
    				$$invalidate(12, testOutput = gridData(output));
    				$$invalidate(13, testKernel = gridData(displayedKernel, mathConstraint, displayPrecision));
    			}
    		}

    		if ($$self.$$.dirty[0] & /*kernel*/ 524288) {
    			 $$invalidate(22, localKernelRange = getDataRange(kernel));
    		}

    		if ($$self.$$.dirty[0] & /*kernelColorRange, localKernelRange, kernelMinMax*/ 7340032) {
    			 $$invalidate(7, currentKernelRange = {
    				range: Number.isFinite(Number(kernelColorRange)) && Number(kernelColorRange) > 0
    				? Number(kernelColorRange)
    				: localKernelRange.range,
    				min: kernelMinMax && Number.isFinite(Number(kernelMinMax.min))
    				? Number(kernelMinMax.min)
    				: localKernelRange.min,
    				max: kernelMinMax && Number.isFinite(Number(kernelMinMax.max))
    				? Number(kernelMinMax.max)
    				: localKernelRange.max
    			});
    		}

    		if ($$self.$$.dirty[0] & /*currentKernelRange*/ 128) {
    			 kernelMinLabel = formatLegendValue(currentKernelRange.min);
    		}

    		if ($$self.$$.dirty[0] & /*currentKernelRange*/ 128) {
    			 kernelMaxLabel = formatLegendValue(currentKernelRange.max);
    		}
    	};

    	return [
    		stride,
    		image,
    		output,
    		dataRange,
    		colorScale,
    		isInputInputLayer,
    		inputChannelName,
    		currentKernelRange,
    		inputHighlights,
    		outputHighlights,
    		testInputMatrixSlice,
    		testImage,
    		testOutput,
    		testKernel,
    		selectedConvolutionResult,
    		selectedModelResult,
    		handleMouseover,
    		isPaused,
    		dilation,
    		kernel,
    		kernelMinMax,
    		kernelColorRange,
    		localKernelRange
    	];
    }

    class ConvolutionAnimator extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$2,
    			create_fragment$2,
    			safe_not_equal,
    			{
    				stride: 0,
    				dilation: 18,
    				kernel: 19,
    				kernelMinMax: 20,
    				kernelColorRange: 21,
    				image: 1,
    				output: 2,
    				isPaused: 17,
    				dataRange: 3,
    				colorScale: 4,
    				isInputInputLayer: 5,
    				inputChannelName: 6
    			},
    			null,
    			[-1, -1]
    		);
    	}
    }

    /* src\detail-view\Convolutionview.svelte generated by Svelte v3.59.2 */

    function create_if_block(ctx) {
    	let div5;
    	let div4;
    	let div2;
    	let div0;
    	let t1;
    	let div1;
    	let button0;

    	let raw_value = (/*isPaused*/ ctx[8]
    	? '<i class="fas fa-play-circle play-icon"></i>'
    	: '<i class="fas fa-pause-circle"></i>') + "";

    	let button0_aria_label_value;
    	let button0_title_value;
    	let t2;
    	let button1;
    	let t3;
    	let div3;
    	let convolutionanimator;
    	let current;
    	let mounted;
    	let dispose;

    	convolutionanimator = new ConvolutionAnimator({
    			props: {
    				kernel: /*kernel*/ ctx[2],
    				image: /*input*/ ctx[1],
    				output: /*outputFinal*/ ctx[9],
    				stride,
    				dilation,
    				isPaused: /*isPaused*/ ctx[8],
    				kernelMinMax: /*kernelMinMax*/ ctx[3],
    				kernelColorRange: /*kernelColorRange*/ ctx[4],
    				dataRange: /*dataRange*/ ctx[5],
    				colorScale: /*colorScale*/ ctx[6],
    				isInputInputLayer: /*isInputInputLayer*/ ctx[7],
    				inputChannelName: /*inputChannelName*/ ctx[10]
    			}
    		});

    	convolutionanimator.$on("message", /*handlePauseFromInteraction*/ ctx[12]);

    	return {
    		c() {
    			div5 = element("div");
    			div4 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			div0.textContent = "Convolution Computation";
    			t1 = space();
    			div1 = element("div");
    			button0 = element("button");
    			t2 = space();
    			button1 = element("button");
    			button1.innerHTML = `<i class="fas control-icon fa-times-circle"></i>`;
    			t3 = space();
    			div3 = element("div");
    			create_component(convolutionanimator.$$.fragment);
    			attr(div0, "class", "title-text svelte-11b5wwi");
    			attr(button0, "type", "button");
    			attr(button0, "class", "play-button control-button svelte-11b5wwi");

    			attr(button0, "aria-label", button0_aria_label_value = /*isPaused*/ ctx[8]
    			? 'Play animation'
    			: 'Pause animation');

    			attr(button0, "title", button0_title_value = /*isPaused*/ ctx[8]
    			? 'Play animation'
    			: 'Pause animation');

    			attr(button1, "type", "button");
    			attr(button1, "class", "delete-button control-button svelte-11b5wwi");
    			attr(button1, "aria-label", "Close computation");
    			attr(button1, "title", "Close");
    			attr(div1, "class", "buttons svelte-11b5wwi");
    			attr(div2, "class", "control-pannel svelte-11b5wwi");
    			attr(div3, "class", "animator-container svelte-11b5wwi");
    			attr(div4, "class", "box svelte-11b5wwi");
    			attr(div5, "id", "detailview-container");
    			attr(div5, "class", "svelte-11b5wwi");
    		},
    		m(target, anchor) {
    			insert(target, div5, anchor);
    			append(div5, div4);
    			append(div4, div2);
    			append(div2, div0);
    			append(div2, t1);
    			append(div2, div1);
    			append(div1, button0);
    			button0.innerHTML = raw_value;
    			append(div1, t2);
    			append(div1, button1);
    			append(div4, t3);
    			append(div4, div3);
    			mount_component(convolutionanimator, div3, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(button0, "click", /*handleClickPause*/ ctx[11]),
    					listen(button1, "click", /*handleClickX*/ ctx[13])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if ((!current || dirty & /*isPaused*/ 256) && raw_value !== (raw_value = (/*isPaused*/ ctx[8]
    			? '<i class="fas fa-play-circle play-icon"></i>'
    			: '<i class="fas fa-pause-circle"></i>') + "")) button0.innerHTML = raw_value;
    			if (!current || dirty & /*isPaused*/ 256 && button0_aria_label_value !== (button0_aria_label_value = /*isPaused*/ ctx[8]
    			? 'Play animation'
    			: 'Pause animation')) {
    				attr(button0, "aria-label", button0_aria_label_value);
    			}

    			if (!current || dirty & /*isPaused*/ 256 && button0_title_value !== (button0_title_value = /*isPaused*/ ctx[8]
    			? 'Play animation'
    			: 'Pause animation')) {
    				attr(button0, "title", button0_title_value);
    			}

    			const convolutionanimator_changes = {};
    			if (dirty & /*kernel*/ 4) convolutionanimator_changes.kernel = /*kernel*/ ctx[2];
    			if (dirty & /*input*/ 2) convolutionanimator_changes.image = /*input*/ ctx[1];
    			if (dirty & /*outputFinal*/ 512) convolutionanimator_changes.output = /*outputFinal*/ ctx[9];
    			if (dirty & /*isPaused*/ 256) convolutionanimator_changes.isPaused = /*isPaused*/ ctx[8];
    			if (dirty & /*kernelMinMax*/ 8) convolutionanimator_changes.kernelMinMax = /*kernelMinMax*/ ctx[3];
    			if (dirty & /*kernelColorRange*/ 16) convolutionanimator_changes.kernelColorRange = /*kernelColorRange*/ ctx[4];
    			if (dirty & /*dataRange*/ 32) convolutionanimator_changes.dataRange = /*dataRange*/ ctx[5];
    			if (dirty & /*colorScale*/ 64) convolutionanimator_changes.colorScale = /*colorScale*/ ctx[6];
    			if (dirty & /*isInputInputLayer*/ 128) convolutionanimator_changes.isInputInputLayer = /*isInputInputLayer*/ ctx[7];
    			if (dirty & /*inputChannelName*/ 1024) convolutionanimator_changes.inputChannelName = /*inputChannelName*/ ctx[10];
    			convolutionanimator.$set(convolutionanimator_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(convolutionanimator.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(convolutionanimator.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div5);
    			destroy_component(convolutionanimator);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$3(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = !/*isExited*/ ctx[0] && create_if_block(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (!/*isExited*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*isExited*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    let stride = 1;
    const dilation = 1;

    function instance$3($$self, $$props, $$invalidate) {
    	let inputChannelName;
    	let { input } = $$props;
    	let { kernel } = $$props;
    	let { kernelMinMax = undefined } = $$props;
    	let { kernelColorRange = undefined } = $$props;
    	let { dataRange } = $$props;
    	let { colorScale = d3.interpolateRdBu } = $$props;
    	let { isInputInputLayer = false } = $$props;
    	let { inputChannelIndex = 0 } = $$props;
    	let { isExited = false } = $$props;
    	const inputColorChannels = ['Red', 'Green', 'Blue'];
    	const dispatch = createEventDispatcher();
    	var isPaused = false;
    	var outputFinal = singleConv(input, kernel, stride);

    	function handleClickPause() {
    		$$invalidate(8, isPaused = !isPaused);
    	}

    	function handlePauseFromInteraction(event) {
    		$$invalidate(8, isPaused = event.detail.text);
    	}

    	function handleClickX() {
    		$$invalidate(0, isExited = true);
    		dispatch('message', { text: isExited });
    	}

    	$$self.$$set = $$props => {
    		if ('input' in $$props) $$invalidate(1, input = $$props.input);
    		if ('kernel' in $$props) $$invalidate(2, kernel = $$props.kernel);
    		if ('kernelMinMax' in $$props) $$invalidate(3, kernelMinMax = $$props.kernelMinMax);
    		if ('kernelColorRange' in $$props) $$invalidate(4, kernelColorRange = $$props.kernelColorRange);
    		if ('dataRange' in $$props) $$invalidate(5, dataRange = $$props.dataRange);
    		if ('colorScale' in $$props) $$invalidate(6, colorScale = $$props.colorScale);
    		if ('isInputInputLayer' in $$props) $$invalidate(7, isInputInputLayer = $$props.isInputInputLayer);
    		if ('inputChannelIndex' in $$props) $$invalidate(14, inputChannelIndex = $$props.inputChannelIndex);
    		if ('isExited' in $$props) $$invalidate(0, isExited = $$props.isExited);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*isInputInputLayer, inputChannelIndex*/ 16512) {
    			 $$invalidate(10, inputChannelName = isInputInputLayer && inputColorChannels[inputChannelIndex]
    			? inputColorChannels[inputChannelIndex]
    			: `Feature ${inputChannelIndex + 1}`);
    		}

    		if ($$self.$$.dirty & /*input, kernel*/ 6) {
    			 {
    				try {
    					$$invalidate(9, outputFinal = singleConv(input, kernel, stride));
    				} catch {
    					
    				}
    			}
    		}
    	};

    	return [
    		isExited,
    		input,
    		kernel,
    		kernelMinMax,
    		kernelColorRange,
    		dataRange,
    		colorScale,
    		isInputInputLayer,
    		isPaused,
    		outputFinal,
    		inputChannelName,
    		handleClickPause,
    		handlePauseFromInteraction,
    		handleClickX,
    		inputChannelIndex
    	];
    }

    class Convolutionview extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			input: 1,
    			kernel: 2,
    			kernelMinMax: 3,
    			kernelColorRange: 4,
    			dataRange: 5,
    			colorScale: 6,
    			isInputInputLayer: 7,
    			inputChannelIndex: 14,
    			isExited: 0
    		});
    	}
    }

    /* src\detail-view\ActivationAnimator.svelte generated by Svelte v3.59.2 */

    function create_fragment$4(ctx) {
    	let div13;
    	let div12;
    	let section0;
    	let div3;
    	let div0;
    	let t1;
    	let div1;
    	let t2;
    	let t3_value = /*image*/ ctx[0].length + "";
    	let t3;
    	let t4;
    	let t5_value = /*image*/ ctx[0][0].length + "";
    	let t5;
    	let t6;
    	let t7;
    	let div2;
    	let t9;
    	let dataview0;
    	let t10;
    	let section1;
    	let div6;
    	let div4;
    	let span0;
    	let t12;
    	let dataview1;
    	let t13;
    	let span1;
    	let t15;
    	let div5;
    	let span2;
    	let t17;
    	let dataview2;
    	let t18;
    	let div7;
    	let t21;
    	let section2;
    	let div11;
    	let div8;
    	let t23;
    	let div9;
    	let t24;
    	let t25_value = /*activatedOutput*/ ctx[2].length + "";
    	let t25;
    	let t26;
    	let t27_value = /*activatedOutput*/ ctx[2][0].length + "";
    	let t27;
    	let t28;
    	let t29;
    	let div10;
    	let t31;
    	let dataview3;
    	let section2_data_has_negative_value;
    	let section2_data_node_output_has_negative_value;
    	let current;

    	dataview0 = new Dataview({
    			props: {
    				data: /*gridImage*/ ctx[5],
    				highlights: /*inputHighlights*/ ctx[7],
    				outputLength: /*activatedOutput*/ ctx[2].length,
    				isKernelMath: false,
    				constraint: getVisualizationSizeConstraint(/*image*/ ctx[0].length),
    				dataRange: /*dataRange*/ ctx[1],
    				stride: 1
    			}
    		});

    	dataview0.$on("message", /*handleMouseover*/ ctx[14]);

    	dataview1 = new Dataview({
    			props: {
    				data: /*gridInputMatrixSlice*/ ctx[3],
    				highlights: /*outputHighlights*/ ctx[8],
    				isKernelMath: true,
    				constraint: mathConstraint$1,
    				dataRange: /*dataRange*/ ctx[1]
    			}
    		});

    	dataview2 = new Dataview({
    			props: {
    				data: /*gridOutputMatrixSlice*/ ctx[4],
    				highlights: /*outputHighlights*/ ctx[8],
    				isKernelMath: true,
    				constraint: mathConstraint$1,
    				dataRange: /*dataRange*/ ctx[1]
    			}
    		});

    	dataview3 = new Dataview({
    			props: {
    				data: /*gridOutput*/ ctx[6],
    				highlights: /*outputHighlights*/ ctx[8],
    				isKernelMath: false,
    				outputLength: /*activatedOutput*/ ctx[2].length,
    				constraint: getVisualizationSizeConstraint(/*activatedOutput*/ ctx[2].length),
    				dataRange: /*dataRange*/ ctx[1],
    				stride: 1
    			}
    		});

    	dataview3.$on("message", /*handleMouseover*/ ctx[14]);

    	return {
    		c() {
    			div13 = element("div");
    			div12 = element("div");
    			section0 = element("section");
    			div3 = element("div");
    			div0 = element("div");
    			div0.textContent = "Input Feature Map";
    			t1 = space();
    			div1 = element("div");
    			t2 = text("(");
    			t3 = text(t3_value);
    			t4 = text(",");
    			t5 = text(t5_value);
    			t6 = text(",1)");
    			t7 = space();
    			div2 = element("div");
    			div2.textContent = "[H, W, C]";
    			t9 = space();
    			create_component(dataview0.$$.fragment);
    			t10 = space();
    			section1 = element("section");
    			div6 = element("div");
    			div4 = element("div");
    			span0 = element("span");
    			span0.textContent = "Relu(x) = max(0,";
    			t12 = space();
    			create_component(dataview1.$$.fragment);
    			t13 = space();
    			span1 = element("span");
    			span1.textContent = ")";
    			t15 = space();
    			div5 = element("div");
    			span2 = element("span");
    			span2.textContent = "=";
    			t17 = space();
    			create_component(dataview2.$$.fragment);
    			t18 = space();
    			div7 = element("div");

    			div7.innerHTML = `<small><strong>Relu:</strong>
          Sets negative values to zero while preserving non-negative values.</small>`;

    			t21 = space();
    			section2 = element("section");
    			div11 = element("div");
    			div8 = element("div");
    			div8.textContent = "Activated Feature Map";
    			t23 = space();
    			div9 = element("div");
    			t24 = text("(");
    			t25 = text(t25_value);
    			t26 = text(",");
    			t27 = text(t27_value);
    			t28 = text(",1)");
    			t29 = space();
    			div10 = element("div");
    			div10.textContent = "[H, W, C]";
    			t31 = space();
    			create_component(dataview3.$$.fragment);
    			attr(div0, "class", "matrix-heading-title svelte-uqs7tu");
    			attr(div1, "class", "matrix-heading-shape svelte-uqs7tu");
    			attr(div2, "class", "matrix-heading-dimensions svelte-uqs7tu");
    			attr(div3, "class", "matrix-heading svelte-uqs7tu");
    			attr(section0, "class", "visual-panel input-panel svelte-uqs7tu");
    			attr(div4, "class", "activation-equation-row expression svelte-uqs7tu");
    			attr(div5, "class", "activation-equation-row result svelte-uqs7tu");
    			attr(div6, "class", "activation-formula svelte-uqs7tu");
    			attr(div6, "data-input-value", /*selectedInputValue*/ ctx[9]);
    			attr(div6, "data-output-value", /*selectedOutputValue*/ ctx[10]);
    			attr(div7, "class", "relu-note svelte-uqs7tu");
    			attr(section1, "class", "calculation-panel svelte-uqs7tu");
    			attr(div8, "class", "matrix-heading-title svelte-uqs7tu");
    			attr(div9, "class", "matrix-heading-shape svelte-uqs7tu");
    			attr(div10, "class", "matrix-heading-dimensions svelte-uqs7tu");
    			attr(div11, "class", "matrix-heading svelte-uqs7tu");
    			attr(section2, "class", "visual-panel output-panel svelte-uqs7tu");
    			attr(section2, "data-min-value", /*activatedOutputMin*/ ctx[13]);
    			attr(section2, "data-max-value", /*activatedOutputMax*/ ctx[12]);
    			attr(section2, "data-has-negative", section2_data_has_negative_value = /*activatedOutputMin*/ ctx[13] < 0);
    			attr(section2, "data-node-output-min", /*nodeOutputMin*/ ctx[11]);
    			attr(section2, "data-node-output-has-negative", section2_data_node_output_has_negative_value = /*nodeOutputMin*/ ctx[11] < 0);
    			attr(div12, "class", "computation-row svelte-uqs7tu");
    			attr(div13, "class", "activation-layout svelte-uqs7tu");
    			attr(div13, "data-operation", "relu");
    		},
    		m(target, anchor) {
    			insert(target, div13, anchor);
    			append(div13, div12);
    			append(div12, section0);
    			append(section0, div3);
    			append(div3, div0);
    			append(div3, t1);
    			append(div3, div1);
    			append(div1, t2);
    			append(div1, t3);
    			append(div1, t4);
    			append(div1, t5);
    			append(div1, t6);
    			append(div3, t7);
    			append(div3, div2);
    			append(section0, t9);
    			mount_component(dataview0, section0, null);
    			append(div12, t10);
    			append(div12, section1);
    			append(section1, div6);
    			append(div6, div4);
    			append(div4, span0);
    			append(div4, t12);
    			mount_component(dataview1, div4, null);
    			append(div4, t13);
    			append(div4, span1);
    			append(div6, t15);
    			append(div6, div5);
    			append(div5, span2);
    			append(div5, t17);
    			mount_component(dataview2, div5, null);
    			append(section1, t18);
    			append(section1, div7);
    			append(div12, t21);
    			append(div12, section2);
    			append(section2, div11);
    			append(div11, div8);
    			append(div11, t23);
    			append(div11, div9);
    			append(div9, t24);
    			append(div9, t25);
    			append(div9, t26);
    			append(div9, t27);
    			append(div9, t28);
    			append(div11, t29);
    			append(div11, div10);
    			append(section2, t31);
    			mount_component(dataview3, section2, null);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if ((!current || dirty & /*image*/ 1) && t3_value !== (t3_value = /*image*/ ctx[0].length + "")) set_data(t3, t3_value);
    			if ((!current || dirty & /*image*/ 1) && t5_value !== (t5_value = /*image*/ ctx[0][0].length + "")) set_data(t5, t5_value);
    			const dataview0_changes = {};
    			if (dirty & /*gridImage*/ 32) dataview0_changes.data = /*gridImage*/ ctx[5];
    			if (dirty & /*inputHighlights*/ 128) dataview0_changes.highlights = /*inputHighlights*/ ctx[7];
    			if (dirty & /*activatedOutput*/ 4) dataview0_changes.outputLength = /*activatedOutput*/ ctx[2].length;
    			if (dirty & /*image*/ 1) dataview0_changes.constraint = getVisualizationSizeConstraint(/*image*/ ctx[0].length);
    			if (dirty & /*dataRange*/ 2) dataview0_changes.dataRange = /*dataRange*/ ctx[1];
    			dataview0.$set(dataview0_changes);
    			const dataview1_changes = {};
    			if (dirty & /*gridInputMatrixSlice*/ 8) dataview1_changes.data = /*gridInputMatrixSlice*/ ctx[3];
    			if (dirty & /*outputHighlights*/ 256) dataview1_changes.highlights = /*outputHighlights*/ ctx[8];
    			if (dirty & /*dataRange*/ 2) dataview1_changes.dataRange = /*dataRange*/ ctx[1];
    			dataview1.$set(dataview1_changes);
    			const dataview2_changes = {};
    			if (dirty & /*gridOutputMatrixSlice*/ 16) dataview2_changes.data = /*gridOutputMatrixSlice*/ ctx[4];
    			if (dirty & /*outputHighlights*/ 256) dataview2_changes.highlights = /*outputHighlights*/ ctx[8];
    			if (dirty & /*dataRange*/ 2) dataview2_changes.dataRange = /*dataRange*/ ctx[1];
    			dataview2.$set(dataview2_changes);

    			if (!current || dirty & /*selectedInputValue*/ 512) {
    				attr(div6, "data-input-value", /*selectedInputValue*/ ctx[9]);
    			}

    			if (!current || dirty & /*selectedOutputValue*/ 1024) {
    				attr(div6, "data-output-value", /*selectedOutputValue*/ ctx[10]);
    			}

    			if ((!current || dirty & /*activatedOutput*/ 4) && t25_value !== (t25_value = /*activatedOutput*/ ctx[2].length + "")) set_data(t25, t25_value);
    			if ((!current || dirty & /*activatedOutput*/ 4) && t27_value !== (t27_value = /*activatedOutput*/ ctx[2][0].length + "")) set_data(t27, t27_value);
    			const dataview3_changes = {};
    			if (dirty & /*gridOutput*/ 64) dataview3_changes.data = /*gridOutput*/ ctx[6];
    			if (dirty & /*outputHighlights*/ 256) dataview3_changes.highlights = /*outputHighlights*/ ctx[8];
    			if (dirty & /*activatedOutput*/ 4) dataview3_changes.outputLength = /*activatedOutput*/ ctx[2].length;
    			if (dirty & /*activatedOutput*/ 4) dataview3_changes.constraint = getVisualizationSizeConstraint(/*activatedOutput*/ ctx[2].length);
    			if (dirty & /*dataRange*/ 2) dataview3_changes.dataRange = /*dataRange*/ ctx[1];
    			dataview3.$set(dataview3_changes);

    			if (!current || dirty & /*activatedOutputMin*/ 8192) {
    				attr(section2, "data-min-value", /*activatedOutputMin*/ ctx[13]);
    			}

    			if (!current || dirty & /*activatedOutputMax*/ 4096) {
    				attr(section2, "data-max-value", /*activatedOutputMax*/ ctx[12]);
    			}

    			if (!current || dirty & /*activatedOutputMin*/ 8192 && section2_data_has_negative_value !== (section2_data_has_negative_value = /*activatedOutputMin*/ ctx[13] < 0)) {
    				attr(section2, "data-has-negative", section2_data_has_negative_value);
    			}

    			if (!current || dirty & /*nodeOutputMin*/ 2048) {
    				attr(section2, "data-node-output-min", /*nodeOutputMin*/ ctx[11]);
    			}

    			if (!current || dirty & /*nodeOutputMin*/ 2048 && section2_data_node_output_has_negative_value !== (section2_data_node_output_has_negative_value = /*nodeOutputMin*/ ctx[11] < 0)) {
    				attr(section2, "data-node-output-has-negative", section2_data_node_output_has_negative_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(dataview0.$$.fragment, local);
    			transition_in(dataview1.$$.fragment, local);
    			transition_in(dataview2.$$.fragment, local);
    			transition_in(dataview3.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(dataview0.$$.fragment, local);
    			transition_out(dataview1.$$.fragment, local);
    			transition_out(dataview2.$$.fragment, local);
    			transition_out(dataview3.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div13);
    			destroy_component(dataview0);
    			destroy_component(dataview1);
    			destroy_component(dataview2);
    			destroy_component(dataview3);
    		}
    	};
    }

    const mathConstraint$1 = 32;

    function instance$4($$self, $$props, $$invalidate) {
    	let activatedOutputValues;
    	let nodeOutputValues;
    	let activatedOutputMin;
    	let activatedOutputMax;
    	let nodeOutputMin;
    	let { image } = $$props;
    	let { output } = $$props;
    	let { isPaused } = $$props;
    	let { dataRange } = $$props;
    	const dispatch = createEventDispatcher();
    	let activatedOutput = singleRelu(image);
    	let gridInputMatrixSlice = gridData([[0]]);
    	let gridOutputMatrixSlice = gridData([[0]]);
    	let gridImage = gridData(image);
    	let gridOutput = gridData(activatedOutput);
    	let inputHighlights = array1d(image.length * image.length, () => false);
    	let outputHighlights = array1d(activatedOutput.length * activatedOutput.length, () => false);
    	let interval;
    	let counter = 0;
    	let selectedInputValue = 0;
    	let selectedOutputValue = 0;

    	function selectCell(row, column) {
    		const outputSize = activatedOutput.length;
    		const inputSize = image.length;
    		const selectedRow = Math.min(row, outputSize - 1, inputSize - 1);
    		const selectedColumn = Math.min(column, outputSize - 1, inputSize - 1);
    		$$invalidate(9, selectedInputValue = image[selectedRow][selectedColumn]);
    		$$invalidate(10, selectedOutputValue = activatedOutput[selectedRow][selectedColumn]);
    		$$invalidate(8, outputHighlights = array1d(outputSize * outputSize, () => false));
    		$$invalidate(7, inputHighlights = array1d(inputSize * inputSize, () => undefined));
    		$$invalidate(8, outputHighlights[selectedRow * outputSize + selectedColumn] = true, outputHighlights);
    		$$invalidate(7, inputHighlights[selectedRow * inputSize + selectedColumn] = true, inputHighlights);
    		const inputMatrixSlice = getMatrixSliceFromInputHighlights(image, inputHighlights, 1);
    		const outputMatrixSlice = getMatrixSliceFromOutputHighlights(activatedOutput, outputHighlights);
    		$$invalidate(3, gridInputMatrixSlice = gridData(inputMatrixSlice, mathConstraint$1, 2));
    		$$invalidate(4, gridOutputMatrixSlice = gridData(outputMatrixSlice, mathConstraint$1, 2));
    	}

    	function startAnimation() {
    		counter = 0;
    		if (interval) clearInterval(interval);
    		selectCell(0, 0);

    		interval = setInterval(
    			() => {
    				if (isPaused) return;
    				const outputSize = activatedOutput.length;
    				const flatAnimated = counter % (outputSize * outputSize);
    				selectCell(Math.floor(flatAnimated / outputSize), flatAnimated % outputSize);
    				counter += 1;
    			},
    			250
    		);
    	}

    	function handleMouseover(event) {
    		selectCell(event.detail.hoverH, event.detail.hoverW);
    		$$invalidate(15, isPaused = true);
    		dispatch("message", { text: isPaused });
    	}

    	onDestroy(() => {
    		if (interval) clearInterval(interval);
    	});

    	$$self.$$set = $$props => {
    		if ('image' in $$props) $$invalidate(0, image = $$props.image);
    		if ('output' in $$props) $$invalidate(16, output = $$props.output);
    		if ('isPaused' in $$props) $$invalidate(15, isPaused = $$props.isPaused);
    		if ('dataRange' in $$props) $$invalidate(1, dataRange = $$props.dataRange);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*image*/ 1) {
    			 $$invalidate(2, activatedOutput = singleRelu(image));
    		}

    		if ($$self.$$.dirty & /*activatedOutput*/ 4) {
    			 $$invalidate(18, activatedOutputValues = activatedOutput.reduce((values, row) => values.concat(row), []));
    		}

    		if ($$self.$$.dirty & /*output, activatedOutputValues*/ 327680) {
    			 $$invalidate(17, nodeOutputValues = Array.isArray(output)
    			? output.reduce((values, row) => values.concat(row), [])
    			: activatedOutputValues);
    		}

    		if ($$self.$$.dirty & /*activatedOutputValues*/ 262144) {
    			 $$invalidate(13, activatedOutputMin = Math.min(...activatedOutputValues));
    		}

    		if ($$self.$$.dirty & /*activatedOutputValues*/ 262144) {
    			 $$invalidate(12, activatedOutputMax = Math.max(...activatedOutputValues));
    		}

    		if ($$self.$$.dirty & /*nodeOutputValues*/ 131072) {
    			 $$invalidate(11, nodeOutputMin = Math.min(...nodeOutputValues));
    		}

    		if ($$self.$$.dirty & /*image, activatedOutput*/ 5) {
    			 if (image && activatedOutput) {
    				$$invalidate(5, gridImage = gridData(image));
    				$$invalidate(6, gridOutput = gridData(activatedOutput));
    				startAnimation();
    			}
    		}
    	};

    	return [
    		image,
    		dataRange,
    		activatedOutput,
    		gridInputMatrixSlice,
    		gridOutputMatrixSlice,
    		gridImage,
    		gridOutput,
    		inputHighlights,
    		outputHighlights,
    		selectedInputValue,
    		selectedOutputValue,
    		nodeOutputMin,
    		activatedOutputMax,
    		activatedOutputMin,
    		handleMouseover,
    		isPaused,
    		output,
    		nodeOutputValues,
    		activatedOutputValues
    	];
    }

    class ActivationAnimator extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
    			image: 0,
    			output: 16,
    			isPaused: 15,
    			dataRange: 1
    		});
    	}
    }

    /* src\detail-view\Activationview.svelte generated by Svelte v3.59.2 */

    function create_if_block$1(ctx) {
    	let div5;
    	let div4;
    	let div2;
    	let div0;
    	let t1;
    	let div1;
    	let button0;

    	let raw_value = (/*isPaused*/ ctx[4]
    	? '<i class="fas fa-play-circle play-icon"></i>'
    	: '<i class="fas fa-pause-circle"></i>') + "";

    	let button0_aria_label_value;
    	let button0_title_value;
    	let t2;
    	let button1;
    	let t3;
    	let div3;
    	let activationanimator;
    	let current;
    	let mounted;
    	let dispose;

    	activationanimator = new ActivationAnimator({
    			props: {
    				image: /*input*/ ctx[0],
    				output: /*output*/ ctx[1],
    				isPaused: /*isPaused*/ ctx[4],
    				dataRange: /*dataRange*/ ctx[2]
    			}
    		});

    	activationanimator.$on("message", /*handlePauseFromInteraction*/ ctx[6]);

    	return {
    		c() {
    			div5 = element("div");
    			div4 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			div0.textContent = "Relu Computation";
    			t1 = space();
    			div1 = element("div");
    			button0 = element("button");
    			t2 = space();
    			button1 = element("button");
    			button1.innerHTML = `<i class="fas control-icon fa-times-circle"></i>`;
    			t3 = space();
    			div3 = element("div");
    			create_component(activationanimator.$$.fragment);
    			attr(div0, "class", "title-text svelte-mgca6r");
    			attr(button0, "type", "button");
    			attr(button0, "class", "play-button control-button svelte-mgca6r");

    			attr(button0, "aria-label", button0_aria_label_value = /*isPaused*/ ctx[4]
    			? 'Play animation'
    			: 'Pause animation');

    			attr(button0, "title", button0_title_value = /*isPaused*/ ctx[4]
    			? 'Play animation'
    			: 'Pause animation');

    			attr(button1, "type", "button");
    			attr(button1, "class", "delete-button control-button svelte-mgca6r");
    			attr(button1, "aria-label", "Close computation");
    			attr(button1, "title", "Close");
    			attr(div1, "class", "buttons svelte-mgca6r");
    			attr(div2, "class", "control-panel svelte-mgca6r");
    			attr(div3, "class", "animator-container svelte-mgca6r");
    			attr(div4, "class", "box svelte-mgca6r");
    			attr(div5, "id", "activation-detailview-container");
    			attr(div5, "class", "svelte-mgca6r");
    		},
    		m(target, anchor) {
    			insert(target, div5, anchor);
    			append(div5, div4);
    			append(div4, div2);
    			append(div2, div0);
    			append(div2, t1);
    			append(div2, div1);
    			append(div1, button0);
    			button0.innerHTML = raw_value;
    			append(div1, t2);
    			append(div1, button1);
    			append(div4, t3);
    			append(div4, div3);
    			mount_component(activationanimator, div3, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(button0, "click", /*handleClickPause*/ ctx[5]),
    					listen(button1, "click", /*handleClickX*/ ctx[7])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if ((!current || dirty & /*isPaused*/ 16) && raw_value !== (raw_value = (/*isPaused*/ ctx[4]
    			? '<i class="fas fa-play-circle play-icon"></i>'
    			: '<i class="fas fa-pause-circle"></i>') + "")) button0.innerHTML = raw_value;
    			if (!current || dirty & /*isPaused*/ 16 && button0_aria_label_value !== (button0_aria_label_value = /*isPaused*/ ctx[4]
    			? 'Play animation'
    			: 'Pause animation')) {
    				attr(button0, "aria-label", button0_aria_label_value);
    			}

    			if (!current || dirty & /*isPaused*/ 16 && button0_title_value !== (button0_title_value = /*isPaused*/ ctx[4]
    			? 'Play animation'
    			: 'Pause animation')) {
    				attr(button0, "title", button0_title_value);
    			}

    			const activationanimator_changes = {};
    			if (dirty & /*input*/ 1) activationanimator_changes.image = /*input*/ ctx[0];
    			if (dirty & /*output*/ 2) activationanimator_changes.output = /*output*/ ctx[1];
    			if (dirty & /*isPaused*/ 16) activationanimator_changes.isPaused = /*isPaused*/ ctx[4];
    			if (dirty & /*dataRange*/ 4) activationanimator_changes.dataRange = /*dataRange*/ ctx[2];
    			activationanimator.$set(activationanimator_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(activationanimator.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(activationanimator.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div5);
    			destroy_component(activationanimator);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$5(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = !/*isExited*/ ctx[3] && create_if_block$1(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (!/*isExited*/ ctx[3]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*isExited*/ 8) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { input } = $$props;
    	let { output } = $$props;
    	let { dataRange } = $$props;
    	let { isExited } = $$props;
    	const dispatch = createEventDispatcher();
    	let isPaused = false;

    	function handleClickPause() {
    		$$invalidate(4, isPaused = !isPaused);
    	}

    	function handlePauseFromInteraction(event) {
    		$$invalidate(4, isPaused = event.detail.text);
    	}

    	function handleClickX() {
    		dispatch("message", { text: true });
    	}

    	$$self.$$set = $$props => {
    		if ('input' in $$props) $$invalidate(0, input = $$props.input);
    		if ('output' in $$props) $$invalidate(1, output = $$props.output);
    		if ('dataRange' in $$props) $$invalidate(2, dataRange = $$props.dataRange);
    		if ('isExited' in $$props) $$invalidate(3, isExited = $$props.isExited);
    	};

    	return [
    		input,
    		output,
    		dataRange,
    		isExited,
    		isPaused,
    		handleClickPause,
    		handlePauseFromInteraction,
    		handleClickX
    	];
    }

    class Activationview extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {
    			input: 0,
    			output: 1,
    			dataRange: 2,
    			isExited: 3
    		});
    	}
    }

    /* src\detail-view\NormalizationviewAnimator.svelte generated by Svelte v3.59.2 */

    function create_fragment$6(ctx) {
    	let div13;
    	let div12;
    	let section0;
    	let div3;
    	let div0;
    	let t1;
    	let div1;
    	let t2;
    	let t3_value = /*image*/ ctx[0].length + "";
    	let t3;
    	let t4;
    	let t5_value = /*image*/ ctx[0][0].length + "";
    	let t5;
    	let t6;
    	let t7;
    	let div2;
    	let t9;
    	let dataview0;
    	let t10;
    	let section1;
    	let div6;
    	let div4;
    	let span0;
    	let t12;
    	let span1;
    	let t14;
    	let span2;
    	let t15_value = formatMathValue(/*gammaValue*/ ctx[17]) + "";
    	let t15;
    	let t16;
    	let span3;
    	let t18;
    	let span9;
    	let span7;
    	let span4;
    	let t19;
    	let t20;
    	let span5;
    	let t21_value = (/*meanValue*/ ctx[16] >= 0 ? "−" : "+") + "";
    	let t21;
    	let t22;
    	let span6;
    	let t23_value = formatMathValue(Math.abs(/*meanValue*/ ctx[16])) + "";
    	let t23;
    	let t24;
    	let span8;
    	let t25;
    	let t26_value = formatMathValue(/*varianceValue*/ ctx[15]) + "";
    	let t26;
    	let t27;
    	let t28_value = formatMathValue(/*epsilonValue*/ ctx[14]) + "";
    	let t28;
    	let t29;
    	let t30;
    	let span10;
    	let t31_value = (/*betaValue*/ ctx[13] >= 0 ? "+" : "−") + "";
    	let t31;
    	let t32;
    	let span11;
    	let t33_value = formatMathValue(Math.abs(/*betaValue*/ ctx[13])) + "";
    	let t33;
    	let t34;
    	let div5;
    	let span12;
    	let t36;
    	let span13;
    	let t37;
    	let t38;
    	let div7;
    	let t41;
    	let section2;
    	let div11;
    	let div8;
    	let t43;
    	let div9;
    	let t44;
    	let t45_value = /*output*/ ctx[1].length + "";
    	let t45;
    	let t46;
    	let t47_value = /*output*/ ctx[1][0].length + "";
    	let t47;
    	let t48;
    	let t49;
    	let div10;
    	let t51;
    	let dataview1;
    	let section2_data_has_negative_value;
    	let current;

    	dataview0 = new Dataview({
    			props: {
    				data: /*gridImage*/ ctx[7],
    				highlights: /*inputHighlights*/ ctx[9],
    				outputLength: /*output*/ ctx[1].length,
    				isKernelMath: false,
    				constraint: getVisualizationSizeConstraint(/*image*/ ctx[0].length),
    				dataRange: /*dataRange*/ ctx[2],
    				stride: 1
    			}
    		});

    	dataview0.$on("message", /*handleMouseover*/ ctx[25]);

    	dataview1 = new Dataview({
    			props: {
    				data: /*gridOutput*/ ctx[8],
    				highlights: /*outputHighlights*/ ctx[10],
    				isKernelMath: false,
    				outputLength: /*output*/ ctx[1].length,
    				constraint: getVisualizationSizeConstraint(/*output*/ ctx[1].length),
    				dataRange: /*dataRange*/ ctx[2],
    				stride: 1
    			}
    		});

    	dataview1.$on("message", /*handleMouseover*/ ctx[25]);

    	return {
    		c() {
    			div13 = element("div");
    			div12 = element("div");
    			section0 = element("section");
    			div3 = element("div");
    			div0 = element("div");
    			div0.textContent = "Input Feature Map";
    			t1 = space();
    			div1 = element("div");
    			t2 = text("(");
    			t3 = text(t3_value);
    			t4 = text(",");
    			t5 = text(t5_value);
    			t6 = text(",1)");
    			t7 = space();
    			div2 = element("div");
    			div2.textContent = "[H, W, C]";
    			t9 = space();
    			create_component(dataview0.$$.fragment);
    			t10 = space();
    			section1 = element("section");
    			div6 = element("div");
    			div4 = element("div");
    			span0 = element("span");
    			span0.textContent = "Norm(x)";
    			t12 = space();
    			span1 = element("span");
    			span1.textContent = "=";
    			t14 = space();
    			span2 = element("span");
    			t15 = text(t15_value);
    			t16 = space();
    			span3 = element("span");
    			span3.textContent = "·";
    			t18 = space();
    			span9 = element("span");
    			span7 = element("span");
    			span4 = element("span");
    			t19 = text(/*formattedInputValue*/ ctx[6]);
    			t20 = space();
    			span5 = element("span");
    			t21 = text(t21_value);
    			t22 = space();
    			span6 = element("span");
    			t23 = text(t23_value);
    			t24 = space();
    			span8 = element("span");
    			t25 = text("√(");
    			t26 = text(t26_value);
    			t27 = text(" + ");
    			t28 = text(t28_value);
    			t29 = text(")");
    			t30 = space();
    			span10 = element("span");
    			t31 = text(t31_value);
    			t32 = space();
    			span11 = element("span");
    			t33 = text(t33_value);
    			t34 = space();
    			div5 = element("div");
    			span12 = element("span");
    			span12.textContent = "=";
    			t36 = space();
    			span13 = element("span");
    			t37 = text(/*formattedOutputValue*/ ctx[5]);
    			t38 = space();
    			div7 = element("div");

    			div7.innerHTML = `<small><strong class="svelte-omsoub">Norm:</strong>
          Normalizes feature values to stabilize the network.</small>`;

    			t41 = space();
    			section2 = element("section");
    			div11 = element("div");
    			div8 = element("div");
    			div8.textContent = "Normalized Feature Map";
    			t43 = space();
    			div9 = element("div");
    			t44 = text("(");
    			t45 = text(t45_value);
    			t46 = text(",");
    			t47 = text(t47_value);
    			t48 = text(",1)");
    			t49 = space();
    			div10 = element("div");
    			div10.textContent = "[H, W, C]";
    			t51 = space();
    			create_component(dataview1.$$.fragment);
    			attr(div0, "class", "matrix-heading-title svelte-omsoub");
    			attr(div1, "class", "matrix-heading-shape svelte-omsoub");
    			attr(div2, "class", "matrix-heading-dimensions svelte-omsoub");
    			attr(div3, "class", "matrix-heading svelte-omsoub");
    			attr(section0, "class", "visual-panel input-panel svelte-omsoub");
    			attr(span0, "class", "norm-function-label svelte-omsoub");
    			attr(span1, "class", "svelte-omsoub");
    			attr(span2, "class", "svelte-omsoub");
    			attr(span3, "class", "svelte-omsoub");
    			attr(span4, "class", "norm-value-box svelte-omsoub");
    			set_style(span4, "background-color", /*inputBoxColor*/ ctx[22]);
    			set_style(span4, "color", /*inputTextColor*/ ctx[20]);
    			attr(span5, "class", "norm-operator svelte-omsoub");
    			attr(span6, "class", "norm-number svelte-omsoub");
    			attr(span7, "class", "math-numerator svelte-omsoub");
    			attr(span8, "class", "math-denominator svelte-omsoub");
    			attr(span9, "class", "math-fraction numeric svelte-omsoub");
    			attr(span10, "class", "svelte-omsoub");
    			attr(span11, "class", "svelte-omsoub");
    			attr(div4, "class", "norm-equation-row substitution svelte-omsoub");
    			attr(span12, "class", "svelte-omsoub");
    			attr(span13, "class", "norm-value-box svelte-omsoub");
    			set_style(span13, "background-color", /*outputBoxColor*/ ctx[21]);
    			set_style(span13, "color", /*outputTextColor*/ ctx[19]);
    			attr(div5, "class", "norm-equation-row result svelte-omsoub");
    			attr(div6, "class", "norm-formula svelte-omsoub");
    			set_style(div6, "--norm-value-box-width", /*valueBoxWidth*/ ctx[18] + "px");
    			attr(div6, "data-input-value", /*selectedInputValue*/ ctx[3]);
    			attr(div6, "data-output-value", /*selectedOutputValue*/ ctx[4]);
    			attr(div6, "data-computed-value", /*computedNormValue*/ ctx[11]);
    			attr(div6, "data-absolute-error", /*normAbsoluteError*/ ctx[12]);
    			attr(div6, "data-mean", /*meanValue*/ ctx[16]);
    			attr(div6, "data-variance", /*varianceValue*/ ctx[15]);
    			attr(div6, "data-gamma", /*gammaValue*/ ctx[17]);
    			attr(div6, "data-beta", /*betaValue*/ ctx[13]);
    			attr(div6, "data-epsilon", /*epsilonValue*/ ctx[14]);
    			attr(div7, "class", "normalization-note svelte-omsoub");
    			attr(section1, "class", "calculation-panel svelte-omsoub");
    			attr(div8, "class", "matrix-heading-title svelte-omsoub");
    			attr(div9, "class", "matrix-heading-shape svelte-omsoub");
    			attr(div10, "class", "matrix-heading-dimensions svelte-omsoub");
    			attr(div11, "class", "matrix-heading svelte-omsoub");
    			attr(section2, "class", "visual-panel output-panel svelte-omsoub");
    			attr(section2, "data-min-value", /*outputMin*/ ctx[24]);
    			attr(section2, "data-max-value", /*outputMax*/ ctx[23]);
    			attr(section2, "data-has-negative", section2_data_has_negative_value = /*outputMin*/ ctx[24] < 0);
    			attr(div12, "class", "computation-row normalization-row svelte-omsoub");
    			attr(div13, "class", "normalization-layout svelte-omsoub");
    			attr(div13, "data-operation", "norm");
    		},
    		m(target, anchor) {
    			insert(target, div13, anchor);
    			append(div13, div12);
    			append(div12, section0);
    			append(section0, div3);
    			append(div3, div0);
    			append(div3, t1);
    			append(div3, div1);
    			append(div1, t2);
    			append(div1, t3);
    			append(div1, t4);
    			append(div1, t5);
    			append(div1, t6);
    			append(div3, t7);
    			append(div3, div2);
    			append(section0, t9);
    			mount_component(dataview0, section0, null);
    			append(div12, t10);
    			append(div12, section1);
    			append(section1, div6);
    			append(div6, div4);
    			append(div4, span0);
    			append(div4, t12);
    			append(div4, span1);
    			append(div4, t14);
    			append(div4, span2);
    			append(span2, t15);
    			append(div4, t16);
    			append(div4, span3);
    			append(div4, t18);
    			append(div4, span9);
    			append(span9, span7);
    			append(span7, span4);
    			append(span4, t19);
    			append(span7, t20);
    			append(span7, span5);
    			append(span5, t21);
    			append(span7, t22);
    			append(span7, span6);
    			append(span6, t23);
    			append(span9, t24);
    			append(span9, span8);
    			append(span8, t25);
    			append(span8, t26);
    			append(span8, t27);
    			append(span8, t28);
    			append(span8, t29);
    			append(div4, t30);
    			append(div4, span10);
    			append(span10, t31);
    			append(div4, t32);
    			append(div4, span11);
    			append(span11, t33);
    			append(div6, t34);
    			append(div6, div5);
    			append(div5, span12);
    			append(div5, t36);
    			append(div5, span13);
    			append(span13, t37);
    			append(section1, t38);
    			append(section1, div7);
    			append(div12, t41);
    			append(div12, section2);
    			append(section2, div11);
    			append(div11, div8);
    			append(div11, t43);
    			append(div11, div9);
    			append(div9, t44);
    			append(div9, t45);
    			append(div9, t46);
    			append(div9, t47);
    			append(div9, t48);
    			append(div11, t49);
    			append(div11, div10);
    			append(section2, t51);
    			mount_component(dataview1, section2, null);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if ((!current || dirty[0] & /*image*/ 1) && t3_value !== (t3_value = /*image*/ ctx[0].length + "")) set_data(t3, t3_value);
    			if ((!current || dirty[0] & /*image*/ 1) && t5_value !== (t5_value = /*image*/ ctx[0][0].length + "")) set_data(t5, t5_value);
    			const dataview0_changes = {};
    			if (dirty[0] & /*gridImage*/ 128) dataview0_changes.data = /*gridImage*/ ctx[7];
    			if (dirty[0] & /*inputHighlights*/ 512) dataview0_changes.highlights = /*inputHighlights*/ ctx[9];
    			if (dirty[0] & /*output*/ 2) dataview0_changes.outputLength = /*output*/ ctx[1].length;
    			if (dirty[0] & /*image*/ 1) dataview0_changes.constraint = getVisualizationSizeConstraint(/*image*/ ctx[0].length);
    			if (dirty[0] & /*dataRange*/ 4) dataview0_changes.dataRange = /*dataRange*/ ctx[2];
    			dataview0.$set(dataview0_changes);
    			if ((!current || dirty[0] & /*gammaValue*/ 131072) && t15_value !== (t15_value = formatMathValue(/*gammaValue*/ ctx[17]) + "")) set_data(t15, t15_value);
    			if (!current || dirty[0] & /*formattedInputValue*/ 64) set_data(t19, /*formattedInputValue*/ ctx[6]);

    			if (!current || dirty[0] & /*inputBoxColor*/ 4194304) {
    				set_style(span4, "background-color", /*inputBoxColor*/ ctx[22]);
    			}

    			if (!current || dirty[0] & /*inputTextColor*/ 1048576) {
    				set_style(span4, "color", /*inputTextColor*/ ctx[20]);
    			}

    			if ((!current || dirty[0] & /*meanValue*/ 65536) && t21_value !== (t21_value = (/*meanValue*/ ctx[16] >= 0 ? "−" : "+") + "")) set_data(t21, t21_value);
    			if ((!current || dirty[0] & /*meanValue*/ 65536) && t23_value !== (t23_value = formatMathValue(Math.abs(/*meanValue*/ ctx[16])) + "")) set_data(t23, t23_value);
    			if ((!current || dirty[0] & /*varianceValue*/ 32768) && t26_value !== (t26_value = formatMathValue(/*varianceValue*/ ctx[15]) + "")) set_data(t26, t26_value);
    			if ((!current || dirty[0] & /*epsilonValue*/ 16384) && t28_value !== (t28_value = formatMathValue(/*epsilonValue*/ ctx[14]) + "")) set_data(t28, t28_value);
    			if ((!current || dirty[0] & /*betaValue*/ 8192) && t31_value !== (t31_value = (/*betaValue*/ ctx[13] >= 0 ? "+" : "−") + "")) set_data(t31, t31_value);
    			if ((!current || dirty[0] & /*betaValue*/ 8192) && t33_value !== (t33_value = formatMathValue(Math.abs(/*betaValue*/ ctx[13])) + "")) set_data(t33, t33_value);
    			if (!current || dirty[0] & /*formattedOutputValue*/ 32) set_data(t37, /*formattedOutputValue*/ ctx[5]);

    			if (!current || dirty[0] & /*outputBoxColor*/ 2097152) {
    				set_style(span13, "background-color", /*outputBoxColor*/ ctx[21]);
    			}

    			if (!current || dirty[0] & /*outputTextColor*/ 524288) {
    				set_style(span13, "color", /*outputTextColor*/ ctx[19]);
    			}

    			if (!current || dirty[0] & /*valueBoxWidth*/ 262144) {
    				set_style(div6, "--norm-value-box-width", /*valueBoxWidth*/ ctx[18] + "px");
    			}

    			if (!current || dirty[0] & /*selectedInputValue*/ 8) {
    				attr(div6, "data-input-value", /*selectedInputValue*/ ctx[3]);
    			}

    			if (!current || dirty[0] & /*selectedOutputValue*/ 16) {
    				attr(div6, "data-output-value", /*selectedOutputValue*/ ctx[4]);
    			}

    			if (!current || dirty[0] & /*computedNormValue*/ 2048) {
    				attr(div6, "data-computed-value", /*computedNormValue*/ ctx[11]);
    			}

    			if (!current || dirty[0] & /*normAbsoluteError*/ 4096) {
    				attr(div6, "data-absolute-error", /*normAbsoluteError*/ ctx[12]);
    			}

    			if (!current || dirty[0] & /*meanValue*/ 65536) {
    				attr(div6, "data-mean", /*meanValue*/ ctx[16]);
    			}

    			if (!current || dirty[0] & /*varianceValue*/ 32768) {
    				attr(div6, "data-variance", /*varianceValue*/ ctx[15]);
    			}

    			if (!current || dirty[0] & /*gammaValue*/ 131072) {
    				attr(div6, "data-gamma", /*gammaValue*/ ctx[17]);
    			}

    			if (!current || dirty[0] & /*betaValue*/ 8192) {
    				attr(div6, "data-beta", /*betaValue*/ ctx[13]);
    			}

    			if (!current || dirty[0] & /*epsilonValue*/ 16384) {
    				attr(div6, "data-epsilon", /*epsilonValue*/ ctx[14]);
    			}

    			if ((!current || dirty[0] & /*output*/ 2) && t45_value !== (t45_value = /*output*/ ctx[1].length + "")) set_data(t45, t45_value);
    			if ((!current || dirty[0] & /*output*/ 2) && t47_value !== (t47_value = /*output*/ ctx[1][0].length + "")) set_data(t47, t47_value);
    			const dataview1_changes = {};
    			if (dirty[0] & /*gridOutput*/ 256) dataview1_changes.data = /*gridOutput*/ ctx[8];
    			if (dirty[0] & /*outputHighlights*/ 1024) dataview1_changes.highlights = /*outputHighlights*/ ctx[10];
    			if (dirty[0] & /*output*/ 2) dataview1_changes.outputLength = /*output*/ ctx[1].length;
    			if (dirty[0] & /*output*/ 2) dataview1_changes.constraint = getVisualizationSizeConstraint(/*output*/ ctx[1].length);
    			if (dirty[0] & /*dataRange*/ 4) dataview1_changes.dataRange = /*dataRange*/ ctx[2];
    			dataview1.$set(dataview1_changes);

    			if (!current || dirty[0] & /*outputMin*/ 16777216) {
    				attr(section2, "data-min-value", /*outputMin*/ ctx[24]);
    			}

    			if (!current || dirty[0] & /*outputMax*/ 8388608) {
    				attr(section2, "data-max-value", /*outputMax*/ ctx[23]);
    			}

    			if (!current || dirty[0] & /*outputMin*/ 16777216 && section2_data_has_negative_value !== (section2_data_has_negative_value = /*outputMin*/ ctx[24] < 0)) {
    				attr(section2, "data-has-negative", section2_data_has_negative_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(dataview0.$$.fragment, local);
    			transition_in(dataview1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(dataview0.$$.fragment, local);
    			transition_out(dataview1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div13);
    			destroy_component(dataview0);
    			destroy_component(dataview1);
    		}
    	};
    }

    function formatNormCellValue(value) {
    	if (!Number.isFinite(value)) return "—";
    	return value.toFixed(3).replace("-", "−");
    }

    function formatMathValue(value) {
    	if (!Number.isFinite(value)) return "—";
    	const absoluteValue = Math.abs(value);

    	if (absoluteValue !== 0 && (absoluteValue >= 10000 || absoluteValue < 0.001)) {
    		const superscripts = {
    			"-": "⁻",
    			"+": "⁺",
    			"0": "⁰",
    			"1": "¹",
    			"2": "²",
    			"3": "³",
    			"4": "⁴",
    			"5": "⁵",
    			"6": "⁶",
    			"7": "⁷",
    			"8": "⁸",
    			"9": "⁹"
    		};

    		const [coefficient, exponent] = value.toExponential(2).split("e");
    		const superscriptExponent = exponent.split("").map(character => superscripts[character] || character).join("");
    		return `${Number(coefficient)}×10${superscriptExponent}`;
    	}

    	const decimals = absoluteValue >= 100 ? 2 : 3;
    	return Number(value.toFixed(decimals)).toString();
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let meanValue;
    	let varianceValue;
    	let gammaValue;
    	let betaValue;
    	let epsilonValue;
    	let outputValues;
    	let outputMin;
    	let outputMax;
    	let inputBoxColor;
    	let outputBoxColor;
    	let inputTextColor;
    	let outputTextColor;
    	let formattedInputValue;
    	let formattedOutputValue;
    	let valueBoxWidth;
    	let { image } = $$props;
    	let { output } = $$props;
    	let { isPaused } = $$props;
    	let { dataRange } = $$props;
    	let { mean = 0 } = $$props;
    	let { variance = 1 } = $$props;
    	let { gamma = 1 } = $$props;
    	let { beta = 0 } = $$props;
    	let { epsilon = 1e-5 } = $$props;
    	const dispatch = createEventDispatcher();
    	let gridImage = gridData(image);
    	let gridOutput = gridData(output);
    	let inputHighlights = array1d(image.length * image.length, () => false);
    	let outputHighlights = array1d(output.length * output.length, () => false);
    	let interval;
    	let counter = 0;
    	let selectedInputValue = 0;
    	let selectedOutputValue = 0;
    	let computedNormValue = 0;
    	let normAbsoluteError = 0;

    	function getNormalizedColorValue(value) {
    		const numericRange = Number(dataRange);

    		const safeRange = Number.isFinite(numericRange) && numericRange !== 0
    		? numericRange
    		: 1;

    		return (value + safeRange / 2) / safeRange;
    	}

    	function getMathCellColor(value) {
    		const color = d3.rgb(d3.interpolateRdBu(getNormalizedColorValue(value)));
    		return `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`;
    	}

    	function getMathCellTextColor(value) {
    		const normalizedValue = getNormalizedColorValue(value);

    		return normalizedValue < 0.2 || normalizedValue > 0.8
    		? "#fff"
    		: "#111";
    	}

    	function selectCell(row, column) {
    		const outputSize = output.length;
    		const inputSize = image.length;
    		const selectedRow = Math.min(row, outputSize - 1, inputSize - 1);
    		const selectedColumn = Math.min(column, outputSize - 1, inputSize - 1);
    		$$invalidate(3, selectedInputValue = image[selectedRow][selectedColumn]);
    		$$invalidate(4, selectedOutputValue = output[selectedRow][selectedColumn]);
    		$$invalidate(11, computedNormValue = gammaValue * ((selectedInputValue - meanValue) / Math.sqrt(varianceValue + epsilonValue)) + betaValue);
    		$$invalidate(12, normAbsoluteError = Math.abs(computedNormValue - selectedOutputValue));
    		$$invalidate(10, outputHighlights = array1d(outputSize * outputSize, () => false));
    		$$invalidate(9, inputHighlights = array1d(inputSize * inputSize, () => undefined));
    		$$invalidate(10, outputHighlights[selectedRow * outputSize + selectedColumn] = true, outputHighlights);
    		$$invalidate(9, inputHighlights[selectedRow * inputSize + selectedColumn] = true, inputHighlights);
    	}

    	function startAnimation() {
    		counter = 0;
    		if (interval) clearInterval(interval);
    		selectCell(0, 0);

    		interval = setInterval(
    			() => {
    				if (isPaused) return;
    				const outputSize = output.length;
    				const flatAnimated = counter % (outputSize * outputSize);
    				selectCell(Math.floor(flatAnimated / outputSize), flatAnimated % outputSize);
    				counter += 1;
    			},
    			250
    		);
    	}

    	function handleMouseover(event) {
    		selectCell(event.detail.hoverH, event.detail.hoverW);
    		$$invalidate(26, isPaused = true);
    		dispatch("message", { text: isPaused });
    	}

    	onDestroy(() => {
    		if (interval) clearInterval(interval);
    	});

    	$$self.$$set = $$props => {
    		if ('image' in $$props) $$invalidate(0, image = $$props.image);
    		if ('output' in $$props) $$invalidate(1, output = $$props.output);
    		if ('isPaused' in $$props) $$invalidate(26, isPaused = $$props.isPaused);
    		if ('dataRange' in $$props) $$invalidate(2, dataRange = $$props.dataRange);
    		if ('mean' in $$props) $$invalidate(27, mean = $$props.mean);
    		if ('variance' in $$props) $$invalidate(28, variance = $$props.variance);
    		if ('gamma' in $$props) $$invalidate(29, gamma = $$props.gamma);
    		if ('beta' in $$props) $$invalidate(30, beta = $$props.beta);
    		if ('epsilon' in $$props) $$invalidate(31, epsilon = $$props.epsilon);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*mean*/ 134217728) {
    			 $$invalidate(16, meanValue = Number.isFinite(Number(mean)) ? Number(mean) : 0);
    		}

    		if ($$self.$$.dirty[0] & /*variance*/ 268435456) {
    			 $$invalidate(15, varianceValue = Number.isFinite(Number(variance)) ? Number(variance) : 1);
    		}

    		if ($$self.$$.dirty[0] & /*gamma*/ 536870912) {
    			 $$invalidate(17, gammaValue = Number.isFinite(Number(gamma)) ? Number(gamma) : 1);
    		}

    		if ($$self.$$.dirty[0] & /*beta*/ 1073741824) {
    			 $$invalidate(13, betaValue = Number.isFinite(Number(beta)) ? Number(beta) : 0);
    		}

    		if ($$self.$$.dirty[1] & /*epsilon*/ 1) {
    			 $$invalidate(14, epsilonValue = Number.isFinite(Number(epsilon))
    			? Number(epsilon)
    			: 1e-5);
    		}

    		if ($$self.$$.dirty[0] & /*output*/ 2) {
    			 $$invalidate(32, outputValues = output.reduce((values, row) => values.concat(row), []));
    		}

    		if ($$self.$$.dirty[1] & /*outputValues*/ 2) {
    			 $$invalidate(24, outputMin = Math.min(...outputValues));
    		}

    		if ($$self.$$.dirty[1] & /*outputValues*/ 2) {
    			 $$invalidate(23, outputMax = Math.max(...outputValues));
    		}

    		if ($$self.$$.dirty[0] & /*selectedInputValue*/ 8) {
    			 $$invalidate(22, inputBoxColor = getMathCellColor(selectedInputValue));
    		}

    		if ($$self.$$.dirty[0] & /*selectedOutputValue*/ 16) {
    			 $$invalidate(21, outputBoxColor = getMathCellColor(selectedOutputValue));
    		}

    		if ($$self.$$.dirty[0] & /*selectedInputValue*/ 8) {
    			 $$invalidate(20, inputTextColor = getMathCellTextColor(selectedInputValue));
    		}

    		if ($$self.$$.dirty[0] & /*selectedOutputValue*/ 16) {
    			 $$invalidate(19, outputTextColor = getMathCellTextColor(selectedOutputValue));
    		}

    		if ($$self.$$.dirty[0] & /*selectedInputValue*/ 8) {
    			 $$invalidate(6, formattedInputValue = formatNormCellValue(selectedInputValue));
    		}

    		if ($$self.$$.dirty[0] & /*selectedOutputValue*/ 16) {
    			 $$invalidate(5, formattedOutputValue = formatNormCellValue(selectedOutputValue));
    		}

    		if ($$self.$$.dirty[0] & /*formattedInputValue, formattedOutputValue*/ 96) {
    			 $$invalidate(18, valueBoxWidth = Math.max(104, Math.ceil(Math.max(formattedInputValue.length, formattedOutputValue.length) * 8.5 + 26)));
    		}

    		if ($$self.$$.dirty[0] & /*image, output*/ 3) {
    			 if (image && output) {
    				$$invalidate(7, gridImage = gridData(image));
    				$$invalidate(8, gridOutput = gridData(output));
    				startAnimation();
    			}
    		}
    	};

    	return [
    		image,
    		output,
    		dataRange,
    		selectedInputValue,
    		selectedOutputValue,
    		formattedOutputValue,
    		formattedInputValue,
    		gridImage,
    		gridOutput,
    		inputHighlights,
    		outputHighlights,
    		computedNormValue,
    		normAbsoluteError,
    		betaValue,
    		epsilonValue,
    		varianceValue,
    		meanValue,
    		gammaValue,
    		valueBoxWidth,
    		outputTextColor,
    		inputTextColor,
    		outputBoxColor,
    		inputBoxColor,
    		outputMax,
    		outputMin,
    		handleMouseover,
    		isPaused,
    		mean,
    		variance,
    		gamma,
    		beta,
    		epsilon,
    		outputValues
    	];
    }

    class NormalizationviewAnimator extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$6,
    			create_fragment$6,
    			safe_not_equal,
    			{
    				image: 0,
    				output: 1,
    				isPaused: 26,
    				dataRange: 2,
    				mean: 27,
    				variance: 28,
    				gamma: 29,
    				beta: 30,
    				epsilon: 31
    			},
    			null,
    			[-1, -1]
    		);
    	}
    }

    /* src\detail-view\Normalizationview.svelte generated by Svelte v3.59.2 */

    function create_if_block$2(ctx) {
    	let div5;
    	let div4;
    	let div2;
    	let div0;
    	let t1;
    	let div1;
    	let button0;

    	let raw_value = (/*isPaused*/ ctx[9]
    	? '<i class="fas fa-play-circle play-icon"></i>'
    	: '<i class="fas fa-pause-circle"></i>') + "";

    	let button0_aria_label_value;
    	let button0_title_value;
    	let t2;
    	let button1;
    	let t3;
    	let div3;
    	let normalizationviewanimator;
    	let current;
    	let mounted;
    	let dispose;

    	normalizationviewanimator = new NormalizationviewAnimator({
    			props: {
    				image: /*input*/ ctx[0],
    				output: /*output*/ ctx[1],
    				isPaused: /*isPaused*/ ctx[9],
    				dataRange: /*dataRange*/ ctx[2],
    				mean: /*mean*/ ctx[4],
    				variance: /*variance*/ ctx[5],
    				gamma: /*gamma*/ ctx[6],
    				beta: /*beta*/ ctx[7],
    				epsilon: /*epsilon*/ ctx[8]
    			}
    		});

    	normalizationviewanimator.$on("message", /*handlePauseFromInteraction*/ ctx[11]);

    	return {
    		c() {
    			div5 = element("div");
    			div4 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			div0.textContent = "Norm Computation";
    			t1 = space();
    			div1 = element("div");
    			button0 = element("button");
    			t2 = space();
    			button1 = element("button");
    			button1.innerHTML = `<i class="fas control-icon fa-times-circle"></i>`;
    			t3 = space();
    			div3 = element("div");
    			create_component(normalizationviewanimator.$$.fragment);
    			attr(div0, "class", "title-text svelte-1h6rqx3");
    			attr(button0, "type", "button");
    			attr(button0, "class", "play-button control-button svelte-1h6rqx3");

    			attr(button0, "aria-label", button0_aria_label_value = /*isPaused*/ ctx[9]
    			? 'Play animation'
    			: 'Pause animation');

    			attr(button0, "title", button0_title_value = /*isPaused*/ ctx[9]
    			? 'Play animation'
    			: 'Pause animation');

    			attr(button1, "type", "button");
    			attr(button1, "class", "delete-button control-button svelte-1h6rqx3");
    			attr(button1, "aria-label", "Close computation");
    			attr(button1, "title", "Close");
    			attr(div1, "class", "buttons svelte-1h6rqx3");
    			attr(div2, "class", "control-panel svelte-1h6rqx3");
    			attr(div3, "class", "animator-container svelte-1h6rqx3");
    			attr(div4, "class", "box svelte-1h6rqx3");
    			attr(div5, "id", "normalization-detailview-container");
    			attr(div5, "class", "svelte-1h6rqx3");
    		},
    		m(target, anchor) {
    			insert(target, div5, anchor);
    			append(div5, div4);
    			append(div4, div2);
    			append(div2, div0);
    			append(div2, t1);
    			append(div2, div1);
    			append(div1, button0);
    			button0.innerHTML = raw_value;
    			append(div1, t2);
    			append(div1, button1);
    			append(div4, t3);
    			append(div4, div3);
    			mount_component(normalizationviewanimator, div3, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(button0, "click", /*handleClickPause*/ ctx[10]),
    					listen(button1, "click", /*handleClickX*/ ctx[12])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if ((!current || dirty & /*isPaused*/ 512) && raw_value !== (raw_value = (/*isPaused*/ ctx[9]
    			? '<i class="fas fa-play-circle play-icon"></i>'
    			: '<i class="fas fa-pause-circle"></i>') + "")) button0.innerHTML = raw_value;
    			if (!current || dirty & /*isPaused*/ 512 && button0_aria_label_value !== (button0_aria_label_value = /*isPaused*/ ctx[9]
    			? 'Play animation'
    			: 'Pause animation')) {
    				attr(button0, "aria-label", button0_aria_label_value);
    			}

    			if (!current || dirty & /*isPaused*/ 512 && button0_title_value !== (button0_title_value = /*isPaused*/ ctx[9]
    			? 'Play animation'
    			: 'Pause animation')) {
    				attr(button0, "title", button0_title_value);
    			}

    			const normalizationviewanimator_changes = {};
    			if (dirty & /*input*/ 1) normalizationviewanimator_changes.image = /*input*/ ctx[0];
    			if (dirty & /*output*/ 2) normalizationviewanimator_changes.output = /*output*/ ctx[1];
    			if (dirty & /*isPaused*/ 512) normalizationviewanimator_changes.isPaused = /*isPaused*/ ctx[9];
    			if (dirty & /*dataRange*/ 4) normalizationviewanimator_changes.dataRange = /*dataRange*/ ctx[2];
    			if (dirty & /*mean*/ 16) normalizationviewanimator_changes.mean = /*mean*/ ctx[4];
    			if (dirty & /*variance*/ 32) normalizationviewanimator_changes.variance = /*variance*/ ctx[5];
    			if (dirty & /*gamma*/ 64) normalizationviewanimator_changes.gamma = /*gamma*/ ctx[6];
    			if (dirty & /*beta*/ 128) normalizationviewanimator_changes.beta = /*beta*/ ctx[7];
    			if (dirty & /*epsilon*/ 256) normalizationviewanimator_changes.epsilon = /*epsilon*/ ctx[8];
    			normalizationviewanimator.$set(normalizationviewanimator_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(normalizationviewanimator.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(normalizationviewanimator.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div5);
    			destroy_component(normalizationviewanimator);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$7(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = !/*isExited*/ ctx[3] && create_if_block$2(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (!/*isExited*/ ctx[3]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*isExited*/ 8) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { input } = $$props;
    	let { output } = $$props;
    	let { dataRange } = $$props;
    	let { isExited } = $$props;
    	let { mean = 0 } = $$props;
    	let { variance = 1 } = $$props;
    	let { gamma = 1 } = $$props;
    	let { beta = 0 } = $$props;
    	let { epsilon = 1e-5 } = $$props;
    	const dispatch = createEventDispatcher();
    	let isPaused = false;

    	function handleClickPause() {
    		$$invalidate(9, isPaused = !isPaused);
    	}

    	function handlePauseFromInteraction(event) {
    		$$invalidate(9, isPaused = event.detail.text);
    	}

    	function handleClickX() {
    		dispatch("message", { text: true });
    	}

    	$$self.$$set = $$props => {
    		if ('input' in $$props) $$invalidate(0, input = $$props.input);
    		if ('output' in $$props) $$invalidate(1, output = $$props.output);
    		if ('dataRange' in $$props) $$invalidate(2, dataRange = $$props.dataRange);
    		if ('isExited' in $$props) $$invalidate(3, isExited = $$props.isExited);
    		if ('mean' in $$props) $$invalidate(4, mean = $$props.mean);
    		if ('variance' in $$props) $$invalidate(5, variance = $$props.variance);
    		if ('gamma' in $$props) $$invalidate(6, gamma = $$props.gamma);
    		if ('beta' in $$props) $$invalidate(7, beta = $$props.beta);
    		if ('epsilon' in $$props) $$invalidate(8, epsilon = $$props.epsilon);
    	};

    	return [
    		input,
    		output,
    		dataRange,
    		isExited,
    		mean,
    		variance,
    		gamma,
    		beta,
    		epsilon,
    		isPaused,
    		handleClickPause,
    		handlePauseFromInteraction,
    		handleClickX
    	];
    }

    class Normalizationview extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {
    			input: 0,
    			output: 1,
    			dataRange: 2,
    			isExited: 3,
    			mean: 4,
    			variance: 5,
    			gamma: 6,
    			beta: 7,
    			epsilon: 8
    		});
    	}
    }

    /* src\detail-view\PoolAnimator.svelte generated by Svelte v3.59.2 */

    function create_fragment$8(ctx) {
    	let div4;
    	let div3;
    	let div0;
    	let t1;
    	let div1;
    	let t2;
    	let t3_value = /*testImage*/ ctx[8].length + "";
    	let t3;
    	let t4;
    	let t5_value = /*testImage*/ ctx[8][0].length + "";
    	let t5;
    	let t6;
    	let t7;
    	let div2;
    	let t9;
    	let dataview0;
    	let t10;
    	let div8;
    	let div7;
    	let div5;
    	let t11;
    	let dataview1;
    	let t12;
    	let dataview2;
    	let t13;
    	let div6;
    	let t16;
    	let div13;
    	let div12;
    	let div9;
    	let t18;
    	let div10;
    	let t19;
    	let t20_value = /*testOutput*/ ctx[9].length + "";
    	let t20;
    	let t21;
    	let t22_value = /*testOutput*/ ctx[9][0].length + "";
    	let t22;
    	let t23;
    	let t24;
    	let div11;
    	let t26;
    	let dataview3;
    	let current;

    	dataview0 = new Dataview({
    			props: {
    				data: /*testImage*/ ctx[8],
    				highlights: /*inputHighlights*/ ctx[6],
    				outputLength: /*output*/ ctx[2].length,
    				isKernelMath: false,
    				constraint: getVisualizationSizeConstraint(/*image*/ ctx[1].length),
    				dataRange: /*dataRange*/ ctx[3],
    				stride: /*stride*/ ctx[0]
    			}
    		});

    	dataview0.$on("message", /*handleMouseover*/ ctx[10]);

    	dataview1 = new Dataview({
    			props: {
    				data: /*testInputMatrixSlice*/ ctx[4],
    				highlights: /*outputHighlights*/ ctx[7],
    				isKernelMath: true,
    				constraint: poolingMathCellSize,
    				textFontSize: poolingMathFontSize,
    				dataRange: /*dataRange*/ ctx[3]
    			}
    		});

    	dataview2 = new Dataview({
    			props: {
    				data: /*testOutputMatrixSlice*/ ctx[5],
    				highlights: /*outputHighlights*/ ctx[7],
    				isKernelMath: true,
    				constraint: poolingMathCellSize,
    				textFontSize: poolingMathFontSize,
    				dataRange: /*dataRange*/ ctx[3]
    			}
    		});

    	dataview3 = new Dataview({
    			props: {
    				data: /*testOutput*/ ctx[9],
    				highlights: /*outputHighlights*/ ctx[7],
    				isKernelMath: false,
    				outputLength: /*output*/ ctx[2].length,
    				constraint: getVisualizationSizeConstraint(/*output*/ ctx[2].length),
    				dataRange: /*dataRange*/ ctx[3],
    				stride: /*stride*/ ctx[0]
    			}
    		});

    	dataview3.$on("message", /*handleMouseover*/ ctx[10]);

    	return {
    		c() {
    			div4 = element("div");
    			div3 = element("div");
    			div0 = element("div");
    			div0.textContent = "Input Feature Map";
    			t1 = space();
    			div1 = element("div");
    			t2 = text("(");
    			t3 = text(t3_value);
    			t4 = text(",");
    			t5 = text(t5_value);
    			t6 = text(",1)");
    			t7 = space();
    			div2 = element("div");
    			div2.textContent = "[H,W,C]";
    			t9 = space();
    			create_component(dataview0.$$.fragment);
    			t10 = space();
    			div8 = element("div");
    			div7 = element("div");
    			div5 = element("div");
    			t11 = text("max(\n      ");
    			create_component(dataview1.$$.fragment);
    			t12 = text("\n      )\n      =\n      ");
    			create_component(dataview2.$$.fragment);
    			t13 = space();
    			div6 = element("div");

    			div6.innerHTML = `<small><strong class="svelte-12w93nz">Pooling:</strong> 
        Selects the maximum value from each 2×2 region.</small>`;

    			t16 = space();
    			div13 = element("div");
    			div12 = element("div");
    			div9 = element("div");
    			div9.textContent = "Pooled Feature Map";
    			t18 = space();
    			div10 = element("div");
    			t19 = text("(");
    			t20 = text(t20_value);
    			t21 = text(",");
    			t22 = text(t22_value);
    			t23 = text(",1)");
    			t24 = space();
    			div11 = element("div");
    			div11.textContent = "[H,W,C]";
    			t26 = space();
    			create_component(dataview3.$$.fragment);
    			attr(div0, "class", "matrix-heading-title svelte-12w93nz");
    			attr(div1, "class", "matrix-heading-shape svelte-12w93nz");
    			attr(div2, "class", "matrix-heading-dimensions svelte-12w93nz");
    			attr(div3, "class", "matrix-heading svelte-12w93nz");
    			attr(div4, "class", "column has-text-centered svelte-12w93nz");
    			attr(div5, "class", "pooling-equation svelte-12w93nz");
    			attr(div6, "class", "pooling-legend-note svelte-12w93nz");
    			attr(div7, "class", "pooling-explanation svelte-12w93nz");
    			attr(div8, "class", "column has-text-centered svelte-12w93nz");
    			attr(div9, "class", "matrix-heading-title pooled-feature-title svelte-12w93nz");
    			attr(div10, "class", "matrix-heading-shape svelte-12w93nz");
    			attr(div11, "class", "matrix-heading-dimensions svelte-12w93nz");
    			attr(div12, "class", "matrix-heading svelte-12w93nz");
    			attr(div13, "class", "column has-text-centered svelte-12w93nz");
    		},
    		m(target, anchor) {
    			insert(target, div4, anchor);
    			append(div4, div3);
    			append(div3, div0);
    			append(div3, t1);
    			append(div3, div1);
    			append(div1, t2);
    			append(div1, t3);
    			append(div1, t4);
    			append(div1, t5);
    			append(div1, t6);
    			append(div3, t7);
    			append(div3, div2);
    			append(div4, t9);
    			mount_component(dataview0, div4, null);
    			insert(target, t10, anchor);
    			insert(target, div8, anchor);
    			append(div8, div7);
    			append(div7, div5);
    			append(div5, t11);
    			mount_component(dataview1, div5, null);
    			append(div5, t12);
    			mount_component(dataview2, div5, null);
    			append(div7, t13);
    			append(div7, div6);
    			insert(target, t16, anchor);
    			insert(target, div13, anchor);
    			append(div13, div12);
    			append(div12, div9);
    			append(div12, t18);
    			append(div12, div10);
    			append(div10, t19);
    			append(div10, t20);
    			append(div10, t21);
    			append(div10, t22);
    			append(div10, t23);
    			append(div12, t24);
    			append(div12, div11);
    			append(div13, t26);
    			mount_component(dataview3, div13, null);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if ((!current || dirty & /*testImage*/ 256) && t3_value !== (t3_value = /*testImage*/ ctx[8].length + "")) set_data(t3, t3_value);
    			if ((!current || dirty & /*testImage*/ 256) && t5_value !== (t5_value = /*testImage*/ ctx[8][0].length + "")) set_data(t5, t5_value);
    			const dataview0_changes = {};
    			if (dirty & /*testImage*/ 256) dataview0_changes.data = /*testImage*/ ctx[8];
    			if (dirty & /*inputHighlights*/ 64) dataview0_changes.highlights = /*inputHighlights*/ ctx[6];
    			if (dirty & /*output*/ 4) dataview0_changes.outputLength = /*output*/ ctx[2].length;
    			if (dirty & /*image*/ 2) dataview0_changes.constraint = getVisualizationSizeConstraint(/*image*/ ctx[1].length);
    			if (dirty & /*dataRange*/ 8) dataview0_changes.dataRange = /*dataRange*/ ctx[3];
    			if (dirty & /*stride*/ 1) dataview0_changes.stride = /*stride*/ ctx[0];
    			dataview0.$set(dataview0_changes);
    			const dataview1_changes = {};
    			if (dirty & /*testInputMatrixSlice*/ 16) dataview1_changes.data = /*testInputMatrixSlice*/ ctx[4];
    			if (dirty & /*outputHighlights*/ 128) dataview1_changes.highlights = /*outputHighlights*/ ctx[7];
    			if (dirty & /*dataRange*/ 8) dataview1_changes.dataRange = /*dataRange*/ ctx[3];
    			dataview1.$set(dataview1_changes);
    			const dataview2_changes = {};
    			if (dirty & /*testOutputMatrixSlice*/ 32) dataview2_changes.data = /*testOutputMatrixSlice*/ ctx[5];
    			if (dirty & /*outputHighlights*/ 128) dataview2_changes.highlights = /*outputHighlights*/ ctx[7];
    			if (dirty & /*dataRange*/ 8) dataview2_changes.dataRange = /*dataRange*/ ctx[3];
    			dataview2.$set(dataview2_changes);
    			if ((!current || dirty & /*testOutput*/ 512) && t20_value !== (t20_value = /*testOutput*/ ctx[9].length + "")) set_data(t20, t20_value);
    			if ((!current || dirty & /*testOutput*/ 512) && t22_value !== (t22_value = /*testOutput*/ ctx[9][0].length + "")) set_data(t22, t22_value);
    			const dataview3_changes = {};
    			if (dirty & /*testOutput*/ 512) dataview3_changes.data = /*testOutput*/ ctx[9];
    			if (dirty & /*outputHighlights*/ 128) dataview3_changes.highlights = /*outputHighlights*/ ctx[7];
    			if (dirty & /*output*/ 4) dataview3_changes.outputLength = /*output*/ ctx[2].length;
    			if (dirty & /*output*/ 4) dataview3_changes.constraint = getVisualizationSizeConstraint(/*output*/ ctx[2].length);
    			if (dirty & /*dataRange*/ 8) dataview3_changes.dataRange = /*dataRange*/ ctx[3];
    			if (dirty & /*stride*/ 1) dataview3_changes.stride = /*stride*/ ctx[0];
    			dataview3.$set(dataview3_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(dataview0.$$.fragment, local);
    			transition_in(dataview1.$$.fragment, local);
    			transition_in(dataview2.$$.fragment, local);
    			transition_in(dataview3.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(dataview0.$$.fragment, local);
    			transition_out(dataview1.$$.fragment, local);
    			transition_out(dataview2.$$.fragment, local);
    			transition_out(dataview3.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div4);
    			destroy_component(dataview0);
    			if (detaching) detach(t10);
    			if (detaching) detach(div8);
    			destroy_component(dataview1);
    			destroy_component(dataview2);
    			if (detaching) detach(t16);
    			if (detaching) detach(div13);
    			destroy_component(dataview3);
    		}
    	};
    }

    const padding = 0;
    const poolingMathCellSize = 44;
    const poolingMathFontSize = 14;

    function instance$8($$self, $$props, $$invalidate) {
    	let { stride } = $$props;
    	let { dilation } = $$props;
    	let { kernelLength } = $$props;
    	let { image } = $$props;
    	let { output } = $$props;
    	let { isPaused } = $$props;
    	let { dataRange } = $$props;
    	const dispatch = createEventDispatcher();
    	let padded_input_size;

    	// Dummy data for original state of component.
    	let testInputMatrixSlice = [];

    	for (let i = 0; i < kernelLength; i++) {
    		testInputMatrixSlice.push([]);

    		for (let j = 0; j < kernelLength; j++) {
    			testInputMatrixSlice[i].push(0);
    		}
    	}

    	testInputMatrixSlice = gridData(testInputMatrixSlice, poolingMathCellSize);
    	let testOutputMatrixSlice = gridData([[0]], poolingMathCellSize);
    	let inputHighlights = [];
    	let outputHighlights = array1d(output.length * output.length, i => true);
    	let interval;
    	let counter;

    	function startMaxPool(stride) {
    		counter = 0;
    		let outputMappings = generateOutputMappings(stride, output, kernelLength, padded_input_size, dilation);
    		if (stride <= 0) return;
    		if (interval) clearInterval(interval);

    		interval = setInterval(
    			() => {
    				if (isPaused) return;
    				const flat_animated = counter % (output.length * output.length);
    				$$invalidate(7, outputHighlights = array1d(output.length * output.length, i => false));
    				const animatedH = Math.floor(flat_animated / output.length);
    				const animatedW = flat_animated % output.length;
    				$$invalidate(7, outputHighlights[animatedH * output.length + animatedW] = true, outputHighlights);
    				$$invalidate(6, inputHighlights = compute_input_multiplies_with_weight(animatedH, animatedW, padded_input_size, kernelLength, outputMappings, kernelLength));
    				const inputMatrixSlice = getMatrixSliceFromInputHighlights(image, inputHighlights, kernelLength);
    				$$invalidate(4, testInputMatrixSlice = gridData(inputMatrixSlice, poolingMathCellSize));
    				const outputMatrixSlice = getMatrixSliceFromOutputHighlights(output, outputHighlights);
    				$$invalidate(5, testOutputMatrixSlice = gridData(outputMatrixSlice, poolingMathCellSize));
    				counter++;
    			},
    			250
    		);
    	}

    	function handleMouseover(event) {
    		let outputMappings = generateOutputMappings(stride, output, kernelLength, padded_input_size, dilation);
    		$$invalidate(7, outputHighlights = array1d(output.length * output.length, i => false));
    		const animatedH = event.detail.hoverH;
    		const animatedW = event.detail.hoverW;
    		$$invalidate(7, outputHighlights[animatedH * output.length + animatedW] = true, outputHighlights);
    		$$invalidate(6, inputHighlights = compute_input_multiplies_with_weight(animatedH, animatedW, padded_input_size, kernelLength, outputMappings, kernelLength));
    		const inputMatrixSlice = getMatrixSliceFromInputHighlights(image, inputHighlights, kernelLength);
    		$$invalidate(4, testInputMatrixSlice = gridData(inputMatrixSlice, poolingMathCellSize));
    		const outputMatrixSlice = getMatrixSliceFromOutputHighlights(output, outputHighlights);
    		$$invalidate(5, testOutputMatrixSlice = gridData(outputMatrixSlice, poolingMathCellSize));
    		$$invalidate(11, isPaused = true);
    		dispatch('message', { text: isPaused });
    	}

    	let testImage;
    	let testOutput;

    	$$self.$$set = $$props => {
    		if ('stride' in $$props) $$invalidate(0, stride = $$props.stride);
    		if ('dilation' in $$props) $$invalidate(12, dilation = $$props.dilation);
    		if ('kernelLength' in $$props) $$invalidate(13, kernelLength = $$props.kernelLength);
    		if ('image' in $$props) $$invalidate(1, image = $$props.image);
    		if ('output' in $$props) $$invalidate(2, output = $$props.output);
    		if ('isPaused' in $$props) $$invalidate(11, isPaused = $$props.isPaused);
    		if ('dataRange' in $$props) $$invalidate(3, dataRange = $$props.dataRange);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*image*/ 2) {
    			 padded_input_size = image.length + padding * 2;
    		}

    		if ($$self.$$.dirty & /*stride, image, output*/ 7) {
    			 {
    				startMaxPool(stride);
    				$$invalidate(8, testImage = gridData(image));
    				$$invalidate(9, testOutput = gridData(output));
    			}
    		}
    	};

    	return [
    		stride,
    		image,
    		output,
    		dataRange,
    		testInputMatrixSlice,
    		testOutputMatrixSlice,
    		inputHighlights,
    		outputHighlights,
    		testImage,
    		testOutput,
    		handleMouseover,
    		isPaused,
    		dilation,
    		kernelLength
    	];
    }

    class PoolAnimator extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {
    			stride: 0,
    			dilation: 12,
    			kernelLength: 13,
    			image: 1,
    			output: 2,
    			isPaused: 11,
    			dataRange: 3
    		});
    	}
    }

    /* src\detail-view\Poolview.svelte generated by Svelte v3.59.2 */

    function create_if_block$3(ctx) {
    	let div5;
    	let div4;
    	let div2;
    	let div0;
    	let t1;
    	let div1;
    	let button0;

    	let raw_value = (/*isPaused*/ ctx[4]
    	? '<i class="fas fa-play-circle play-icon"></i>'
    	: '<i class="fas fa-pause-circle"></i>') + "";

    	let button0_aria_label_value;
    	let button0_title_value;
    	let t2;
    	let button1;
    	let t3;
    	let div3;
    	let poolanimator;
    	let current;
    	let mounted;
    	let dispose;

    	poolanimator = new PoolAnimator({
    			props: {
    				kernelLength: /*kernelLength*/ ctx[1],
    				image: /*input*/ ctx[0],
    				output: /*outputFinal*/ ctx[5],
    				stride: stride$1,
    				dilation: dilation$1,
    				isPaused: /*isPaused*/ ctx[4],
    				dataRange: /*dataRange*/ ctx[2]
    			}
    		});

    	poolanimator.$on("message", /*handlePauseFromInteraction*/ ctx[7]);

    	return {
    		c() {
    			div5 = element("div");
    			div4 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			div0.textContent = "Pooling Computation";
    			t1 = space();
    			div1 = element("div");
    			button0 = element("button");
    			t2 = space();
    			button1 = element("button");
    			button1.innerHTML = `<i class="fas control-icon fa-times-circle"></i>`;
    			t3 = space();
    			div3 = element("div");
    			create_component(poolanimator.$$.fragment);
    			attr(div0, "class", "title-text svelte-155etma");
    			attr(button0, "type", "button");
    			attr(button0, "class", "play-button control-button svelte-155etma");

    			attr(button0, "aria-label", button0_aria_label_value = /*isPaused*/ ctx[4]
    			? 'Play animation'
    			: 'Pause animation');

    			attr(button0, "title", button0_title_value = /*isPaused*/ ctx[4]
    			? 'Play animation'
    			: 'Pause animation');

    			attr(button1, "type", "button");
    			attr(button1, "class", "delete-button control-button svelte-155etma");
    			attr(button1, "aria-label", "Close computation");
    			attr(button1, "title", "Close");
    			attr(div1, "class", "buttons svelte-155etma");
    			attr(div2, "class", "control-pannel svelte-155etma");
    			attr(div3, "class", "container is-centered is-vcentered svelte-155etma");
    			attr(div4, "class", "box svelte-155etma");
    			attr(div5, "class", "container pooling-popup svelte-155etma");
    		},
    		m(target, anchor) {
    			insert(target, div5, anchor);
    			append(div5, div4);
    			append(div4, div2);
    			append(div2, div0);
    			append(div2, t1);
    			append(div2, div1);
    			append(div1, button0);
    			button0.innerHTML = raw_value;
    			append(div1, t2);
    			append(div1, button1);
    			append(div4, t3);
    			append(div4, div3);
    			mount_component(poolanimator, div3, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(button0, "click", /*handleClickPause*/ ctx[6]),
    					listen(button1, "click", /*handleClickX*/ ctx[8])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if ((!current || dirty & /*isPaused*/ 16) && raw_value !== (raw_value = (/*isPaused*/ ctx[4]
    			? '<i class="fas fa-play-circle play-icon"></i>'
    			: '<i class="fas fa-pause-circle"></i>') + "")) button0.innerHTML = raw_value;
    			if (!current || dirty & /*isPaused*/ 16 && button0_aria_label_value !== (button0_aria_label_value = /*isPaused*/ ctx[4]
    			? 'Play animation'
    			: 'Pause animation')) {
    				attr(button0, "aria-label", button0_aria_label_value);
    			}

    			if (!current || dirty & /*isPaused*/ 16 && button0_title_value !== (button0_title_value = /*isPaused*/ ctx[4]
    			? 'Play animation'
    			: 'Pause animation')) {
    				attr(button0, "title", button0_title_value);
    			}

    			const poolanimator_changes = {};
    			if (dirty & /*kernelLength*/ 2) poolanimator_changes.kernelLength = /*kernelLength*/ ctx[1];
    			if (dirty & /*input*/ 1) poolanimator_changes.image = /*input*/ ctx[0];
    			if (dirty & /*outputFinal*/ 32) poolanimator_changes.output = /*outputFinal*/ ctx[5];
    			if (dirty & /*isPaused*/ 16) poolanimator_changes.isPaused = /*isPaused*/ ctx[4];
    			if (dirty & /*dataRange*/ 4) poolanimator_changes.dataRange = /*dataRange*/ ctx[2];
    			poolanimator.$set(poolanimator_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(poolanimator.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(poolanimator.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div5);
    			destroy_component(poolanimator);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$9(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = !/*isExited*/ ctx[3] && create_if_block$3(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (!/*isExited*/ ctx[3]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*isExited*/ 8) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    let stride$1 = 2;
    const dilation$1 = 1;

    function instance$9($$self, $$props, $$invalidate) {
    	let { input } = $$props;
    	let { kernelLength } = $$props;
    	let { dataRange } = $$props;
    	let { isExited } = $$props;
    	const dispatch = createEventDispatcher();
    	var isPaused = false;
    	var outputFinal = singleMaxPooling(input);

    	function handleClickPause() {
    		$$invalidate(4, isPaused = !isPaused);
    	}

    	function handlePauseFromInteraction(event) {
    		$$invalidate(4, isPaused = event.detail.text);
    	}

    	function handleClickX() {
    		dispatch('message', { text: true });
    	}

    	$$self.$$set = $$props => {
    		if ('input' in $$props) $$invalidate(0, input = $$props.input);
    		if ('kernelLength' in $$props) $$invalidate(1, kernelLength = $$props.kernelLength);
    		if ('dataRange' in $$props) $$invalidate(2, dataRange = $$props.dataRange);
    		if ('isExited' in $$props) $$invalidate(3, isExited = $$props.isExited);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*input*/ 1) {
    			 {
    				try {
    					$$invalidate(5, outputFinal = singleMaxPooling(input));
    				} catch {
    					
    				}
    			}
    		}
    	};

    	return [
    		input,
    		kernelLength,
    		dataRange,
    		isExited,
    		isPaused,
    		outputFinal,
    		handleClickPause,
    		handlePauseFromInteraction,
    		handleClickX
    	];
    }

    class Poolview extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {
    			input: 0,
    			kernelLength: 1,
    			dataRange: 2,
    			isExited: 3
    		});
    	}
    }

    /* src\detail-view\Softmaxview.svelte generated by Svelte v3.59.2 */

    function create_fragment$a(ctx) {
    	let div3;
    	let div2;
    	let div0;
    	let button;
    	let t0;
    	let div1;
    	let t1;
    	let i1;
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let svg_1;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			button = element("button");
    			button.innerHTML = `<i class="fas control-icon fa-times-circle"></i>`;
    			t0 = space();
    			div1 = element("div");
    			t1 = text("Softmax Score for ");
    			i1 = element("i");
    			t2 = text("\"");
    			t3 = text(/*outputName*/ ctx[0]);
    			t4 = text("\"");
    			t5 = space();
    			svg_1 = svg_element("svg");
    			attr(button, "type", "button");
    			attr(button, "class", "delete-button control-button svelte-1edzsqo");
    			attr(button, "aria-label", "Close computation");
    			attr(button, "title", "Close");
    			attr(div0, "class", "buttons svelte-1edzsqo");
    			attr(div1, "class", "title-text svelte-1edzsqo");
    			attr(svg_1, "id", "softmax-svg");
    			attr(svg_1, "width", "470");
    			attr(svg_1, "height", "105");
    			attr(svg_1, "class", "svelte-1edzsqo");
    			attr(div2, "class", "box svelte-1edzsqo");
    			attr(div3, "class", "container");
    		},
    		m(target, anchor) {
    			insert(target, div3, anchor);
    			append(div3, div2);
    			append(div2, div0);
    			append(div0, button);
    			append(div2, t0);
    			append(div2, div1);
    			append(div1, t1);
    			append(div1, i1);
    			append(i1, t2);
    			append(i1, t3);
    			append(i1, t4);
    			append(div2, t5);
    			append(div2, svg_1);
    			/*div3_binding*/ ctx[10](div3);

    			if (!mounted) {
    				dispose = listen(button, "click", /*handleClickX*/ ctx[2]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*outputName*/ 1) set_data(t3, /*outputName*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div3);
    			/*div3_binding*/ ctx[10](null);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let { logits } = $$props;
    	let { logitColors } = $$props;
    	let { selectedI } = $$props;
    	let { highlightI = -1 } = $$props;
    	let { outputName } = $$props;
    	let { outputValue } = $$props;
    	let { startAnimation } = $$props;
    	let softmaxViewComponent;
    	let svg = null;
    	const dispatch = createEventDispatcher();

    	const formater = (n, d) => {
    		if (d === undefined) {
    			return d3.format('.2f')(n);
    		} else {
    			return d3.format(`.${d}f`)(n);
    		}
    	};

    	const mouseOverHandler = (d, i, g, curI) => {
    		$$invalidate(3, highlightI = curI);
    		dispatch('mouseOver', { curI });
    	};

    	const mouseLeaveHandler = (d, i, g, curI) => {
    		$$invalidate(3, highlightI = -1);
    		dispatch('mouseLeave', { curI });
    	};

    	const handleClickX = () => {
    		dispatch('xClicked', {});
    	};

    	onMount(() => {
    		$$invalidate(9, svg = d3.select(softmaxViewComponent).select('#softmax-svg'));
    		let formulaRightGroup = svg.append('g').attr('class', 'formula-right').attr('transform', `translate(${10}, ${0})`).style('font-size', '15px');

    		// Denominator
    		let denominatorGroup = formulaRightGroup.append('g').attr('class', 'denominator').attr('transform', `translate(${0}, ${58})`);

    		// Add the left (
    		denominatorGroup.append('text').attr('x', 0).attr('y', 0).style('fill', 'gray').text('(');

    		// Need to loop through the logits array instead of data-binding because
    		// we want dynamic positioning based on prior '-' occurance
    		let curX = 8;

    		let numOfRows = 4;

    		logits.forEach((d, i) => {
    			if (i / numOfRows >= 1 && i % numOfRows === 0) {
    				curX = 8;
    			}

    			let curText = denominatorGroup.append('text').attr('x', curX).attr('y', Math.floor(i / numOfRows) * 20).style('cursor', 'crosshair').style('pointer-events', 'all').on('mouseover', (d, n, g) => mouseOverHandler(d, n, g, i)).on('mouseleave', (d, n, g) => mouseLeaveHandler(d, n, g, i)).text(`exp(`);
    			curText.append('tspan').attr('class', `formula-term-${i} formula-term`).attr('dx', '1').style('fill', logitColors[i]).style('fill-opacity', i === selectedI || startAnimation.hasInitialized ? 1 : 0).text(formater(d));
    			curText.append('tspan').attr('dx', '1').text(')');
    			let curBBox = curText.node().getBBox();
    			curX += curBBox.width + 4;

    			if (i !== logits.length - 1) {
    				denominatorGroup.append('text').attr('x', curX).attr('y', Math.floor(i / numOfRows) * 20).text('+');
    				curX += 14;
    			} else {
    				denominatorGroup.append('text').attr('x', curX - 2).attr('y', Math.floor(i / numOfRows) * 20).style('fill', 'gray').text(')');
    			}
    		});

    		denominatorGroup.selectAll('text').data(logits).enter().append('text').attr('x', (d, i) => 40 * i).attr('y', 0).text(d => formater(d));

    		// Calculate the dynamic denominator group width
    		let denominatorGroupBBox = denominatorGroup.node().getBBox();

    		// Draw the fraction line
    		formulaRightGroup.append('line').attr('class', 'separation-line').attr('x1', -5).attr('x2', denominatorGroupBBox.width + 5).attr('y1', 32).attr('y2', 32).style('stroke-width', 1.2).style('stroke', 'gray');

    		// Draw the numerator
    		let numeratorGroup = formulaRightGroup.append('g').attr('class', 'numerator-group').attr('transform', `translate(${0}, ${20})`);

    		let numeratorText = numeratorGroup.append('text').attr('x', denominatorGroupBBox.x + denominatorGroupBBox.width / 2).attr('y', 0).on('mouseover', (d, n, g) => mouseOverHandler(d, n, g, selectedI)).on('mouseleave', (d, n, g) => mouseLeaveHandler(d, n, g, selectedI)).style('pointer-events', 'all').style('cursor', 'crosshair').style('text-anchor', 'middle').text('exp(');
    		numeratorText.append('tspan').attr('class', `formula-term-${selectedI} formula-term`).attr('dx', 1).style('fill', logitColors[selectedI]).text(`${formater(logits[selectedI])}`);
    		numeratorText.append('tspan').attr('dx', 1).text(')');

    		// Draw the left part of the formula
    		let formulaLeftGroup = svg.append('g').attr('class', 'formula-left').attr('transform', `translate(${395}, ${32})`);

    		formulaLeftGroup.append('text').attr('x', 20).attr('dominant-baseline', 'middle').text(`${formater(outputValue, 4)}`);
    		formulaLeftGroup.append('text').attr('dominant-baseline', 'middle').attr('x', 0).attr('y', 0).style('fill', 'gray').style('font-weight', 'bold').text('=');
    	});

    	function div3_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			softmaxViewComponent = $$value;
    			$$invalidate(1, softmaxViewComponent);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('logits' in $$props) $$invalidate(4, logits = $$props.logits);
    		if ('logitColors' in $$props) $$invalidate(5, logitColors = $$props.logitColors);
    		if ('selectedI' in $$props) $$invalidate(6, selectedI = $$props.selectedI);
    		if ('highlightI' in $$props) $$invalidate(3, highlightI = $$props.highlightI);
    		if ('outputName' in $$props) $$invalidate(0, outputName = $$props.outputName);
    		if ('outputValue' in $$props) $$invalidate(7, outputValue = $$props.outputValue);
    		if ('startAnimation' in $$props) $$invalidate(8, startAnimation = $$props.startAnimation);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*highlightI, svg*/ 520) {
    			 ((() => {
    				if (svg !== null) {
    					svg.selectAll(`.formula-term`).style('text-decoration', 'none').style('font-weight', 'normal');
    					svg.selectAll(`.formula-term-${highlightI}`).style('font-weight', 'bold').style('text-decoration', 'underline');
    				}
    			})());
    		}

    		if ($$self.$$.dirty & /*startAnimation, svg*/ 768) {
    			 ((() => {
    				if (svg !== null) {
    					svg.select(`.formula-term-${startAnimation.i}`).transition('softmax-edge').duration(startAnimation.duration).style('fill-opacity', 1);
    				}
    			})());
    		}
    	};

    	return [
    		outputName,
    		softmaxViewComponent,
    		handleClickX,
    		highlightI,
    		logits,
    		logitColors,
    		selectedI,
    		outputValue,
    		startAnimation,
    		svg,
    		div3_binding
    	];
    }

    class Softmaxview extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {
    			logits: 4,
    			logitColors: 5,
    			selectedI: 6,
    			highlightI: 3,
    			outputName: 0,
    			outputValue: 7,
    			startAnimation: 8
    		});
    	}
    }

    /* src\overview\Modal.svelte generated by Svelte v3.59.2 */

    function create_fragment$b(ctx) {
    	let div8;
    	let div7;
    	let button0;
    	let t0;
    	let div6;
    	let header;
    	let p;
    	let t2;
    	let button1;
    	let t3;
    	let section;
    	let div3;
    	let div0;
    	let input0;
    	let t4;
    	let span0;
    	let t5;
    	let div1;
    	let t7;
    	let div2;
    	let label;
    	let input1;
    	let t8;
    	let span3;
    	let t11;
    	let footer;
    	let div4;
    	let t12_value = /*errorInfo*/ ctx[5].error + "";
    	let t12;
    	let t13;
    	let div5;
    	let button2;
    	let t15;
    	let button3;
    	let t17;
    	let img;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div8 = element("div");
    			div7 = element("div");
    			button0 = element("button");
    			t0 = space();
    			div6 = element("div");
    			header = element("header");
    			p = element("p");
    			p.textContent = "Add Input Image";
    			t2 = space();
    			button1 = element("button");
    			t3 = space();
    			section = element("section");
    			div3 = element("div");
    			div0 = element("div");
    			input0 = element("input");
    			t4 = space();
    			span0 = element("span");
    			span0.innerHTML = `<i class="fas fa-link"></i>`;
    			t5 = space();
    			div1 = element("div");
    			div1.textContent = "or";
    			t7 = space();
    			div2 = element("div");
    			label = element("label");
    			input1 = element("input");
    			t8 = space();
    			span3 = element("span");

    			span3.innerHTML = `<span class="file-icon"><i class="fas fa-upload"></i></span> 
                <span class="file-label">Upload</span>`;

    			t11 = space();
    			footer = element("footer");
    			div4 = element("div");
    			t12 = text(t12_value);
    			t13 = space();
    			div5 = element("div");
    			button2 = element("button");
    			button2.textContent = "Cancel";
    			t15 = space();
    			button3 = element("button");
    			button3.textContent = "Add";
    			t17 = space();
    			img = element("img");
    			attr(button0, "type", "button");
    			attr(button0, "class", "modal-background svelte-157s6nl");
    			attr(button0, "tabindex", "-1");
    			attr(button0, "aria-label", "Close input dialog");
    			attr(p, "class", "modal-card-title svelte-157s6nl");
    			attr(p, "id", "input-modal-title");
    			attr(button1, "type", "button");
    			attr(button1, "class", "delete");
    			attr(button1, "aria-label", "Close input dialog");
    			attr(header, "class", "modal-card-head svelte-157s6nl");
    			attr(input0, "class", "input small-font svelte-157s6nl");
    			attr(input0, "type", "url");
    			attr(input0, "placeholder", "Paste URL of image...");
    			attr(span0, "class", "icon small-font is-left svelte-157s6nl");
    			attr(div0, "class", "control has-icons-left svelte-157s6nl");
    			toggle_class(div0, "is-loading", /*showLoading*/ ctx[3]);
    			attr(div1, "class", "or-label svelte-157s6nl");
    			attr(input1, "class", "file-input");
    			attr(input1, "type", "file");
    			attr(input1, "name", "image");
    			attr(input1, "accept", ".png,.jpeg,.tiff,.jpg,.png");
    			attr(span3, "class", "file-cta small-font svelte-157s6nl");
    			attr(label, "class", "file-label");
    			attr(div2, "class", "file");
    			attr(div3, "class", "field svelte-157s6nl");
    			attr(section, "class", "modal-card-body");
    			attr(div4, "class", "error-message svelte-157s6nl");
    			toggle_class(div4, "hidden", !/*errorInfo*/ ctx[5].show);
    			attr(button2, "class", "button is-smaller svelte-157s6nl");
    			attr(button3, "class", "button is-success is-smaller svelte-157s6nl");
    			attr(div5, "class", "button-container");
    			attr(footer, "class", "modal-card-foot svelte-157s6nl");
    			attr(div6, "class", "modal-card svelte-157s6nl");
    			attr(div7, "class", "modal");
    			attr(div7, "id", "input-modal");
    			attr(div7, "role", "dialog");
    			attr(div7, "aria-modal", "true");
    			attr(div7, "aria-labelledby", "input-modal-title");
    			toggle_class(div7, "is-active", /*modalInfo*/ ctx[6].show);
    			set_style(img, "display", "none");
    			attr(img, "alt", "");
    			attr(img, "aria-hidden", "true");
    			attr(img, "id", "vali-image");
    			attr(div8, "class", "modal-component");
    		},
    		m(target, anchor) {
    			insert(target, div8, anchor);
    			append(div8, div7);
    			append(div7, button0);
    			append(div7, t0);
    			append(div7, div6);
    			append(div6, header);
    			append(header, p);
    			append(header, t2);
    			append(header, button1);
    			append(div6, t3);
    			append(div6, section);
    			append(section, div3);
    			append(div3, div0);
    			append(div0, input0);
    			set_input_value(input0, /*inputValue*/ ctx[2]);
    			append(div0, t4);
    			append(div0, span0);
    			append(div3, t5);
    			append(div3, div1);
    			append(div3, t7);
    			append(div3, div2);
    			append(div2, label);
    			append(label, input1);
    			append(label, t8);
    			append(label, span3);
    			append(div6, t11);
    			append(div6, footer);
    			append(footer, div4);
    			append(div4, t12);
    			append(footer, t13);
    			append(footer, div5);
    			append(div5, button2);
    			append(div5, t15);
    			append(div5, button3);
    			append(div8, t17);
    			append(div8, img);
    			/*img_binding*/ ctx[15](img);
    			/*div8_binding*/ ctx[16](div8);

    			if (!mounted) {
    				dispose = [
    					listen(window, "keydown", /*handleKeydown*/ ctx[11]),
    					listen(button0, "click", /*crossClicked*/ ctx[10]),
    					listen(button1, "click", /*crossClicked*/ ctx[10]),
    					listen(input0, "input", /*input0_input_handler*/ ctx[13]),
    					listen(input1, "change", /*input1_change_handler*/ ctx[14]),
    					listen(input1, "change", /*imageUpload*/ ctx[9]),
    					listen(button2, "click", /*crossClicked*/ ctx[10]),
    					listen(button3, "click", /*addClicked*/ ctx[12]),
    					listen(img, "error", /*errorCallback*/ ctx[7]),
    					listen(img, "load", /*loadCallback*/ ctx[8])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*inputValue*/ 4 && input0.value !== /*inputValue*/ ctx[2]) {
    				set_input_value(input0, /*inputValue*/ ctx[2]);
    			}

    			if (dirty & /*showLoading*/ 8) {
    				toggle_class(div0, "is-loading", /*showLoading*/ ctx[3]);
    			}

    			if (dirty & /*errorInfo*/ 32 && t12_value !== (t12_value = /*errorInfo*/ ctx[5].error + "")) set_data(t12, t12_value);

    			if (dirty & /*errorInfo*/ 32) {
    				toggle_class(div4, "hidden", !/*errorInfo*/ ctx[5].show);
    			}

    			if (dirty & /*modalInfo*/ 64) {
    				toggle_class(div7, "is-active", /*modalInfo*/ ctx[6].show);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div8);
    			/*img_binding*/ ctx[15](null);
    			/*div8_binding*/ ctx[16](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let modalComponent;
    	let valiImg;
    	let inputValue = '';
    	let showLoading = false;
    	let files;
    	let usingURL = true;
    	let errorInfo = { show: false, error: '' };
    	const dispatch = createEventDispatcher();
    	let modalInfo = { show: false };
    	modalStore.set(modalInfo);

    	modalStore.subscribe(value => {
    		$$invalidate(6, modalInfo = value);
    	});

    	const errorCallback = () => {
    		// The URL is invalid, show an error message on the UI
    		$$invalidate(3, showLoading = false);

    		$$invalidate(5, errorInfo.show = true, errorInfo);

    		$$invalidate(
    			5,
    			errorInfo.error = usingURL
    			? "We can't find the image at that URL."
    			: "Not a valid image file.",
    			errorInfo
    		);
    	};

    	const loadCallback = () => {
    		// The URL is valid, but we are not sure if loading it to canvas would be
    		// blocked by crossOrigin setting. Try it here before dispatch to parent.
    		// https://stackoverflow.com/questions/13674835/canvas-tainted-by-cross-origin-data
    		let canvas = document.createElement("canvas");

    		let context = canvas.getContext("2d");
    		canvas.width = valiImg.width;
    		canvas.height = valiImg.height;
    		context.drawImage(valiImg, 0, 0);

    		try {
    			context.getImageData(0, 0, valiImg.width, valiImg.height);

    			// If the foreign image does support CORS -> use this image
    			// dispatch to parent component to use the input image
    			$$invalidate(3, showLoading = false);

    			$$invalidate(6, modalInfo.show = false, modalInfo);
    			modalStore.set(modalInfo);
    			dispatch('urlTyped', { url: valiImg.src });
    			$$invalidate(2, inputValue = null);
    		} catch(err) {
    			// If the foreign image does not support CORS -> use this image
    			$$invalidate(3, showLoading = false);

    			$$invalidate(5, errorInfo.show = true, errorInfo);
    			$$invalidate(5, errorInfo.error = "No permission to load this image.", errorInfo);
    		}
    	};

    	const imageUpload = () => {
    		usingURL = false;
    		let reader = new FileReader();

    		reader.onload = event => {
    			$$invalidate(1, valiImg.src = event.target.result, valiImg);
    		};

    		reader.readAsDataURL(files[0]);
    	};

    	const crossClicked = () => {
    		$$invalidate(6, modalInfo.show = false, modalInfo);
    		modalStore.set(modalInfo);

    		// Dispatch the parent component
    		dispatch('xClicked', { preImage: modalInfo.preImage });
    	};

    	const handleKeydown = event => {
    		if (modalInfo.show && event.key === 'Escape') crossClicked();
    	};

    	const addClicked = () => {
    		// Validate the input URL
    		$$invalidate(3, showLoading = true);

    		$$invalidate(5, errorInfo.show = false, errorInfo);
    		$$invalidate(1, valiImg.crossOrigin = "Anonymous", valiImg);
    		$$invalidate(1, valiImg.src = inputValue, valiImg);
    	};

    	onMount(() => {
    		let modal = d3.select(modalComponent).select('#input-modal');
    	});

    	function input0_input_handler() {
    		inputValue = this.value;
    		$$invalidate(2, inputValue);
    	}

    	function input1_change_handler() {
    		files = this.files;
    		$$invalidate(4, files);
    	}

    	function img_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			valiImg = $$value;
    			$$invalidate(1, valiImg);
    		});
    	}

    	function div8_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			modalComponent = $$value;
    			$$invalidate(0, modalComponent);
    		});
    	}

    	return [
    		modalComponent,
    		valiImg,
    		inputValue,
    		showLoading,
    		files,
    		errorInfo,
    		modalInfo,
    		errorCallback,
    		loadCallback,
    		imageUpload,
    		crossClicked,
    		handleKeydown,
    		addClicked,
    		input0_input_handler,
    		input1_change_handler,
    		img_binding,
    		div8_binding
    	];
    }

    class Modal extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {});
    	}
    }

    /* src\overview\ImageSelector.svelte generated by Svelte v3.59.2 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	return child_ctx;
    }

    // (146:0) {#if show}
    function create_if_block$4(ctx) {
    	let div4;
    	let button0;
    	let t0;
    	let div3;
    	let div0;
    	let h3;
    	let t2;
    	let button1;
    	let t4;
    	let div1;
    	let t5;
    	let div2;
    	let button2;
    	let mounted;
    	let dispose;
    	let each_value = /*imageOptions*/ ctx[1];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	return {
    		c() {
    			div4 = element("div");
    			button0 = element("button");
    			t0 = space();
    			div3 = element("div");
    			div0 = element("div");
    			h3 = element("h3");
    			h3.textContent = "Select an Image";
    			t2 = space();
    			button1 = element("button");
    			button1.textContent = "×";
    			t4 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t5 = space();
    			div2 = element("div");
    			button2 = element("button");
    			button2.textContent = "Cancel";
    			attr(button0, "type", "button");
    			attr(button0, "class", "modal-backdrop svelte-12kauwt");
    			attr(button0, "tabindex", "-1");
    			attr(button0, "aria-label", "Close image selection");
    			attr(h3, "class", "modal-title svelte-12kauwt");
    			attr(h3, "id", "image-selector-title");
    			attr(button1, "type", "button");
    			attr(button1, "class", "close-button svelte-12kauwt");
    			attr(button1, "aria-label", "Close image selection");
    			attr(div0, "class", "modal-header svelte-12kauwt");
    			attr(div1, "class", "image-grid svelte-12kauwt");
    			attr(button2, "class", "button");
    			attr(div2, "class", "modal-footer svelte-12kauwt");
    			attr(div3, "class", "modal-content svelte-12kauwt");
    			attr(div4, "class", "modal svelte-12kauwt");
    			attr(div4, "role", "dialog");
    			attr(div4, "aria-modal", "true");
    			attr(div4, "aria-labelledby", "image-selector-title");
    		},
    		m(target, anchor) {
    			insert(target, div4, anchor);
    			append(div4, button0);
    			append(div4, t0);
    			append(div4, div3);
    			append(div3, div0);
    			append(div0, h3);
    			append(div0, t2);
    			append(div0, button1);
    			append(div3, t4);
    			append(div3, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div1, null);
    				}
    			}

    			append(div3, t5);
    			append(div3, div2);
    			append(div2, button2);

    			if (!mounted) {
    				dispose = [
    					listen(button0, "click", /*closeModal*/ ctx[5]),
    					listen(button1, "click", /*closeModal*/ ctx[5]),
    					listen(button2, "click", /*closeModal*/ ctx[5])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*imageOptions, selectedImage, selectImage, demoImageURL, imageRoot, imageVersion*/ 94) {
    				each_value = /*imageOptions*/ ctx[1];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div4);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (157:8) {#each imageOptions as image}
    function create_each_block(ctx) {
    	let button;
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let t0;
    	let span;
    	let t1_value = /*image*/ ctx[10].class + "";
    	let t1;
    	let t2;
    	let button_aria_label_value;
    	let button_aria_pressed_value;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[8](/*image*/ ctx[10]);
    	}

    	return {
    		c() {
    			button = element("button");
    			img = element("img");
    			t0 = space();
    			span = element("span");
    			t1 = text(t1_value);
    			t2 = space();
    			if (!src_url_equal(img.src, img_src_value = demoImageURL(/*imageRoot*/ ctx[3], /*image*/ ctx[10].file, /*imageVersion*/ ctx[4]))) attr(img, "src", img_src_value);
    			attr(img, "alt", img_alt_value = /*image*/ ctx[10].class);
    			attr(img, "class", "image-preview svelte-12kauwt");
    			attr(span, "class", "image-label svelte-12kauwt");
    			attr(button, "type", "button");
    			attr(button, "class", "image-option svelte-12kauwt");
    			attr(button, "aria-label", button_aria_label_value = `Select ${/*image*/ ctx[10].class}`);
    			attr(button, "aria-pressed", button_aria_pressed_value = /*selectedImage*/ ctx[2] === /*image*/ ctx[10].file);
    			toggle_class(button, "selected", /*selectedImage*/ ctx[2] === /*image*/ ctx[10].file);
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);
    			append(button, img);
    			append(button, t0);
    			append(button, span);
    			append(span, t1);
    			append(button, t2);

    			if (!mounted) {
    				dispose = listen(button, "click", click_handler);
    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*imageRoot, imageOptions, imageVersion*/ 26 && !src_url_equal(img.src, img_src_value = demoImageURL(/*imageRoot*/ ctx[3], /*image*/ ctx[10].file, /*imageVersion*/ ctx[4]))) {
    				attr(img, "src", img_src_value);
    			}

    			if (dirty & /*imageOptions*/ 2 && img_alt_value !== (img_alt_value = /*image*/ ctx[10].class)) {
    				attr(img, "alt", img_alt_value);
    			}

    			if (dirty & /*imageOptions*/ 2 && t1_value !== (t1_value = /*image*/ ctx[10].class + "")) set_data(t1, t1_value);

    			if (dirty & /*imageOptions*/ 2 && button_aria_label_value !== (button_aria_label_value = `Select ${/*image*/ ctx[10].class}`)) {
    				attr(button, "aria-label", button_aria_label_value);
    			}

    			if (dirty & /*selectedImage, imageOptions*/ 6 && button_aria_pressed_value !== (button_aria_pressed_value = /*selectedImage*/ ctx[2] === /*image*/ ctx[10].file)) {
    				attr(button, "aria-pressed", button_aria_pressed_value);
    			}

    			if (dirty & /*selectedImage, imageOptions*/ 6) {
    				toggle_class(button, "selected", /*selectedImage*/ ctx[2] === /*image*/ ctx[10].file);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(button);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function create_fragment$c(ctx) {
    	let if_block_anchor;
    	let mounted;
    	let dispose;
    	let if_block = /*show*/ ctx[0] && create_if_block$4(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);

    			if (!mounted) {
    				dispose = listen(window, "keydown", /*handleKeydown*/ ctx[7]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (/*show*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$4(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let { show = false } = $$props;
    	let { imageOptions = [] } = $$props;
    	let { selectedImage = '' } = $$props;
    	let { imageRoot = '/assets/img' } = $$props;
    	let { imageVersion = '' } = $$props;
    	const dispatch = createEventDispatcher();

    	const closeModal = () => {
    		dispatch('canceled');
    	};

    	const selectImage = imageName => {
    		dispatch('imageSelected', { imageName });
    	};

    	const handleKeydown = event => {
    		if (show && event.key === 'Escape') closeModal();
    	};

    	const click_handler = image => selectImage(image.file);

    	$$self.$$set = $$props => {
    		if ('show' in $$props) $$invalidate(0, show = $$props.show);
    		if ('imageOptions' in $$props) $$invalidate(1, imageOptions = $$props.imageOptions);
    		if ('selectedImage' in $$props) $$invalidate(2, selectedImage = $$props.selectedImage);
    		if ('imageRoot' in $$props) $$invalidate(3, imageRoot = $$props.imageRoot);
    		if ('imageVersion' in $$props) $$invalidate(4, imageVersion = $$props.imageVersion);
    	};

    	return [
    		show,
    		imageOptions,
    		selectedImage,
    		imageRoot,
    		imageVersion,
    		closeModal,
    		selectImage,
    		handleKeydown,
    		click_handler
    	];
    }

    class ImageSelector extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {
    			show: 0,
    			imageOptions: 1,
    			selectedImage: 2,
    			imageRoot: 3,
    			imageVersion: 4
    		});
    	}
    }

    /* src\overview\ImageUploader.svelte generated by Svelte v3.59.2 */

    function create_if_block$5(ctx) {
    	let div3;
    	let button0;
    	let t0;
    	let div2;
    	let div0;
    	let h3;
    	let t2;
    	let button1;
    	let t4;
    	let t5;
    	let t6;
    	let div1;
    	let button2;
    	let t8;
    	let mounted;
    	let dispose;
    	let if_block0 = /*errorInfo*/ ctx[3].show && create_if_block_4(ctx);

    	function select_block_type(ctx, dirty) {
    		if (/*showLoading*/ ctx[2]) return create_if_block_2;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block1 = current_block_type(ctx);
    	let if_block2 = /*files*/ ctx[1] && /*files*/ ctx[1].length > 0 && !/*showLoading*/ ctx[2] && create_if_block_1(ctx);

    	return {
    		c() {
    			div3 = element("div");
    			button0 = element("button");
    			t0 = space();
    			div2 = element("div");
    			div0 = element("div");
    			h3 = element("h3");
    			h3.textContent = "Upload Image";
    			t2 = space();
    			button1 = element("button");
    			button1.textContent = "×";
    			t4 = space();
    			if (if_block0) if_block0.c();
    			t5 = space();
    			if_block1.c();
    			t6 = space();
    			div1 = element("div");
    			button2 = element("button");
    			button2.textContent = "Cancel";
    			t8 = space();
    			if (if_block2) if_block2.c();
    			attr(button0, "type", "button");
    			attr(button0, "class", "modal-backdrop svelte-wzv81u");
    			attr(button0, "tabindex", "-1");
    			attr(button0, "aria-label", "Close upload dialog");
    			attr(h3, "class", "modal-title svelte-wzv81u");
    			attr(h3, "id", "image-uploader-title");
    			attr(button1, "type", "button");
    			attr(button1, "class", "close-button svelte-wzv81u");
    			attr(button1, "aria-label", "Close upload dialog");
    			attr(div0, "class", "modal-header svelte-wzv81u");
    			attr(button2, "class", "button svelte-wzv81u");
    			attr(div1, "class", "modal-footer svelte-wzv81u");
    			attr(div2, "class", "modal-content svelte-wzv81u");
    			attr(div3, "class", "modal svelte-wzv81u");
    			attr(div3, "role", "dialog");
    			attr(div3, "aria-modal", "true");
    			attr(div3, "aria-labelledby", "image-uploader-title");
    		},
    		m(target, anchor) {
    			insert(target, div3, anchor);
    			append(div3, button0);
    			append(div3, t0);
    			append(div3, div2);
    			append(div2, div0);
    			append(div0, h3);
    			append(div0, t2);
    			append(div0, button1);
    			append(div2, t4);
    			if (if_block0) if_block0.m(div2, null);
    			append(div2, t5);
    			if_block1.m(div2, null);
    			append(div2, t6);
    			append(div2, div1);
    			append(div1, button2);
    			append(div1, t8);
    			if (if_block2) if_block2.m(div1, null);

    			if (!mounted) {
    				dispose = [
    					listen(button0, "click", /*closeModal*/ ctx[5]),
    					listen(button1, "click", /*closeModal*/ ctx[5]),
    					listen(button2, "click", /*closeModal*/ ctx[5])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (/*errorInfo*/ ctx[3].show) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_4(ctx);
    					if_block0.c();
    					if_block0.m(div2, t5);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(div2, t6);
    				}
    			}

    			if (/*files*/ ctx[1] && /*files*/ ctx[1].length > 0 && !/*showLoading*/ ctx[2]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_1(ctx);
    					if_block2.c();
    					if_block2.m(div1, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div3);
    			if (if_block0) if_block0.d();
    			if_block1.d();
    			if (if_block2) if_block2.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (245:6) {#if errorInfo.show}
    function create_if_block_4(ctx) {
    	let div;
    	let t_value = /*errorInfo*/ ctx[3].error + "";
    	let t;

    	return {
    		c() {
    			div = element("div");
    			t = text(t_value);
    			attr(div, "class", "error-message svelte-wzv81u");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*errorInfo*/ 8 && t_value !== (t_value = /*errorInfo*/ ctx[3].error + "")) set_data(t, t_value);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (255:6) {:else}
    function create_else_block(ctx) {
    	let div2;
    	let div0;
    	let t0;
    	let div1;
    	let t2;
    	let input;
    	let t3;
    	let label;
    	let t5;
    	let if_block_anchor;
    	let mounted;
    	let dispose;
    	let if_block = /*files*/ ctx[1] && /*files*/ ctx[1].length > 0 && create_if_block_3(ctx);

    	return {
    		c() {
    			div2 = element("div");
    			div0 = element("div");
    			div0.innerHTML = `<i class="fas fa-cloud-upload-alt"></i>`;
    			t0 = space();
    			div1 = element("div");
    			div1.textContent = "Click to select an image file";
    			t2 = space();
    			input = element("input");
    			t3 = space();
    			label = element("label");
    			label.textContent = "Choose File";
    			t5 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			attr(div0, "class", "upload-icon svelte-wzv81u");
    			attr(div1, "class", "upload-text svelte-wzv81u");
    			attr(input, "type", "file");
    			attr(input, "class", "file-input svelte-wzv81u");
    			attr(input, "accept", "image/*");
    			attr(input, "id", "file-upload");
    			attr(label, "for", "file-upload");
    			attr(label, "class", "upload-button svelte-wzv81u");
    			attr(div2, "class", "upload-area svelte-wzv81u");
    		},
    		m(target, anchor) {
    			insert(target, div2, anchor);
    			append(div2, div0);
    			append(div2, t0);
    			append(div2, div1);
    			append(div2, t2);
    			append(div2, input);
    			append(div2, t3);
    			append(div2, label);
    			insert(target, t5, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);

    			if (!mounted) {
    				dispose = listen(input, "change", /*input_change_handler*/ ctx[10]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (/*files*/ ctx[1] && /*files*/ ctx[1].length > 0) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_3(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div2);
    			if (detaching) detach(t5);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (251:6) {#if showLoading}
    function create_if_block_2(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			div.textContent = "Processing image...";
    			attr(div, "class", "loading svelte-wzv81u");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (275:8) {#if files && files.length > 0}
    function create_if_block_3(ctx) {
    	let div;
    	let t0;
    	let t1_value = /*files*/ ctx[1][0].name + "";
    	let t1;

    	return {
    		c() {
    			div = element("div");
    			t0 = text("Selected: ");
    			t1 = text(t1_value);
    			attr(div, "class", "selected-file svelte-wzv81u");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t0);
    			append(div, t1);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*files*/ 2 && t1_value !== (t1_value = /*files*/ ctx[1][0].name + "")) set_data(t1, t1_value);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (284:8) {#if files && files.length > 0 && !showLoading}
    function create_if_block_1(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			button = element("button");
    			button.textContent = "Upload";
    			attr(button, "class", "button button-primary svelte-wzv81u");
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);

    			if (!mounted) {
    				dispose = listen(button, "click", /*handleFileUpload*/ ctx[7]);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(button);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function create_fragment$d(ctx) {
    	let t;
    	let img;
    	let mounted;
    	let dispose;
    	let if_block = /*show*/ ctx[0] && create_if_block$5(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			t = space();
    			img = element("img");
    			set_style(img, "display", "none");
    			attr(img, "alt", "");
    			attr(img, "aria-hidden", "true");
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, t, anchor);
    			insert(target, img, anchor);
    			/*img_binding*/ ctx[11](img);

    			if (!mounted) {
    				dispose = [
    					listen(window, "keydown", /*handleKeydown*/ ctx[6]),
    					listen(img, "error", /*errorCallback*/ ctx[8]),
    					listen(img, "load", /*loadCallback*/ ctx[9])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (/*show*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$5(ctx);
    					if_block.c();
    					if_block.m(t.parentNode, t);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(t);
    			if (detaching) detach(img);
    			/*img_binding*/ ctx[11](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$d($$self, $$props, $$invalidate) {
    	let { show = false } = $$props;
    	const dispatch = createEventDispatcher();
    	let files;
    	let showLoading = false;
    	let errorInfo = { show: false, error: '' };
    	let valiImg;

    	const closeModal = () => {
    		dispatch('canceled');
    		resetState();
    	};

    	const handleKeydown = event => {
    		if (show && event.key === 'Escape') closeModal();
    	};

    	const resetState = () => {
    		$$invalidate(1, files = null);
    		$$invalidate(2, showLoading = false);
    		$$invalidate(3, errorInfo.show = false, errorInfo);
    		$$invalidate(3, errorInfo.error = '', errorInfo);
    	};

    	const handleFileUpload = () => {
    		if (!files || files.length === 0) {
    			$$invalidate(3, errorInfo.show = true, errorInfo);
    			$$invalidate(3, errorInfo.error = "Please select a file.", errorInfo);
    			return;
    		}

    		$$invalidate(2, showLoading = true);
    		$$invalidate(3, errorInfo.show = false, errorInfo);
    		let reader = new FileReader();

    		reader.onload = event => {
    			$$invalidate(4, valiImg.src = event.target.result, valiImg);
    		};

    		reader.readAsDataURL(files[0]);
    	};

    	const errorCallback = () => {
    		$$invalidate(2, showLoading = false);
    		$$invalidate(3, errorInfo.show = true, errorInfo);
    		$$invalidate(3, errorInfo.error = "Not a valid image file.", errorInfo);
    	};

    	const loadCallback = () => {
    		// Test if we can draw to canvas (CORS check)
    		let canvas = document.createElement("canvas");

    		let context = canvas.getContext("2d");
    		canvas.width = valiImg.width;
    		canvas.height = valiImg.height;
    		context.drawImage(valiImg, 0, 0);

    		try {
    			context.getImageData(0, 0, valiImg.width, valiImg.height);

    			// Success - dispatch the image
    			$$invalidate(2, showLoading = false);

    			dispatch('imageUploaded', { url: valiImg.src });
    			resetState();
    		} catch(err) {
    			$$invalidate(2, showLoading = false);
    			$$invalidate(3, errorInfo.show = true, errorInfo);
    			$$invalidate(3, errorInfo.error = "Error processing the image.", errorInfo);
    		}
    	};

    	function input_change_handler() {
    		files = this.files;
    		$$invalidate(1, files);
    	}

    	function img_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			valiImg = $$value;
    			$$invalidate(4, valiImg);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('show' in $$props) $$invalidate(0, show = $$props.show);
    	};

    	return [
    		show,
    		files,
    		showLoading,
    		errorInfo,
    		valiImg,
    		closeModal,
    		handleKeydown,
    		handleFileUpload,
    		errorCallback,
    		loadCallback,
    		input_change_handler,
    		img_binding
    	];
    }

    class ImageUploader extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, { show: 0 });
    	}
    }

    /* src\overview\Loss.svelte generated by Svelte v3.59.2 */

    function create_fragment$e(ctx) {
    	let svg_1;

    	return {
    		c() {
    			svg_1 = svg_element("svg");
    			attr(svg_1, "id", "loss-chart");
    			attr(svg_1, "aria-label", "Training loss, cross entropy loss and consistency loss over epochs");
    			attr(svg_1, "class", "svelte-1c0ocm");
    		},
    		m(target, anchor) {
    			insert(target, svg_1, anchor);
    			/*svg_1_binding*/ ctx[7](svg_1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(svg_1);
    			/*svg_1_binding*/ ctx[7](null);
    		}
    	};
    }

    function instance$e($$self, $$props, $$invalidate) {
    	let allData;
    	let $lossData;
    	component_subscribe($$self, lossData, $$value => $$invalidate(6, $lossData = $$value));
    	let { epoch = 0 } = $$props;
    	let { showTitle = true } = $$props;
    	let svgContainer;
    	let tooltip;
    	let svg, g, xScale, yScale, lineGenerator, areaGenerator;
    	let isInitialized = false;
    	let previousData = null;

    	// 当前高亮的折线，null 表示全部恢复默认状态
    	let selectedLossKey = null;

    	function initializeChart() {
    		let width = 0, height = 0;
    		let innerWidth = 0, innerHeight = 0;
    		const margin = { top: 40, right: 18, bottom: 40, left: 45 };

    		const lines = [
    			{
    				key: "loss",
    				label: "Total Loss",
    				color: "#08306b"
    			},
    			{
    				key: "loss_x",
    				label: "Cross Entropy Loss (Labeled image)",
    				color: "#2171b5"
    			},
    			{
    				key: "loss_u",
    				label: "Consistency Loss (Unlabeled image)",
    				color: "#6baed6"
    			}
    		];

    		if (!svgContainer || allData.length === 0) return;
    		const lossArea = svgContainer;
    		if (!lossArea) return;
    		const rect = lossArea.getBoundingClientRect();
    		width = rect.width;
    		height = rect.height;
    		innerWidth = width - margin.left - margin.right;
    		innerHeight = height - margin.top - margin.bottom;
    		if (innerWidth <= 0 || innerHeight <= 0) return;

    		// 初始化时恢复默认状态
    		selectedLossKey = null;

    		// ---------------- Scales ----------------
    		const lastEpoch = d3$1.max(allData, d => d.epoch) || 1;

    		xScale = d3$1.scaleLinear().domain([0, lastEpoch]).range([0, innerWidth]);
    		const yMax = d3$1.max(allData.flatMap(d => [d.loss, d.loss_x, d.loss_u])) || 1;
    		yScale = d3$1.scaleLinear().domain([0, yMax]).range([innerHeight, 0]);

    		// ---------------- Generators ----------------
    		lineGenerator = d3$1.line().x(d => xScale(d.epoch)).y(d => yScale(d.value)).defined(d => d.value != null).curve(d3$1.curveMonotoneX);

    		areaGenerator = d3$1.area().x(d => xScale(d.epoch)).y0(innerHeight).y1(d => yScale(d.value)).curve(d3$1.curveMonotoneX);

    		// ---------------- SVG ----------------
    		svg = d3$1.select(svgContainer).attr("width", "100%").attr("height", "100%");

    		// 避免重复初始化时图表元素叠加
    		svg.selectAll(".loss-chart-root").remove();

    		g = svg.append("g").attr("class", "loss-chart-root").attr("transform", `translate(${margin.left}, ${margin.top})`);

    		// ---------------- Title ----------------
    		if (showTitle) {
    			g.append("text").attr("class", "chart-title").attr("x", innerWidth / 2).attr("y", -margin.top / 2).attr("text-anchor", "middle").attr("font-size", "12px").attr("font-weight", "bold").text("Training Loss over Epochs");
    		}

    		// ---------------- X Axis ----------------
    		const xAxisGrid = d3$1.axisBottom(xScale).tickValues(d3$1.range(0, lastEpoch, 45).concat([lastEpoch])).tickSize(4).tickPadding(2);

    		const xAxisGroup = g.append("g").attr("class", "x-axis chart-axis").attr("transform", `translate(0, ${innerHeight})`).call(xAxisGrid);
    		xAxisGroup.selectAll(".tick text").attr("y", 5);
    		xAxisGroup.append("text").attr("class", "axis-title").attr("x", innerWidth / 2).attr("y", 33).attr("text-anchor", "middle").attr("fill", "black").text("Epochs");

    		// ---------------- Y Axis ----------------
    		const yAxisGrid = d3$1.axisLeft(yScale).tickValues([...new Set(d3$1.range(0, yMax + 0.001, 0.5).concat([yMax]))]).tickFormat(d3$1.format(".1f")).tickSize(4).tickPadding(2);

    		const yAxisGroup = g.append("g").attr("class", "y-axis chart-axis").call(yAxisGrid);
    		yAxisGroup.selectAll(".tick text").attr("x", -4);
    		yAxisGroup.append("text").attr("class", "axis-title").attr("transform", "rotate(-90)").attr("x", -innerHeight / 2).attr("y", -28).attr("text-anchor", "middle").attr("fill", "black").text("Loss Value");

    		// ==================================================
    		// 创建折线和面积
    		// ==================================================
    		lines.forEach(lineInfo => {
    			// Area
    			g.append("path").attr("class", `area area-${lineInfo.key} loss-series-area`).attr("data-key", lineInfo.key).attr("fill", lineInfo.color).attr("opacity", 0.05).style("pointer-events", "none");

    			// Line
    			g.append("path").attr("class", `line line-${lineInfo.key} loss-series-line`).attr("data-key", lineInfo.key).attr("fill", "none").attr("stroke", lineInfo.color).attr("stroke-width", 1.6).attr("stroke-opacity", 1).style("pointer-events", "none");
    		});

    		// ==================================================
    		// 折线高亮状态更新函数
    		// ==================================================
    		function updateLossHighlight() {
    			const hasSelection = selectedLossKey !== null;

    			// ---------------- Lines ----------------
    			g.selectAll(".loss-series-line").interrupt().attr("stroke-width", function () {
    				const key = d3$1.select(this).attr("data-key");

    				// 未选中任何图例：恢复原始宽度
    				if (!hasSelection) {
    					return 1.6;
    				}

    				// 被选中的折线加粗
    				return key === selectedLossKey ? 2.8 : 1.6;
    			}).attr("stroke-opacity", function () {
    				const key = d3$1.select(this).attr("data-key");

    				// 未选中：所有折线恢复完全显示
    				if (!hasSelection) {
    					return 1;
    				}

    				// 被选中的折线保持完全显示
    				// 其他折线降低透明度
    				return key === selectedLossKey ? 1 : 0.12;
    			});

    			// ---------------- Areas ----------------
    			g.selectAll(".loss-series-area").interrupt().attr("opacity", function () {
    				const key = d3$1.select(this).attr("data-key");

    				// 未选中：恢复原始面积透明度
    				if (!hasSelection) {
    					return 0.05;
    				}

    				// 高亮选中的面积
    				return key === selectedLossKey ? 0.15 : 0.01;
    			});

    			// ---------------- Legend ----------------
    			g.selectAll(".loss-legend-item").each(function () {
    				const item = d3$1.select(this);
    				const key = item.attr("data-key");
    				const isSelected = selectedLossKey === key;

    				// 图例色块透明度
    				item.select(".loss-legend-marker").attr("opacity", !hasSelection || isSelected ? 1 : 0.3);

    				// 图例文字透明度
    				item.select(".legend-label").attr("opacity", !hasSelection || isSelected ? 1 : 0.35).attr("font-weight", isSelected ? "bold" : "normal");
    			});
    		}

    		// ==================================================
    		// Tooltip
    		// ==================================================
    		if (!tooltip) {
    			tooltip = d3$1.select("body").append("div").attr("class", "tooltip-loss").style("position", "absolute").style("pointer-events", "none").style("color", "white").style("background", "rgba(0,0,0,0.7)").style("padding", "6px 10px").style("border-radius", "6px").style("font-size", "15px").style("display", "none").style("z-index", 9999);
    		}

    		// ==================================================
    		// Hover Line
    		// ==================================================
    		const hoverLine = g.append("line").attr("class", "loss-hover-line").attr("stroke", "black").attr("stroke-width", 1).attr("stroke-dasharray", "4 4").attr("y1", 0).attr("y2", innerHeight).style("display", "none").style("pointer-events", "none");

    		// ==================================================
    		// 透明层捕获鼠标
    		// ==================================================
    		g.append("rect").attr("class", "loss-hover-overlay").attr("width", innerWidth).attr("height", innerHeight).attr("fill", "none").attr("pointer-events", "all").on("mousemove", event => {
    			const [mx] = d3$1.pointer(event);
    			const x0 = xScale.invert(mx);
    			const bisect = d3$1.bisector(d => d.epoch).left;
    			const i = bisect(allData, x0);
    			const d0 = allData[i - 1] || allData[0];
    			const d1 = allData[i] || allData[allData.length - 1];
    			const dClosest = x0 - d0.epoch > d1.epoch - x0 ? d1 : d0;
    			const xPos = xScale(dClosest.epoch);

    			// ---------------- Hover Line ----------------
    			hoverLine.attr("x1", xPos).attr("x2", xPos).style("display", "block");

    			// ---------------- Container Boundary ----------------
    			const containerRect = lossArea.getBoundingClientRect();

    			// 先更新内容，以便正确获取 tooltip 尺寸
    			tooltip.html(`
                <div>
                    Epoch:
                    <strong style="color:white;">
                        ${dClosest.epoch}
                    </strong>
                </div>

                <div>
                    Total Loss:
                    <strong style="color:white;">
                        ${Number(dClosest.loss).toFixed(4)}
                    </strong>
                </div>

                <div>
                    Cross Entropy Loss:
                    <strong style="color:white;">
                        ${Number(dClosest.loss_x).toFixed(4)}
                    </strong>
                </div>

                <div>
                    Consistency Loss:
                    <strong style="color:white;">
                        ${Number(dClosest.loss_u).toFixed(4)}
                    </strong>
                </div>
            `).style("display", "block");

    			// ---------------- Tooltip Size ----------------
    			const tooltipNode = tooltip.node();

    			const tooltipWidth = tooltipNode.offsetWidth || 180;
    			const tooltipHeight = tooltipNode.offsetHeight || 100;

    			// ---------------- Tooltip Position ----------------
    			let left = event.clientX + 10;

    			let top = event.clientY - 28;

    			// 右边界
    			if (left + tooltipWidth > containerRect.right) {
    				left = event.clientX - tooltipWidth - 10;
    			}

    			// 左边界
    			if (left < containerRect.left) {
    				left = containerRect.left;
    			}

    			// 下边界
    			if (top + tooltipHeight > containerRect.bottom) {
    				top = containerRect.bottom - tooltipHeight;
    			}

    			// 上边界
    			if (top < containerRect.top) {
    				top = containerRect.top;
    			}

    			tooltip.style("left", left + window.scrollX + "px").style("top", top + window.scrollY + "px");
    		}).on("mouseout", () => {
    			tooltip.style("display", "none");
    			hoverLine.style("display", "none");
    		});

    		// ==================================================
    		// 图例
    		// 放在透明鼠标捕获层之后，保证图例可以正常点击
    		// ==================================================
    		const legend = g.append("g").attr("class", "chart-legend loss-legend").attr("transform", `translate(${30}, ${-2})`);

    		lines.forEach((lineInfo, i) => {
    			const item = legend.append("g").attr("class", "loss-legend-item").attr("data-key", lineInfo.key).attr("transform", `translate(${i === 0 ? 0 : i === 1 ? 90 : 240}, 0)`).style("cursor", "pointer");

    			// ---------------- 图例点击事件 ----------------
    			item.on("click", function (event) {
    				event.stopPropagation();

    				// 第一次点击当前图例：选中对应折线
    				// 再次点击同一图例：取消选中，恢复全部折线
    				// 点击其他图例：切换高亮对象
    				selectedLossKey = selectedLossKey === lineInfo.key ? null : lineInfo.key;

    				// 更新所有折线、面积及图例状态
    				updateLossHighlight();
    			});

    			// ---------------- 图例颜色标记 ----------------
    			item.append("rect").attr("class", "loss-legend-marker").attr("width", 15).attr("height", 6).attr("fill", lineInfo.color);

    			// ---------------- 图例文字 ----------------
    			item.append("text").attr("class", "legend-label").attr("x", 18).attr("y", i === 0 ? -2 : 0).attr("font-size", "8px").attr("alignment-baseline", "hanging").each(function () {
    				const text = lineInfo.label;
    				const regex = /(.*)\((.*)\)/;
    				const match = text.match(regex);
    				const textEl = d3$1.select(this);

    				if (match) {
    					// 第一行：括号外文字
    					textEl.append("tspan").text(match[1].trim()).attr("x", 18).attr("dy", "0em");

    					// 第二行：括号内文字
    					textEl.append("tspan").text(`(${match[2].trim()})`).attr("x", 18).attr("dy", "1em");
    				} else {
    					textEl.text(text);
    				}
    			});

    			// ---------------- 扩大图例点击范围 ----------------
    			// 在当前图例内添加透明区域，
    			// 让色块和文字周围的空白处也可以点击。
    			item.insert("rect", ":first-child").attr("class", "loss-legend-hitbox").attr("x", -4).attr("y", -6).attr("width", i === 0 ? 85 : i === 1 ? 145 : 175).attr("height", 27).attr("fill", "transparent").style("pointer-events", "all");
    		});

    		// 初始化全部折线的显示状态
    		updateLossHighlight();
    	}

    	// ======================================================
    	// Update Chart
    	// ======================================================
    	function updateChart(currentEpoch) {
    		if (!g || !allData.length) return;
    		const filteredData = allData.filter(d => d.epoch <= currentEpoch);
    		if (filteredData.length === 0) return;

    		const lines = [
    			{
    				key: "loss",
    				label: "Total Loss",
    				color: "#08306b"
    			},
    			{
    				key: "loss_x",
    				label: "Cross Entropy Loss (Labeled image)",
    				color: "#2171b5"
    			},
    			{
    				key: "loss_u",
    				label: "Consistency Loss (Unlabeled image)",
    				color: "#6baed6"
    			}
    		];

    		// ---------------- Update Lines and Areas ----------------
    		lines.forEach(lineInfo => {
    			const points = filteredData.map(d => ({ epoch: d.epoch, value: d[lineInfo.key] }));

    			// 更新面积路径
    			g.select(`.area-${lineInfo.key}`).datum(points).attr("d", areaGenerator);

    			// 更新折线路径
    			g.select(`.line-${lineInfo.key}`).datum(points).attr("d", lineGenerator);
    		});
    	} // 折线和面积路径更新不会改变其高亮样式，
    	// 因此切换 Epoch 时保留当前图例的选中状态。

    	onDestroy(() => {
    		if (tooltip) tooltip.remove();
    	});

    	function svg_1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			svgContainer = $$value;
    			$$invalidate(0, svgContainer);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('epoch' in $$props) $$invalidate(1, epoch = $$props.epoch);
    		if ('showTitle' in $$props) $$invalidate(2, showTitle = $$props.showTitle);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$lossData*/ 64) {
    			 $$invalidate(5, allData = $lossData);
    		}

    		if ($$self.$$.dirty & /*allData, svgContainer, previousData, isInitialized, epoch*/ 59) {
    			// Watch for epoch changes and update incrementally
    			 if (allData.length > 0 && svgContainer) {
    				if (allData !== previousData) {
    					$$invalidate(3, isInitialized = false);
    					$$invalidate(4, previousData = allData);
    				}

    				if (!isInitialized) {
    					initializeChart();
    					$$invalidate(3, isInitialized = true);
    				}

    				updateChart(epoch);
    			}
    		}
    	};

    	return [
    		svgContainer,
    		epoch,
    		showTitle,
    		isInitialized,
    		previousData,
    		allData,
    		$lossData,
    		svg_1_binding
    	];
    }

    class Loss extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, { epoch: 1, showTitle: 2 });
    	}
    }

    /* src\overview\LossPopup.svelte generated by Svelte v3.59.2 */

    function create_fragment$f(ctx) {
    	let div1;
    	let button0;
    	let t0;
    	let section;
    	let header;
    	let h2;
    	let t2;
    	let button1;
    	let t4;
    	let div0;
    	let loss;
    	let current;
    	let mounted;
    	let dispose;

    	loss = new Loss({
    			props: {
    				epoch: /*$lastEpochStore*/ ctx[2],
    				showTitle: false
    			}
    		});

    	return {
    		c() {
    			div1 = element("div");
    			button0 = element("button");
    			t0 = space();
    			section = element("section");
    			header = element("header");
    			h2 = element("h2");
    			h2.textContent = "Training Loss over Epochs";
    			t2 = space();
    			button1 = element("button");
    			button1.textContent = "×";
    			t4 = space();
    			div0 = element("div");
    			create_component(loss.$$.fragment);
    			attr(button0, "type", "button");
    			attr(button0, "class", "loss-backdrop svelte-1w774z2");
    			attr(button0, "tabindex", "-1");
    			attr(button0, "aria-label", "Close loss chart");
    			attr(h2, "id", "loss-popup-title");
    			attr(h2, "class", "svelte-1w774z2");
    			attr(button1, "type", "button");
    			attr(button1, "class", "loss-close svelte-1w774z2");
    			attr(button1, "aria-label", "Close loss chart");
    			attr(header, "class", "svelte-1w774z2");
    			attr(div0, "class", "loss-chart-container svelte-1w774z2");
    			attr(section, "class", "loss-dialog svelte-1w774z2");
    			attr(section, "role", "dialog");
    			attr(section, "aria-modal", "true");
    			attr(section, "aria-labelledby", "loss-popup-title");
    			attr(div1, "class", "loss-modal svelte-1w774z2");
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, button0);
    			append(div1, t0);
    			append(div1, section);
    			append(section, header);
    			append(header, h2);
    			append(header, t2);
    			append(header, button1);
    			/*button1_binding*/ ctx[5](button1);
    			append(section, t4);
    			append(section, div0);
    			mount_component(loss, div0, null);
    			/*section_binding*/ ctx[6](section);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(window, "keydown", /*handleKeydown*/ ctx[4]),
    					listen(button0, "click", /*close*/ ctx[3]),
    					listen(button1, "click", /*close*/ ctx[3])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			const loss_changes = {};
    			if (dirty & /*$lastEpochStore*/ 4) loss_changes.epoch = /*$lastEpochStore*/ ctx[2];
    			loss.$set(loss_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(loss.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(loss.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div1);
    			/*button1_binding*/ ctx[5](null);
    			destroy_component(loss);
    			/*section_binding*/ ctx[6](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$f($$self, $$props, $$invalidate) {
    	let $lastEpochStore;
    	component_subscribe($$self, lastEpochStore, $$value => $$invalidate(2, $lastEpochStore = $$value));
    	const dispatch = createEventDispatcher();
    	let dialog;
    	let closeButton;
    	const close = () => dispatch("close");

    	function handleKeydown(event) {
    		if (event.key === "Escape") {
    			event.preventDefault();
    			event.stopPropagation();
    			close();
    		} else if (event.key === "Tab") {
    			const controls = [...dialog.querySelectorAll('button, [tabindex="0"]')];
    			const first = controls[0];
    			const last = controls[controls.length - 1];

    			if (event.shiftKey && document.activeElement === first) {
    				event.preventDefault();
    				last.focus();
    			} else if (!event.shiftKey && document.activeElement === last) {
    				event.preventDefault();
    				first.focus();
    			}
    		}
    	}

    	onMount(() => {
    		const previousFocus = document.activeElement;
    		closeButton.focus();

    		return () => {
    			if (previousFocus?.isConnected) previousFocus.focus();
    		};
    	});

    	function button1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			closeButton = $$value;
    			$$invalidate(1, closeButton);
    		});
    	}

    	function section_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			dialog = $$value;
    			$$invalidate(0, dialog);
    		});
    	}

    	return [
    		dialog,
    		closeButton,
    		$lastEpochStore,
    		close,
    		handleKeydown,
    		button1_binding,
    		section_binding
    	];
    }

    class LossPopup extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$f, create_fragment$f, safe_not_equal, {});
    	}
    }

    // Reflow SVG geometry when its actual layout column changes, not just when
    // the dataset or selected epoch changes. Ignore subpixel jitter and hidden
    // containers to avoid repeated rebuilds and zero-sized chart scales.
    function observeChartSize(node, onResize) {
      let width = 0;
      let height = 0;
      let destroyed = false;
      const measure = () => {
        if (destroyed) return;
        const rect = node.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        if (Math.abs(rect.width - width) <= 0.5 && Math.abs(rect.height - height) <= 0.5) return;
        width = rect.width;
        height = rect.height;
        onResize({ width, height });
      };
      const observer = new ResizeObserver(measure);
      observer.observe(node);
      measure();
      return {
        destroy() {
          destroyed = true;
          observer.disconnect();
        },
      };
    }

    // Pack measured labels/controls into rows without changing their typography.
    function packChartRows(widths, availableWidth, gap = 8) {
      let row = 0;
      let x = 0;
      const items = widths.map(width => {
        if (x > 0 && x + width > availableWidth) { row++; x = 0; }
        const item = { x, row, width };
        x += width + gap;
        return item;
      });
      return { items, rows: items.length ? row + 1 : 0 };
    }

    /* src\overview\AccuracyLine.svelte generated by Svelte v3.59.2 */

    function create_fragment$g(ctx) {
    	let div;
    	let h2;
    	let t1;
    	let svg_1;
    	let svg_1_data_configuration_value;
    	let observeChartSize_action;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div = element("div");
    			h2 = element("h2");
    			h2.textContent = "Overall Accuracy over Epochs";
    			t1 = space();
    			svg_1 = svg_element("svg");
    			attr(h2, "class", "metric-view-title metric-overlay-title");

    			attr(svg_1, "data-configuration", svg_1_data_configuration_value = /*$selectedWeightConfigurationStore*/ ctx[1]
    			? /*$selectedWeightConfigurationStore*/ ctx[1].id
    			: '');

    			attr(svg_1, "class", "svelte-8p8ck1");
    			attr(div, "class", "accuracy-container svelte-8p8ck1");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, h2);
    			append(div, t1);
    			append(div, svg_1);
    			/*svg_1_binding*/ ctx[13](svg_1);

    			if (!mounted) {
    				dispose = action_destroyer(observeChartSize_action = observeChartSize.call(null, div, /*resizeChart*/ ctx[2]));
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*$selectedWeightConfigurationStore*/ 2 && svg_1_data_configuration_value !== (svg_1_data_configuration_value = /*$selectedWeightConfigurationStore*/ ctx[1]
    			? /*$selectedWeightConfigurationStore*/ ctx[1].id
    			: '')) {
    				attr(svg_1, "data-configuration", svg_1_data_configuration_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			/*svg_1_binding*/ ctx[13](null);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    const categoryDetailOffsetY = 5;
    const buttonHeight = 24;
    const numClasses = 10;

    function instance$g($$self, $$props, $$invalidate) {
    	let classNames;
    	let $classNamesStore;
    	let $accuracyData;
    	let $selectedWeightConfigurationStore;
    	component_subscribe($$self, classNamesStore, $$value => $$invalidate(11, $classNamesStore = $$value));
    	component_subscribe($$self, accuracyData, $$value => $$invalidate(12, $accuracyData = $$value));
    	component_subscribe($$self, selectedWeightConfigurationStore, $$value => $$invalidate(1, $selectedWeightConfigurationStore = $$value));
    	let allData = [];
    	let { epoch = 0 } = $$props;
    	let svgContainer;
    	let chartWidth = 0;
    	let chartHeight = 0;
    	let renderedWidth = 0;
    	let renderedHeight = 0;

    	function resizeChart(size) {
    		$$invalidate(5, chartWidth = size.width);
    		$$invalidate(6, chartHeight = size.height);
    	}

    	// Chart 1 variables (Overall Accuracy)
    	let svg, g1, xScale1, yScale1, lineGen1;

    	let innerWidth1,
    		overallPlotHeight,
    		margin1 = { top: 50, right: 25, bottom: 30, left: 45 };

    	// Chart 2 variables (Category Accuracy)
    	let g2, xScale2, yScale2;

    	let innerHeight2,
    		innerWidth2,
    		margin2 = { top: 280, right: 25, bottom: 5, left: 55 };

    	let selectedClass = 0;
    	let classControlLayout;
    	let categoryTitleY = -80;
    	let isInitialized = false;

    	const colorCatrgery = [
    		"#a6cee3",
    		"#1f78b4",
    		"#b2df8a",
    		"#33a02c",
    		"#fb9a99",
    		"#e31a1c",
    		"#fdbf6f",
    		"#ff7f00",
    		"#cab2d6",
    		"#6a3d9a"
    	];

    	let prevDataRef = null;

    	function clearSvg() {
    		if (!svgContainer) return;
    		d3$1.select(svgContainer).selectAll("*").remove();
    		g1 = null;
    		g2 = null;
    		$$invalidate(9, isInitialized = false);
    	}

    	function initialize() {
    		const accuracyArea = document.getElementById("accuracy-area");
    		if (!accuracyArea) return;
    		const width = chartWidth;
    		const height = chartHeight;

    		// A wrapped heading gets its own space; it never covers the plot.
    		const title = accuracyArea.querySelector('.metric-view-title');

    		margin1.top = Math.max(50, (title ? title.offsetHeight : 24) + 24);

    		// Anchor the category chart to the bottom edge and let the upper plot
    		// use the remaining height.  This removes the large empty lower band
    		// that appeared on a 4K viewport while retaining a clear separation.
    		margin2 = {
    			...margin2,
    			top: Math.max(230, height - 18)
    		};

    		innerWidth1 = width - margin1.left - margin1.right;
    		innerWidth2 = width - margin2.left - margin2.right;
    		innerHeight2 = height - margin2.top - margin2.bottom;
    		svg = d3$1.select(svgContainer).attr("width", width).attr("height", height);
    		prepareClassControls();

    		// Initialize Chart 1 - Overall Accuracy
    		initializeChart1(width, height);

    		// Initialize Chart 2 - Category Accuracy
    		initializeChart2();
    	}

    	function initializeChart1(width, height) {
    		// Measure and wrap the original 13px legend before allocating the
    		// plot. A narrower accuracy column must not clip its class names.
    		const legend = svg.append("g").attr("class", "legend chart-legend accuracy-legend");

    		const legendItemSize = 8, legendSpacing = 4, legendItemGap = 10;
    		const legendItems = [];
    		const legendWidths = [];

    		classNames.forEach((cls, i) => {
    			const legendItem = legend.append("g").attr("class", "accuracy-legend-item");
    			legendItem.append("rect").attr("width", legendItemSize).attr("height", legendItemSize).attr("fill", colorCatrgery[i]).attr("rx", 2).attr("ry", 2);
    			const legendText = legendItem.append("text").attr("class", "legend-label").attr("x", legendItemSize + legendSpacing).attr("y", legendItemSize / 2).attr("alignment-baseline", "middle").attr("font-size", "13px").text(cls);
    			legendItems.push(legendItem);
    			legendWidths.push(legendItemSize + legendSpacing + legendText.node().getComputedTextLength());
    		});

    		// All ten classes share the first legend row, aligned to the right.
    		const legendWidth = d3$1.sum(legendWidths) + legendItemGap * (numClasses - 1);

    		const legendLeft = width - margin1.right - legendWidth;

    		const legendTop = legendLeft > titleTextWidth() + 24
    		? 14
    		: margin1.top - 10;

    		legend.attr("transform", `translate(${legendLeft}, ${legendTop})`);
    		legendItems.forEach((item, index) => item.attr("transform", `translate(${d3$1.sum(legendWidths.slice(0, index)) + index * legendItemGap}, 0)`));

    		// Reserve the full selected-epoch rose above a high-accuracy point.
    		margin1.top = Math.max(margin1.top, legendTop + 30, 58);

    		svg.attr("height", height).style("height", `${height}px`);
    		overallPlotHeight = Math.max(40, margin2.top + categoryTitleY - margin1.top - 42);
    		g1 = svg.append("g").attr("class", "accuracy-epoch-group").attr("transform", `translate(${margin1.left},${margin1.top})`);
    		g1.append("text").attr("class", "axis-title").attr("x", innerWidth1 / 2).attr("y", overallPlotHeight + 26).attr("text-anchor", "middle").attr("font-size", "10px").text("Epochs");
    		g1.append("text").attr("class", "axis-title").attr("transform", "rotate(-90)").attr("x", -overallPlotHeight / 2).attr("y", -28).attr("font-size", "10px").attr("text-anchor", "middle").text("Accuracy");
    		const lastEpoch = d3$1.max(allData, d => d.epoch) || 1;
    		xScale1 = d3$1.scaleLinear().domain([0, lastEpoch]).range([0, innerWidth1]);
    		yScale1 = d3$1.scaleLinear().domain([d3$1.min(allData, d => d.accuracy), d3$1.max(allData, d => d.accuracy)]).range([overallPlotHeight, 0]);
    		lineGen1 = d3$1.line().x(d => xScale1(d.epoch)).y(d => yScale1(d.accuracy)).curve(d3$1.curveMonotoneX);

    		// Axes
    		g1.append("g").attr("class", "x-axis chart-axis").attr("transform", `translate(0, ${overallPlotHeight})`).call(d3$1.axisBottom(xScale1).tickValues(d3$1.range(0, lastEpoch, 45).concat([lastEpoch])).tickSize(3));

    		g1.append("g").attr("class", "y-axis chart-axis").call(d3$1.axisLeft(yScale1).ticks(Math.max(3, Math.floor(overallPlotHeight / 28))).tickFormat(d3$1.format('.1f')).tickSize(3).tickSizeOuter(0));

    		// Separate tick labels from the axis titles without changing their
    		// typography.  The x ticks move upward and the y ticks move closer
    		// to their axis line, creating clean title gutters.
    		g1.select(".x-axis").selectAll(".tick text").attr("y", 6);

    		g1.select(".y-axis").selectAll(".tick text").attr("x", -4);

    		// Initialize empty line path
    		g1.append("path").attr("class", "accuracy-line").attr("fill", "none").attr("stroke", "#39A47B").attr("stroke-width", 2);

    		// --- 节点 ---
    		const nodeRadius = 1;

    		const nodes = g1.selectAll(".node").data(allData).enter().append("circle").attr("class", "node").attr("cx", d => xScale1(d.epoch)).attr("cy", d => yScale1(d.accuracy)).attr("r", nodeRadius).attr("fill", "white").attr("stroke", "#39A47B").style("cursor", "pointer");

    		// --- 创建 tooltip ---
    		let tooltip = d3$1.select("body").append("div").attr("class", "tooltip-accuracy").style("position", "absolute").style("pointer-events", "none").style("background", "rgba(0,0,0,0.7)").style("color", "white").style("padding", "4px 8px").style("border-radius", "4px").style("font-size", "14px").style("display", "none");

    		// --- 鼠标悬停交互 ---
    		nodes.on("mouseover", function (event, d) {
    			const node = d3$1.select(this);
    			const cx = xScale1(d.epoch);
    			const cy = yScale1(d.accuracy);

    			// 节点放大
    			node.transition().duration(100).attr("r", 4).attr("opacity", 1).attr("stroke", "#E18E6D").attr("fill", "#E18E6D");

    			// ===== tooltip 尺寸（用于判断翻转）=====
    			const tooltipNode = tooltip.node();

    			const tooltipWidth = tooltipNode.offsetWidth || 120;

    			// ===== 关键：使用 pageX，但用 width 做边界判断 =====
    			let left = event.pageX + 10;

    			let top = event.pageY - 28;

    			// ===== 自动左右翻转（核心逻辑）=====
    			if (left + tooltipWidth > width) {
    				left = event.pageX - tooltipWidth + 20; // 放到左侧
    			}

    			if (left < 0) {
    				left = 0;
    			}

    			// ===== 显示 tooltip =====
    			tooltip.style("display", "block").style("left", left + "px").style("top", top + "px").html(`
                <div>Epoch: <strong style="color:white;">${d.epoch}</strong></div>
                <div>Accuracy: <strong style="color:white;">${(d.accuracy * 100).toFixed(2)}%</strong></div>
            `);

    			// 添加垂直虚线
    			g1.append("line").attr("class", "hover-vline").style("pointer-events", "none").attr("x1", cx).attr("x2", cx).attr("y1", cy).attr("y2", overallPlotHeight).attr("stroke", "black").attr("stroke-width", 2).attr("stroke-dasharray", "4 4").attr("opacity", 0.7);
    		}).on("mouseout", function (event, d) {
    			const node = d3$1.select(this);

    			// 恢复节点大小
    			node.transition().duration(100).attr("r", nodeRadius).attr("fill", "white").attr("fill", "white").attr("stroke", "#39A47B").style("cursor", "pointer");

    			// 隐藏 tooltip
    			tooltip.style("display", "none");

    			// 删除虚线
    			g1.selectAll(".hover-vline").remove();
    		});

    		// --- 管理选中的节点 ---
    		const selected = new Set();

    		// --- 点击事件 ---
    		nodes.on("click", function (event, d) {
    			const key = d.epoch;

    			// 已选中 → 取消
    			if (selected.has(key)) {
    				selected.delete(key);
    				g1.selectAll(`.rose-${key}`).remove();
    				g1.selectAll(`.vline-${key}`).remove(); // 删除虚线
    				g1.selectAll(`.label-${key}`).remove();
    				d3$1.select(this).attr("fill", "white").attr("stroke", "#39A47B");
    				return;
    			}

    			// 新选中
    			selected.add(key);

    			d3$1.select(this).attr("fill", "#E18E6D").attr("stroke", "#E18E6D");
    			const cx = xScale1(d.epoch);
    			const cy = yScale1(d.accuracy);
    			const roseRadius = Math.min(20, overallPlotHeight / 4);

    			// --- 添加垂直虚线 ---
    			g1.append("line").attr("class", `vline-${key} accuracy-selection-line`).style("pointer-events", "none").attr("x1", cx).attr("x2", cx).attr("y1", cy).attr("y2", overallPlotHeight).attr("stroke", "black").attr("stroke-width", 2).attr("stroke-dasharray", "4 4").attr("opacity", 0.7);

    			// --- 添加 accuracy 数值标签 ---
    			const accuracyText = (d.accuracy * 100).toFixed(2) + "%";

    			const labelPadding = 4;
    			let labelY = overallPlotHeight - 18;

    			if (Math.abs(labelY - cy) < roseRadius + 13) {
    				labelY = cy - roseRadius - 16;
    			}

    			labelY = Math.max(14, labelY);
    			const label = g1.append("g").attr("class", `label-${key} accuracy-selection-label`).style("pointer-events", "none").attr("transform", `translate(${cx}, ${labelY})`);
    			const text = label.append("text").text(accuracyText).attr("text-anchor", "middle").attr("alignment-baseline", "middle").attr("fill", "black").attr("font-size", "12px").attr("font-weight", "bold");
    			const bbox = text.node().getBBox();

    			const labelX = key === 299
    			? cx
    			: Math.max(bbox.width / 2 + 3, Math.min(innerWidth1 - bbox.width / 2 - 3, cx));

    			label.attr('transform', `translate(${labelX}, ${labelY})`);
    			label.insert("rect", "text").attr("x", bbox.x - labelPadding / 2).attr("y", bbox.y - labelPadding / 2).attr("width", bbox.width + labelPadding).attr("height", bbox.height + labelPadding).attr("rx", 4).attr("ry", 4).attr("fill", "#d9d9d9");

    			// --- 绘制玫瑰图 ---
    			const roseGap = 2;

    			const gapAngle = 0.1; // 每个扇区之间的间隔，单位是弧度，越大间距越大
    			const arc = d3$1.arc().innerRadius(5).outerRadius(a => a.value * roseRadius - roseGap).startAngle(a => a.index * (2 * Math.PI / numClasses) + gapAngle / 2).endAngle(a => (a.index + 1) * (2 * Math.PI / numClasses) - gapAngle / 2);
    			const roseGroup = g1.append("g").attr("class", `rose-${key} accuracy-selection-rose`).style("pointer-events", "none").attr("transform", `translate(${cx}, ${cy})`);
    			roseGroup.selectAll("path").data(d.classAccuracies.map((v, i) => ({ value: v, index: i }))).enter().append("path").attr("d", arc).attr("fill", (d, i) => colorCatrgery[i]).attr("opacity", 0.8);

    			// 外圈
    			roseGroup.append("circle").attr("r", roseRadius).attr("fill", "none").attr("stroke", "gray").attr("stroke-width", 1).attr("opacity", 0.5);
    		});
    	}

    	function prepareClassControls() {
    		const measure = svg.append("g").attr("visibility", "hidden");

    		const buttonWidths = classNames.map(name => {
    			const text = measure.append("text").attr("class", "chart-control-label").text(name);
    			return Math.max(35, Math.ceil(text.node().getComputedTextLength() + 24));
    		});

    		const titleWidth = Math.max(...classNames.map(name => {
    			const text = measure.append("text").attr("class", "category-title chart-title").attr("font-size", "12px").attr("font-weight", "bold").text(`Accuracy for ${name}`);
    			return text.node().getComputedTextLength();
    		}));

    		measure.remove();
    		const totalWidth = d3$1.sum(buttonWidths) + 8 * (numClasses - 1);
    		const inline = titleWidth + 16 + totalWidth <= innerWidth2;
    		const packed = packChartRows(buttonWidths, innerWidth2, 8);
    		const controlsHeight = packed.rows * buttonHeight + (packed.rows - 1) * 6;

    		classControlLayout = {
    			widths: buttonWidths,
    			items: inline
    			? buttonWidths.map((width, index) => ({
    					x: titleWidth + 16 + d3$1.sum(buttonWidths.slice(0, index)) + index * 8,
    					row: 0
    				}))
    			: packed.items,
    			top: inline ? -90 : -76 - controlsHeight
    		};

    		categoryTitleY = inline ? -80 : classControlLayout.top - 8;
    	}

    	function titleTextWidth() {
    		const measure = svg.append('text').attr('font-family', 'Arial').attr('font-size', 18).attr('font-weight', 700).text('Overall Accuracy over Epochs');
    		const result = measure.node().getComputedTextLength();
    		measure.remove();
    		return result;
    	}

    	function initializeChart2(width, height) {
    		g2 = svg.append("g").attr("class", "accuracy-category-group").attr("transform", `translate(${margin2.left},${margin2.top + categoryDetailOffsetY})`);

    		// Class selection buttons
    		const buttonGroup = svg.append("g").attr("transform", `translate(${margin2.left}, ${margin2.top + classControlLayout.top + categoryDetailOffsetY})`);

    		const buttonWidths = classControlLayout.widths;

    		// 创建按钮
    		const buttons = buttonGroup.selectAll(".class-button").data(d3$1.range(numClasses)).enter().append("g").attr("class", "class-button").attr("transform", (d, i) => `translate(${classControlLayout.items[i].x}, ${classControlLayout.items[i].row * (buttonHeight + 6)})`).style("cursor", "pointer").on("click", (event, classIndex) => {
    			selectedClass = classIndex;
    			updateButtonStyles(buttons);
    			updateCategoryChart(allData.filter(d => d.epoch <= epoch), classIndex);
    		}).on("mouseover", function (_, i) {
    			if (i !== selectedClass) {
    				d3$1.select(this).select("rect").attr("fill", "white").attr("stroke", "#007bff");
    				d3$1.select(this).select("text").attr("fill", "#007bff");
    			}
    		}).on("mouseout", function (_, i) {
    			if (i !== selectedClass) {
    				d3$1.select(this).select("rect").attr("fill", "white").attr("stroke", "#aaa");
    				d3$1.select(this).select("text").attr("fill", "black");
    			}
    		});

    		// 按钮背景
    		buttons.append("rect").attr("width", d => buttonWidths[d]).attr("height", buttonHeight).attr("rx", 4).attr("ry", 4).attr("fill", "white").attr("stroke", d => d === selectedClass ? "#007bff" : "#aaa").attr("stroke-width", 1.5);

    		// 按钮文字
    		buttons.append("text").attr("class", "chart-control-label").attr("x", d => buttonWidths[d] / 2).attr("y", buttonHeight / 2).attr("text-anchor", "middle").attr("alignment-baseline", "middle").attr("fill", d => d === selectedClass ? "#007bff" : "black").text(d => classNames[d]);

    		// Scales for category chart
    		xScale2 = d3$1.scaleBand().domain(d3$1.range(allData.length)).range([0, innerWidth2]);

    		// Axis labels
    		g2.append("text").attr("class", "category-y-label axis-title").attr("transform", "rotate(-90)").attr("x", 45).attr("y", -32).attr("text-anchor", "middle").attr("font-size", "10px").text("Accuracy");

    		g2.append("text").attr("class", "category-x-label axis-title").attr("x", innerWidth2 / 2).attr("y", 5).attr("text-anchor", "middle").attr("font-size", "10px").text("Epochs");
    	}

    	function updateButtonStyles(buttons) {
    		buttons.select("rect").attr("stroke", d => d === selectedClass ? "#007bff" : "#aaa").attr("fill", "white");
    		buttons.select("text").attr("fill", d => d === selectedClass ? "#007bff" : "black");
    	}

    	function updateCharts(currentEpoch) {
    		if (!g1 || !g2 || !allData.length) return;
    		const filteredData = allData.filter(d => d.epoch <= currentEpoch);
    		if (filteredData.length === 0) return;

    		// Update Chart 1 - Overall Accuracy line
    		g1.select(".accuracy-line").datum(filteredData).attr("d", lineGen1);

    		// Update Chart 2 - Category Accuracy bars
    		updateCategoryChart(filteredData, selectedClass);
    	}

    	function updateCategoryChart(data, classIndex) {
    		if (!g2 || !data.length) return;

    		// Use full data for scale calculation to keep consistent scale
    		const minVal = d3$1.min(allData, d => d.classAccuracies[classIndex]);

    		const maxVal = d3$1.max(allData, d => d.classAccuracies[classIndex]);
    		const rowHeight = 40;

    		// Update y scale with full data range
    		yScale2 = d3$1.scaleLinear().domain([minVal, maxVal]).range([rowHeight, 0]);

    		// Update x scale domain based on the actual epoch history.
    		xScale2.domain(d3$1.range(allData.length));

    		// Update or create Y axis
    		if (g2.select(".category-y-axis").empty()) {
    			g2.append("g").attr("class", "category-y-axis").attr("transform", `translate(${-1},${-60})`).call(d3$1.axisLeft(yScale2).tickSize(3).tickValues([minVal, maxVal]).tickFormat(d3$1.format('.1f')));
    		} else {
    			g2.select(".category-y-axis").attr("transform", `translate(${-1},${-60})`).call(d3$1.axisLeft(yScale2).tickSize(3).tickValues([minVal, maxVal]).tickFormat(d3$1.format('.1f')));
    		}

    		// Update or create X axis
    		if (g2.select(".category-x-axis").empty()) {
    			g2.append("g").attr("class", "category-x-axis").attr("transform", `translate(0, ${-20})`).call(d3$1.axisBottom(xScale2).tickSize(3).tickSizeOuter(0).tickValues(d3$1.range(0, allData.length - 1, 45).concat(allData.length - 1)).tickFormat(i => allData[i]?.epoch || i));
    		} else {
    			g2.select(".category-x-axis").attr("transform", `translate(0, ${-20})`).call(d3$1.axisBottom(xScale2).tickSize(3).tickSizeOuter(0).tickValues(d3$1.range(0, allData.length - 1, 45).concat(allData.length - 1)).tickFormat(i => allData[i]?.epoch || i));
    		}

    		// Title - 在g2的上方
    		// 删除之前的标题
    		g2.selectAll(".category-title").remove();

    		g2.append("text").attr("class", "category-title chart-title").// Preserve the title's original left edge while allowing the 4K
    		// font to grow to the right instead of being clipped by the SVG.
    		attr("x", 0).attr("y", categoryTitleY).attr("text-anchor", "start").attr("font-size", "12px").attr("font-weight", "bold").text("Accuracy for " + classNames[selectedClass]);

    		// Update bars using D3 data join pattern (enter-update-exit)
    		const bars = g2.selectAll(".category-rect").data(data, d => d.epoch); // Use epoch as key for data join

    		d3$1.selectAll('.tooltip-bar').remove();
    		const tooltipBar = d3$1.select("body").append("div").attr("class", "tooltip-bar").style("position", "absolute").style("pointer-events", "none").style("background", "rgba(0,0,0,0.7)").style("color", "white").style("padding", "4px 8px").style("border-radius", "4px").style("font-size", "14px").style("display", "none");

    		// Remove bars that are no longer needed
    		bars.exit().remove();

    		// Add new bars
    		bars.enter().append("rect").attr("class", "category-rect").attr("x", (d, j) => xScale2(allData.findIndex(ad => ad.epoch === d.epoch))).attr("y", d => yScale2(d.classAccuracies[classIndex])).attr("width", xScale2.bandwidth()).attr("height", d => rowHeight - yScale2(d.classAccuracies[classIndex])).attr("fill", colorCatrgery[classIndex]).merge(bars).attr("x", (d, j) => xScale2(allData.findIndex(ad => ad.epoch === d.epoch))).attr("y", d => yScale2(d.classAccuracies[classIndex]) - 60).attr("height", d => rowHeight - yScale2(d.classAccuracies[classIndex])).attr("fill", colorCatrgery[classIndex]).on("mousemove", function (event, d) {
    			const value = d.classAccuracies[classIndex]; // Merge with existing bars

    			// ====== tooltip内容 ======
    			tooltipBar.style("display", "block").html(`
                    Epoch: <strong style="color:white;">${d.epoch}</strong><br>
                    Value: <strong style="color:white;">${(value * 100).toFixed(2) + "%"}</strong>
                `);

    			// ====== tooltip尺寸 ======
    			const tooltipNode = tooltipBar.node();

    			const tooltipWidth = tooltipNode.offsetWidth;
    			const rect = this.ownerSVGElement.getBoundingClientRect();
    			const centerX = rect.left + rect.width / 2;
    			const mouseX = event.clientX;
    			let left;
    			let top = event.pageY - 15;

    			if (mouseX > centerX) {
    				left = event.pageX - tooltipWidth - 10;
    			} else {
    				left = event.pageX + 10;
    			}

    			tooltipBar.style("left", left + "px").style("top", top + "px");
    			d3$1.select(this).attr("stroke", "black").attr("stroke-width", 1);
    		}).on("mouseout", function () {
    			tooltipBar.style("display", "none");
    			d3$1.select(this).attr("stroke", "none");
    		});
    	}

    	onDestroy(() => {
    		d3$1.selectAll('.tooltip-bar, .tooltip-accuracy').remove();
    	});

    	function svg_1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			svgContainer = $$value;
    			$$invalidate(0, svgContainer);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('epoch' in $$props) $$invalidate(3, epoch = $$props.epoch);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*$accuracyData*/ 4096) {
    			 $$invalidate(4, allData = $accuracyData);
    		}

    		if ($$self.$$.dirty[0] & /*$classNamesStore*/ 2048) {
    			 classNames = $classNamesStore;
    		}

    		if ($$self.$$.dirty[0] & /*allData, svgContainer, chartWidth, chartHeight, prevDataRef, renderedWidth, renderedHeight, isInitialized, epoch*/ 2041) {
    			 if (allData.length > 0 && svgContainer && chartWidth > 0 && chartHeight > 0) {
    				if (allData !== prevDataRef || chartWidth !== renderedWidth || chartHeight !== renderedHeight) {
    					clearSvg();
    					$$invalidate(10, prevDataRef = allData);
    					$$invalidate(7, renderedWidth = chartWidth);
    					$$invalidate(8, renderedHeight = chartHeight);
    				}

    				if (!isInitialized) {
    					initialize();
    					$$invalidate(9, isInitialized = true);
    				}

    				updateCharts(epoch);
    			}
    		}
    	};

    	return [
    		svgContainer,
    		$selectedWeightConfigurationStore,
    		resizeChart,
    		epoch,
    		allData,
    		chartWidth,
    		chartHeight,
    		renderedWidth,
    		renderedHeight,
    		isInitialized,
    		prevDataRef,
    		$classNamesStore,
    		$accuracyData,
    		svg_1_binding
    	];
    }

    class AccuracyLine extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$g, create_fragment$g, safe_not_equal, { epoch: 3 }, null, [-1, -1]);
    	}
    }

    /* src\overview\Confusion.svelte generated by Svelte v3.59.2 */

    function create_fragment$h(ctx) {
    	let div;
    	let h2;
    	let t0;
    	let t1_value = (/*epoch*/ ctx[1] === undefined ? 0 : /*epoch*/ ctx[1]) + "";
    	let t1;
    	let t2;
    	let svg;
    	let svg_data_configuration_value;
    	let observeChartSize_action;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div = element("div");
    			h2 = element("h2");
    			t0 = text("Confusion Matrix of Epoch ");
    			t1 = text(t1_value);
    			t2 = space();
    			svg = svg_element("svg");
    			attr(h2, "class", "metric-view-title metric-overlay-title");

    			attr(svg, "data-configuration", svg_data_configuration_value = /*$selectedWeightConfigurationStore*/ ctx[2]
    			? /*$selectedWeightConfigurationStore*/ ctx[2].id
    			: '');

    			attr(svg, "data-epoch", /*epoch*/ ctx[1]);
    			attr(svg, "class", "svelte-zam1a5");
    			attr(div, "class", "confusion-container svelte-zam1a5");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, h2);
    			append(h2, t0);
    			append(h2, t1);
    			append(div, t2);
    			append(div, svg);
    			/*svg_binding*/ ctx[9](svg);

    			if (!mounted) {
    				dispose = action_destroyer(observeChartSize_action = observeChartSize.call(null, div, /*resizeChart*/ ctx[3]));
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*epoch*/ 2 && t1_value !== (t1_value = (/*epoch*/ ctx[1] === undefined ? 0 : /*epoch*/ ctx[1]) + "")) set_data(t1, t1_value);

    			if (dirty & /*$selectedWeightConfigurationStore*/ 4 && svg_data_configuration_value !== (svg_data_configuration_value = /*$selectedWeightConfigurationStore*/ ctx[2]
    			? /*$selectedWeightConfigurationStore*/ ctx[2].id
    			: '')) {
    				attr(svg, "data-configuration", svg_data_configuration_value);
    			}

    			if (dirty & /*epoch*/ 2) {
    				attr(svg, "data-epoch", /*epoch*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			/*svg_binding*/ ctx[9](null);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    const numClasses$1 = 10;
    const canvasOffsetY = 8;

    function instance$h($$self, $$props, $$invalidate) {
    	let epoch;
    	let $classNamesStore;
    	let $confusionData;
    	let $selectedEpochStore;
    	let $selectedWeightConfigurationStore;
    	component_subscribe($$self, classNamesStore, $$value => $$invalidate(13, $classNamesStore = $$value));
    	component_subscribe($$self, confusionData, $$value => $$invalidate(7, $confusionData = $$value));
    	component_subscribe($$self, selectedEpochStore, $$value => $$invalidate(8, $selectedEpochStore = $$value));
    	component_subscribe($$self, selectedWeightConfigurationStore, $$value => $$invalidate(2, $selectedWeightConfigurationStore = $$value));
    	let svgContainer;
    	let width = 0;
    	let height = 0;
    	let chartWidth = 0;
    	let chartHeight = 0;

    	function resizeChart(size) {
    		$$invalidate(4, chartWidth = size.width);
    		$$invalidate(5, chartHeight = size.height);
    	}

    	const dispatch = createEventDispatcher();

    	const margin = {
    		top: 50,
    		right: 10,
    		bottom: 20,
    		left: 110
    	}; // 增加右侧空间

    	let allConfusionData = [];

    	function updateConfusionMatrix(selectedEpoch) {
    		const epochData = allConfusionData.find(d => d.epoch === selectedEpoch);
    		if (!epochData) return;
    		d3$1.select(svgContainer).selectAll("*").remove();
    		drawConfusion(epochData.matrix);
    	}

    	function drawConfusion(data, selectedEpoch) {
    		const container = svgContainer;
    		const rectSize = 25;
    		const confusionArea = document.getElementById("confusion-area");

    		if (confusionArea) {
    			width = chartWidth;
    			height = chartHeight;
    			const title = confusionArea.querySelector('.metric-view-title');
    			margin.top = Math.max(50, (title ? title.offsetHeight : 24) + 24);
    		}

    		const svg = d3$1.select(container).attr("width", width).attr("height", height);

    		// Remove any existing tooltips before creating new ones
    		d3$1.selectAll(".tooltip-confusion").remove();

    		d3$1.selectAll(".tooltip-diff").remove();
    		const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top + canvasOffsetY})`);
    		g.append("text").attr("x", -85).attr("y", 20).attr("text-anchor", "middle").attr("font-size", "14px").attr("font-weight", "bold").attr("transform", `rotate(-90, -45, 60)`).text("Classes"); // 旋转文字
    		g.append("text").attr("x", 280).attr("y", -4).attr("text-anchor", "middle").attr("font-size", "12px").attr("font-weight", "bold").text("Difference");

    		// --- 创建 tooltip ---
    		const tooltipConfusion = d3$1.select("body").append("div").attr("class", "tooltip-confusion").style("position", "absolute").style("pointer-events", "none").style("background", "rgba(0,0,0,0.7)").style("color", "white").style("padding", "4px 8px").style("border-radius", "4px").style("font-size", "16px").style("display", "none");

    		const tooltipDiff = d3$1.select("body").append("div").attr("class", "tooltip-diff").style("position", "absolute").style("pointer-events", "none").style("background", "rgba(0,0,0,0.7)").style("color", "white").style("padding", "4px 8px").style("border-radius", "4px").style("font-size", "16px").style("display", "none");

    		// 颜色比例尺
    		const maxVal = d3$1.max(data.flat());

    		const colorScale = d3$1.scaleSequential(d3$1.interpolateBlues).domain([0, maxVal]);

    		// --- 绘制颜色图例 ---
    		const legendWidth = 10;

    		const legendHeight = 80;
    		const legendX = -88; // 紧贴右侧
    		const legendY = 170;

    		// 定义垂直渐变
    		const defs = svg.append("defs");

    		const gradient = defs.append("linearGradient").attr("id", "color-gradient").attr("x1", "0%").attr("y1", "0%").attr("x2", "0%").attr("y2", "100%");

    		// 顶部：最大值对应的颜色
    		gradient.append("stop").attr("offset", "0%").attr("stop-color", colorScale(maxVal));

    		// 底部：最小值对应的颜色
    		gradient.append("stop").attr("offset", "100%").attr("stop-color", colorScale(0));

    		// 绘制垂直渐变矩形
    		g.append("rect").attr("x", legendX).attr("y", legendY).attr("width", legendWidth).attr("height", legendHeight).style("fill", "url(#color-gradient)");

    		// 左右文字
    		g.append("text").attr("x", legendX + 4).attr("y", legendY + legendHeight + 10).attr("text-anchor", "start").attr("font-size", "10px").text("0");

    		g.append("text").attr("x", legendX + 10).attr("y", legendY - 2).attr("text-anchor", "end").attr("font-size", "10px").text(maxVal);

    		// 图例标题
    		const textOffsetX = 50; // 向左移动的距离

    		g.append("text").attr("x", legendX / 2 - textOffsetX).attr("y", legendY + legendHeight / 2).attr("text-anchor", "middle").attr("font-size", "10px").attr("transform", `rotate(-90, ${legendX / 2 - textOffsetX}, ${legendY + legendHeight / 2})`).text("Count");

    		// 绘制矩阵单元格
    		g.selectAll("g.row").data(data).enter().append("g").attr("class", "row").attr("transform", (_, i) => `translate(4, ${i * rectSize - 10})`).each(function (rowData, rowIndex) {
    			d3$1.select(this).selectAll("rect").data(rowData.map((d, colIndex) => ({ value: d, colIndex }))).enter().append("rect").attr("x", d => d.colIndex * rectSize - 10).attr("width", rectSize - 1).attr("height", rectSize - 1).attr("fill", d => colorScale(d.value)).attr("rx", 4).attr("ry", 4).on("mousemove", function (event, d) {
    				const rowName = classNames[rowIndex]; // 👈 包装数据
    				const colName = classNames[d.colIndex];

    				// ====== tooltip内容 ======
    				tooltipConfusion.style("display", "block").html(`${rowName} → ${colName}<br>
             Value: <strong style="color:white;">${d.value}</strong>`);

    				// ====== 获取tooltip尺寸 ======
    				const tooltipNode = tooltipConfusion.node();

    				const tooltipWidth = tooltipNode.offsetWidth;

    				// ====== 容器位置（视口坐标） ======
    				const rect = confusionArea.getBoundingClientRect();

    				const centerX = rect.left + rect.width / 2;
    				const mouseX = event.clientX;
    				const pageX = event.pageX;
    				let left;
    				let top = event.pageY - 15;

    				if (mouseX > centerX) {
    					left = pageX - tooltipWidth - 10;
    				} else {
    					left = pageX + 10;
    				}

    				tooltipConfusion.style("left", left + "px").style("top", top + "px");

    				// ====== 高亮 ======
    				d3$1.select(this).attr("stroke", "black").attr("stroke-width", 1.2);
    			}).on("mouseout", function () {
    				d3$1.select(this).attr("stroke-width", 0).attr("stroke", "none");
    				tooltipConfusion.style("display", "none");
    			});

    			d3$1.select(this).selectAll("text").data(rowData).enter().append("text").attr("x", (_, i) => i * rectSize + rectSize / 2 - 11).attr("y", rectSize / 2).attr("text-anchor", "middle").attr("alignment-baseline", "middle").attr("font-size", "12px").attr("fill", d => d > maxVal / 2 ? "white" : "black").text(d => d);
    		});

    		// ======================================================
    		// Difference 柱形图
    		// ======================================================
    		// === 1. 只需要修改以下三个参数 ===
    		const barX = rectSize * numClasses$1 - 4; // 柱形区域左上角 X

    		const barY = 0; // 柱形区域左上角 Y
    		const barWidth = 80; // 柱形区域水平总长度

    		// === 其他参数 ===
    		const barHeight = 10; // 实际柱子的高度

    		const bgHeight = 15; // 背景条高度
    		const rowSpacing = 25; // 相邻柱子的垂直间距

    		// ======================================================
    		// 2. 计算行列总和
    		// ======================================================
    		const rowSums = data.map(row => d3$1.sum(row));

    		const colSums = d3$1.range(numClasses$1).map(colIndex => d3$1.sum(data.map(row => row[colIndex])));

    		// === 计算差值（列总 - 行总） ===
    		const diffs = d3$1.range(numClasses$1).map(i => colSums[i] - rowSums[i]);

    		// ======================================================
    		// 3. 根据柱形区域宽度自动计算比例尺
    		// ======================================================
    		// 零线位于柱形区域的水平中心
    		const centerX = barX + barWidth / 2;

    		// 正负两侧各占一半宽度
    		const halfWidth = barWidth / 2;

    		// 最大绝对差值
    		const maxAbsDiff = d3$1.max(diffs, d => Math.abs(d)) || 1;

    		// 差值映射到柱形长度
    		const diffScale = d3$1.scaleLinear().domain([-maxAbsDiff, maxAbsDiff]).range([-halfWidth, halfWidth]);

    		// ======================================================
    		// 4. 背景条
    		// ======================================================
    		g.selectAll(".diff-bg").data(diffs).enter().append("rect").attr("class", "diff-bg").attr("x", barX).attr("y", (_, i) => barY + i * rowSpacing).attr("width", barWidth).attr("height", bgHeight).attr("rx", 2).attr("ry", 2).attr("fill", "#eee").attr("opacity", 0.8);

    		// ======================================================
    		// 5. 中心零线
    		// ======================================================
    		g.append("line").attr("class", "diff-zero-line").attr("x1", centerX).attr("x2", centerX).attr("y1", barY).attr("y2", barY + (numClasses$1 - 1) * rowSpacing + bgHeight).attr("stroke", "black").attr("stroke-dasharray", "4 2");

    		// ======================================================
    		// 6. 绘制 Difference 柱形
    		// ======================================================
    		g.selectAll(".diff-bar").data(diffs).enter().append("rect").attr("class", "diff-bar").// 正值：从中心向右延伸
    		// 负值：从中心向左延伸
    		attr("x", d => d >= 0 ? centerX : centerX + diffScale(d)).// 柱形 Y 坐标
    		attr("y", (_, i) => barY + (bgHeight - barHeight) / 2 + i * rowSpacing).// 根据差值自动计算柱形长度
    		attr("width", d => Math.abs(diffScale(d))).attr("height", barHeight).attr("rx", 2).attr("ry", 2).// 正值绿色，负值橙色
    		attr("fill", d => d >= 0 ? "#69b3a2" : "#f28e2b").attr("opacity", 0.9).// ==================================================
    		// Tooltip
    		// ==================================================
    		on("mouseover", function (event, d) {
    			tooltipDiff.style("display", "block").html(`
                <span style="font-size:16px;color:#fff;">
                    ${d > 0
			? "Overestimated"
			: d < 0 ? "Underestimated" : "Balanced"}
                </span>
                <br>
                Value:
                <strong style="color:white;">
                    ${d > 0 ? "+" : ""}${d.toFixed(0)}
                </strong>
            `);
    		}).on("mousemove", function (event) {
    			tooltipDiff.style("left", event.pageX - tooltipDiff.node().offsetWidth + "px").style("top", event.pageY - 15 + "px");
    		}).on("mouseout", function () {
    			tooltipDiff.style("display", "none");
    		});

    		// === 差值文字 ===
    		const textGap = 4; // 文字与中心线的水平间距

    		g.selectAll(".diff-text").data(diffs).enter().append("text").attr("class", "diff-text").// 正值放左侧，负值和零值放右侧
    		attr("x", d => d > 0 ? centerX - textGap : centerX + textGap).// 与柱形条垂直居中
    		attr("y", (_, i) => barY + i * rowSpacing + bgHeight / 2).attr("dy", "0.35em").// 左侧文字右对齐，右侧文字左对齐
    		attr("text-anchor", d => d > 0 ? "end" : "start").attr("fill", d => d >= 0 ? "#69b3a2" : "#f28e2b").attr("font-size", "12px").attr("font-weight", "bold").text(d => d > 0 ? `+${d.toFixed(0)}` : d.toFixed(0));

    		// --- 行标签 ---
    		const classNames = $classNamesStore;

    		g.selectAll(".row-label").data(classNames).enter().append("text").attr("x", -10).attr("y", (_, i) => i * rectSize + rectSize / 2 - 10).attr("text-anchor", "end").attr("alignment-baseline", "middle").attr("font-size", "12px").text(d => d);

    		g.selectAll(".col-label").data(classNames).enter().append("text").attr("class", "col-label").attr("x", (_, i) => i * rectSize + rectSize / 2 - 16).attr("y", numClasses$1 * rectSize - 11).attr("text-anchor", "start").attr("alignment-baseline", "hanging").attr("font-size", "12px").attr("transform", (_, i) => `rotate(20, ${i * rectSize + rectSize / 2 - 16}, ${numClasses$1 * rectSize - 11})`).text(d => d); // 对齐每列中心
    		// 放在矩阵下方
    		// 旋转后左对齐更自然
    		// ✅ 绕各自坐标点旋转

    		const bounds = g.node().getBBox();

    		dispatch('fit', {
    			height: Math.ceil(margin.top + bounds.y + bounds.height + 12) + 4
    		});
    	}

    	onDestroy(() => {
    		d3$1.selectAll('.tooltip-confusion, .tooltip-diff').remove();
    	});

    	function svg_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			svgContainer = $$value;
    			$$invalidate(0, svgContainer);
    		});
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$selectedEpochStore*/ 256) {
    			 $$invalidate(1, epoch = $selectedEpochStore);
    		}

    		if ($$self.$$.dirty & /*$confusionData*/ 128) {
    			 $$invalidate(6, allConfusionData = $confusionData);
    		}

    		if ($$self.$$.dirty & /*svgContainer, chartWidth, chartHeight, allConfusionData, epoch*/ 115) {
    			 if (svgContainer && chartWidth > 0 && chartHeight > 0 && allConfusionData.length > 0 && epoch !== undefined) {
    				updateConfusionMatrix(epoch);
    			}
    		}
    	};

    	return [
    		svgContainer,
    		epoch,
    		$selectedWeightConfigurationStore,
    		resizeChart,
    		chartWidth,
    		chartHeight,
    		allConfusionData,
    		$confusionData,
    		$selectedEpochStore,
    		svg_binding
    	];
    }

    class Confusion extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$h, create_fragment$h, safe_not_equal, {});
    	}
    }

    const WEIGHT_AXES = ["alpha", "beta", "gamma"];

    // One ranking rule for both the default run and the comparison view. Ties use
    // numeric configuration IDs, never test accuracy or the old recommended flag.
    function rankWeightConfigurations(configurations) {
      return configurations.filter((configuration) => configuration.simulated === false
        && Number.isFinite(configuration.accuracy) && configuration.accuracy >= 0
        && configuration.accuracy <= 100)
        .sort((a, b) => b.accuracy - a.accuracy
          || a.id.localeCompare(b.id, 'en', { numeric: true }));
    }

    const ACCURACY_PURPLE_PALETTE = [
      "#f5f2f9",
      "#e8e2f1",
      "#d5cbe6",
      "#b6a6d3",
      "#917cbd",
    ];

    function hexToRgb(hex) {
      return [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
    }

    function rgbToHex(channels) {
      return "#" + channels.map((channel) =>
        Math.round(channel).toString(16).padStart(2, "0")).join("");
    }

    function accuracyColorStyle(accuracy, minimum, maximum) {
      const ratio = Number.isFinite(accuracy) && maximum > minimum
        ? Math.max(0, Math.min(1, (accuracy - minimum) / (maximum - minimum)))
        : 0.5;
      const position = ratio * (ACCURACY_PURPLE_PALETTE.length - 1);
      const index = Math.min(ACCURACY_PURPLE_PALETTE.length - 2, Math.floor(position));
      const fraction = position - index;
      const start = hexToRgb(ACCURACY_PURPLE_PALETTE[index]);
      const end = hexToRgb(ACCURACY_PURPLE_PALETTE[index + 1]);
      const channels = start.map((value, axis) => value + (end[axis] - value) * fraction);
      const fill = rgbToHex(channels);
      return {
        fill,
        stroke: rgbToHex(channels.map((value, axis) =>
          value * 0.72 + [64, 36, 87][axis] * 0.28)),
        // Labels sit outside the colored markers, on the white plot background.
        label: "#000000",
      };
    }

    function prepareWeightStrategies(strategies) {
      return strategies.reduce((result, strategy, index) => {
        if (strategy.simulated !== false) return result;
        const rawWeights = WEIGHT_AXES.map((key) =>
          strategy[key] == null ? NaN : Number(strategy[key]));
        const sum = rawWeights.reduce((total, value) => total + value, 0);
        const accuracy = strategy.accuracy == null ? NaN : Number(strategy.accuracy);
        if (
          rawWeights.some((value) => !Number.isFinite(value) || value < 0) ||
          !Number.isFinite(sum) || sum <= 0 ||
          !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100
        ) return result;

        result.push({
          ...strategy,
          id: strategy.id || `S${index + 1}`,
          // Display numbering is stable in catalog order; model IDs remain intact.
          displayId: `Cfg-${result.length + 1}`,
          accuracy,
          rawWeights,
          weights: rawWeights.map((value) => value / sum),
        });
        return result;
      }, []);
    }

    function projectSimplex(weights, vertices) {
      return {
        x: weights.reduce((total, value, axis) => total + value * vertices[axis].x, 0),
        y: weights.reduce((total, value, axis) => total + value * vertices[axis].y, 0),
      };
    }

    function getWeightGuideCoordinates(weights, vertices) {
      const [alpha, beta, gamma] = weights;
      return {
        point: projectSimplex(weights, vertices),
        alpha: projectSimplex([alpha, 1 - alpha, 0], vertices),
        beta: projectSimplex([0, beta, 1 - beta], vertices),
        gamma: projectSimplex([1 - gamma, 0, gamma], vertices),
      };
    }

    function accuracyRadius(accuracy, maximumRadius) {
      return maximumRadius * Math.sqrt(accuracy / 100);
    }

    const TERNARY_ASPECT_RATIO = 1.7;
    const ternaryTopInset = 26;
    const ternaryBottomInset = 32;
    const ternarySideInset = 52;
    const ternaryExpansion = 12;

    function getWeightComparisonPanelWidth(plotHeight, rankings = []) {
      const triangleHeight = Math.max(12, plotHeight - ternaryTopInset - ternaryBottomInset);
      const triangleWidth = triangleHeight * TERNARY_ASPECT_RATIO;
      const radius = Math.min(19, triangleHeight * 2 / Math.sqrt(3) / 25);
      const rankingWidth = Math.max(146, ...rankings.map(box => box.width));
      const rankingBottom = Math.max(plotHeight < 340 ? 127 : 177,
        ...rankings.map(box => box.y + box.height));
      // Rankings occupy the two white corners, not the data region. At their
      // bottom edge, leave clearance for the sloping edge, markers and tick text.
      const cornerWidth = 2 * (rankingWidth + radius + 40)
        + TERNARY_ASPECT_RATIO * Math.max(0, rankingBottom - ternaryTopInset);
      return Math.max(triangleWidth + ternarySideInset * 2, cornerWidth) + 24;
    }

    function getTernaryLayout(width, height) {
      const top = ternaryTopInset - ternaryExpansion;
      // Fit the largest triangle with one fixed aspect ratio. Neither a width
      // constraint nor a tall screen is allowed to stretch the simplex.
      const baseTriangleHeight = Math.min(height - ternaryTopInset - ternaryBottomInset,
        (width - ternarySideInset * 2) / TERNARY_ASPECT_RATIO);
      const triangleHeight = Math.max(12, baseTriangleHeight + ternaryExpansion);
      const triangleWidth = triangleHeight * TERNARY_ASPECT_RATIO;
      const vertices = [
        { x: width / 2, y: top },
        { x: (width - triangleWidth) / 2, y: top + triangleHeight },
        { x: (width + triangleWidth) / 2, y: top + triangleHeight },
      ];
      return {
        top, triangleHeight, triangleWidth, vertices,
        maximumRadius: Math.min(19, triangleWidth / 25,
          triangleHeight * 2 / Math.sqrt(3) / 25)
      };
    }

    function fitConfigurationRadius(points, maximumRadius) {
      let fitted = maximumRadius;
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const distance = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
          const factor = Math.sqrt(points[i].accuracy / 100) + Math.sqrt(points[j].accuracy / 100);
          // Identical coordinates cannot be separated without falsifying weights.
          // For distinct real points use one common radius scale, preserving areas.
          if (distance > 3 && factor > 0) fitted = Math.min(fitted, (distance - 3) / factor);
        }
      }
      return fitted;
    }

    function getTernaryAnnotations(layout, width, rankings = []) {
      const { vertices, maximumRadius } = layout;
      const tickOffset = Math.max(12, maximumRadius + 6);
      const baseTickOffset = Math.max(18, maximumRadius + 8);
      const gammaTickOffset = 10;
      const gammaTickY = -2;
      const alphaPoint = projectSimplex([0.7, 0.3, 0], vertices);
      const betaPoint = projectSimplex([0, 0.7, 0.3], vertices);
      const gammaPoint = projectSimplex([0.7, 0, 0.3], vertices);
      const alpha = { x: alphaPoint.x - tickOffset - 4, y: alphaPoint.y + 5, anchor: 'end' };
      const beta = { x: betaPoint.x, y: betaPoint.y + baseTickOffset + 2, anchor: 'middle' };
      const gamma = { x: gammaPoint.x + gammaTickOffset + 3, y: gammaPoint.y + gammaTickY, anchor: 'start' };
      const obstacles = [...rankings];
      for (const ratio of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
        const left = projectSimplex([ratio, 1 - ratio, 0], vertices);
        const base = projectSimplex([0, ratio, 1 - ratio], vertices);
        const right = projectSimplex([1 - ratio, 0, ratio], vertices);
        obstacles.push(
          { x: left.x - tickOffset - 24, y: left.y - 10, width: 24, height: 18 },
          { x: base.x - 12, y: base.y + baseTickOffset - 13, width: 24, height: 18 },
          { x: right.x + gammaTickOffset, y: right.y + gammaTickY - 14, width: 24, height: 18 });
      }
      for (const point of [alpha, beta, gamma]) {
        obstacles.push({
          x: point.x - (point.anchor === 'end' ? 14 : point.anchor === 'middle' ? 8 : 1),
          y: point.y - 17, width: 16, height: 21
        });
      }
      return { alpha, beta, gamma, tickOffset, baseTickOffset, gammaTickOffset, gammaTickY, obstacles };
    }

    const overlap = (a, b, gap = 2) => a.x < b.x + b.width + gap
      && a.x + a.width + gap > b.x && a.y < b.y + b.height + gap
      && a.y + a.height + gap > b.y;
    const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

    // Keep the measured points in their exact barycentric positions. Only their
    // black labels are displaced, with leaders, when configurations are close.
    function placeConfigurationLabels(points, width, height, obstacles = []) {
      const occupied = [...obstacles, ...points.map((point) => ({
        x: point.x - point.radius - 0.5, y: point.y - point.radius - 0.5,
        width: point.radius * 2 + 1, height: point.radius * 2 + 1,
      }))];
      const nearestBoxDistance = (point, box) => Math.hypot(
        point.x - clamp(point.x, box.x, box.x + box.width),
        point.y - clamp(point.y, box.y, box.y + box.height));
      const directions = [-90, 90, 0, 180, -45, -135, 45, 135,
      -75, -105, -60, -120, -30, -150, 30, 150, 60, 120, 75, 105, -15, 15, -165, 165];
      const candidateBox = (point, gap, angle) => {
        const labelWidth = point.displayId.length * 6.2 + 2;
        const labelHeight = 14;
        const radians = angle * Math.PI / 180;
        const dx = Math.cos(radians), dy = Math.sin(radians);
        return {
          x: clamp(point.x + dx * (point.radius + gap)
            + (Math.abs(dx) > 0.01 ? Math.sign(dx) * labelWidth / 2 : 0)
            - labelWidth / 2, 4, width - labelWidth - 4),
          y: clamp(point.y + dy * (point.radius + gap)
            + (Math.abs(dy) > 0.01 ? Math.sign(dy) * labelHeight / 2 : 0)
            - labelHeight / 2, 4, height - labelHeight - 4),
          width: labelWidth, height: labelHeight,
        };
      };
      const withLabel = (point, box) => {
        const leaderX = clamp(point.x, box.x, box.x + box.width);
        const leaderY = clamp(point.y, box.y, box.y + box.height);
        const distance = Math.hypot(leaderX - point.x, leaderY - point.y) || 1;
        return {
          ...point, label: {
            ...box,
            centerX: box.x + box.width / 2, centerY: box.y + box.height / 2,
            leaderX, leaderY,
            leaderStartX: point.x + (leaderX - point.x) * point.radius / distance,
            leaderStartY: point.y + (leaderY - point.y) * point.radius / distance,
          }
        };
      };
      // Reserve nearby slots for the tightest data clusters first, then break
      // ties by remaining annotation clearance. Restore catalog order afterwards.
      const order = points.map((point, index) => ({
        point, index,
        availableSlots: [3, 4, 6].flatMap(gap => directions.map(angle => candidateBox(point, gap, angle)))
          .filter(box => !occupied.some(other => overlap(box, other))).length,
        separation: Math.min(Infinity, ...points.filter(other => other !== point)
          .map(other => Math.hypot(other.x - point.x, other.y - point.y)))
      }))
        .sort((a, b) => a.separation - b.separation || a.availableSlots - b.availableSlots || a.index - b.index);
      const placed = [];
      for (const { point, index } of order) {
        // Match the 12px Arial label with a small safety margin, without reserving
        // excessive whitespace around a dense cluster of configurations.
        const labelWidth = point.displayId.length * 6.2 + 2;
        const labelHeight = 14;
        const candidates = [];
        for (const gap of [3, 4, 6, 8, 12, 18, 24, 32, 40, 52, 68, 84, 108, 140, 180]) {
          for (const angle of directions) {
            const candidate = candidateBox(point, gap, angle);
            if (!occupied.some((other) => overlap(candidate, other))) {
              candidates.push(candidate);
            }
          }
        }
        candidates.sort((a, b) => nearestBoxDistance(point, a) - nearestBoxDistance(point, b)
          || Math.hypot(a.x + labelWidth / 2 - point.x, a.y + labelHeight / 2 - point.y)
          - Math.hypot(b.x + labelWidth / 2 - point.x, b.y + labelHeight / 2 - point.y));
        let box = candidates[0];
        // A short view can have a nearby free slot between the sampled angles.
        // Search that local space before accepting a long cross-plot leader.
        if (!box || nearestBoxDistance(point, box) - point.radius > 4) {
          for (let y = Math.max(4, point.y - 64 - labelHeight / 2);
            y <= Math.min(height - labelHeight - 4, point.y + 64 - labelHeight / 2); y += 2) {
            for (let x = Math.max(4, point.x - 64 - labelWidth / 2);
              x <= Math.min(width - labelWidth - 4, point.x + 64 - labelWidth / 2); x += 2) {
              const candidate = { x, y, width: labelWidth, height: labelHeight };
              if ((!box || nearestBoxDistance(point, candidate) < nearestBoxDistance(point, box))
                && !occupied.some(other => overlap(candidate, other))) box = candidate;
            }
          }
        }
        // Search free plot space if a dense cluster has occupied the radial slots.
        if (!box) {
          const candidates = [];
          for (let y = 4; y + labelHeight <= height - 4; y += 4) {
            for (let x = 4; x + labelWidth <= width - 4; x += 4) {
              const candidate = { x, y, width: labelWidth, height: labelHeight };
              if (!occupied.some((other) => overlap(candidate, other))) candidates.push(candidate);
            }
          }
          candidates.sort((a, b) => Math.hypot(a.x + labelWidth / 2 - point.x, a.y + labelHeight / 2 - point.y)
            - Math.hypot(b.x + labelWidth / 2 - point.x, b.y + labelHeight / 2 - point.y));
          box = candidates[0];
        }
        if (!box) { placed[index] = { ...point, label: null }; continue; }
        occupied.push(box);
        placed[index] = withLabel(point, box);
      }
      return placed;
    }

    function configurationTooltip(strategy) {
      const weights = strategy.rawWeights || strategy.weights;
      const items = [
        { label: 'Accuracy', value: `${strategy.accuracy.toFixed(2)}%` },
        { label: 'Best epoch', value: strategy.bestEpoch == null ? 'Not recorded' : String(strategy.bestEpoch) },
        { label: 'α · Confidence', value: weights[0].toFixed(2) },
        { label: 'β · Uncertainty', value: weights[1].toFixed(2) },
        { label: 'γ · Class balance', value: weights[2].toFixed(2) },
      ];
      if (strategy.recommended) items.push({ label: 'Recommended', value: 'Yes' });
      return { key: `configuration-${strategy.id}`, title: strategy.displayId, items };
    }

    function positionComparisonTooltip(anchor, size, viewport) {
      const padding = 8;
      let x = anchor.x + 12;
      if (x + size.width > viewport.width - padding) x = anchor.x - size.width - 12;
      return {
        x: clamp(x, padding, Math.max(padding, viewport.width - size.width - padding)),
        y: clamp(anchor.y - 24, padding, Math.max(padding, viewport.height - size.height - padding)),
      };
    }

    /* src\overview\WeightConfigurationComparison.svelte generated by Svelte v3.59.2 */

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[53] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[56] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[59] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[62] = list[i];
    	child_ctx[64] = i;
    	return child_ctx;
    }

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[59] = list[i];
    	return child_ctx;
    }

    function get_each_context_5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[67] = list[i];
    	const constants_0 = /*interpolate*/ child_ctx[22](/*vertices*/ child_ctx[6][1], /*vertices*/ child_ctx[6][0], /*ratio*/ child_ctx[67]);
    	child_ctx[68] = constants_0;
    	const constants_1 = /*interpolate*/ child_ctx[22](/*vertices*/ child_ctx[6][2], /*vertices*/ child_ctx[6][1], /*ratio*/ child_ctx[67]);
    	child_ctx[69] = constants_1;
    	const constants_2 = /*interpolate*/ child_ctx[22](/*vertices*/ child_ctx[6][0], /*vertices*/ child_ctx[6][2], /*ratio*/ child_ctx[67]);
    	child_ctx[70] = constants_2;
    	return child_ctx;
    }

    function get_each_context_6(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[59] = list[i];
    	return child_ctx;
    }

    function get_each_context_7(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[67] = list[i];
    	return child_ctx;
    }

    function get_each_context_8(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[64] = list[i];
    	const constants_0 = /*interpolate*/ child_ctx[22](/*vertices*/ child_ctx[6][(/*axis*/ child_ctx[64] + 1) % 3], /*vertices*/ child_ctx[6][/*axis*/ child_ctx[64]], /*ratio*/ child_ctx[67]);
    	child_ctx[77] = constants_0;
    	const constants_1 = /*interpolate*/ child_ctx[22](/*vertices*/ child_ctx[6][(/*axis*/ child_ctx[64] + 2) % 3], /*vertices*/ child_ctx[6][/*axis*/ child_ctx[64]], /*ratio*/ child_ctx[67]);
    	child_ctx[78] = constants_1;
    	return child_ctx;
    }

    // (222:6) {#if configurations.length}
    function create_if_block_4$1(ctx) {
    	let div;
    	let span0;
    	let t1;
    	let span1;
    	let t2_value = /*minimumAccuracy*/ ctx[12].toFixed(2) + "";
    	let t2;
    	let t3;
    	let t4;
    	let span2;
    	let t5;
    	let span3;
    	let t6_value = /*maximumAccuracy*/ ctx[11].toFixed(2) + "";
    	let t6;
    	let t7;
    	let div_aria_label_value;

    	return {
    		c() {
    			div = element("div");
    			span0 = element("span");
    			span0.textContent = "Accuracy";
    			t1 = space();
    			span1 = element("span");
    			t2 = text(t2_value);
    			t3 = text("%");
    			t4 = space();
    			span2 = element("span");
    			t5 = space();
    			span3 = element("span");
    			t6 = text(t6_value);
    			t7 = text("%");
    			attr(span2, "class", "accuracy-gradient svelte-wc34me");
    			set_style(span2, "background", /*accuracyGradient*/ ctx[19]);
    			attr(div, "class", "accuracy-color-legend svelte-wc34me");
    			attr(div, "role", "img");
    			attr(div, "aria-label", div_aria_label_value = "Accuracy color scale: " + /*minimumAccuracy*/ ctx[12].toFixed(2) + "% to " + /*maximumAccuracy*/ ctx[11].toFixed(2) + "%; darker purple means higher accuracy");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, span0);
    			append(div, t1);
    			append(div, span1);
    			append(span1, t2);
    			append(span1, t3);
    			append(div, t4);
    			append(div, span2);
    			append(div, t5);
    			append(div, span3);
    			append(span3, t6);
    			append(span3, t7);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*minimumAccuracy*/ 4096 && t2_value !== (t2_value = /*minimumAccuracy*/ ctx[12].toFixed(2) + "")) set_data(t2, t2_value);

    			if (dirty[0] & /*accuracyGradient*/ 524288) {
    				set_style(span2, "background", /*accuracyGradient*/ ctx[19]);
    			}

    			if (dirty[0] & /*maximumAccuracy*/ 2048 && t6_value !== (t6_value = /*maximumAccuracy*/ ctx[11].toFixed(2) + "")) set_data(t6, t6_value);

    			if (dirty[0] & /*minimumAccuracy, maximumAccuracy*/ 6144 && div_aria_label_value !== (div_aria_label_value = "Accuracy color scale: " + /*minimumAccuracy*/ ctx[12].toFixed(2) + "% to " + /*maximumAccuracy*/ ctx[11].toFixed(2) + "%; darker purple means higher accuracy")) {
    				attr(div, "aria-label", div_aria_label_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (258:10) {#each [0, 1, 2] as axis}
    function create_each_block_8(ctx) {
    	let line;
    	let line_x__value;
    	let line_y__value;
    	let line_x__value_1;
    	let line_y__value_1;

    	return {
    		c() {
    			line = svg_element("line");
    			attr(line, "class", "ternary-grid svelte-wc34me");
    			attr(line, "x1", line_x__value = /*start*/ ctx[77].x);
    			attr(line, "y1", line_y__value = /*start*/ ctx[77].y);
    			attr(line, "x2", line_x__value_1 = /*end*/ ctx[78].x);
    			attr(line, "y2", line_y__value_1 = /*end*/ ctx[78].y);
    		},
    		m(target, anchor) {
    			insert(target, line, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*vertices*/ 64 && line_x__value !== (line_x__value = /*start*/ ctx[77].x)) {
    				attr(line, "x1", line_x__value);
    			}

    			if (dirty[0] & /*vertices*/ 64 && line_y__value !== (line_y__value = /*start*/ ctx[77].y)) {
    				attr(line, "y1", line_y__value);
    			}

    			if (dirty[0] & /*vertices*/ 64 && line_x__value_1 !== (line_x__value_1 = /*end*/ ctx[78].x)) {
    				attr(line, "x2", line_x__value_1);
    			}

    			if (dirty[0] & /*vertices*/ 64 && line_y__value_1 !== (line_y__value_1 = /*end*/ ctx[78].y)) {
    				attr(line, "y2", line_y__value_1);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(line);
    		}
    	};
    }

    // (257:8) {#each tickRatios.filter((ratio) => ratio > 0 && ratio < 1) as ratio}
    function create_each_block_7(ctx) {
    	let each_1_anchor;
    	let each_value_8 = [0, 1, 2];
    	let each_blocks = [];

    	for (let i = 0; i < 3; i += 1) {
    		each_blocks[i] = create_each_block_8(get_each_context_8(ctx, each_value_8, i));
    	}

    	return {
    		c() {
    			for (let i = 0; i < 3; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < 3; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(target, anchor);
    				}
    			}

    			insert(target, each_1_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*interpolate, vertices, tickRatios*/ 6291520) {
    				each_value_8 = [0, 1, 2];
    				let i;

    				for (i = 0; i < 3; i += 1) {
    					const child_ctx = get_each_context_8(ctx, each_value_8, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_8(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < 3; i += 1) {
    					each_blocks[i].d(1);
    				}
    			}
    		},
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    // (279:8) {#if weightGuide}
    function create_if_block_3$1(ctx) {
    	let path;
    	let path_data_strategy_value;
    	let path_d_value;

    	return {
    		c() {
    			path = svg_element("path");
    			attr(path, "class", "weight-guide svelte-wc34me");
    			attr(path, "aria-hidden", "true");
    			attr(path, "data-strategy", path_data_strategy_value = /*hoveredStrategy*/ ctx[7].id);
    			attr(path, "d", path_d_value = "M " + /*weightGuide*/ ctx[16].point.x + "," + /*weightGuide*/ ctx[16].point.y + " L " + /*weightGuide*/ ctx[16].alpha.x + "," + /*weightGuide*/ ctx[16].alpha.y + "\n             M " + /*weightGuide*/ ctx[16].point.x + "," + /*weightGuide*/ ctx[16].point.y + " L " + /*weightGuide*/ ctx[16].beta.x + "," + /*weightGuide*/ ctx[16].beta.y + "\n             M " + /*weightGuide*/ ctx[16].point.x + "," + /*weightGuide*/ ctx[16].point.y + " L " + /*weightGuide*/ ctx[16].gamma.x + "," + /*weightGuide*/ ctx[16].gamma.y);
    		},
    		m(target, anchor) {
    			insert(target, path, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*hoveredStrategy*/ 128 && path_data_strategy_value !== (path_data_strategy_value = /*hoveredStrategy*/ ctx[7].id)) {
    				attr(path, "data-strategy", path_data_strategy_value);
    			}

    			if (dirty[0] & /*weightGuide*/ 65536 && path_d_value !== (path_d_value = "M " + /*weightGuide*/ ctx[16].point.x + "," + /*weightGuide*/ ctx[16].point.y + " L " + /*weightGuide*/ ctx[16].alpha.x + "," + /*weightGuide*/ ctx[16].alpha.y + "\n             M " + /*weightGuide*/ ctx[16].point.x + "," + /*weightGuide*/ ctx[16].point.y + " L " + /*weightGuide*/ ctx[16].beta.x + "," + /*weightGuide*/ ctx[16].beta.y + "\n             M " + /*weightGuide*/ ctx[16].point.x + "," + /*weightGuide*/ ctx[16].point.y + " L " + /*weightGuide*/ ctx[16].gamma.x + "," + /*weightGuide*/ ctx[16].gamma.y)) {
    				attr(path, "d", path_d_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(path);
    		}
    	};
    }

    // (294:10) {#if strategy.label}
    function create_if_block_2$1(ctx) {
    	let line;
    	let line_x__value;
    	let line_y__value;
    	let line_x__value_1;
    	let line_y__value_1;

    	return {
    		c() {
    			line = svg_element("line");
    			attr(line, "class", "strategy-label-leader svelte-wc34me");
    			attr(line, "aria-hidden", "true");
    			attr(line, "x1", line_x__value = /*strategy*/ ctx[59].label.leaderStartX);
    			attr(line, "y1", line_y__value = /*strategy*/ ctx[59].label.leaderStartY);
    			attr(line, "x2", line_x__value_1 = /*strategy*/ ctx[59].label.leaderX);
    			attr(line, "y2", line_y__value_1 = /*strategy*/ ctx[59].label.leaderY);
    		},
    		m(target, anchor) {
    			insert(target, line, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*plotted*/ 256 && line_x__value !== (line_x__value = /*strategy*/ ctx[59].label.leaderStartX)) {
    				attr(line, "x1", line_x__value);
    			}

    			if (dirty[0] & /*plotted*/ 256 && line_y__value !== (line_y__value = /*strategy*/ ctx[59].label.leaderStartY)) {
    				attr(line, "y1", line_y__value);
    			}

    			if (dirty[0] & /*plotted*/ 256 && line_x__value_1 !== (line_x__value_1 = /*strategy*/ ctx[59].label.leaderX)) {
    				attr(line, "x2", line_x__value_1);
    			}

    			if (dirty[0] & /*plotted*/ 256 && line_y__value_1 !== (line_y__value_1 = /*strategy*/ ctx[59].label.leaderY)) {
    				attr(line, "y2", line_y__value_1);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(line);
    		}
    	};
    }

    // (293:8) {#each plotted as strategy (strategy.id)}
    function create_each_block_6(key_1, ctx) {
    	let first;
    	let if_block_anchor;
    	let if_block = /*strategy*/ ctx[59].label && create_if_block_2$1(ctx);

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			first = empty();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			this.first = first;
    		},
    		m(target, anchor) {
    			insert(target, first, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (/*strategy*/ ctx[59].label) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_2$1(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(first);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (306:8) {#each tickRatios as ratio}
    function create_each_block_5(ctx) {
    	let line0;
    	let line0_x__value;
    	let line0_y__value;
    	let line0_x__value_1;
    	let line0_y__value_1;
    	let line1;
    	let line1_x__value;
    	let line1_y__value;
    	let line1_x__value_1;
    	let line1_y__value_1;
    	let line2;
    	let line2_x__value;
    	let line2_y__value;
    	let line2_x__value_1;
    	let line2_y__value_1;
    	let text0;
    	let t0_value = /*ratio*/ ctx[67].toFixed(1) + "";
    	let t0;
    	let text0_x_value;
    	let text0_y_value;
    	let text1;
    	let t1_value = /*ratio*/ ctx[67].toFixed(1) + "";
    	let t1;
    	let text1_x_value;
    	let text1_y_value;
    	let text2;
    	let t2_value = /*ratio*/ ctx[67].toFixed(1) + "";
    	let t2;
    	let text2_x_value;
    	let text2_y_value;

    	return {
    		c() {
    			line0 = svg_element("line");
    			line1 = svg_element("line");
    			line2 = svg_element("line");
    			text0 = svg_element("text");
    			t0 = text(t0_value);
    			text1 = svg_element("text");
    			t1 = text(t1_value);
    			text2 = svg_element("text");
    			t2 = text(t2_value);
    			attr(line0, "class", "ternary-tick-mark svelte-wc34me");
    			attr(line0, "x1", line0_x__value = /*alphaPoint*/ ctx[68].x);
    			attr(line0, "y1", line0_y__value = /*alphaPoint*/ ctx[68].y);
    			attr(line0, "x2", line0_x__value_1 = /*alphaPoint*/ ctx[68].x - 5);
    			attr(line0, "y2", line0_y__value_1 = /*alphaPoint*/ ctx[68].y);
    			attr(line1, "class", "ternary-tick-mark svelte-wc34me");
    			attr(line1, "x1", line1_x__value = /*betaPoint*/ ctx[69].x);
    			attr(line1, "y1", line1_y__value = /*betaPoint*/ ctx[69].y);
    			attr(line1, "x2", line1_x__value_1 = /*betaPoint*/ ctx[69].x);
    			attr(line1, "y2", line1_y__value_1 = /*betaPoint*/ ctx[69].y + 5);
    			attr(line2, "class", "ternary-tick-mark svelte-wc34me");
    			attr(line2, "x1", line2_x__value = /*gammaPoint*/ ctx[70].x);
    			attr(line2, "y1", line2_y__value = /*gammaPoint*/ ctx[70].y);
    			attr(line2, "x2", line2_x__value_1 = /*gammaPoint*/ ctx[70].x + 5);
    			attr(line2, "y2", line2_y__value_1 = /*gammaPoint*/ ctx[70].y);
    			attr(text0, "class", "ternary-tick svelte-wc34me");
    			attr(text0, "text-anchor", "end");
    			attr(text0, "x", text0_x_value = /*alphaPoint*/ ctx[68].x - /*annotations*/ ctx[10].tickOffset);
    			attr(text0, "y", text0_y_value = /*alphaPoint*/ ctx[68].y + 4);
    			attr(text1, "class", "ternary-tick svelte-wc34me");
    			attr(text1, "text-anchor", "middle");
    			attr(text1, "x", text1_x_value = /*betaPoint*/ ctx[69].x);
    			attr(text1, "y", text1_y_value = /*betaPoint*/ ctx[69].y + /*annotations*/ ctx[10].baseTickOffset);
    			attr(text2, "class", "ternary-tick svelte-wc34me");
    			attr(text2, "text-anchor", "start");
    			attr(text2, "x", text2_x_value = /*gammaPoint*/ ctx[70].x + /*annotations*/ ctx[10].gammaTickOffset);
    			attr(text2, "y", text2_y_value = /*gammaPoint*/ ctx[70].y + /*annotations*/ ctx[10].gammaTickY);
    		},
    		m(target, anchor) {
    			insert(target, line0, anchor);
    			insert(target, line1, anchor);
    			insert(target, line2, anchor);
    			insert(target, text0, anchor);
    			append(text0, t0);
    			insert(target, text1, anchor);
    			append(text1, t1);
    			insert(target, text2, anchor);
    			append(text2, t2);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*vertices*/ 64 && line0_x__value !== (line0_x__value = /*alphaPoint*/ ctx[68].x)) {
    				attr(line0, "x1", line0_x__value);
    			}

    			if (dirty[0] & /*vertices*/ 64 && line0_y__value !== (line0_y__value = /*alphaPoint*/ ctx[68].y)) {
    				attr(line0, "y1", line0_y__value);
    			}

    			if (dirty[0] & /*vertices*/ 64 && line0_x__value_1 !== (line0_x__value_1 = /*alphaPoint*/ ctx[68].x - 5)) {
    				attr(line0, "x2", line0_x__value_1);
    			}

    			if (dirty[0] & /*vertices*/ 64 && line0_y__value_1 !== (line0_y__value_1 = /*alphaPoint*/ ctx[68].y)) {
    				attr(line0, "y2", line0_y__value_1);
    			}

    			if (dirty[0] & /*vertices*/ 64 && line1_x__value !== (line1_x__value = /*betaPoint*/ ctx[69].x)) {
    				attr(line1, "x1", line1_x__value);
    			}

    			if (dirty[0] & /*vertices*/ 64 && line1_y__value !== (line1_y__value = /*betaPoint*/ ctx[69].y)) {
    				attr(line1, "y1", line1_y__value);
    			}

    			if (dirty[0] & /*vertices*/ 64 && line1_x__value_1 !== (line1_x__value_1 = /*betaPoint*/ ctx[69].x)) {
    				attr(line1, "x2", line1_x__value_1);
    			}

    			if (dirty[0] & /*vertices*/ 64 && line1_y__value_1 !== (line1_y__value_1 = /*betaPoint*/ ctx[69].y + 5)) {
    				attr(line1, "y2", line1_y__value_1);
    			}

    			if (dirty[0] & /*vertices*/ 64 && line2_x__value !== (line2_x__value = /*gammaPoint*/ ctx[70].x)) {
    				attr(line2, "x1", line2_x__value);
    			}

    			if (dirty[0] & /*vertices*/ 64 && line2_y__value !== (line2_y__value = /*gammaPoint*/ ctx[70].y)) {
    				attr(line2, "y1", line2_y__value);
    			}

    			if (dirty[0] & /*vertices*/ 64 && line2_x__value_1 !== (line2_x__value_1 = /*gammaPoint*/ ctx[70].x + 5)) {
    				attr(line2, "x2", line2_x__value_1);
    			}

    			if (dirty[0] & /*vertices*/ 64 && line2_y__value_1 !== (line2_y__value_1 = /*gammaPoint*/ ctx[70].y)) {
    				attr(line2, "y2", line2_y__value_1);
    			}

    			if (dirty[0] & /*vertices, annotations*/ 1088 && text0_x_value !== (text0_x_value = /*alphaPoint*/ ctx[68].x - /*annotations*/ ctx[10].tickOffset)) {
    				attr(text0, "x", text0_x_value);
    			}

    			if (dirty[0] & /*vertices*/ 64 && text0_y_value !== (text0_y_value = /*alphaPoint*/ ctx[68].y + 4)) {
    				attr(text0, "y", text0_y_value);
    			}

    			if (dirty[0] & /*vertices*/ 64 && text1_x_value !== (text1_x_value = /*betaPoint*/ ctx[69].x)) {
    				attr(text1, "x", text1_x_value);
    			}

    			if (dirty[0] & /*vertices, annotations*/ 1088 && text1_y_value !== (text1_y_value = /*betaPoint*/ ctx[69].y + /*annotations*/ ctx[10].baseTickOffset)) {
    				attr(text1, "y", text1_y_value);
    			}

    			if (dirty[0] & /*vertices, annotations*/ 1088 && text2_x_value !== (text2_x_value = /*gammaPoint*/ ctx[70].x + /*annotations*/ ctx[10].gammaTickOffset)) {
    				attr(text2, "x", text2_x_value);
    			}

    			if (dirty[0] & /*vertices, annotations*/ 1088 && text2_y_value !== (text2_y_value = /*gammaPoint*/ ctx[70].y + /*annotations*/ ctx[10].gammaTickY)) {
    				attr(text2, "y", text2_y_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(line0);
    			if (detaching) detach(line1);
    			if (detaching) detach(line2);
    			if (detaching) detach(text0);
    			if (detaching) detach(text1);
    			if (detaching) detach(text2);
    		}
    	};
    }

    // (431:12) {#if strategy.label}
    function create_if_block_1$1(ctx) {
    	let text_1;
    	let t_value = /*strategy*/ ctx[59].displayId + "";
    	let t;
    	let text_1_x_value;
    	let text_1_y_value;

    	return {
    		c() {
    			text_1 = svg_element("text");
    			t = text(t_value);
    			attr(text_1, "class", "strategy-id svelte-wc34me");
    			attr(text_1, "text-anchor", "middle");
    			attr(text_1, "dominant-baseline", "central");
    			attr(text_1, "x", text_1_x_value = /*strategy*/ ctx[59].label.centerX);
    			attr(text_1, "y", text_1_y_value = /*strategy*/ ctx[59].label.centerY);
    		},
    		m(target, anchor) {
    			insert(target, text_1, anchor);
    			append(text_1, t);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*plotted*/ 256 && t_value !== (t_value = /*strategy*/ ctx[59].displayId + "")) set_data(t, t_value);

    			if (dirty[0] & /*plotted*/ 256 && text_1_x_value !== (text_1_x_value = /*strategy*/ ctx[59].label.centerX)) {
    				attr(text_1, "x", text_1_x_value);
    			}

    			if (dirty[0] & /*plotted*/ 256 && text_1_y_value !== (text_1_y_value = /*strategy*/ ctx[59].label.centerY)) {
    				attr(text_1, "y", text_1_y_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(text_1);
    		}
    	};
    }

    // (392:8) {#each plotted as strategy (strategy.id)}
    function create_each_block_4(key_1, ctx) {
    	let g;
    	let circle;
    	let circle_cx_value;
    	let circle_cy_value;
    	let circle_r_value;
    	let g_tabindex_value;
    	let g_aria_label_value;
    	let g_aria_describedby_value;
    	let g_aria_pressed_value;
    	let g_data_strategy_value;
    	let g_data_alpha_value;
    	let g_data_beta_value;
    	let g_data_gamma_value;
    	let g_data_accuracy_value;
    	let g_data_configuration_label_value;
    	let mounted;
    	let dispose;

    	function mouseenter_handler() {
    		return /*mouseenter_handler*/ ctx[38](/*strategy*/ ctx[59]);
    	}

    	let if_block = /*strategy*/ ctx[59].label && create_if_block_1$1(ctx);

    	function click_handler() {
    		return /*click_handler*/ ctx[40](/*strategy*/ ctx[59]);
    	}

    	function keydown_handler(...args) {
    		return /*keydown_handler*/ ctx[41](/*strategy*/ ctx[59], ...args);
    	}

    	function mouseenter_handler_1(...args) {
    		return /*mouseenter_handler_1*/ ctx[42](/*strategy*/ ctx[59], ...args);
    	}

    	function focus_handler(...args) {
    		return /*focus_handler*/ ctx[43](/*strategy*/ ctx[59], ...args);
    	}

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			g = svg_element("g");
    			circle = svg_element("circle");
    			if (if_block) if_block.c();
    			attr(circle, "class", "strategy-circle svelte-wc34me");
    			attr(circle, "cx", circle_cx_value = /*strategy*/ ctx[59].x);
    			attr(circle, "cy", circle_cy_value = /*strategy*/ ctx[59].y);
    			attr(circle, "r", circle_r_value = /*strategy*/ ctx[59].radius);
    			attr(g, "class", "strategy-glyph svelte-wc34me");
    			set_style(g, "--strategy-fill", /*strategy*/ ctx[59].colors.fill);
    			set_style(g, "--strategy-stroke", /*strategy*/ ctx[59].colors.stroke);
    			attr(g, "role", "button");
    			attr(g, "tabindex", g_tabindex_value = /*disabled*/ ctx[0] ? -1 : 0);
    			attr(g, "aria-disabled", /*disabled*/ ctx[0]);
    			attr(g, "aria-label", g_aria_label_value = describe(/*strategy*/ ctx[59]));

    			attr(g, "aria-describedby", g_aria_describedby_value = /*tooltip*/ ctx[3] && /*tooltip*/ ctx[3].key === `configuration-${/*strategy*/ ctx[59].id}`
    			? tooltipId
    			: undefined);

    			attr(g, "aria-pressed", g_aria_pressed_value = /*activeId*/ ctx[9] === /*strategy*/ ctx[59].id);
    			attr(g, "data-strategy", g_data_strategy_value = /*strategy*/ ctx[59].id);
    			attr(g, "data-alpha", g_data_alpha_value = /*strategy*/ ctx[59].weights[0]);
    			attr(g, "data-beta", g_data_beta_value = /*strategy*/ ctx[59].weights[1]);
    			attr(g, "data-gamma", g_data_gamma_value = /*strategy*/ ctx[59].weights[2]);
    			attr(g, "data-accuracy", g_data_accuracy_value = /*strategy*/ ctx[59].accuracy);
    			attr(g, "data-configuration-label", g_data_configuration_label_value = /*strategy*/ ctx[59].displayId);
    			toggle_class(g, "active", /*activeId*/ ctx[9] === /*strategy*/ ctx[59].id);
    			this.first = g;
    		},
    		m(target, anchor) {
    			insert(target, g, anchor);
    			append(g, circle);
    			if (if_block) if_block.m(g, null);

    			if (!mounted) {
    				dispose = [
    					listen(circle, "mouseenter", mouseenter_handler),
    					listen(circle, "mouseleave", /*mouseleave_handler*/ ctx[39]),
    					listen(g, "click", click_handler),
    					listen(g, "keydown", keydown_handler),
    					listen(g, "mouseenter", mouseenter_handler_1),
    					listen(g, "mousemove", /*moveTooltip*/ ctx[26]),
    					listen(g, "mouseleave", /*hideTooltip*/ ctx[27]),
    					listen(g, "focus", focus_handler),
    					listen(g, "blur", /*hideTooltip*/ ctx[27])
    				];

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*plotted*/ 256 && circle_cx_value !== (circle_cx_value = /*strategy*/ ctx[59].x)) {
    				attr(circle, "cx", circle_cx_value);
    			}

    			if (dirty[0] & /*plotted*/ 256 && circle_cy_value !== (circle_cy_value = /*strategy*/ ctx[59].y)) {
    				attr(circle, "cy", circle_cy_value);
    			}

    			if (dirty[0] & /*plotted*/ 256 && circle_r_value !== (circle_r_value = /*strategy*/ ctx[59].radius)) {
    				attr(circle, "r", circle_r_value);
    			}

    			if (/*strategy*/ ctx[59].label) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1$1(ctx);
    					if_block.c();
    					if_block.m(g, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty[0] & /*plotted*/ 256) {
    				set_style(g, "--strategy-fill", /*strategy*/ ctx[59].colors.fill);
    			}

    			if (dirty[0] & /*plotted*/ 256) {
    				set_style(g, "--strategy-stroke", /*strategy*/ ctx[59].colors.stroke);
    			}

    			if (dirty[0] & /*disabled*/ 1 && g_tabindex_value !== (g_tabindex_value = /*disabled*/ ctx[0] ? -1 : 0)) {
    				attr(g, "tabindex", g_tabindex_value);
    			}

    			if (dirty[0] & /*disabled*/ 1) {
    				attr(g, "aria-disabled", /*disabled*/ ctx[0]);
    			}

    			if (dirty[0] & /*plotted*/ 256 && g_aria_label_value !== (g_aria_label_value = describe(/*strategy*/ ctx[59]))) {
    				attr(g, "aria-label", g_aria_label_value);
    			}

    			if (dirty[0] & /*tooltip, plotted*/ 264 && g_aria_describedby_value !== (g_aria_describedby_value = /*tooltip*/ ctx[3] && /*tooltip*/ ctx[3].key === `configuration-${/*strategy*/ ctx[59].id}`
    			? tooltipId
    			: undefined)) {
    				attr(g, "aria-describedby", g_aria_describedby_value);
    			}

    			if (dirty[0] & /*activeId, plotted*/ 768 && g_aria_pressed_value !== (g_aria_pressed_value = /*activeId*/ ctx[9] === /*strategy*/ ctx[59].id)) {
    				attr(g, "aria-pressed", g_aria_pressed_value);
    			}

    			if (dirty[0] & /*plotted*/ 256 && g_data_strategy_value !== (g_data_strategy_value = /*strategy*/ ctx[59].id)) {
    				attr(g, "data-strategy", g_data_strategy_value);
    			}

    			if (dirty[0] & /*plotted*/ 256 && g_data_alpha_value !== (g_data_alpha_value = /*strategy*/ ctx[59].weights[0])) {
    				attr(g, "data-alpha", g_data_alpha_value);
    			}

    			if (dirty[0] & /*plotted*/ 256 && g_data_beta_value !== (g_data_beta_value = /*strategy*/ ctx[59].weights[1])) {
    				attr(g, "data-beta", g_data_beta_value);
    			}

    			if (dirty[0] & /*plotted*/ 256 && g_data_gamma_value !== (g_data_gamma_value = /*strategy*/ ctx[59].weights[2])) {
    				attr(g, "data-gamma", g_data_gamma_value);
    			}

    			if (dirty[0] & /*plotted*/ 256 && g_data_accuracy_value !== (g_data_accuracy_value = /*strategy*/ ctx[59].accuracy)) {
    				attr(g, "data-accuracy", g_data_accuracy_value);
    			}

    			if (dirty[0] & /*plotted*/ 256 && g_data_configuration_label_value !== (g_data_configuration_label_value = /*strategy*/ ctx[59].displayId)) {
    				attr(g, "data-configuration-label", g_data_configuration_label_value);
    			}

    			if (dirty[0] & /*activeId, plotted*/ 768) {
    				toggle_class(g, "active", /*activeId*/ ctx[9] === /*strategy*/ ctx[59].id);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(g);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (488:18) {#each symbols as symbol, axis}
    function create_each_block_3(ctx) {
    	let span;
    	let t0_value = /*symbol*/ ctx[62] + "";
    	let t0;
    	let t1;
    	let t2_value = /*strategy*/ ctx[59].rawWeights[/*axis*/ ctx[64]].toFixed(2) + "";
    	let t2;

    	return {
    		c() {
    			span = element("span");
    			t0 = text(t0_value);
    			t1 = text("=");
    			t2 = text(t2_value);
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			append(span, t0);
    			append(span, t1);
    			append(span, t2);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*best, worst*/ 393216 && t2_value !== (t2_value = /*strategy*/ ctx[59].rawWeights[/*axis*/ ctx[64]].toFixed(2) + "")) set_data(t2, t2_value);
    		},
    		d(detaching) {
    			if (detaching) detach(span);
    		}
    	};
    }

    // (454:10) {#each ranking.entries as strategy (strategy.id)}
    function create_each_block_2(key_1, ctx) {
    	let li;
    	let button;
    	let span1;
    	let span0;
    	let t0_value = /*strategy*/ ctx[59].displayId + "";
    	let t0;
    	let strong;
    	let t1_value = /*strategy*/ ctx[59].accuracy.toFixed(2) + "";
    	let t1;
    	let t2;
    	let strong_aria_label_value;
    	let t3;
    	let span2;
    	let button_data_strategy_value;
    	let button_aria_pressed_value;
    	let button_aria_label_value;
    	let button_aria_describedby_value;
    	let t4;
    	let mounted;
    	let dispose;
    	let each_value_3 = /*symbols*/ ctx[20];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[45](/*strategy*/ ctx[59]);
    	}

    	function mouseenter_handler_2(...args) {
    		return /*mouseenter_handler_2*/ ctx[46](/*strategy*/ ctx[59], ...args);
    	}

    	function focus_handler_1(...args) {
    		return /*focus_handler_1*/ ctx[47](/*strategy*/ ctx[59], ...args);
    	}

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			li = element("li");
    			button = element("button");
    			span1 = element("span");
    			span0 = element("span");
    			t0 = text(t0_value);
    			strong = element("strong");
    			t1 = text(t1_value);
    			t2 = text("%");
    			t3 = space();
    			span2 = element("span");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t4 = space();
    			attr(span0, "class", "configuration-id svelte-wc34me");
    			attr(strong, "aria-label", strong_aria_label_value = "Accuracy: " + /*strategy*/ ctx[59].accuracy.toFixed(2) + "%");
    			attr(strong, "class", "svelte-wc34me");
    			attr(span1, "class", "ranking-summary svelte-wc34me");
    			attr(span2, "class", "ranking-weights svelte-wc34me");
    			attr(button, "type", "button");
    			attr(button, "class", "ranking-entry svelte-wc34me");
    			button.disabled = /*disabled*/ ctx[0];
    			attr(button, "data-strategy", button_data_strategy_value = /*strategy*/ ctx[59].id);
    			attr(button, "aria-pressed", button_aria_pressed_value = /*activeId*/ ctx[9] === /*strategy*/ ctx[59].id);
    			attr(button, "aria-label", button_aria_label_value = describe(/*strategy*/ ctx[59]));

    			attr(button, "aria-describedby", button_aria_describedby_value = /*tooltip*/ ctx[3] && /*tooltip*/ ctx[3].key === `configuration-${/*strategy*/ ctx[59].id}`
    			? tooltipId
    			: undefined);

    			toggle_class(button, "active", /*activeId*/ ctx[9] === /*strategy*/ ctx[59].id);
    			attr(li, "class", "svelte-wc34me");
    			this.first = li;
    		},
    		m(target, anchor) {
    			insert(target, li, anchor);
    			append(li, button);
    			append(button, span1);
    			append(span1, span0);
    			append(span0, t0);
    			append(span1, strong);
    			append(strong, t1);
    			append(strong, t2);
    			append(button, t3);
    			append(button, span2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(span2, null);
    				}
    			}

    			append(li, t4);

    			if (!mounted) {
    				dispose = [
    					listen(button, "click", click_handler_1),
    					listen(button, "mouseenter", mouseenter_handler_2),
    					listen(button, "mousemove", /*moveTooltip*/ ctx[26]),
    					listen(button, "mouseleave", /*hideTooltip*/ ctx[27]),
    					listen(button, "focus", focus_handler_1),
    					listen(button, "blur", /*hideTooltip*/ ctx[27]),
    					listen(button, "keydown", /*keydown_handler_1*/ ctx[48])
    				];

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*best, worst*/ 393216 && t0_value !== (t0_value = /*strategy*/ ctx[59].displayId + "")) set_data(t0, t0_value);
    			if (dirty[0] & /*best, worst*/ 393216 && t1_value !== (t1_value = /*strategy*/ ctx[59].accuracy.toFixed(2) + "")) set_data(t1, t1_value);

    			if (dirty[0] & /*best, worst*/ 393216 && strong_aria_label_value !== (strong_aria_label_value = "Accuracy: " + /*strategy*/ ctx[59].accuracy.toFixed(2) + "%")) {
    				attr(strong, "aria-label", strong_aria_label_value);
    			}

    			if (dirty[0] & /*best, worst, symbols*/ 1441792) {
    				each_value_3 = /*symbols*/ ctx[20];
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(span2, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_3.length;
    			}

    			if (dirty[0] & /*disabled*/ 1) {
    				button.disabled = /*disabled*/ ctx[0];
    			}

    			if (dirty[0] & /*best, worst*/ 393216 && button_data_strategy_value !== (button_data_strategy_value = /*strategy*/ ctx[59].id)) {
    				attr(button, "data-strategy", button_data_strategy_value);
    			}

    			if (dirty[0] & /*activeId, best, worst*/ 393728 && button_aria_pressed_value !== (button_aria_pressed_value = /*activeId*/ ctx[9] === /*strategy*/ ctx[59].id)) {
    				attr(button, "aria-pressed", button_aria_pressed_value);
    			}

    			if (dirty[0] & /*best, worst*/ 393216 && button_aria_label_value !== (button_aria_label_value = describe(/*strategy*/ ctx[59]))) {
    				attr(button, "aria-label", button_aria_label_value);
    			}

    			if (dirty[0] & /*tooltip, best, worst*/ 393224 && button_aria_describedby_value !== (button_aria_describedby_value = /*tooltip*/ ctx[3] && /*tooltip*/ ctx[3].key === `configuration-${/*strategy*/ ctx[59].id}`
    			? tooltipId
    			: undefined)) {
    				attr(button, "aria-describedby", button_aria_describedby_value);
    			}

    			if (dirty[0] & /*activeId, best, worst*/ 393728) {
    				toggle_class(button, "active", /*activeId*/ ctx[9] === /*strategy*/ ctx[59].id);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(li);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (445:4) {#each [{ key: "best", title: "Best 3", entries: best }, { key: "worst", title: "Worst 3", entries: worst }] as ranking}
    function create_each_block_1(ctx) {
    	let div;
    	let h3;
    	let t0_value = /*ranking*/ ctx[56].title + "";
    	let t0;
    	let t1;
    	let ol;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t2;
    	let div_class_value;
    	let div_aria_label_value;
    	let each_value_2 = /*ranking*/ ctx[56].entries;
    	const get_key = ctx => /*strategy*/ ctx[59].id;

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		let child_ctx = get_each_context_2(ctx, each_value_2, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block_2(key, child_ctx));
    	}

    	return {
    		c() {
    			div = element("div");
    			h3 = element("h3");
    			t0 = text(t0_value);
    			t1 = space();
    			ol = element("ol");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			attr(h3, "class", "svelte-wc34me");
    			attr(ol, "class", "svelte-wc34me");
    			attr(div, "class", div_class_value = "ranking-panel " + /*ranking*/ ctx[56].key + " svelte-wc34me");

    			attr(div, "aria-label", div_aria_label_value = /*ranking*/ ctx[56].key === "best"
    			? "Three highest-accuracy configurations"
    			: "Three lowest-accuracy configurations");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, h3);
    			append(h3, t0);
    			append(div, t1);
    			append(div, ol);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(ol, null);
    				}
    			}

    			append(div, t2);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*best, worst*/ 393216 && t0_value !== (t0_value = /*ranking*/ ctx[56].title + "")) set_data(t0, t0_value);

    			if (dirty[0] & /*disabled, best, worst, activeId, tooltip, select, showTooltip, moveTooltip, hideTooltip, symbols*/ 253100553) {
    				each_value_2 = /*ranking*/ ctx[56].entries;
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_2, each_1_lookup, ol, destroy_block, create_each_block_2, null, get_each_context_2);
    			}

    			if (dirty[0] & /*best, worst*/ 393216 && div_class_value !== (div_class_value = "ranking-panel " + /*ranking*/ ctx[56].key + " svelte-wc34me")) {
    				attr(div, "class", div_class_value);
    			}

    			if (dirty[0] & /*best, worst*/ 393216 && div_aria_label_value !== (div_aria_label_value = /*ranking*/ ctx[56].key === "best"
    			? "Three highest-accuracy configurations"
    			: "Three lowest-accuracy configurations")) {
    				attr(div, "aria-label", div_aria_label_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}
    		}
    	};
    }

    // (501:0) {#if tooltip && !disabled}
    function create_if_block$6(ctx) {
    	let div1;
    	let div0;
    	let t0_value = /*tooltip*/ ctx[3].title + "";
    	let t0;
    	let t1;
    	let ul;
    	let tooltipPortal_action;
    	let mounted;
    	let dispose;
    	let each_value = /*tooltip*/ ctx[3].items;
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	return {
    		c() {
    			div1 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(div0, "class", "tooltip-heading svelte-wc34me");
    			attr(ul, "class", "svelte-wc34me");
    			attr(div1, "id", tooltipId);
    			attr(div1, "class", "comparison-tooltip svelte-wc34me");
    			attr(div1, "role", "tooltip");
    			set_style(div1, "left", /*tooltipPosition*/ ctx[15].x + "px");
    			set_style(div1, "top", /*tooltipPosition*/ ctx[15].y + "px");
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, div0);
    			append(div0, t0);
    			append(div1, t1);
    			append(div1, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(ul, null);
    				}
    			}

    			/*div1_binding*/ ctx[49](div1);

    			if (!mounted) {
    				dispose = action_destroyer(tooltipPortal_action = tooltipPortal.call(null, div1));
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*tooltip*/ 8 && t0_value !== (t0_value = /*tooltip*/ ctx[3].title + "")) set_data(t0, t0_value);

    			if (dirty[0] & /*tooltip*/ 8) {
    				each_value = /*tooltip*/ ctx[3].items;
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty[0] & /*tooltipPosition*/ 32768) {
    				set_style(div1, "left", /*tooltipPosition*/ ctx[15].x + "px");
    			}

    			if (dirty[0] & /*tooltipPosition*/ 32768) {
    				set_style(div1, "top", /*tooltipPosition*/ ctx[15].y + "px");
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div1);
    			destroy_each(each_blocks, detaching);
    			/*div1_binding*/ ctx[49](null);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (512:6) {#each tooltip.items as item}
    function create_each_block$1(ctx) {
    	let li;
    	let t0_value = /*item*/ ctx[53].label + "";
    	let t0;
    	let t1;
    	let strong;
    	let t2_value = /*item*/ ctx[53].value + "";
    	let t2;
    	let t3;

    	return {
    		c() {
    			li = element("li");
    			t0 = text(t0_value);
    			t1 = text(": ");
    			strong = element("strong");
    			t2 = text(t2_value);
    			t3 = space();
    			attr(strong, "class", "svelte-wc34me");
    			attr(li, "class", "svelte-wc34me");
    		},
    		m(target, anchor) {
    			insert(target, li, anchor);
    			append(li, t0);
    			append(li, t1);
    			append(li, strong);
    			append(strong, t2);
    			append(li, t3);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*tooltip*/ 8 && t0_value !== (t0_value = /*item*/ ctx[53].label + "")) set_data(t0, t0_value);
    			if (dirty[0] & /*tooltip*/ 8 && t2_value !== (t2_value = /*item*/ ctx[53].value + "")) set_data(t2, t2_value);
    		},
    		d(detaching) {
    			if (detaching) detach(li);
    		}
    	};
    }

    function create_fragment$i(ctx) {
    	let section;
    	let div1;
    	let h2;
    	let t1;
    	let div0;
    	let t2;
    	let div3;
    	let div2;
    	let svg;
    	let path;
    	let path_d_value;
    	let each0_anchor;
    	let if_block1_anchor;
    	let each_blocks_3 = [];
    	let each1_lookup = new Map();
    	let each1_anchor;
    	let g0;
    	let text0;
    	let t3;
    	let text0_text_anchor_value;
    	let text0_x_value;
    	let text0_y_value;
    	let g1;
    	let text1;
    	let t4;
    	let text1_text_anchor_value;
    	let text1_x_value;
    	let text1_y_value;
    	let g2;
    	let text2;
    	let t5;
    	let text2_text_anchor_value;
    	let text2_x_value;
    	let text2_y_value;
    	let each_blocks_1 = [];
    	let each3_lookup = new Map();
    	let svg_viewBox_value;
    	let t6;
    	let t7;
    	let if_block2_anchor;
    	let if_block0 = /*configurations*/ ctx[5].length && create_if_block_4$1(ctx);
    	let each_value_7 = /*tickRatios*/ ctx[21].filter(func);
    	let each_blocks_4 = [];

    	for (let i = 0; i < each_value_7.length; i += 1) {
    		each_blocks_4[i] = create_each_block_7(get_each_context_7(ctx, each_value_7, i));
    	}

    	let if_block1 = /*weightGuide*/ ctx[16] && create_if_block_3$1(ctx);
    	let each_value_6 = /*plotted*/ ctx[8];
    	const get_key = ctx => /*strategy*/ ctx[59].id;

    	for (let i = 0; i < each_value_6.length; i += 1) {
    		let child_ctx = get_each_context_6(ctx, each_value_6, i);
    		let key = get_key(child_ctx);
    		each1_lookup.set(key, each_blocks_3[i] = create_each_block_6(key, child_ctx));
    	}

    	let each_value_5 = /*tickRatios*/ ctx[21];
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_5.length; i += 1) {
    		each_blocks_2[i] = create_each_block_5(get_each_context_5(ctx, each_value_5, i));
    	}

    	let each_value_4 = /*plotted*/ ctx[8];
    	const get_key_1 = ctx => /*strategy*/ ctx[59].id;

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		let child_ctx = get_each_context_4(ctx, each_value_4, i);
    		let key = get_key_1(child_ctx);
    		each3_lookup.set(key, each_blocks_1[i] = create_each_block_4(key, child_ctx));
    	}

    	let each_value_1 = [
    		{
    			key: "best",
    			title: "Best 3",
    			entries: /*best*/ ctx[18]
    		},
    		{
    			key: "worst",
    			title: "Worst 3",
    			entries: /*worst*/ ctx[17]
    		}
    	];

    	let each_blocks = [];

    	for (let i = 0; i < 2; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let if_block2 = /*tooltip*/ ctx[3] && !/*disabled*/ ctx[0] && create_if_block$6(ctx);

    	return {
    		c() {
    			section = element("section");
    			div1 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Weight Configuration Comparison";
    			t1 = space();
    			div0 = element("div");
    			if (if_block0) if_block0.c();
    			t2 = space();
    			div3 = element("div");
    			div2 = element("div");
    			svg = svg_element("svg");
    			path = svg_element("path");

    			for (let i = 0; i < each_blocks_4.length; i += 1) {
    				each_blocks_4[i].c();
    			}

    			each0_anchor = empty();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].c();
    			}

    			each1_anchor = empty();

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			g0 = svg_element("g");
    			text0 = svg_element("text");
    			t3 = text("α");
    			g1 = svg_element("g");
    			text1 = svg_element("text");
    			t4 = text("β");
    			g2 = svg_element("g");
    			text2 = svg_element("text");
    			t5 = text("γ");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t6 = space();

    			for (let i = 0; i < 2; i += 1) {
    				each_blocks[i].c();
    			}

    			t7 = space();
    			if (if_block2) if_block2.c();
    			if_block2_anchor = empty();
    			attr(h2, "id", "weight-comparison-title");
    			attr(h2, "class", "metric-view-title svelte-wc34me");
    			attr(div0, "class", "comparison-key svelte-wc34me");
    			attr(div1, "class", "comparison-header svelte-wc34me");
    			attr(path, "class", "triangle-fill svelte-wc34me");
    			attr(path, "d", path_d_value = "M" + /*vertices*/ ctx[6][0].x + "," + /*vertices*/ ctx[6][0].y + " L" + /*vertices*/ ctx[6][1].x + "," + /*vertices*/ ctx[6][1].y + " L" + /*vertices*/ ctx[6][2].x + "," + /*vertices*/ ctx[6][2].y + " Z");
    			attr(text0, "class", "ternary-axis svelte-wc34me");
    			attr(text0, "text-anchor", text0_text_anchor_value = /*annotations*/ ctx[10].alpha.anchor);
    			attr(text0, "x", text0_x_value = /*annotations*/ ctx[10].alpha.x);
    			attr(text0, "y", text0_y_value = /*annotations*/ ctx[10].alpha.y);
    			attr(g0, "class", "ternary-axis-label");
    			attr(g0, "data-axis", "alpha");
    			attr(g0, "role", "img");
    			attr(g0, "aria-label", "α: Confidence weight");
    			attr(text1, "class", "ternary-axis svelte-wc34me");
    			attr(text1, "text-anchor", text1_text_anchor_value = /*annotations*/ ctx[10].beta.anchor);
    			attr(text1, "x", text1_x_value = /*annotations*/ ctx[10].beta.x);
    			attr(text1, "y", text1_y_value = /*annotations*/ ctx[10].beta.y);
    			attr(g1, "class", "ternary-axis-label");
    			attr(g1, "data-axis", "beta");
    			attr(g1, "role", "img");
    			attr(g1, "aria-label", "β: Uncertainty weight");
    			attr(text2, "class", "ternary-axis svelte-wc34me");
    			attr(text2, "text-anchor", text2_text_anchor_value = /*annotations*/ ctx[10].gamma.anchor);
    			attr(text2, "x", text2_x_value = /*annotations*/ ctx[10].gamma.x);
    			attr(text2, "y", text2_y_value = /*annotations*/ ctx[10].gamma.y);
    			attr(g2, "class", "ternary-axis-label");
    			attr(g2, "data-axis", "gamma");
    			attr(g2, "role", "img");
    			attr(g2, "aria-label", "γ: Class balance weight");
    			attr(svg, "viewBox", svg_viewBox_value = "0 0 " + /*width*/ ctx[1] + " " + /*height*/ ctx[2]);
    			attr(svg, "role", "group");
    			attr(svg, "aria-label", "Ternary comparison of alpha, beta and gamma weights; circle area represents accuracy; darker purple means higher accuracy");
    			attr(svg, "shape-rendering", "geometricPrecision");
    			attr(svg, "class", "svelte-wc34me");
    			attr(div2, "class", "ternary-plot svelte-wc34me");
    			attr(div3, "class", "comparison-body svelte-wc34me");
    			attr(section, "class", "weight-comparison svelte-wc34me");
    			attr(section, "aria-labelledby", "weight-comparison-title");
    			toggle_class(section, "short", /*height*/ ctx[2] < 340);
    		},
    		m(target, anchor) {
    			insert(target, section, anchor);
    			append(section, div1);
    			append(div1, h2);
    			append(div1, t1);
    			append(div1, div0);
    			if (if_block0) if_block0.m(div0, null);
    			append(section, t2);
    			append(section, div3);
    			append(div3, div2);
    			append(div2, svg);
    			append(svg, path);

    			for (let i = 0; i < each_blocks_4.length; i += 1) {
    				if (each_blocks_4[i]) {
    					each_blocks_4[i].m(svg, null);
    				}
    			}

    			append(svg, each0_anchor);
    			if (if_block1) if_block1.m(svg, null);
    			append(svg, if_block1_anchor);

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				if (each_blocks_3[i]) {
    					each_blocks_3[i].m(svg, null);
    				}
    			}

    			append(svg, each1_anchor);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				if (each_blocks_2[i]) {
    					each_blocks_2[i].m(svg, null);
    				}
    			}

    			append(svg, g0);
    			append(g0, text0);
    			append(text0, t3);
    			append(svg, g1);
    			append(g1, text1);
    			append(text1, t4);
    			append(svg, g2);
    			append(g2, text2);
    			append(text2, t5);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				if (each_blocks_1[i]) {
    					each_blocks_1[i].m(svg, null);
    				}
    			}

    			/*div2_binding*/ ctx[44](div2);
    			append(div3, t6);

    			for (let i = 0; i < 2; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div3, null);
    				}
    			}

    			insert(target, t7, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert(target, if_block2_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (/*configurations*/ ctx[5].length) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_4$1(ctx);
    					if_block0.c();
    					if_block0.m(div0, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty[0] & /*vertices*/ 64 && path_d_value !== (path_d_value = "M" + /*vertices*/ ctx[6][0].x + "," + /*vertices*/ ctx[6][0].y + " L" + /*vertices*/ ctx[6][1].x + "," + /*vertices*/ ctx[6][1].y + " L" + /*vertices*/ ctx[6][2].x + "," + /*vertices*/ ctx[6][2].y + " Z")) {
    				attr(path, "d", path_d_value);
    			}

    			if (dirty[0] & /*interpolate, vertices, tickRatios*/ 6291520) {
    				each_value_7 = /*tickRatios*/ ctx[21].filter(func);
    				let i;

    				for (i = 0; i < each_value_7.length; i += 1) {
    					const child_ctx = get_each_context_7(ctx, each_value_7, i);

    					if (each_blocks_4[i]) {
    						each_blocks_4[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_4[i] = create_each_block_7(child_ctx);
    						each_blocks_4[i].c();
    						each_blocks_4[i].m(svg, each0_anchor);
    					}
    				}

    				for (; i < each_blocks_4.length; i += 1) {
    					each_blocks_4[i].d(1);
    				}

    				each_blocks_4.length = each_value_7.length;
    			}

    			if (/*weightGuide*/ ctx[16]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_3$1(ctx);
    					if_block1.c();
    					if_block1.m(svg, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty[0] & /*plotted*/ 256) {
    				each_value_6 = /*plotted*/ ctx[8];
    				each_blocks_3 = update_keyed_each(each_blocks_3, dirty, get_key, 1, ctx, each_value_6, each1_lookup, svg, destroy_block, create_each_block_6, each1_anchor, get_each_context_6);
    			}

    			if (dirty[0] & /*interpolate, vertices, tickRatios, annotations*/ 6292544) {
    				each_value_5 = /*tickRatios*/ ctx[21];
    				let i;

    				for (i = 0; i < each_value_5.length; i += 1) {
    					const child_ctx = get_each_context_5(ctx, each_value_5, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_2[i] = create_each_block_5(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(svg, g0);
    					}
    				}

    				for (; i < each_blocks_2.length; i += 1) {
    					each_blocks_2[i].d(1);
    				}

    				each_blocks_2.length = each_value_5.length;
    			}

    			if (dirty[0] & /*annotations*/ 1024 && text0_text_anchor_value !== (text0_text_anchor_value = /*annotations*/ ctx[10].alpha.anchor)) {
    				attr(text0, "text-anchor", text0_text_anchor_value);
    			}

    			if (dirty[0] & /*annotations*/ 1024 && text0_x_value !== (text0_x_value = /*annotations*/ ctx[10].alpha.x)) {
    				attr(text0, "x", text0_x_value);
    			}

    			if (dirty[0] & /*annotations*/ 1024 && text0_y_value !== (text0_y_value = /*annotations*/ ctx[10].alpha.y)) {
    				attr(text0, "y", text0_y_value);
    			}

    			if (dirty[0] & /*annotations*/ 1024 && text1_text_anchor_value !== (text1_text_anchor_value = /*annotations*/ ctx[10].beta.anchor)) {
    				attr(text1, "text-anchor", text1_text_anchor_value);
    			}

    			if (dirty[0] & /*annotations*/ 1024 && text1_x_value !== (text1_x_value = /*annotations*/ ctx[10].beta.x)) {
    				attr(text1, "x", text1_x_value);
    			}

    			if (dirty[0] & /*annotations*/ 1024 && text1_y_value !== (text1_y_value = /*annotations*/ ctx[10].beta.y)) {
    				attr(text1, "y", text1_y_value);
    			}

    			if (dirty[0] & /*annotations*/ 1024 && text2_text_anchor_value !== (text2_text_anchor_value = /*annotations*/ ctx[10].gamma.anchor)) {
    				attr(text2, "text-anchor", text2_text_anchor_value);
    			}

    			if (dirty[0] & /*annotations*/ 1024 && text2_x_value !== (text2_x_value = /*annotations*/ ctx[10].gamma.x)) {
    				attr(text2, "x", text2_x_value);
    			}

    			if (dirty[0] & /*annotations*/ 1024 && text2_y_value !== (text2_y_value = /*annotations*/ ctx[10].gamma.y)) {
    				attr(text2, "y", text2_y_value);
    			}

    			if (dirty[0] & /*plotted, disabled, tooltip, activeId, select, selectWithKeyboard, showTooltip, moveTooltip, hideTooltip, hoveredStrategyId*/ 260047641) {
    				each_value_4 = /*plotted*/ ctx[8];
    				each_blocks_1 = update_keyed_each(each_blocks_1, dirty, get_key_1, 1, ctx, each_value_4, each3_lookup, svg, destroy_block, create_each_block_4, null, get_each_context_4);
    			}

    			if (dirty[0] & /*width, height*/ 6 && svg_viewBox_value !== (svg_viewBox_value = "0 0 " + /*width*/ ctx[1] + " " + /*height*/ ctx[2])) {
    				attr(svg, "viewBox", svg_viewBox_value);
    			}

    			if (dirty[0] & /*best, worst, disabled, activeId, tooltip, select, showTooltip, moveTooltip, hideTooltip, symbols*/ 253100553) {
    				each_value_1 = [
    					{
    						key: "best",
    						title: "Best 3",
    						entries: /*best*/ ctx[18]
    					},
    					{
    						key: "worst",
    						title: "Worst 3",
    						entries: /*worst*/ ctx[17]
    					}
    				];

    				let i;

    				for (i = 0; i < 2; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div3, null);
    					}
    				}

    				for (; i < 2; i += 1) {
    					each_blocks[i].d(1);
    				}
    			}

    			if (dirty[0] & /*height*/ 4) {
    				toggle_class(section, "short", /*height*/ ctx[2] < 340);
    			}

    			if (/*tooltip*/ ctx[3] && !/*disabled*/ ctx[0]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block$6(ctx);
    					if_block2.c();
    					if_block2.m(if_block2_anchor.parentNode, if_block2_anchor);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(section);
    			if (if_block0) if_block0.d();
    			destroy_each(each_blocks_4, detaching);
    			if (if_block1) if_block1.d();

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].d();
    			}

    			destroy_each(each_blocks_2, detaching);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].d();
    			}

    			/*div2_binding*/ ctx[44](null);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(t7);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach(if_block2_anchor);
    		}
    	};
    }

    const tooltipId = "weight-configuration-tooltip";

    function describe(strategy) {
    	return `${strategy.displayId}: α=${strategy.rawWeights[0].toFixed(2)}, β=${strategy.rawWeights[1].toFixed(2)}, ` + `γ=${strategy.rawWeights[2].toFixed(2)}; best validation accuracy ${strategy.accuracy.toFixed(2)}%; best epoch ${strategy.bestEpoch}. ` + `Circle area is proportional to accuracy; darker purple means higher accuracy.${strategy.recommended
	? " Recommended configuration."
	: ""}`;
    }

    function tooltipPortal(node) {
    	// The metric views clip their contents. A body-level tooltip stays visible
    	// beside the plot and is removed when its Svelte block is destroyed.
    	document.body.appendChild(node);

    	return { destroy: () => node.remove() };
    }

    const func = ratio => ratio > 0 && ratio < 1;

    function instance$i($$self, $$props, $$invalidate) {
    	let configurations;
    	let minimumAccuracy;
    	let maximumAccuracy;
    	let accuracyGradient;
    	let ranked;
    	let best;
    	let worstCount;
    	let worst;
    	let activeId;
    	let layout;
    	let vertices;
    	let maximumRadius;
    	let annotations;
    	let coordinates;
    	let radiusScale;
    	let positioned;
    	let plotted;
    	let hoveredStrategy;
    	let weightGuide;
    	let { strategies = [] } = $$props;
    	let { selectedId = null } = $$props;
    	let { disabled = false } = $$props;
    	const dispatch = createEventDispatcher();
    	let plotContainer;
    	let width = 740;
    	let height = 580;
    	let rankingObstacles = [];
    	let tooltip = null;
    	let hoveredStrategyId = null;
    	let tooltipElement;
    	let tooltipAnchor = { x: 0, y: 0 };
    	let tooltipPosition = { x: 8, y: 8 };
    	const symbols = ["α", "β", "γ"];
    	const tickRatios = [0, 0.2, 0.4, 0.6, 0.8, 1];

    	const interpolate = (start, end, ratio) => ({
    		x: start.x + (end.x - start.x) * ratio,
    		y: start.y + (end.y - start.y) * ratio
    	});

    	function selectWithKeyboard(event, id) {
    		if (event.key === "Escape") hideTooltip();

    		if (event.key === "Enter" || event.key === " ") {
    			event.preventDefault();
    			select(id);
    		}
    	}

    	function select(id) {
    		if (!disabled) dispatch("select", { id });
    	}

    	function updateTooltipPosition() {
    		if (!tooltipElement) return;

    		$$invalidate(15, tooltipPosition = positionComparisonTooltip(
    			tooltipAnchor,
    			{
    				width: tooltipElement.offsetWidth,
    				height: tooltipElement.offsetHeight
    			},
    			{
    				width: document.documentElement.clientWidth,
    				height: window.innerHeight
    			}
    		));
    	}

    	async function showTooltip(event, details) {
    		if (disabled) return;
    		const rect = event.currentTarget.getBoundingClientRect();

    		tooltipAnchor = event.type === "focus"
    		? {
    				x: rect.left + rect.width / 2,
    				y: rect.top + rect.height / 2
    			}
    		: { x: event.clientX, y: event.clientY };

    		$$invalidate(3, tooltip = details);
    		await tick();
    		if (tooltip && tooltip.key === details.key && !disabled) updateTooltipPosition();
    	}

    	function moveTooltip(event) {
    		if (!tooltip) return;
    		tooltipAnchor = { x: event.clientX, y: event.clientY };
    		updateTooltipPosition();
    	}

    	function hideTooltip() {
    		$$invalidate(3, tooltip = null);
    	}

    	onMount(() => {
    		const measure = () => {
    			const rect = plotContainer.getBoundingClientRect();

    			if (rect.width > 0 && rect.height > 0) {
    				$$invalidate(1, width = rect.width);
    				$$invalidate(2, height = rect.height);
    			}

    			$$invalidate(30, rankingObstacles = [...plotContainer.parentElement.querySelectorAll(".ranking-panel")].map(panel => {
    				const bounds = panel.getBoundingClientRect();

    				return {
    					x: bounds.left - rect.left,
    					y: bounds.top - rect.top,
    					width: bounds.width,
    					height: bounds.height
    				};
    			}));

    			if (rect.width > 0 && rect.height > 0) {
    				dispatch("resize", {
    					width: getWeightComparisonPanelWidth(height, rankingObstacles)
    				});
    			}
    		};

    		measure();
    		const observer = new ResizeObserver(measure);
    		observer.observe(plotContainer);
    		observer.observe(plotContainer.parentElement);
    		plotContainer.parentElement.querySelectorAll(".ranking-panel").forEach(panel => observer.observe(panel));
    		return () => observer.disconnect();
    	});

    	const mouseenter_handler = strategy => $$invalidate(4, hoveredStrategyId = strategy.id);
    	const mouseleave_handler = () => $$invalidate(4, hoveredStrategyId = null);
    	const click_handler = strategy => select(strategy.id);
    	const keydown_handler = (strategy, event) => selectWithKeyboard(event, strategy.id);
    	const mouseenter_handler_1 = (strategy, event) => showTooltip(event, configurationTooltip(strategy));
    	const focus_handler = (strategy, event) => showTooltip(event, configurationTooltip(strategy));

    	function div2_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			plotContainer = $$value;
    			$$invalidate(13, plotContainer);
    		});
    	}

    	const click_handler_1 = strategy => select(strategy.id);
    	const mouseenter_handler_2 = (strategy, event) => showTooltip(event, configurationTooltip(strategy));
    	const focus_handler_1 = (strategy, event) => showTooltip(event, configurationTooltip(strategy));

    	const keydown_handler_1 = event => {
    		if (event.key === "Escape") hideTooltip();
    	};

    	function div1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			tooltipElement = $$value;
    			$$invalidate(14, tooltipElement);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('strategies' in $$props) $$invalidate(28, strategies = $$props.strategies);
    		if ('selectedId' in $$props) $$invalidate(29, selectedId = $$props.selectedId);
    		if ('disabled' in $$props) $$invalidate(0, disabled = $$props.disabled);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*strategies*/ 268435456) {
    			 $$invalidate(5, configurations = prepareWeightStrategies(strategies));
    		}

    		if ($$self.$$.dirty[0] & /*configurations*/ 32) {
    			 $$invalidate(12, minimumAccuracy = configurations.length
    			? Math.min(...configurations.map(strategy => strategy.accuracy))
    			: 0);
    		}

    		if ($$self.$$.dirty[0] & /*configurations*/ 32) {
    			 $$invalidate(11, maximumAccuracy = configurations.length
    			? Math.max(...configurations.map(strategy => strategy.accuracy))
    			: 0);
    		}

    		if ($$self.$$.dirty[0] & /*maximumAccuracy, minimumAccuracy*/ 6144) {
    			 $$invalidate(19, accuracyGradient = maximumAccuracy > minimumAccuracy
    			? `linear-gradient(to right, ${ACCURACY_PURPLE_PALETTE.join(", ")})`
    			: `linear-gradient(to right, ${ACCURACY_PURPLE_PALETTE[2]}, ${ACCURACY_PURPLE_PALETTE[2]})`);
    		}

    		if ($$self.$$.dirty[0] & /*configurations*/ 32) {
    			 $$invalidate(37, ranked = rankWeightConfigurations(configurations));
    		}

    		if ($$self.$$.dirty[1] & /*ranked*/ 64) {
    			 $$invalidate(18, best = ranked.slice(0, Math.min(3, Math.ceil(ranked.length / 2))));
    		}

    		if ($$self.$$.dirty[1] & /*ranked*/ 64) {
    			 $$invalidate(36, worstCount = Math.min(3, Math.floor(ranked.length / 2)));
    		}

    		if ($$self.$$.dirty[1] & /*worstCount, ranked*/ 96) {
    			 $$invalidate(17, worst = worstCount > 0
    			? ranked.slice(-worstCount).reverse()
    			: []);
    		}

    		if ($$self.$$.dirty[0] & /*configurations, selectedId*/ 536870944) {
    			 $$invalidate(9, activeId = configurations.some(strategy => strategy.id === selectedId)
    			? selectedId
    			: null);
    		}

    		if ($$self.$$.dirty[0] & /*width, height*/ 6) {
    			 $$invalidate(35, layout = getTernaryLayout(width, height));
    		}

    		if ($$self.$$.dirty[1] & /*layout*/ 16) {
    			 $$invalidate(6, { vertices, maximumRadius } = layout, vertices, ((($$invalidate(34, maximumRadius), $$invalidate(35, layout)), $$invalidate(1, width)), $$invalidate(2, height)));
    		}

    		if ($$self.$$.dirty[0] & /*width, rankingObstacles*/ 1073741826 | $$self.$$.dirty[1] & /*layout*/ 16) {
    			 $$invalidate(10, annotations = getTernaryAnnotations(layout, width, rankingObstacles));
    		}

    		if ($$self.$$.dirty[0] & /*configurations, vertices*/ 96) {
    			 $$invalidate(33, coordinates = configurations.map(strategy => ({
    				...strategy,
    				...projectSimplex(strategy.weights, vertices)
    			})));
    		}

    		if ($$self.$$.dirty[1] & /*coordinates, maximumRadius*/ 12) {
    			 $$invalidate(32, radiusScale = fitConfigurationRadius(coordinates, maximumRadius));
    		}

    		if ($$self.$$.dirty[0] & /*minimumAccuracy, maximumAccuracy*/ 6144 | $$self.$$.dirty[1] & /*coordinates, radiusScale*/ 6) {
    			 $$invalidate(31, positioned = coordinates.map(strategy => ({
    				...strategy,
    				radius: accuracyRadius(strategy.accuracy, radiusScale),
    				colors: accuracyColorStyle(strategy.accuracy, minimumAccuracy, maximumAccuracy)
    			})));
    		}

    		if ($$self.$$.dirty[0] & /*width, height, annotations, activeId*/ 1542 | $$self.$$.dirty[1] & /*positioned*/ 1) {
    			 $$invalidate(8, plotted = placeConfigurationLabels(positioned, width, height, annotations.obstacles).sort((a, b) => Number(a.id === activeId) - Number(b.id === activeId)));
    		}

    		if ($$self.$$.dirty[0] & /*disabled, tooltip, configurations*/ 41) {
    			 if (disabled || tooltip && tooltip.key.startsWith("configuration-") && !configurations.some(strategy => `configuration-${strategy.id}` === tooltip.key)) {
    				$$invalidate(4, hoveredStrategyId = null);
    				hideTooltip();
    			}
    		}

    		if ($$self.$$.dirty[0] & /*plotted, hoveredStrategyId*/ 272) {
    			 $$invalidate(7, hoveredStrategy = plotted.find(strategy => strategy.id === hoveredStrategyId) || null);
    		}

    		if ($$self.$$.dirty[0] & /*hoveredStrategy, vertices*/ 192) {
    			 $$invalidate(16, weightGuide = hoveredStrategy
    			? getWeightGuideCoordinates(hoveredStrategy.weights, vertices)
    			: null);
    		}
    	};

    	return [
    		disabled,
    		width,
    		height,
    		tooltip,
    		hoveredStrategyId,
    		configurations,
    		vertices,
    		hoveredStrategy,
    		plotted,
    		activeId,
    		annotations,
    		maximumAccuracy,
    		minimumAccuracy,
    		plotContainer,
    		tooltipElement,
    		tooltipPosition,
    		weightGuide,
    		worst,
    		best,
    		accuracyGradient,
    		symbols,
    		tickRatios,
    		interpolate,
    		selectWithKeyboard,
    		select,
    		showTooltip,
    		moveTooltip,
    		hideTooltip,
    		strategies,
    		selectedId,
    		rankingObstacles,
    		positioned,
    		radiusScale,
    		coordinates,
    		maximumRadius,
    		layout,
    		worstCount,
    		ranked,
    		mouseenter_handler,
    		mouseleave_handler,
    		click_handler,
    		keydown_handler,
    		mouseenter_handler_1,
    		focus_handler,
    		div2_binding,
    		click_handler_1,
    		mouseenter_handler_2,
    		focus_handler_1,
    		keydown_handler_1,
    		div1_binding
    	];
    }

    class WeightConfigurationComparison extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$i,
    			create_fragment$i,
    			safe_not_equal,
    			{
    				strategies: 28,
    				selectedId: 29,
    				disabled: 0
    			},
    			null,
    			[-1, -1, -1]
    		);
    	}
    }

    function parseAccuracyData(csvText) {
      return csvText.trim().split(/\r?\n/).slice(1).filter(Boolean).map((line) => {
        const values = line.split(',').map(Number);
        if (values.length !== 12 || values.some((value) => !Number.isFinite(value))) {
          throw new Error('Invalid accuracy CSV row');
        }
        return { epoch: values[0], accuracy: values[1] / 100, classAccuracies: values.slice(2).map((value) => value / 100) };
      });
    }

    async function fetchAccuracyData(dataPath) {
      const response = await fetch(`${dataPath}/accuracy_results.csv`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Unable to load accuracy data: HTTP ${response.status}`);
      return parseAccuracyData(await response.text());
    }

    function parseConfusionData(csvText, numClasses = 10) {
      return csvText.trim().split(/\r?\n/).slice(1).filter(Boolean).map((line) => {
        const values = line.split(',').map(Number);
        if (values.length !== 1 + numClasses * numClasses || values.some((value) => !Number.isInteger(value))) {
          throw new Error('Invalid confusion CSV row');
        }
        return { epoch: values[0], matrix: Array.from({ length: numClasses }, (_, row) =>
          values.slice(1 + row * numClasses, 1 + (row + 1) * numClasses)) };
      });
    }

    async function fetchConfusionData(dataPath) {
      const response = await fetch(`${dataPath}/confusion_matrices.csv`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Unable to load confusion data: HTTP ${response.status}`);
      return parseConfusionData(await response.text());
    }

    let statistics = null;
    const statisticsPromises = new Map();

    function fetchACCTStatistics(dataPath) {
      if (!statisticsPromises.has(dataPath)) {
        const promise = fetch(`${dataPath}/acct_class_statistics.json`, { cache: 'no-store' })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`Unable to load ACCT statistics: ${response.status}`);
            }
            return response.json();
          })
          .catch((error) => {
            statisticsPromises.delete(dataPath);
            throw error;
          });
        statisticsPromises.set(dataPath, promise);
      }
      return statisticsPromises.get(dataPath);
    }

    function activateACCTStatistics(data) {
      statistics = data;
    }

    async function loadACCTStatistics(dataPath) {
      const data = await fetchACCTStatistics(dataPath);
      activateACCTStatistics(data);
      return data;
    }

    function getACCTModelWeights(modelName) {
      const weights = statistics?.models?.[modelName]?.weights;
      const values = ["alpha", "beta", "gamma"].map((key) => Number(weights?.[key]));
      const sum = values.reduce((total, value) => total + value, 0);
      if (values.some((value) => !Number.isFinite(value) || value < 0) || Math.abs(sum - 1) > 1e-5) {
        return { ...ACCT_DEFAULT_PARAMETERS };
      }
      return { alpha: values[0] / sum, beta: values[1] / sum, gamma: values[2] / sum };
    }

    function getACCTClassStatistics(modelName, classIndex) {
      const modelStatistics = statistics?.models?.[modelName];
      const readValue = (key) => modelStatistics?.[key]?.[classIndex] == null
        ? NaN : Number(modelStatistics[key][classIndex]);

      return {
        S_c: readValue("S_c"),
        U_c: readValue("U_c"),
        B_c: readValue("B_c"),
        sampleCount: Number(modelStatistics?.candidate_count?.[classIndex]),
      };
    }

    function getACCTThresholdComponents(data, weights) {
      return [
        {
          key: "confidence",
          name: "α·S",
          sub: "c",
          value: weights.alpha * data.S_c,
          detail: `α = ${weights.alpha}; S_c = ${data.S_c} (mean predicted confidence); N_c = ${data.sampleCount}`,
        },
        {
          key: "uncertainty",
          name: "β·U",
          sub: "c",
          value: weights.beta * data.U_c,
          detail: `β = ${weights.beta}; U_c = ${data.U_c} (mean normalized entropy); N_c = ${data.sampleCount}`,
        },
        {
          key: "balance",
          name: "γ·B",
          sub: "c",
          value: weights.gamma * data.B_c,
          detail: `γ = ${weights.gamma}; B_c = ${data.B_c} (class candidate count / maximum class count); N_c = ${data.sampleCount}`,
        },
      ].map((component) => ({ ...component, rawValue: component.value }));
    }

    let initialization;
    let requestVersion = 0;
    const runCache = new Map();
    const catalogCache = new Map();

    async function json(url, optional = false) {
      const response = await fetch(url, { cache: 'no-store' });
      if (optional && response.status === 404) return null;
      // sirv --single serves index.html with HTTP 200 for absent asset paths.
      if (optional && response.headers?.get('content-type')?.includes('text/html')) return null;
      if (!response.ok) throw new Error(`Unable to load ${url}: HTTP ${response.status}`);
      return response.json();
    }

    function updateSelectedEpoch(name) {
      const entry = get_store_value(availableModelsStore).find((model) => model.name === name);
      if (entry) selectedEpochStore.set(entry.training_epoch_index);
    }

    async function fetchRunData(configuration) {
      const path = configuration.dataPath;
      if (!runCache.has(path)) {
        const promise = Promise.all([
          fetchAccuracyData(path), fetchConfusionData(path), fetchACCTStatistics(path),
          fetch(`${path}/learning_curve.json`, { cache: 'no-store' }).then(async (response) => {
            if (!response.ok) throw new Error(`Unable to load loss data: HTTP ${response.status}`);
            return (await response.text()).trim().split(/\r?\n/).filter(Boolean).map((line) => {
              const record = JSON.parse(line);
              return { epoch: record.epoch, loss: record.loss, loss_x: record.loss_x, loss_u: record.loss_u };
            });
          }),
        ]).then(([accuracy, confusion, statistics, loss]) => {
          for (const records of [accuracy, confusion, loss]) {
            if (records.length !== configuration.completedEpochs || records.some((record, index) => record.epoch !== index)) {
              throw new Error(`Incomplete epoch history for ${configuration.id}`);
            }
          }
          if (!statistics.models?.model_best || !configuration.models?.some((model) => model.name === 'model_best')) {
            throw new Error(`Missing best model for ${configuration.id}`);
          }
          for (const model of configuration.models) {
            const entry = statistics.models[model.name];
            if (!entry || entry.training_epoch_index !== model.training_epoch_index ||
                entry.class_names?.join('|') !== configuration.classNames.join('|') ||
                ['alpha', 'beta', 'gamma'].some((key) => !Number.isFinite(entry.weights?.[key]) ||
                  Math.abs(entry.weights[key] - configuration[key]) > 1e-6)) {
              throw new Error(`Checkpoint statistics do not match ${configuration.datasetId}/${configuration.id}/${model.name}`);
            }
          }
          return { accuracy, confusion, statistics, loss };
        }).catch((error) => { runCache.delete(path); throw error; });
        runCache.set(path, promise);
      }
      return runCache.get(path);
    }

    function commitRun(configuration, data, dataset, catalog) {
      // No store changes until all metrics load and agree. Dataset and weight
      // changes share one request generation, so a stale response cannot win.
      activateACCTStatistics(data.statistics);
      if (dataset) {
        activateClasses(dataset.classNames);
        classNamesStore.set([...dataset.classNames]);
        const images = dataset.id === 'cifar10' ? ORIGINAL_IMAGES : demoImages(dataset.classNames, Boolean(dataset.legacy));
        imageOptionsStore.set(images);
        imageRootStore.set(dataset.id === 'cifar10' ? ORIGINAL_IMAGE_ROOT : dataset.imageRoot);
        imagePreviewRootStore.set(dataset.id === 'cifar10' ? ORIGINAL_IMAGE_ROOT :
          dataset.previewImageRoot || dataset.imageRoot);
        imageVersionStore.set(dataset.imageVersion || '');
        customImageStore.set(false);
        selectedImageStore.set(images[0].file);
        selectedDatasetStore.set({ ...dataset, epochs: catalog.epochs });
        weightConfigurationsStore.set(catalog.configurations);
      }
      accuracyData.set(data.accuracy);
      confusionData.set(data.confusion);
      lossData.set(data.loss);
      availableModelsStore.set(configuration.models);
      lastEpochStore.set(configuration.lastEpoch);
      alphaStore.set(configuration.alpha);
      betaStore.set(configuration.beta);
      gammaStore.set(configuration.gamma);
      selectedEpochStore.set(configuration.bestEpoch);
      model_nameStore.set('model_best');
      trainingDataPathStore.set(configuration.dataPath);
      selectedWeightConfigurationStore.set(configuration);
    }

    async function selectWeightConfiguration(id) {
      const cfg = get_store_value(weightConfigurationsStore).find((item) => item.id === id);
      if (!cfg) throw new Error(`Unknown configuration ${id}`);
      if (get_store_value(selectedWeightConfigurationStore)?.id === id && !get_store_value(runErrorStore) && !get_store_value(runLoadingStore)) return true;
      const version = ++requestVersion;
      runLoadingStore.set(true);
      runErrorStore.set('');
      try {
        const data = await fetchRunData(cfg);
        if (version !== requestVersion) return false;
        commitRun(cfg, data);
        return true;
      } catch (error) {
        if (version === requestVersion) runErrorStore.set(error.message);
        throw error;
      } finally { if (version === requestVersion) runLoadingStore.set(false); }
    }

    async function loadCatalog(dataset) {
      if (!catalogCache.has(dataset.id)) {
        const promise = (async () => {
          let catalog;
          if (dataset.legacy) {
            const [statistics, summary] = await Promise.all([
              fetchACCTStatistics('/assets/data'), json('/assets/data/training_run_summary.json')]);
            const best = statistics.models.model_best;
            const models = Object.values(statistics.models).map((model) => ({
              name: model.checkpoint, training_epoch_index: model.training_epoch_index,
              label: `Epoch ${model.training_epoch_index}${model.checkpoint === 'model_best' ? ' (best)' : ''}`,
            }));
            catalog = { dataset: 'CIFAR-10', numLabeled: 4000, epochs: summary.completed_epochs,
              classNames: best.class_names, defaultConfigurationId: 'Legacy', configurations: [{
                id: 'Legacy', ...best.weights, recommended: false, simulated: false,
                accuracy: summary.best_validation_accuracy_percent, bestEpoch: best.training_epoch_index,
                lastEpoch: summary.completed_epochs - 1, completedEpochs: summary.completed_epochs,
                dataPath: '/assets/data', models,
              }] };
          } else {
            catalog = await json(dataset.catalogPath);
            if (catalog.dataset !== dataset.name || catalog.numLabeled !== dataset.numLabeled ||
                catalog.epochs !== 300 || catalog.configurations?.length !== 12 ||
                catalog.classNames?.join('|') !== dataset.classNames.join('|')) {
              throw new Error(`Invalid ${dataset.name} twelve-configuration catalog`);
            }
            if (catalog.configurations.some((cfg) => cfg.completedEpochs !== 300 || cfg.lastEpoch !== 299 ||
                !Number.isInteger(cfg.bestEpoch) || cfg.bestEpoch < 0 || cfg.bestEpoch > 299 || cfg.simulated !== false ||
                !Number.isFinite(cfg.accuracy) || cfg.accuracy < 0 || cfg.accuracy > 100 ||
                ['alpha', 'beta', 'gamma'].some((key) => !Number.isFinite(cfg[key]) || cfg[key] < 0 || cfg[key] > 1) ||
                Math.abs(cfg.alpha + cfg.beta + cfg.gamma - 1) > 1e-6)) {
              throw new Error('Catalog contains incomplete or non-real training results');
            }
            if (catalog.selectionSplit !== 'validation' || new Set(catalog.configurations.map((cfg) => cfg.id)).size !== 12) {
              throw new Error('Configuration ranking requires unique, real validation results');
            }
          }
          catalog.configurations = catalog.configurations.map((cfg) => {
            if (!cfg.dataPath.startsWith('/assets/data/') && cfg.dataPath !== '/assets/data') throw new Error('Invalid run data path');
            return { ...cfg, datasetId: dataset.id, numLabeled: catalog.numLabeled, epochs: catalog.epochs,
              classNames: [...dataset.classNames], legacy: Boolean(dataset.legacy),
              dataPath: dataset.legacy ? '/assets/data' : cfg.dataPath.replace(/^\/assets\/data/, dataset.dataRoot) };
          });
          const best = rankWeightConfigurations(catalog.configurations)[0];
          if (!best) throw new Error('No real configuration has a valid accuracy');
          // Even an older catalog with a fixed recommended ID must open the actual
          // highest-performing run; ties follow the same rule as the Best ranking.
          catalog.defaultConfigurationId = best.id;
          catalog.highestValidationAccuracyId = best.id;
          return catalog;
        })().catch((error) => { catalogCache.delete(dataset.id); throw error; });
        catalogCache.set(dataset.id, promise);
      }
      return catalogCache.get(dataset.id);
    }

    async function selectDataset(id) {
      const dataset = get_store_value(datasetsStore).find((item) => item.id === id);
      if (!dataset?.available) {
        throw new Error(`${dataset?.name || id} results are not installed. Restore the exported runtime assets in public/assets/data and reload.`);
      }
      if (get_store_value(selectedDatasetStore)?.id === id && !get_store_value(runErrorStore) && !get_store_value(runLoadingStore)) return true;
      const version = ++requestVersion;
      runLoadingStore.set(true);
      runErrorStore.set('');
      try {
        const catalog = await loadCatalog(dataset);
        const cfg = catalog.configurations.find((item) => item.id === catalog.defaultConfigurationId);
        if (!cfg) throw new Error('Missing default configuration');
        const data = await fetchRunData(cfg);
        if (version !== requestVersion) return false;
        commitRun(cfg, data, dataset, catalog);
        return true;
      } catch (error) {
        if (version === requestVersion) runErrorStore.set(error.message);
        throw error;
      } finally { if (version === requestVersion) runLoadingStore.set(false); }
    }

    function initializeRunCatalog() {
      if (!initialization) {
        initialization = (async () => {
          const registry = await json('/assets/data/datasets.json', true);
          let datasets;
          if (registry) {
            datasets = DATASETS.map((definition) => ({ ...definition,
              ...registry.datasets.find((entry) => entry.id === definition.id) }));
          } else {
            const rootCatalog = await json('/assets/data/weight_configurations.json', true);
            datasets = DATASETS.map((item) => item.id === 'cifar10' ? {
              ...item, available: true, legacy: !rootCatalog, dataRoot: '/assets/data',
              catalogPath: '/assets/data/weight_configurations.json', imageRoot: '/assets/img',
            } : { ...item, available: false });
          }
          datasetsStore.set(datasets);
          const defaultId = datasets.find((item) => item.id === registry?.defaultDatasetId && item.available)?.id ||
            datasets.find((item) => item.id === 'cifar10' && item.available)?.id ||
            datasets.find((item) => item.available)?.id;
          if (!defaultId) throw new Error('No trained dataset is installed');
          await selectDataset(defaultId);
          return get_store_value(selectedDatasetStore);
        })().catch((error) => {
          initialization = null;
          runLoadingStore.set(false);
          runErrorStore.set(error.message);
          throw error;
        });
      }
      return initialization;
    }

    /* src\overview\Plot.svelte generated by Svelte v3.59.2 */

    function create_fragment$j(ctx) {
    	let div4;
    	let div3;
    	let div0;
    	let accuracyline;
    	let t0;
    	let div1;
    	let confusion;
    	let t1;
    	let div2;
    	let weightconfigurationcomparison;
    	let div3_style_value;
    	let current;

    	accuracyline = new AccuracyLine({
    			props: { epoch: /*$lastEpochStore*/ ctx[2] }
    		});

    	confusion = new Confusion({});
    	confusion.$on("fit", /*fitMatrix*/ ctx[7]);

    	weightconfigurationcomparison = new WeightConfigurationComparison({
    			props: {
    				strategies: /*$weightConfigurationsStore*/ ctx[3],
    				selectedId: /*$selectedWeightConfigurationStore*/ ctx[4]
    				? /*$selectedWeightConfigurationStore*/ ctx[4].id
    				: null,
    				disabled: /*$runLoadingStore*/ ctx[5] || /*$modelLoadingStore*/ ctx[6]
    			}
    		});

    	weightconfigurationcomparison.$on("select", /*select*/ ctx[9]);
    	weightconfigurationcomparison.$on("resize", /*resizeComparison*/ ctx[8]);

    	return {
    		c() {
    			div4 = element("div");
    			div3 = element("div");
    			div0 = element("div");
    			create_component(accuracyline.$$.fragment);
    			t0 = space();
    			div1 = element("div");
    			create_component(confusion.$$.fragment);
    			t1 = space();
    			div2 = element("div");
    			create_component(weightconfigurationcomparison.$$.fragment);
    			attr(div0, "id", "accuracy-area");
    			attr(div0, "class", "metric-div svelte-f8kcds");
    			attr(div1, "id", "confusion-area");
    			attr(div1, "class", "metric-div svelte-f8kcds");
    			attr(div2, "id", "weight-comparison-area");
    			attr(div2, "class", "metric-div svelte-f8kcds");
    			attr(div3, "id", "performance-container");

    			attr(div3, "style", div3_style_value = /*comparisonWidth*/ ctx[0] === null
    			? undefined
    			: `--weight-comparison-width: ${/*comparisonWidth*/ ctx[0]}px;`);

    			attr(div3, "class", "svelte-f8kcds");
    			attr(div4, "class", "charts svelte-f8kcds");
    			set_style(div4, "--metric-row-height", /*metricHeight*/ ctx[1] + "px");
    		},
    		m(target, anchor) {
    			insert(target, div4, anchor);
    			append(div4, div3);
    			append(div3, div0);
    			mount_component(accuracyline, div0, null);
    			append(div3, t0);
    			append(div3, div1);
    			mount_component(confusion, div1, null);
    			append(div3, t1);
    			append(div3, div2);
    			mount_component(weightconfigurationcomparison, div2, null);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const accuracyline_changes = {};
    			if (dirty & /*$lastEpochStore*/ 4) accuracyline_changes.epoch = /*$lastEpochStore*/ ctx[2];
    			accuracyline.$set(accuracyline_changes);
    			const weightconfigurationcomparison_changes = {};
    			if (dirty & /*$weightConfigurationsStore*/ 8) weightconfigurationcomparison_changes.strategies = /*$weightConfigurationsStore*/ ctx[3];

    			if (dirty & /*$selectedWeightConfigurationStore*/ 16) weightconfigurationcomparison_changes.selectedId = /*$selectedWeightConfigurationStore*/ ctx[4]
    			? /*$selectedWeightConfigurationStore*/ ctx[4].id
    			: null;

    			if (dirty & /*$runLoadingStore, $modelLoadingStore*/ 96) weightconfigurationcomparison_changes.disabled = /*$runLoadingStore*/ ctx[5] || /*$modelLoadingStore*/ ctx[6];
    			weightconfigurationcomparison.$set(weightconfigurationcomparison_changes);

    			if (!current || dirty & /*comparisonWidth*/ 1 && div3_style_value !== (div3_style_value = /*comparisonWidth*/ ctx[0] === null
    			? undefined
    			: `--weight-comparison-width: ${/*comparisonWidth*/ ctx[0]}px;`)) {
    				attr(div3, "style", div3_style_value);
    			}

    			if (!current || dirty & /*metricHeight*/ 2) {
    				set_style(div4, "--metric-row-height", /*metricHeight*/ ctx[1] + "px");
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(accuracyline.$$.fragment, local);
    			transition_in(confusion.$$.fragment, local);
    			transition_in(weightconfigurationcomparison.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(accuracyline.$$.fragment, local);
    			transition_out(confusion.$$.fragment, local);
    			transition_out(weightconfigurationcomparison.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div4);
    			destroy_component(accuracyline);
    			destroy_component(confusion);
    			destroy_component(weightconfigurationcomparison);
    		}
    	};
    }

    function instance$j($$self, $$props, $$invalidate) {
    	let $lastEpochStore;
    	let $weightConfigurationsStore;
    	let $selectedWeightConfigurationStore;
    	let $runLoadingStore;
    	let $modelLoadingStore;
    	component_subscribe($$self, lastEpochStore, $$value => $$invalidate(2, $lastEpochStore = $$value));
    	component_subscribe($$self, weightConfigurationsStore, $$value => $$invalidate(3, $weightConfigurationsStore = $$value));
    	component_subscribe($$self, selectedWeightConfigurationStore, $$value => $$invalidate(4, $selectedWeightConfigurationStore = $$value));
    	component_subscribe($$self, runLoadingStore, $$value => $$invalidate(5, $runLoadingStore = $$value));
    	component_subscribe($$self, modelLoadingStore, $$value => $$invalidate(6, $modelLoadingStore = $$value));
    	let comparisonWidth = null;
    	let metricHeight = 340;

    	function fitMatrix(event) {
    		$$invalidate(1, metricHeight = event.detail.height);
    	}

    	function resizeComparison(event) {
    		const width = event.detail.width;

    		if (Number.isFinite(width) && width > 0 && (comparisonWidth === null || Math.abs(width - comparisonWidth) > 0.5)) {
    			$$invalidate(0, comparisonWidth = width);
    		}
    	}

    	async function select(event) {
    		try {
    			await selectWeightConfiguration(event.detail.id);
    		} catch(error) {
    			console.error('Unable to select configuration:', error);
    		}
    	}

    	return [
    		comparisonWidth,
    		metricHeight,
    		$lastEpochStore,
    		$weightConfigurationsStore,
    		$selectedWeightConfigurationStore,
    		$runLoadingStore,
    		$modelLoadingStore,
    		fitMatrix,
    		resizeComparison,
    		select
    	];
    }

    class Plot extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$j, create_fragment$j, safe_not_equal, {});
    	}
    }

    // The exported classifier is BatchNorm -> ReLU -> 2x2 max pool -> linear.
    // Its gradients can be evaluated from inference outputs without retraining.
    function computeGradCAM(results, weights, variance, gamma, epsilon = 1e-5) {
      const activation = results.block_3_layer_4_out;
      const normalized = results.norm;
      const activated = results.relu;
      const pooled = results.pool;
      const logits = results.output;
      if (!activation || !normalized || !activated || !pooled || !logits) {
        throw new Error("Grad-CAM requires the exported classifier feature maps.");
      }

      const [, channels, height, width] = activation.dims;
      const [, poolChannels, poolHeight, poolWidth] = pooled.dims;
      const plane = height * width;
      const poolPlane = poolHeight * poolWidth;
      if (
        channels !== poolChannels || height !== poolHeight * 2 ||
        width !== poolWidth * 2 || weights.length !== logits.data.length * channels * poolPlane ||
        variance.length !== channels || gamma.length !== channels
      ) {
        throw new Error("Grad-CAM classifier dimensions do not match the exported weights.");
      }

      let target = 0;
      for (let i = 1; i < logits.data.length; i++) {
        if (logits.data[i] > logits.data[target]) target = i;
      }

      const values = new Float64Array(plane);
      const classOffset = target * channels * poolPlane;
      for (let channel = 0; channel < channels; channel++) {
        const offset = channel * plane;
        const slope = gamma[channel] / Math.sqrt(variance[channel] + epsilon);
        let gradientSum = 0;
        for (let row = 0; row < poolHeight; row++) {
          for (let column = 0; column < poolWidth; column++) {
            let selected = offset + row * 2 * width + column * 2;
            for (const index of [selected + 1, selected + width, selected + width + 1]) {
              if (activated.data[index] > activated.data[selected]) selected = index;
            }
            if (normalized.data[selected] > 0) {
              gradientSum += weights[classOffset + channel * poolPlane + row * poolWidth + column] * slope;
            }
          }
        }
        const channelWeight = gradientSum / plane;
        for (let pixel = 0; pixel < plane; pixel++) {
          values[pixel] += channelWeight * activation.data[offset + pixel];
        }
      }

      let min = Infinity;
      let max = -Infinity;
      for (let pixel = 0; pixel < plane; pixel++) {
        values[pixel] = Math.max(0, values[pixel]);
        min = Math.min(min, values[pixel]);
        max = Math.max(max, values[pixel]);
      }
      return { values, min, max, width, height, target };
    }

    function normalizeColorValue(value, min, max) {
      return max > min ? Math.max(0, Math.min(1, (value - min) / (max - min))) : 0.5;
    }

    // Blue -> cyan -> green -> yellow -> red, shared by the heatmap and legend.
    function gradCAMColor(t) {
      t = Math.max(0, Math.min(1, t));
      return [
        255 * Math.max(0, Math.min(1, 4 * t - 2)),
        255 * Math.max(0, Math.min(1, 4 * t, 4 * (1 - t))),
        255 * Math.max(0, Math.min(1, 2 - 4 * t)),
      ];
    }

    function formatColorValue(value) {
      if (!Number.isFinite(value)) return "—";
      const label = value.toFixed(2);
      return label === "-0.00" ? "0.00" : label;
    }

    function renderGradCAM(cam, input, mean, std) {
      const [height, width] = input.shape;
      const pixels = input.dataSync();
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      const image = context.createImageData(width, height);
      const range = Math.max(cam.max - cam.min, 1e-12);

      for (let row = 0; row < height; row++) {
        const y = Math.max(0, Math.min(cam.height - 1, (row + 0.5) * cam.height / height - 0.5));
        const y0 = Math.floor(y);
        const y1 = Math.min(y0 + 1, cam.height - 1);
        for (let column = 0; column < width; column++) {
          const x = Math.max(0, Math.min(cam.width - 1, (column + 0.5) * cam.width / width - 0.5));
          const x0 = Math.floor(x);
          const x1 = Math.min(x0 + 1, cam.width - 1);
          const top = cam.values[y0 * cam.width + x0] * (1 - (x - x0)) + cam.values[y0 * cam.width + x1] * (x - x0);
          const bottom = cam.values[y1 * cam.width + x0] * (1 - (x - x0)) + cam.values[y1 * cam.width + x1] * (x - x0);
          const value = top * (1 - (y - y0)) + bottom * (y - y0);
          const color = gradCAMColor((value - cam.min) / range);
          const pixel = row * width + column;
          for (let channel = 0; channel < 3; channel++) {
            const original = (pixels[pixel * 3 + channel] * std[channel] + mean[channel]) * 255;
            image.data[pixel * 4 + channel] = Math.max(0, Math.min(255, Math.floor(original * 0.55 + color[channel] * 0.45)));
          }
          image.data[pixel * 4 + 3] = 255;
        }
      }
      context.putImageData(image, 0, 0);
      return canvas.toDataURL();
    }

    /* global tf */

    // Network input image size
    const networkInputSize = 32;
    const batchNormEpsilon = 1e-5;
    const cifar10Mean = [0.4914, 0.4822, 0.4465];
    const cifar10Std = [0.2471, 0.2435, 0.2616];
    const binaryAssetVersion = "20260923-norm-v1";

    // Enum of node types
    const nodeType = {
      INPUT: "input",
      BLOCK_OUT: "block_out",
      LAYER_OUT: "layer_out",
      CONV: "conv",
      POOL: "pool",
      RELU: "relu",
      NORM: "norm",
      FC: "fc",
      FLATTEN: "flatten",
    };

    class Node {
      /**
       * Class structure for each neuron node.
       *
       * @param {string} layerName Name of the node's layer.
       * @param {int} index Index of this node in its layer.
       * @param {string} type Node type {input, conv, pool, relu, fc}.
       * @param {number[]} output Output of this node.
       * @param {Array} intermediateOutputs Intermediate outputs for this node.
       */
      constructor(layerName, index, type, output, bias = 0) {
        this.layerName = layerName;
        this.bias = bias;
        this.index = index;
        this.type = type;
        this.output = output;
        // Weights are stored in the links
        this.inputLinks = [];
        this.outputLinks = [];
        // Store hidden intermediate nodes (not in visible cnn structure yet)
      }
    }

    class Link {
      /**
       * Class structure for each link between two nodes.
       *
       * @param {Node} source Source node.
       * @param {Node} dest Target node.
       * @param {number} weight Weight associated to this link. It can be a number,
       *  1D array, or 2D array.
       */
      constructor(
        source,
        dest,
        weight = [],
        mean = null,
        variance = null,
        gamma = null,
        beta = null,
        epsilon = null
      ) {
        this.source = source;
        this.dest = dest;
        this.weight = weight;
        this.mean = mean;
        this.variance = variance;
        this.gamma = gamma;
        this.beta = beta;
        this.epsilon = epsilon;
      }
    }
    async function loadBinaryWeights(filePath, shape, dtype = "float32") {
      const versionedFilePath = `${filePath}${filePath.includes("?") ? "&" : "?"}v=${binaryAssetVersion}`;
      const response = await fetch(versionedFilePath, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to fetch ${filePath}: ${response.statusText}`);
      }
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/html")) {
        throw new Error(`Expected binary weights at ${filePath}, but received HTML`);
      }
      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength % Float32Array.BYTES_PER_ELEMENT !== 0) {
        throw new Error(`Invalid float32 weight file: ${filePath}`);
      }
      let typedArray;
      if (dtype === "float32") {

        typedArray = new Float32Array(arrayBuffer);
      } else {
        throw new Error(`Unsupported dtype: ${dtype}`);
      }

      // Keep a flat float32 buffer; each layer applies its own weight shape.
      return typedArray;
    }

    /**
     * Construct a CNN with given extracted outputs from every layer.
     *
     * @param {number[][]} allOutputs Array of outputs for each layer.
     *  allOutputs[i][j] is the output for layer i node j.
     * @param {Model} model Loaded tf.js model.
     * @param {Tensor} inputImageTensor Loaded input image tensor.
     */
    const constructCNNFromOutputs = async (
      allOutputs,
      model,
      inputImageTensor,
      model_name,
      dataPath
    ) => {
      let cnn = [];
      let classifierWeights;
      let normalizationVariance;
      let normalizationGamma;
      // Add the first layer (input layer)
      let inputLayer = [];
      let inputShape = inputImageTensor.shape;
      let inputImageArray = tf.tidy(() => inputImageTensor.transpose([2, 0, 1]).arraySync());
      
      // First layer's three nodes' outputs are the channels of inputImageArray
      for (let i = 0; i < inputShape[2]; i++) {
        let node = new Node("input", i, nodeType.INPUT, inputImageArray[i], 0);
        inputLayer.push(node);
      }
      cnn.push(inputLayer); // Add the first layer (input layer)
      let curLayerIndex = 1;

      for (let l = 0; l < allOutputs.length; l++) {
        let layer = allOutputs[l];

        let outputs = tf.tidy(() => tf.tensor(
            allOutputs[l].tensor.data,
            allOutputs[l].tensor.dims,
            allOutputs[l].tensor.type
          )
          .squeeze().arraySync());

        let curLayerNodes = [];
        let curLayerType;

        // Identify layer type based on the layer name
        if (layer.name.includes("conv")) {
          curLayerType = nodeType.CONV;
        } else if (layer.name.includes("layer_4_out")) {
          curLayerType = nodeType.BLOCK_OUT;
        } else if (layer.name.includes("block")) {
          curLayerType = nodeType.LAYER_OUT;
        } else if (layer.name.includes("pool")) {
          curLayerType = nodeType.POOL;
        } else if (layer.name.includes("relu")) {
          curLayerType = nodeType.RELU;
        } else if (layer.name.includes("output")) {
          curLayerType = nodeType.FC;
        } else if (layer.name.includes("flatten")) {
          curLayerType = nodeType.FLATTEN;
        } else if (layer.name.includes("norm")) {
          curLayerType = nodeType.NORM;
        } else {
          continue;
        }

        // Construct this layer based on its layer type
        switch (curLayerType) {
          case nodeType.CONV: {
            // Load weights from binary file
            const weights = await loadBinaryWeights(
              `${dataPath}/${model_name}/${layer.name}.bin`
            );
            const kernelWeight = tf.tidy(() => tf.tensor(weights, [16, 3, 3, 3]).arraySync());
            for (let i = 0; i < Math.min(10, outputs.length); i++) {
              let nodeOutput;
              if (Array.isArray(outputs[i])) {
                if (Array.isArray(outputs[i][0])) {
                  nodeOutput = outputs[i]; // already [row][col]
                } else {
                  nodeOutput = [outputs[i]]; // it's 1D, make it 2D
                }
              } else if (typeof outputs[i] === "number") {
                nodeOutput = [[outputs[i]]]; // scalar, make 2D
              } else {
                
                nodeOutput = [[0]]; // fallback dummy
              }
              let node = new Node(layer.name, i, curLayerType, nodeOutput);

              // Add weight
              for (let j = 0; j < cnn[curLayerIndex - 1].length; j++) {
                let preNode = cnn[curLayerIndex - 1][j];
                let curLink = new Link(preNode, node, kernelWeight[i][j]);
                preNode.outputLinks.push(curLink);
                node.inputLinks.push(curLink);
              }

              curLayerNodes.push(node);
            }
            break;
          }
          case nodeType.LAYER_OUT: {
            for (let i = 0; i < Math.min(10, outputs.length); i++) {
              let nodeOutput;
              if (Array.isArray(outputs[i])) {
                if (Array.isArray(outputs[i][0])) {
                  nodeOutput = outputs[i]; // already [row][col]
                } else {
                  nodeOutput = [outputs[i]]; // it's 1D, make it 2D
                }
              } else if (typeof outputs[i] === "number") {
                nodeOutput = [[outputs[i]]]; // scalar, make 2D
              } else {
                nodeOutput = [[0]]; // fallback dummy
              }

            
              let node = new Node(layer.name, i, curLayerType, nodeOutput);

              // Add weight
              for (let j = 0; j < cnn[curLayerIndex - 1].length; j++) {
                let preNode = cnn[curLayerIndex - 1][j];
                let curLink = new Link(preNode, node);
                preNode.outputLinks.push(curLink);
                node.inputLinks.push(curLink);
              }

              curLayerNodes.push(node);
            }
            break;
          }
          case nodeType.BLOCK_OUT: {
            for (let i = 0; i < Math.min(10, outputs.length); i++) {
              let nodeOutput;
              if (Array.isArray(outputs[i])) {
                if (Array.isArray(outputs[i][0])) {
                  nodeOutput = outputs[i]; // already [row][col]
                } else {
                  nodeOutput = [outputs[i]]; // it's 1D, make it 2D
                }
              } else if (typeof outputs[i] === "number") {
                nodeOutput = [[outputs[i]]]; // scalar, make 2D
              } else {
                
                nodeOutput = [[0]]; // fallback dummy
              }
              let node = new Node(layer.name, i, curLayerType, nodeOutput);

              // Add weight
              for (let j = 0; j < cnn[curLayerIndex - 1].length; j++) {
                let preNode = cnn[curLayerIndex - 1][j];
                let curLink = new Link(preNode, node);
                preNode.outputLinks.push(curLink);
                node.inputLinks.push(curLink);
              }

              curLayerNodes.push(node);
            }
            break;
          }
          case nodeType.RELU:
          case nodeType.POOL: {
            for (let i = 0; i < Math.min(10, outputs.length); i++) {
              let output = outputs[i];
              let nodeOutput;
              if (Array.isArray(output)) {
                nodeOutput = Array.isArray(output[0]) ? output : [output];
              } else if (typeof output === "number") {
                nodeOutput = [[output]];
              } else {
                
                nodeOutput = [[0]];
              }

              // Keep the visualized ReLU node mathematically consistent with
              // ReLU(x) = max(0, x), even when an exported tensor contains a
              // pre-activation value.
              if (curLayerType === nodeType.RELU) {
                nodeOutput = singleRelu(nodeOutput);
              }

              const node = new Node(layer.name, i, curLayerType, nodeOutput);

              let preNode = cnn[curLayerIndex - 1][i];
              let link = new Link(preNode, node); // Save in weight field
              preNode.outputLinks.push(link);
              node.inputLinks.push(link);
              curLayerNodes.push(node);
            }
            break;
          }
          case nodeType.NORM: {
            let running_mean = await loadBinaryWeights(
              `${dataPath}/${model_name}/norm_mean.bin`
            );
            // running_mean = tf.tensor(running_mean, [128]).arraySync();
            let running_var = await loadBinaryWeights(
              `${dataPath}/${model_name}/norm_var.bin`
            );
            let gammes = await loadBinaryWeights(
              `${dataPath}/${model_name}/norm_weight.bin`
            );
            let betas = await loadBinaryWeights(
              `${dataPath}/${model_name}/norm_bias.bin`
            );
            normalizationVariance = running_var;
            normalizationGamma = gammes;

            for (let i = 0; i < Math.min(10, outputs.length); i++) {
              const preNode = cnn[curLayerIndex - 1][i];
              const nodeOutput = singleBatchNorm(
                preNode.output,
                running_mean[i],
                running_var[i],
                gammes[i],
                betas[i],
                batchNormEpsilon
              );

              const node = new Node(layer.name, i, curLayerType, nodeOutput);

              let link = new Link(
                preNode,
                node,
                [],
                running_mean[i],
                running_var[i],
                gammes[i],
                betas[i],
                batchNormEpsilon
              ); // Save in weight field
              preNode.outputLinks.push(link);
              node.inputLinks.push(link);

              curLayerNodes.push(node);
            }
            break;
          }
          case nodeType.FLATTEN: {
            // Flatten layer has no bias nor weights.
            let bias = 0;
            let preNodeWidth = cnn[curLayerIndex - 1][0].output.length;
            let preNodeNum = cnn[curLayerIndex - 1].length;
            let preNodePlane = preNodeWidth * preNodeWidth;
            let visibleFlattenLength = Math.min(
              outputs.length,
              preNodeNum * preNodePlane
            );

            // ONNX flattens the NCHW Pool tensor in channel-major order. Keep the
            // sampled Flatten nodes in that same order so each value, Pool pixel,
            // and classifier weight refer to one identical real index.
            for (let realIndex = 0; realIndex < visibleFlattenLength; realIndex++) {
              let preNodeIndex = Math.floor(realIndex / preNodePlane);
              let preNodeOffset = realIndex % preNodePlane;
              let preNodeRow = Math.floor(preNodeOffset / preNodeWidth);
              let preNodeCol = preNodeOffset % preNodeWidth;

              let node = new Node(
                layer.name,
                realIndex,
                curLayerType,
                outputs[realIndex],
                bias
              );
              node.realIndex = realIndex;
              let link = new Link(cnn[curLayerIndex - 1][preNodeIndex], node, [
                preNodeRow,
                preNodeCol,
              ]);

              cnn[curLayerIndex - 1][preNodeIndex].outputLinks.push(link);
              node.inputLinks.push(link);

              curLayerNodes.push(node);
            }
            break;
          }
          case nodeType.FC: {
            const weights = await loadBinaryWeights(
              `${dataPath}/${model_name}/${layer.name}.bin`
            );
            const reshapedWeights = tf.tensor(weights, [10, 2048]);
            const kernelWeight = reshapedWeights.arraySync();
            reshapedWeights.dispose();
            classifierWeights = weights;

            // `outputs` is the current ONNX `output` tensor and contains logits.
            // The ONNX model also exposes a final `probs` tensor, so reading the
            // last model output here would apply softmax to probabilities a second
            // time and incorrectly compress every class toward 0.1.
            const logits = tf.tensor(outputs);
            const probabilities = tf.softmax(logits);
            const probabilitiesArray = probabilities.arraySync();
            const logitsArray = outputs;
            
            for (let i = 0; i < Math.min(10, logitsArray.length); i++) {
              let node = new Node(layer.name, i, curLayerType, probabilitiesArray[i], 0);
              // Use the original logit value from the model output
              let curLogit = logitsArray[i];

              for (let j = 0; j < cnn[curLayerIndex - 1].length; j++) {
                let preNode = cnn[curLayerIndex - 1][j];
                let curLink = new Link(
                  preNode,
                  node,
                  kernelWeight[i][preNode.realIndex]
                );
                preNode.outputLinks.push(curLink);
                node.inputLinks.push(curLink);
              }
              node.logit = curLogit;
              curLayerNodes.push(node);
            }
            
            // Clean up tensors
            logits.dispose();
            probabilities.dispose();

            // Sort flatten layer based on the node TF index
            cnn[curLayerIndex - 1].sort((a, b) => a.realIndex - b.realIndex);
            break;
          }
        }

        // Add current layer to the NN
        cnn.push(curLayerNodes);
        curLayerIndex++;
      }

      const results = Object.fromEntries(allOutputs.map(({ name, tensor }) => [name, tensor]));
      const cam = computeGradCAM(results, classifierWeights, normalizationVariance, normalizationGamma, batchNormEpsilon);
      cnn.gradcam = {
        ...cam,
        modelName: model_name,
        imageUrl: renderGradCAM(cam, inputImageTensor, cifar10Mean, cifar10Std),
      };
      return cnn;
    };

    /**
     * Construct a CNN with given model and input.
     *
     * @param {string} inputImageFile filename of input image.
     * @param {Model} model Loaded tf.js model.
     */
    const constructCNN = async (inputImageFile, model, model_name, dataPath = get_store_value(trainingDataPathStore)) => {
      if (!model) {
        throw new Error("ONNX model session not loaded.");
      }

      let inputTensor = await getInputImageArray(inputImageFile, true); // returns tf.Tensor
      let shape = inputTensor.shape; // [H, W, C]
      const chw = tf.tidy(() =>
        inputTensor.transpose([2, 0, 1]).reshape([1, 3, shape[0], shape[1]])
      );
      try {
        const ortTensor = new ort.Tensor("float32", chw.dataSync(), chw.shape);
        const results = await model.run({ input: ortTensor });
        const outputs = Object.entries(results).map(([name, tensor]) => ({ name, tensor }));
        return await constructCNNFromOutputs(outputs, model, inputTensor, model_name, dataPath);
      } finally {
        chw.dispose();
        inputTensor.dispose();
      }
    };

    // Helper functions

    /**
     * Convert canvas image data into a 3D tensor with dimension [height, width, 3].
     * Recall that tensorflow uses NHWC order (batch, height, width, channel).
     * Each pixel is in 0-255 scale.
     *
     * @param {[int8]} imageData Canvas image data
     * @param {int} width Canvas image width
     * @param {int} height Canvas image height
     */
    const imageDataTo3DTensor = (imageData, width, height, normalize = true) => {
      // CIFAR-10 normalization constants (matching training preprocessing)

      const values = new Float32Array(height * width * 3);
      for (let pixelIndex = 0; pixelIndex < width * height; pixelIndex++) {
        for (let channelIndex = 0; channelIndex < 3; channelIndex++) {
          let value = imageData[pixelIndex * 4 + channelIndex];
          if (normalize) {
            value /= 255;
            value =
              (value - cifar10Mean[channelIndex]) / cifar10Std[channelIndex];
          }
          values[pixelIndex * 3 + channelIndex] = value;
        }
      }

      return tf.tensor3d(values, [height, width, 3]);
    };

    /**
     * Get the 3D pixel value array of the given image file.
     *
     * @param {string} imgFile File path to the image file
     * @returns A promise with the corresponding 3D array
     */
    const getInputImageArray = (imgFile, normalize = true) => {
      let canvas = document.createElement("canvas");
      canvas.style.cssText = "display:none;";
      canvas.width = networkInputSize;
      canvas.height = networkInputSize;
      document.getElementsByTagName("body")[0].appendChild(canvas);
      let context = canvas.getContext("2d");

      return new Promise((resolve, reject) => {
        let inputImage = new Image();
        inputImage.crossOrigin = "Anonymous";
        inputImage.onload = () => {
          context.imageSmoothingEnabled = true;
          context.imageSmoothingQuality = "high";
          context.drawImage(
            inputImage,
            0,
            0,
            networkInputSize,
            networkInputSize
          );
          const canvasImage = context.getImageData(
            0,
            0,
            networkInputSize,
            networkInputSize
          );
          canvas.remove();
          resolve(
            imageDataTo3DTensor(
              canvasImage.data,
              networkInputSize,
              networkInputSize,
              normalize
            )
          );
        };
        inputImage.onerror = (error) => {
          canvas.remove();
          reject(error);
        };
        inputImage.src = imgFile;
      });
    };

    const loadTrainedModel = async (modelPath) => {
      try {
        const session = await ort.InferenceSession.create(modelPath);
        return session;
      } catch (error) {
        throw error;
      }
    };

    /* global d3 */

    const layerColorScales = {
      input: [d3.interpolateGreys, d3.interpolateGreys, d3.interpolateGreys],
      conv: d3.interpolateRdBu,
      layer_out: d3.interpolateRdBu,
      block_out: d3.interpolateRdBu,
      relu: d3.interpolateRdBu,
      norm: d3.interpolateRdBu,
      pool: d3.interpolateRdBu,
      fc: d3.interpolateGreys,
      weight: d3.interpolateBrBG,
      logit: d3.interpolateOranges,
    };

    const nodeLength = 40;

    const overviewConfig = {
      nodeLength,
      plusSymbolRadius: nodeLength / 5,
      numLayers: 17,
      edgeOpacity: 0.8,
      edgeInitColor: "rgb(230, 230, 230)",
      edgeHoverColor: "rgb(130, 130, 130)",
      edgeHoverOuting: false,
      edgeStrokeWidth: 0.7,
      intermediateColor: "gray",
      layerColorScales,
      svgPaddings: { top: 20, bottom: 20, left: 10, right: 10 },
      kernelRectLength: 8 / 3,
      gapRatio: 2,
      overlayRectOffset: 12,
      classLists: ACTIVE_CLASS_NAMES,
    };

    // Configs
    const nodeLength$1 = overviewConfig.nodeLength;

    /**
     * Every feature-map node has the same external footprint. Spatial resolution
     * is represented by the density of the pixels rendered inside the node, not
     * by changing the node's width or height.
     */
    const getNodeRenderSize = () => nodeLength$1;

    const getNodeRenderOffset = () => 0;

    /**
     * Compute the [minimum, maximum] of a 1D or 2D array.
     * @param {[number]} array
     */
    const getExtent = (array) => {
      let min = Infinity;
      let max = -Infinity;

      // Scalar
      if (array.length === undefined) {
        return [array, array];
      }

      // 1D array
      if (array[0].length === undefined) {
        for (let i = 0; i < array.length; i++) {
          if (array[i] < min) {
            min = array[i];
          }
          if (array[i] > max) {
            max = array[i];
          }
        }
        return [min, max];
      }

      // 2D array
      for (let i = 0; i < array.length; i++) {
        for (let j = 0; j < array[0].length; j++) {
          if (array[i][j] < min) {
            min = array[i][j];
          }
          if (array[i][j] > max) {
            max = array[i][j];
          }
        }
      }
      return [min, max];
    };

    /**
     * Convert the svg element center coord to document absolute value
     * // Inspired by https://github.com/caged/d3-tip/blob/master/index.js#L286
     * @param {elem} elem
     */
    const getMidCoords = (svg, elem) => {
      if (svg !== undefined) {
        let targetel = elem;
        while (targetel.getScreenCTM == null && targetel.parentNode != null) {
          targetel = targetel.parentNode;
        }
        // Get the absolute coordinate of the E point of element bbox
        let point = svg.node().ownerSVGElement.createSVGPoint();
        let matrix = targetel.getScreenCTM();
        let tbbox = targetel.getBBox();
        let height = tbbox.height;

        point.x += 0;
        point.y -= height / 2;
        let bbox = point.matrixTransform(matrix);
        return {
          top: bbox.y,
          left: bbox.x,
        };
      }
    };

    /**
     * Return the output knot (right boundary center)
     * @param {object} point {x: x, y:y}
     */
    const getOutputKnot = (point) => {
      const renderSize = point.size === undefined ? nodeLength$1 : point.size;
      const renderOffset = (nodeLength$1 - renderSize) / 2;
      return {
        x: point.x + renderOffset + renderSize,
        y: point.y + renderOffset + renderSize / 2,
      };
    };

    /**
     * Return the output knot (left boundary center)
     * @param {object} point {x: x, y:y}
     */
    const getInputKnot = (point) => {
      const renderSize = point.size === undefined ? nodeLength$1 : point.size;
      const renderOffset = (nodeLength$1 - renderSize) / 2;
      return {
        x: point.x + renderOffset,
        y: point.y + renderOffset + renderSize / 2,
      };
    };

    /**
     * Compute edge data
     * @param {[[[number, number]]]} nodeCoordinate Constructed neuron svg locations
     * @param {[object]} cnn Constructed CNN model
     */
    const getLinkData = (nodeCoordinate, cnn) => {
      let linkData = [];
      // Create links backward (starting for the first conv layer)
      for (let l = 1; l < cnn.length; l++) {
        for (let n = 0; n < cnn[l].length; n++) {
          let isOutput = cnn[l][n].layerName === "output";
          let curTarget = getInputKnot(nodeCoordinate[l][n]);
          for (let p = 0; p < cnn[l][n].inputLinks.length; p++) {
            // Specially handle output layer (since we are ignoring the flatten)
            let inputNodeIndex = cnn[l][n].inputLinks[p].source.index;

            if (isOutput) {
              let flattenDimension =
                cnn[l - 1][0].output.length * cnn[l - 1][0].output.length;
              if (inputNodeIndex % flattenDimension !== 0) {
                continue;
              }
              inputNodeIndex = Math.min(
                9,
                Math.floor(inputNodeIndex / flattenDimension)
              );
            }
            let curSource = getOutputKnot(nodeCoordinate[l - 1][inputNodeIndex]);
            let curWeight = cnn[l][n].inputLinks[p].weight;
            linkData.push({
              source: curSource,
              target: curTarget,
              weight: curWeight,
              targetLayerIndex: l,
              targetNodeIndex: n,
              sourceNodeIndex: inputNodeIndex,
            });
          }
        }
      }
      return linkData;
    };

    /**
     * Color scale wrapper (support artificially lighter color!)
     * @param {function} colorScale D3 color scale function
     * @param {number} range Color range (max - min)
     * @param {number} value Color value
     * @param {number} gap Tail of the color scale to skip
     */
    const gappedColorScale = (colorScale, range, value, gap) => {
      if (gap === undefined) {
        gap = 0;
      }
      let normalizedValue = (value + range / 2) / range;
      return colorScale(normalizedValue * (1 - 2 * gap) + gap);
    };

    /* global d3 */

    // Configs
    const layerColorScales$1 = overviewConfig.layerColorScales;
    const nodeLength$2 = overviewConfig.nodeLength;
    const intermediateColor = overviewConfig.intermediateColor;
    const svgPaddings = overviewConfig.svgPaddings;
    let legendSequence = 0;

    // Shared variables
    let svg = undefined;
    svgStore.subscribe( value => {svg = value;} );

    let vSpaceAroundGap = undefined;
    vSpaceAroundGapStore.subscribe( value => {vSpaceAroundGap = value;} );

    /**
     * Move one layer horizontally
     * @param {object} arg Multiple arguments {
     *   layerIndex: current layer index
     *   targetX: destination x
     *   disable: make this layer unresponsible
     *   delay: animation delay
     *   opacity: change the current layer's opacity
     *   specialIndex: avoid manipulating `specialIndex`th node
     *   onEndFunc: call this function when animation finishes
     *   transitionName: animation ID
     * }
     */
    const moveLayerX = (arg) => {
      let layerIndex = arg.layerIndex;
      let targetX = arg.targetX;
      let disable = arg.disable;
      let delay = arg.delay;
      let opacity = arg.opacity;
      let specialIndex = arg.specialIndex;
      let onEndFunc = arg.onEndFunc;
      let transitionName = arg.transitionName === undefined ? 'move' : arg.transitionName;
      let duration = arg.duration === undefined ? 500 : arg.duration;

      // Move the selected layer
      let curLayer = svg.select(`g#cnn-layer-group-${layerIndex}`);
      curLayer.selectAll('g.node-group').each((d, i, g) => {
        const renderOffset = getNodeRenderOffset();
        const nodeGroup = d3.select(g[i]);

        nodeGroup
          .style('cursor', disable && i !== specialIndex ? 'default' : 'pointer')
          .style('pointer-events', disable && i !== specialIndex ? 'none' : 'all')
          .select('image')
          .transition(transitionName)
          .ease(d3.easeCubicInOut)
          .delay(delay)
          .duration(duration)
          .attr('x', targetX + renderOffset);
        
        nodeGroup
          .select('rect.bounding')
          .transition(transitionName)
          .ease(d3.easeCubicInOut)
          .delay(delay)
          .duration(duration)
          .attr('x', targetX + renderOffset);

        // Output nodes use bars and text rather than feature-map images.  Move
        // those native elements through the same layer transition so the output
        // and its attached ACCT analysis remain one visual chain.
        nodeGroup
          .selectAll('rect.output-rect, text.output-text, text.annotation-text')
          .transition(transitionName)
          .ease(d3.easeCubicInOut)
          .delay(delay)
          .duration(duration)
          .attr('x', targetX);
        
        if (opacity !== undefined && i !== specialIndex) {
          d3.select(g[i])
            .select('image')
            .style('opacity', opacity);
        }
      });
      
      // Also move the layer labels
      svg.selectAll(`g#layer-label-${layerIndex}`)
        .transition(transitionName)
        .ease(d3.easeCubicInOut)
        .delay(delay)
        .duration(duration)
        .attr('transform', () => {
          let x = targetX + nodeLength$2 / 2;
          let y = (svgPaddings.top + vSpaceAroundGap) / 2 + 5;
          return `translate(${x}, ${y})`;
        })
        .on('end', onEndFunc);

      svg.selectAll(`g#layer-detailed-label-${layerIndex}`)
        .transition(transitionName)
        .ease(d3.easeCubicInOut)
        .delay(delay)
        .duration(duration)
        .attr('transform', () => {
          let x = targetX + nodeLength$2 / 2;
          let y = (svgPaddings.top + vSpaceAroundGap) / 2 - 6;
          return `translate(${x}, ${y})`;
        })
        .on('end', onEndFunc);

      // Move both the SVG chain and the original HTML weight controls with Output
      // so a layer expansion does not separate the sliders from their title.
      const isOutputLayer = !curLayer.select('g.node-output').empty();
      if (isOutputLayer) {
        const acctGroup = d3.select('#cnn-svg').select('g.acctcontain');
        const baseX = Number(acctGroup.attr('data-base-x'));
        const outputX = Number(acctGroup.attr('data-output-x'));

        if (!acctGroup.empty() && Number.isFinite(baseX) && Number.isFinite(outputX)) {
          const deltaX = targetX - outputX;
          acctGroup
            .transition(transitionName)
            .ease(d3.easeCubicInOut)
            .delay(delay)
            .duration(duration)
            .attr('transform', `translate(${baseX + deltaX}, 0)`);
          const sliderGroup = document.querySelector('.slider-group');
          if (sliderGroup) {
            sliderGroup.style.transitionProperty = 'transform';
            sliderGroup.style.transitionDuration = `${duration}ms`;
            sliderGroup.style.transitionDelay = `${delay || 0}ms`;
            sliderGroup.style.transitionTimingFunction = 'cubic-bezier(0.645,0.045,0.355,1)';
            sliderGroup.style.transform = `translateX(${deltaX}px)`;
          }
        }
      }
    };

    /**
     * Append a gradient definition to `group`
     * @param {string} gradientID CSS ID for the gradient def
     * @param {[{offset: number, color: string, opacity: number}]} stops Gradient stops
     * @param {element} group Element to append def to
     */
    const addOverlayGradient = (gradientID, stops, group) => {
      if (group === undefined) {
        group = svg;
      }

      // Create a gradient
      let defs = group.append("defs")
        .attr('class', 'overlay-gradient');

      let gradient = defs.append("linearGradient")
        .attr("id", gradientID)
        .attr("x1", "0%")
        .attr("x2", "100%")
        .attr("y1", "100%")
        .attr("y2", "100%");
      
      stops.forEach(s => {
        gradient.append('stop')
          .attr('offset', s.offset)
          .attr('stop-color', s.color)
          .attr('stop-opacity', s.opacity);
      });
    };

    /**
     * Draw the legend for intermediate layer
     * @param {object} arg 
     * {
     *   legendHeight: height of the legend rectangle
     *   curLayerIndex: the index of selected layer
     *   range: colormap range
     *   group: group to append the legend
     *   minMax: {min: min value, max: max value}
     *   width: width of the legend
     *   x: x position of the legend
     *   y: y position of the legend
     *   isInput: if the legend is for the input layer (special handle black to
     *      white color scale)
     *   colorScale: d3 color scale
     *   colorForValue: optional function that maps a raw data value to its exact
     *      rendered color
     *   gradientAppendingName: name of the appending gradient
     *   gradientGap: gap to make the color lighter
     * }
     */
    const drawIntermediateLayerLegend = (arg) => {
      let legendHeight = arg.legendHeight,
        curLayerIndex = arg.curLayerIndex,
        range = arg.range,
        group = arg.group,
        minMax = arg.minMax,
        width = arg.width,
        x = arg.x,
        y = arg.y,
        isInput = arg.isInput,
        colorScale = arg.colorScale,
        colorForValue = arg.colorForValue,
        gradientAppendingName = arg.gradientAppendingName,
        gradientGap = arg.gradientGap,
        legendTitle = arg.legendTitle;
      
      if (colorScale === undefined) { colorScale = layerColorScales$1.conv; }
      if (gradientGap === undefined) { gradientGap = 0; }
      
      // Every legend owns its gradient, including the Input Channel ramp. The
      // overview no longer defines the old global `inputGradient` reference.
      const safeRange = Number.isFinite(range) && range !== 0 ? range : 1;
      const minimum = isInput ? 0 : minMax.min;
      const maximum = isInput ? range : minMax.max;
      const gradientID = `${gradientAppendingName || (isInput
    ? 'input-channel-gradient'
    : 'intermediate-legend-gradient')}-${++legendSequence}`;
      const gradientName = `url(#${gradientID})`;
      let normalizedColor = v => colorScale(v * (1 - 2 * gradientGap) + gradientGap);
      const valueColor = isInput
        ? value => layerColorScales$1.input[0](1 - value / safeRange)
        : typeof colorForValue === 'function'
          ? colorForValue
          : value => normalizedColor((value + safeRange / 2) / safeRange);
      const extent = maximum - minimum;
      const stopCount = 20;
      const stops = Array.from({length: stopCount + 1}, (_, index) => {
        const offset = index / stopCount;
        const value = minimum + extent * offset;
        return {offset, color: valueColor(value), opacity: 1};
      });
      addOverlayGradient(gradientID, stops, group);

      const ownerSVG = group.node().ownerSVGElement;
      const compact = arg.compact === true;
      const tickFontSize = compact ? 9 : ownerSVG.clientWidth >= 2100 ? 14 : 11;
      const titleFontSize = compact ? 12 : tickFontSize + 1;
      // Compact legends sit in the footer. Keep their short tick marks attached to
      // the color ramp so each value has an unambiguous visual anchor.
      const axisGap = compact ? 0 : 5;

      let legendScale = d3.scaleLinear()
        .range([0, width])
        .domain([minimum, maximum]);

      let legendAxis = d3.axisBottom()
        .scale(legendScale)
        .tickFormat(d3.format(isInput ? 'd' : '.2f'))
        .tickSize(compact ? 2 : 3)
        .tickSizeOuter(0)
        .tickPadding(compact ? 2 : 3)
        .tickValues(isInput
          ? [0, range]
          : Array.from(new Set([
              minMax.min,
              ...(minMax.min < 0 && minMax.max > 0 ? [0] : []),
              minMax.max
            ])));
      
      let intermediateLegend = group.append('g')
        .attr('class', `intermediate-legend intermediate-legend-${curLayerIndex - 1}`)
        .attr('data-legend-title', arg.legendName || legendTitle || '')
        .style('pointer-events', 'none')
        .attr('transform', `translate(${x}, ${y})`);

      intermediateLegend.append('rect')
        .attr('class', 'legend-color-bar')
        .attr('width', width)
        .attr('height', legendHeight)
        .style('fill', gradientName)
        .style('stroke', '#d0d0d0')
        .style('stroke-width', 0.5);
      
      let legendGroup = intermediateLegend.append('g')
        .attr('class', 'legend-ticks')
        .attr('transform', `translate(0, ${legendHeight + axisGap})`)
        .call(legendAxis);

      // Short ticks sit below the ramp. No axis line runs across the colors.
      legendGroup.select('.domain').remove();
      
      legendGroup.selectAll('text')
        .style('font-size', `${tickFontSize}px`)
        .style('fill', '#555')
        .attr('text-anchor', value => value === minimum ? 'start'
          : value === maximum ? 'end' : 'middle');
      
      legendGroup.selectAll('path, line')
        .style('stroke', intermediateColor);

      // Add legend title if provided
      if (legendTitle) {
        intermediateLegend.append('text')
          .attr('class', 'legend-title')
          .attr('x', width / 2)
          .attr('y', compact ? -6 : -8)
          .attr('text-anchor', 'middle')
          .style('font-size', `${titleFontSize}px`)
          .style('font-weight', '500')
          .style('fill', '#333')
          .text(legendTitle);
      }

      // A white margin separates the complete legend from faded background edges.
      const bounds = intermediateLegend.node().getBBox();
      const horizontalPadding = compact ? 4 : 8;
      const verticalPadding = compact ? 2 : 6;
      intermediateLegend.append('rect')
        .attr('class', 'legend-background')
        .attr('x', bounds.x - horizontalPadding)
        .attr('y', bounds.y - verticalPadding)
        .attr('width', bounds.width + horizontalPadding * 2)
        .attr('height', bounds.height + verticalPadding * 2)
        .style('fill', '#fff')
        .lower();

      return intermediateLegend;
    };

    /** Place the full rendered legend, including its title and ticks, in the footer. */
    const positionIntermediateLegendInFooter = (legend, x, bottomPadding = 12) => {
      const ownerSVG = legend.node().ownerSVGElement;
      const svgHeight = ownerSVG.getBoundingClientRect().height;
      const bounds = legend.node().getBBox();
      const y = svgHeight - bottomPadding - bounds.y - bounds.height;
      legend.attr('transform', `translate(${x}, ${y})`);
    };

    /**
     * Draw an very neat arrow!
     * @param {object} arg 
     * {
     *   group: element to append this arrow to
     *   sx: source x
     *   sy: source y
     *   tx: target x
     *   ty: target y
     *   dr: radius of curve (I'm using a circle)
     *   hFlip: the direction to choose the circle (there are always two ways)
     * }
     */
    const drawArrow = (arg) => {
      let group = arg.group,
        sx = arg.sx,
        sy = arg.sy,
        tx = arg.tx,
        ty = arg.ty,
        dr = arg.dr,
        hFlip = arg.hFlip,
        marker = arg.marker === undefined ? 'marker' : arg.marker;

      /* Cool graphics trick -> merge translate and scale together
      translateX = (1 - scaleX) * tx,
      translateY = (1 - scaleY) * ty;
      */
      
      let arrow = group.append('g')
        .attr('class', 'arrow-group');

      arrow.append('path')
        .attr("d", `M${sx},${sy}A${dr},${dr} 0 0,${hFlip ? 0 : 1} ${tx},${ty}`)
        .attr('marker-end', `url(#${marker})`)
        .style('stroke', 'gray')
        .style('fill', 'none');
    };

    /* global d3 */

    // Configs
    const layerColorScales$2 = overviewConfig.layerColorScales;
    const nodeLength$3 = overviewConfig.nodeLength;
    const plusSymbolRadius = overviewConfig.plusSymbolRadius;
    const intermediateColor$1 = overviewConfig.intermediateColor;
    const kernelRectLength = overviewConfig.kernelRectLength;
    const svgPaddings$1 = overviewConfig.svgPaddings;
    const gapRatio = overviewConfig.gapRatio;
    const overlayRectOffset = overviewConfig.overlayRectOffset;
    const formater = d3.format(".4f");
    let isEndOfAnimation = false;

    // Shared variables
    let svg$1 = undefined;
    svgStore.subscribe((value) => {
      svg$1 = value;
    });

    let vSpaceAroundGap$1 = undefined;
    vSpaceAroundGapStore.subscribe((value) => {
      vSpaceAroundGap$1 = value;
    });

    let hSpaceAroundGap = undefined;
    hSpaceAroundGapStore.subscribe((value) => {
      hSpaceAroundGap = value;
    });

    let cnn = undefined;
    cnnStore.subscribe((value) => {
      cnn = value;
    });

    let nodeCoordinate = undefined;
    nodeCoordinateStore.subscribe((value) => {
      nodeCoordinate = value;
    });

    let selectedScaleLevel = undefined;
    selectedScaleLevelStore.subscribe((value) => {
      selectedScaleLevel = value;
    });

    let cnnLayerRanges = undefined;
    cnnLayerRangesStore.subscribe((value) => {
      cnnLayerRanges = value;
    });

    let shouldIntermediateAnimate = undefined;
    shouldIntermediateAnimateStore.subscribe((value) => {
      shouldIntermediateAnimate = value;
    });

    let detailedMode = undefined;
    detailedModeStore.subscribe((value) => {
      detailedMode = value;
    });

    let intermediateLayerPosition = undefined;
    intermediateLayerPositionStore.subscribe((value) => {
      intermediateLayerPosition = value;
    });

    /**
     * Draw the intermediate layer activation heatmaps
     * @param {element} image Neuron heatmap image
     * @param {number} range Colormap range
     * @param {function} colorScale Colormap
     * @param {number} length Image length
     * @param {[[number]]} dataMatrix Heatmap matrix
     */
    const drawIntermidiateImage = (
      image,
      range,
      colorScale,
      length,
      dataMatrix
    ) => {
      // Set up a buffer convas in order to resize image
      if (Array.isArray(dataMatrix) && typeof dataMatrix[0] === "number") {
        dataMatrix = [dataMatrix];
      }

      let imageLength = length;
      let bufferCanvas = document.createElement("canvas");
      let bufferContext = bufferCanvas.getContext("2d");
      bufferCanvas.width = imageLength;
      bufferCanvas.height = imageLength;

      // Fill image pixel array
      let imageSingle = bufferContext.getImageData(0, 0, imageLength, imageLength);
      let imageSingleArray = imageSingle.data;

      for (let i = 0; i < imageSingleArray.length; i += 4) {
        let pixeIndex = Math.floor(i / 4);
        let row = Math.floor(pixeIndex / imageLength);
        let column = pixeIndex % imageLength;

        let color = d3.rgb(
          colorScale((dataMatrix[row][column] + range / 2) / range)
        );

        imageSingleArray[i] = color.r;
        imageSingleArray[i + 1] = color.g;
        imageSingleArray[i + 2] = color.b;
        imageSingleArray[i + 3] = 255;
      }

      // canvas.toDataURL() only exports image in 96 DPI, so we can hack it to have
      // higher DPI by rescaling the image using canvas magic
      let largeCanvas = document.createElement("canvas");
      largeCanvas.width = nodeLength$3 * 3;
      largeCanvas.height = nodeLength$3 * 3;
      let largeCanvasContext = largeCanvas.getContext("2d");

      // Use drawImage to resize the original pixel array, and put the new image
      // (canvas) into corresponding canvas
      bufferContext.putImageData(imageSingle, 0, 0);
      largeCanvasContext.drawImage(
        bufferCanvas,
        0,
        0,
        imageLength,
        imageLength,
        0,
        0,
        nodeLength$3 * 3,
        nodeLength$3 * 3
      );

      let imageDataURL = largeCanvas.toDataURL();
      image.attr("xlink:href", imageDataURL);

      // Destory the buffer canvas
      bufferCanvas.remove();
      largeCanvas.remove();
    };

    /**
     * Create a node group for the intermediate layer
     * @param {number} curLayerIndex Intermediate layer index
     * @param {number} selectedI Clicked node index
     * @param {element} groupLayer Group element
     * @param {number} x Node's x
     * @param {number} y Node's y
     * @param {number} nodeIndex Node's index
     * @param {function} intermediateNodeMouseOverHandler Mouse over handler
     * @param {function} intermediateNodeMouseLeaveHandler Mouse leave handler
     * @param {function} intermediateNodeClicked Mouse click handler
     * @param {bool} interaction Whether support interaction
     */
    const createIntermediateNode = (
      curLayerIndex,
      selectedI,
      groupLayer,
      x,
      y,
      nodeIndex,
      stride,
      intermediateNodeMouseOverHandler,
      intermediateNodeMouseLeaveHandler,
      intermediateNodeClicked,
      interaction
    ) => {
      let newNode = groupLayer
        .append("g")
        .datum(cnn[curLayerIndex - 1][nodeIndex])
        .attr("class", "intermediate-node")
        .attr("cursor", interaction ? "pointer" : "default")
        .attr("pointer-events", interaction ? "all" : "none")
        .attr("node-index", nodeIndex)
        .on("mouseover", intermediateNodeMouseOverHandler)
        .on("mouseleave", intermediateNodeMouseLeaveHandler)
        .on("click", (d, g, i) =>
          intermediateNodeClicked(d, g, i, selectedI, curLayerIndex)
        );

      newNode
        .append("image")
        .attr("width", nodeLength$3)
        .attr("height", nodeLength$3)
        .attr("x", x)
        .attr("y", y);

      // Overlay the image with a mask of many small rectangles
      let strideTime = Math.floor(nodeLength$3 / stride);
      let overlayGroup = newNode
        .append("g")
        .attr("class", "overlay-group")
        .attr("transform", `translate(${x}, ${y})`);

      for (let i = 0; i < strideTime; i++) {
        for (let j = 0; j < strideTime; j++) {
          overlayGroup
            .append("rect")
            .attr("class", `mask-overlay mask-${i}-${j}`)
            .attr("width", stride)
            .attr("height", stride)
            .attr("x", i * stride)
            .attr("y", j * stride)
            .style("fill", "var(--light-gray)")
            .style("stroke", "var(--light-gray)")
            .style("opacity", 1);
        }
      }

      // Add a rectangle to show the border
      newNode
        .append("rect")
        .attr("class", "bounding")
        .attr("width", nodeLength$3)
        .attr("height", nodeLength$3)
        .attr("x", x)
        .attr("y", y)
        .style("fill", "none")
        .style("stroke", intermediateColor$1)
        .style("stroke-width", 1);

      return newNode;
    };

    const startOutputAnimation = (
      kernelGroup,
      tickTime1D,
      stride,
      delay,
      curLayerIndex
    ) => {
      const slidingAnimation = () => {
        let originX = +kernelGroup.attr("data-origin-x");
        let originY = +kernelGroup.attr("data-origin-y");
        let oldTick = +kernelGroup.attr("data-tick");
        let i = oldTick % tickTime1D;
        let j = Math.floor(oldTick / tickTime1D);
        let x = originX + i * stride;
        let y = originY + j * stride;
        let newTick = (oldTick + 1) % (tickTime1D * tickTime1D);

        // Remove one mask rect at each tick
        svg$1
          .selectAll(`rect.mask-${i}-${j}`)
          .transition("window-sliding-mask")
          .delay(delay + 100)
          .duration(300)
          .style("opacity", 0);

        kernelGroup
          .attr("data-tick", newTick)
          .transition("window-sliding-input")
          .delay(delay)
          .duration(200)
          .attr("transform", `translate(${x}, ${y})`)
          .on("end", () => {
            if (newTick === 0) {
              // Stop the animation
              // Be careful with animation racing so call this function here instead
              // of under selectALL
              if (!isEndOfAnimation) {
                animationButtonClicked(curLayerIndex);
              }
            }
            if (shouldIntermediateAnimate) {
              slidingAnimation();
            }
          });
      };
      slidingAnimation();
    };

    const startIntermediateAnimation = (
      kernelGroupInput,
      kernelGroupResult,
      tickTime1D,
      stride
    ) => {
      let delay = 200;
      const slidingAnimation = () => {
        let originX = +kernelGroupInput.attr("data-origin-x");
        let originY = +kernelGroupInput.attr("data-origin-y");
        let originXResult = +kernelGroupResult.attr("data-origin-x");
        let oldTick = +kernelGroupInput.attr("data-tick");
        let i = oldTick % tickTime1D;
        let j = Math.floor(oldTick / tickTime1D);
        let x = originX + i * stride;
        let y = originY + j * stride;
        let xResult = originXResult + (oldTick % tickTime1D) * stride;
        let newTick = (oldTick + 1) % (tickTime1D * tickTime1D);

        // Remove one mask rect at each tick
        svg$1
          .selectAll(`rect.mask-${i}-${j}`)
          .transition("window-sliding-mask")
          .delay(delay + 100)
          .duration(300)
          .style("opacity", 0);

        kernelGroupInput
          .attr("data-tick", newTick)
          .transition("window-sliding-input")
          .delay(delay)
          .duration(200)
          .attr("transform", `translate(${x}, ${y})`);

        kernelGroupResult
          .attr("data-tick", newTick)
          .transition("window-sliding-result")
          .delay(delay)
          .duration(200)
          .attr("transform", `translate(${xResult}, ${y})`)
          .on("end", () => {
            if (shouldIntermediateAnimate) {
              slidingAnimation();
            }
          });
      };
      slidingAnimation();
    };

    const animationButtonClicked = (curLayerIndex) => {
      if (d3.event !== null) {
        d3.event.stopPropagation();
      }

      let delay = 200;
      let tickTime1D = nodeLength$3 / (kernelRectLength * 3);
      let stride = kernelRectLength * 3;

      if (isEndOfAnimation) {
        // Start the animation
        shouldIntermediateAnimateStore.set(true);

        // Show kernel
        svg$1
          .selectAll(".kernel-clone")
          .transition()
          .duration(300)
          .style("opacity", 1);

        // Restore the mask
        svg$1
          .selectAll(`rect.mask-overlay`)
          .transition()
          .duration(300)
          .style("opacity", 1);

        // Start the intermediate animation
        for (let i = 0; i < nodeCoordinate[curLayerIndex - 1].length; i++) {
          startIntermediateAnimation(
            d3.select(`.kernel-input-${i}`),
            d3.select(`.kernel-result-${i}`),
            tickTime1D,
            stride
          );
        }

        // Start the output animation
        startOutputAnimation(
          d3.select(".kernel-output"),
          tickTime1D,
          stride,
          delay,
          curLayerIndex
        );

        // Change the flow edge style
        svg$1
          .selectAll("path.flow-edge")
          .attr("stroke-dasharray", "4 2")
          .attr("stroke-dashoffset", 0)
          .each((d, i, g) => animateEdge(d, i, g, 0 - 1000));

        // Change button icon
        svg$1
          .select(".animation-control-button")
          .attr("xlink:href", "/assets/img/fast_forward.svg");

        isEndOfAnimation = false;
      } else {
        // End the animation
        shouldIntermediateAnimateStore.set(false);

        // Show all intermediate and output results
        svg$1
          .selectAll(`rect.mask-overlay`)
          .transition("skip")
          .duration(600)
          .style("opacity", 0);

        // Move kernel to the beginning to prepare for the next animation
        let kernelClones = svg$1.selectAll(".kernel-clone");
        kernelClones
          .attr("data-tick", 0)
          .transition("skip")
          .duration(300)
          .style("opacity", 0)
          .on("end", (d, i, g) => {
            let element = d3.select(g[i]);
            let originX = +element.attr("data-origin-x");
            let originY = +element.attr("data-origin-y");
            element.attr("transform", `translate(${originX}, ${originY})`);
          });

        // Change flow edge style
        svg$1.selectAll("path.flow-edge").interrupt().attr("stroke-dasharray", "0 0");

        // Change button icon
        svg$1
          .select(".animation-control-button")
          .attr("xlink:href", "/assets/img/redo.svg");

        isEndOfAnimation = true;
      }
    };

    const animateEdge = (d, i, g, dashoffset) => {
      let curPath = d3.select(g[i]);
      curPath
        .transition()
        .duration(60000)
        .ease(d3.easeLinear)
        .attr("stroke-dashoffset", dashoffset)
        .on("end", (d, i, g) => {
          if (shouldIntermediateAnimate) {
            animateEdge(d, i, g, dashoffset - 2000);
          }
        });
    };

    /**
     * Draw one intermediate layer
     * @param {number} curLayerIndex
     * @param {number} leftX X value of intermediate layer left border
     * @param {number} rightX X value of intermediate layer right border
     * @param {number} rightStart X value of right component starting anchor
     * @param {number} intermediateGap The inner gap
     * @param {number} d Clicked node bounded data
     * @param {number} i Clicked node index
     * @param {function} intermediateNodeMouseOverHandler Mouse over handler
     * @param {function} intermediateNodeMouseLeaveHandler Mouse leave handler
     * @param {function} intermediateNodeClicked Mouse click handler
     */
    const drawIntermediateLayer = (
      curLayerIndex,
      leftX,
      rightX,
      rightStart,
      intermediateGap,
      d,
      i,
      intermediateNodeMouseOverHandler,
      intermediateNodeMouseLeaveHandler,
      intermediateNodeClicked
    ) => {

      // Add the intermediate layer
      let intermediateLayer = svg$1
        .append("g")
        .attr("class", "intermediate-layer")
        .style("opacity", 0);

      // Recovert the animation counter
      isEndOfAnimation = false;

      let intermediateX1 = leftX + nodeLength$3 + intermediateGap;
      let intermediateX2 = intermediateX1 + nodeLength$3 + intermediateGap * 1.5;

      let range = cnnLayerRanges[selectedScaleLevel][curLayerIndex];
      let colorScale = layerColorScales$2[d.type];
      let intermediateMinMax = [];

      // Copy the previsious layer to construct foreignObject placeholder
      // Also add edges from/to the intermediate layer in this loop
      let linkData = [];

      // Compute the min max of all kernel weights in the intermediate layer
      let kernelExtents = d.inputLinks.map((link) => getExtent(link.weight));
      let kernelExtent = kernelExtents.reduce((acc, cur) => {
        return [Math.min(acc[0], cur[0]), Math.max(acc[1], cur[1])];
      });
      let kernelRange =
        2 * (Math.round(Math.max(...kernelExtent.map(Math.abs)) * 1000) / 1000);
      let kernelColorGap = 0.2;

      // Compute stride for the kernel animation
      let stride = kernelRectLength * 3;

      // Also add the overlay mask on the output node
      let outputY = nodeCoordinate[curLayerIndex][i].y;
      let curNode = svg$1.select(`#layer-${curLayerIndex}-node-${i}`);
      let outputOverlayGroup = curNode
        .append("g")
        .attr("class", "overlay-group")
        .attr("transform", `translate(${rightX}, ${outputY})`);

      let strideTime = Math.floor(nodeLength$3 / stride);

      for (let i = 0; i < strideTime; i++) {
        for (let j = 0; j < strideTime; j++) {
          outputOverlayGroup
            .append("rect")
            .attr("class", `mask-overlay mask-${i}-${j}`)
            .attr("width", stride)
            .attr("height", stride)
            .attr("x", i * stride)
            .attr("y", j * stride)
            .style("fill", "var(--light-gray)")
            .style("stroke", "var(--light-gray)")
            .style("opacity", 1);
        }
      }

      // Make sure the bounding box is on top of other things
      curNode.select("rect.bounding").raise();

      // Add sliding kernel for the output node
      let kernelGroup = intermediateLayer
        .append("g")
        .attr("class", `kernel kernel-output kernel-clone`)
        .attr("transform", `translate(${rightX}, ${outputY})`);

      kernelGroup
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", kernelRectLength * 3)
        .attr("height", kernelRectLength * 3)
        .attr("fill", "none")
        .attr("stroke", intermediateColor$1);

      kernelGroup
        .attr("data-tick", 0)
        .attr("data-origin-x", rightX)
        .attr("data-origin-y", outputY);

      let delay = 200;
      let tickTime1D = nodeLength$3 / (kernelRectLength * 3);

      startOutputAnimation(kernelGroup, tickTime1D, stride, delay, curLayerIndex);

      // First intermediate layer
      nodeCoordinate[curLayerIndex - 1].forEach((n, ni) => {
        // Compute the intermediate value
        let inputMatrix = cnn[curLayerIndex - 1][ni].output;
        let kernelMatrix = cnn[curLayerIndex][i].inputLinks[ni].weight;
        let interMatrix = singleConv(inputMatrix, kernelMatrix);

        // Compute the intermediate layer min max
        intermediateMinMax.push(getExtent(interMatrix));

        // Update the intermediate sum
        // itnermediateSumMatrix = matrixAdd(itnermediateSumMatrix, interMatrix);

        // Layout the canvas and rect
        let newNode = createIntermediateNode(
          curLayerIndex,
          i,
          intermediateLayer,
          intermediateX1,
          n.y,
          ni,
          stride,
          intermediateNodeMouseOverHandler,
          intermediateNodeMouseLeaveHandler,
          intermediateNodeClicked,
          true
        );

        // Draw the image
        let image = newNode.select("image");
        drawIntermidiateImage(
          image,
          range,
          colorScale,
          d.output.length,
          interMatrix
        );

        // Edge: input -> intermediate1
        linkData.push({
          source: getOutputKnot({ x: leftX, y: n.y }),
          target: getInputKnot({ x: intermediateX1, y: n.y }),
          name: `input-${ni}-inter1-${ni}`,
        });

        // Edge: intermediate1 -> intermediate2-1
        linkData.push({
          source: getOutputKnot({ x: intermediateX1, y: n.y }),
          target: getInputKnot({
            x: intermediateX2,
            y: nodeCoordinate[curLayerIndex][i].y,
          }),
          name: `inter1-${ni}-inter2-1`,
        });

        // Create a small kernel illustration
        let kernelRectX = leftX - kernelRectLength * 3 * 2;
        let kernelGroup = intermediateLayer
          .append("g")
          .attr("class", `kernel kernel-${ni}`)
          .attr("transform", `translate(${kernelRectX}, ${n.y})`);

        let weightText = "Kernel weights: [";
        let f2 = d3.format(".2f");
        for (let r = 0; r < kernelMatrix.length; r++) {
          for (let c = 0; c < kernelMatrix[0].length; c++) {
            kernelGroup
              .append("rect")
              .attr("class", "kernel")
              .attr("x", kernelRectLength * c)
              .attr("y", kernelRectLength * r)
              .attr("width", kernelRectLength)
              .attr("height", kernelRectLength)
              .attr(
                "fill",
                gappedColorScale(
                  layerColorScales$2.weight,
                  kernelRange,
                  kernelMatrix[r][c],
                  kernelColorGap
                )
              );

            let sep = "";
            if (c === 0 && r == 0) {
              sep = "";
            } else if (c === 0) {
              sep = "; ";
            } else {
              sep = ", ";
            }
            weightText = weightText.concat(sep, `${f2(kernelMatrix[r][c])}`);
          }
        }
        weightText = weightText.concat("]");

        kernelGroup
          .append("rect")
          .attr("x", 0)
          .attr("y", 0)
          .attr("width", kernelRectLength * 3)
          .attr("height", kernelRectLength * 3)
          .attr("fill", "none")
          .attr("stroke", intermediateColor$1);

        kernelGroup
          .style("pointer-events", "all")
          .style("cursor", "crosshair")
          .on("mouseover", () => {
            hoverInfoStore.set({ show: true, text: weightText });
          })
          .on("mouseleave", () => {
            hoverInfoStore.set({ show: false, text: weightText });
          })
          .on("click", () => {
            d3.event.stopPropagation();
          });

        // Sliding the kernel on the input channel and result channel at the same
        // time
        let kernelGroupInput = kernelGroup
          .clone(true)
          .style("pointer-events", "none")
          .style("cursor", "pointer")
          .classed("kernel-clone", true)
          .classed(`kernel-input-${ni}`, true);

        kernelGroupInput
          .style("opacity", 0.9)
          .selectAll("rect.kernel")
          .style("opacity", 0.7);

        kernelGroupInput
          .attr("transform", `translate(${leftX}, ${n.y})`)
          .attr("data-tick", 0)
          .attr("data-origin-x", leftX)
          .attr("data-origin-y", n.y);

        let kernelGroupResult = kernelGroup
          .clone(true)
          .style("pointer-events", "none")
          .style("cursor", "pointer")
          .classed("kernel-clone", true)
          .classed(`kernel-result-${ni}`, true);

        kernelGroupResult
          .style("opacity", 0.9)
          .selectAll("rect.kernel")
          .style("fill", "none");

        kernelGroupResult
          .attr("transform", `translate(${intermediateX1}, ${n.y})`)
          .attr("data-origin-x", intermediateX1)
          .attr("data-origin-y", n.y);

        startIntermediateAnimation(
          kernelGroupInput,
          kernelGroupResult,
          tickTime1D,
          stride
        );
      });

      // Aggregate the intermediate min max
      let aggregatedExtent = intermediateMinMax.reduce((acc, cur) => {
        return [Math.min(acc[0], cur[0]), Math.max(acc[1], cur[1])];
      });
      let aggregatedMinMax = { min: aggregatedExtent[0], max: aggregatedExtent[1] };

      // Draw the plus operation symbol
      let symbolY = nodeCoordinate[curLayerIndex][i].y + nodeLength$3 / 2;
      let symbolRectHeight = 1;
      let symbolGroup = intermediateLayer
        .append("g")
        .attr("class", "plus-symbol")
        .attr(
          "transform",
          `translate(${intermediateX2 + plusSymbolRadius}, ${symbolY})`
        );

      symbolGroup
        .append("rect")
        .attr("x", -plusSymbolRadius)
        .attr("y", -plusSymbolRadius)
        .attr("width", 2 * plusSymbolRadius)
        .attr("height", 2 * plusSymbolRadius)
        .attr("rx", 3)
        .attr("ry", 3)
        .style("fill", "none")
        .style("stroke", intermediateColor$1);

      symbolGroup
        .append("rect")
        .attr("x", -(plusSymbolRadius - 3))
        .attr("y", -symbolRectHeight / 2)
        .attr("width", 2 * (plusSymbolRadius - 3))
        .attr("height", symbolRectHeight)
        .style("fill", intermediateColor$1);

      symbolGroup
        .append("rect")
        .attr("x", -symbolRectHeight / 2)
        .attr("y", -(plusSymbolRadius - 3))
        .attr("width", symbolRectHeight)
        .attr("height", 2 * (plusSymbolRadius - 3))
        .style("fill", intermediateColor$1);

      // Place the bias marker below the plus sign for the first conv node.
      if (i == 0) {
        // Add bias symbol to the plus symbol
        symbolGroup
          .append("circle")
          .attr("cx", 0)
          .attr("cy", nodeLength$3 / 2 + kernelRectLength)
          .attr("r", 4)
          .style("stroke", intermediateColor$1)
          .style("cursor", "crosshair")
          .style(
            "fill",
            gappedColorScale(
              layerColorScales$2.weight,
              kernelRange,
              d.bias,
              kernelColorGap
            )
          )
          .on("mouseover", () => {
            hoverInfoStore.set({ show: true, text: `Bias: ${formater(d.bias)}` });
          })
          .on("mouseleave", () => {
            hoverInfoStore.set({ show: false, text: `Bias: ${formater(d.bias)}` });
          });

        symbolGroup
          .append("text")
          .attr("class", "bias-label")
          .attr("x", 0)
          .attr("y", nodeLength$3 / 2 + kernelRectLength + 9)
          .style("dominant-baseline", "hanging")
          .style("text-anchor", "middle")
          .style("font-size", "10px")
          .style("font-style", "italic")
          .style("fill", intermediateColor$1)
          .style("pointer-events", "none")
          .text("Bias");

        // Link from bias to the plus symbol
        linkData.push({
          source: {
            x: intermediateX2 + plusSymbolRadius,
            y: nodeCoordinate[curLayerIndex][i].y + nodeLength$3,
          },
          target: {
            x: intermediateX2 + plusSymbolRadius,
            y:
              nodeCoordinate[curLayerIndex][i].y +
              nodeLength$3 / 2 +
              plusSymbolRadius,
          },
          name: `bias-plus`,
        });
      } else {
        // Add bias symbol to the plus symbol
        symbolGroup
          .append("circle")
          .attr("cx", 0)
          .attr("cy", -nodeLength$3 / 2 - kernelRectLength)
          .attr("r", 4)
          .style("stroke", intermediateColor$1)
          .style("cursor", "crosshair")
          .style(
            "fill",
            gappedColorScale(
              layerColorScales$2.weight,
              kernelRange,
              d.bias,
              kernelColorGap
            )
          )
          .on("mouseover", () => {
            hoverInfoStore.set({ show: true, text: `Bias: ${formater(d.bias)}` });
          })
          .on("mouseleave", () => {
            hoverInfoStore.set({ show: false, text: `Bias: ${formater(d.bias)}` });
          });

        symbolGroup
          .append("text")
          .attr("class", "bias-label")
          .attr("x", 0)
          .attr("y", -nodeLength$3 / 2 - kernelRectLength - 9)
          .style("dominant-baseline", "alphabetic")
          .style("text-anchor", "middle")
          .style("font-size", "10px")
          .style("font-style", "italic")
          .style("fill", intermediateColor$1)
          .style("pointer-events", "none")
          .text("Bias");

        // Link from bias to the plus symbol
        linkData.push({
          source: {
            x: intermediateX2 + plusSymbolRadius,
            y: nodeCoordinate[curLayerIndex][i].y,
          },
          target: {
            x: intermediateX2 + plusSymbolRadius,
            y:
              nodeCoordinate[curLayerIndex][i].y +
              nodeLength$3 / 2 -
              plusSymbolRadius,
          },
          name: `bias-plus`,
        });
      }

      // Link from the plus symbol to the output
      linkData.push({
        source: getOutputKnot({
          x: intermediateX2 + 2 * plusSymbolRadius - nodeLength$3,
          y: nodeCoordinate[curLayerIndex][i].y,
        }),
        target: getInputKnot({ x: rightX, y: nodeCoordinate[curLayerIndex][i].y }),
        name: `symbol-output`,
      });

      // Output -> next layer
      linkData.push({
        source: getOutputKnot({ x: rightX, y: nodeCoordinate[curLayerIndex][i].y }),
        target: getInputKnot({
          x: rightStart,
          y: nodeCoordinate[curLayerIndex][i].y,
        }),
        name: `output-next`,
      });

      // Draw the layer label
      intermediateLayer
        .append("g")
        .attr("class", "layer-intermediate-label layer-label")
        .attr("transform", () => {
          let x = intermediateX1 + nodeLength$3 / 2;
          let y = (svgPaddings$1.top + vSpaceAroundGap$1) / 2 + 5;
          return `translate(${x}, ${y})`;
        })
        .classed("hidden", detailedMode)
        .append("text")
        .style("text-anchor", "middle")
        .style("dominant-baseline", "middle")
        .style("font-weight", 800)
        .style("opacity", "0.8")
        .text("intermediate");

      intermediateLayer
        .append("g")
        .attr("class", "animation-control")
        .attr("transform", () => {
          let x = intermediateX1 + nodeLength$3 / 2 + 10;
          let y = (svgPaddings$1.top + vSpaceAroundGap$1) / 2 - 4;
          return `translate(${x}, ${y})`;
        })
        .on("click", () => animationButtonClicked(curLayerIndex))
        .append("image")
        .attr("class", "animation-control-button")
        .attr("xlink:href", "/assets/img/fast_forward.svg")
        .attr("x", 50)
        .attr("y", 0)
        .attr("height", 13)
        .attr("width", 13);

      // Draw the detailed model layer label
      intermediateLayer
        .append("g")
        .attr("class", "layer-intermediate-label layer-detailed-label")
        .attr("transform", () => {
          let x = intermediateX1 + nodeLength$3 / 2;
          let y = (svgPaddings$1.top + vSpaceAroundGap$1) / 2 - 5;
          return `translate(${x}, ${y})`;
        })
        .classed("hidden", !detailedMode)
        .append("text")
        .style("text-anchor", "middle")
        .style("dominant-baseline", "middle")
        .style("opacity", "1")
        .style("font-size", "17px")
        .style("font-weight", 800)
        .append("tspan")
        .text("Intermediate")
        .append("tspan")
        .style("font-size", "10px")
        .style("font-weight", "normal")
        .attr("x", 0)
        .attr("dy", "1.5em").text(`(${cnn[curLayerIndex][0].output.length},${cnn[curLayerIndex][0].output[0].length},1)`)
        .append("tspan")
        .style("font-size", "10px")
        .style("font-weight", "normal")
        .style("font-style", "italic")
        .attr("x", 0)
        .attr("dy", "1.5em")
        .text(" [H,W,C]");

      // Draw the edges
      let linkGen = d3
        .linkHorizontal()
        .x((d) => d.x)
        .y((d) => d.y);

      let edgeGroup = intermediateLayer
        .append("g")
        .attr("class", "edge-group")
        .lower();

      let dashoffset = 0;

      edgeGroup
        .selectAll("path")
        .data(linkData)
        .enter()
        .append("path")
        .classed("flow-edge", (d) => d.name !== "output-next")
        .attr("id", (d) => `edge-${d.name}`)
        .attr("d", (d) => linkGen({ source: d.source, target: d.target }))
        .style("fill", "none")
        .style("stroke-width", 1)
        .style("stroke", intermediateColor$1);

      edgeGroup.select("#edge-output-next").style("opacity", 0.1);

      edgeGroup
        .selectAll("path.flow-edge")
        .attr("stroke-dasharray", "4 2")
        .attr("stroke-dashoffset", 0)
        .each((d, i, g) => animateEdge(d, i, g, dashoffset - 1000));

      return {
        intermediateLayer: intermediateLayer,
        intermediateMinMax: aggregatedMinMax,
        kernelRange: kernelRange,
        kernelMinMax: { min: kernelExtent[0], max: kernelExtent[1] },
      };
    };

    /**
     * Add an annotation for the kernel and the sliding
     * @param {object} arg
     * {
     *  leftX: X value of the left border of intermedaite layer
     *  group: element group
     *  intermediateGap: the inner gap of intermediate layer
     *  isFirstConv: if this intermediate layer is after the first layer
     *  i: index of the selected node
     * }
     */
    const drawIntermediateLayerAnnotation = (arg) => {
      let {
        leftX,
        curLayerIndex,
        group,
        intermediateGap,
        isFirstConv,
        i,
        intermediateNodes,
      } = arg;

      let kernelAnnotation = group.append("g").attr("class", "kernel-annotation");

      const kernelLabelNodes = intermediateNodes?.length
        ? intermediateNodes.map((node) => node.__renderPos ?? node)
        : nodeCoordinate[curLayerIndex - 1];

      kernelAnnotation
        .selectAll("text.kernel-row-label")
        .data(kernelLabelNodes)
        .enter()
        .append("text")
        .text("Kernel")
        .attr("class", "annotation-text kernel-row-label")
        .attr("x", leftX - 2.5 * kernelRectLength * 3)
        .attr("y", (node) => node.y + kernelRectLength * 3)
        .style("dominant-baseline", "baseline")
        .style("text-anchor", "end");

      let sliderX, sliderY, arrowSX, arrowSY, dr;
      let sliderY2, arrowSY2, arrowTY2;

      if (isFirstConv) {
        sliderX = leftX;
        sliderY =
          (intermediateNodes?.[0]?.__renderPos?.y ??
            nodeCoordinate[curLayerIndex - 1][0].y) +
          nodeLength$3 +
          kernelRectLength * 3;
        arrowSX = leftX - 5;
        arrowSY =
          (intermediateNodes?.[0]?.__renderPos?.y ??
            nodeCoordinate[curLayerIndex - 1][0].y) +
          nodeLength$3 +
          kernelRectLength * 3 +
          5;
        dr = 20;
        sliderY2 =
          (intermediateNodes?.[1]?.__renderPos?.y ??
            nodeCoordinate[curLayerIndex - 1][1].y) +
          nodeLength$3 +
          kernelRectLength * 3;
        arrowSY2 =
          (intermediateNodes?.[1]?.__renderPos?.y ??
            nodeCoordinate[curLayerIndex - 1][1].y) +
          nodeLength$3 +
          15;
        arrowTY2 =
          (intermediateNodes?.[1]?.__renderPos?.y ??
            nodeCoordinate[curLayerIndex - 1][1].y) + 15;
      } else {
        sliderX = leftX - 3 * kernelRectLength * 3;
        sliderY =
          (intermediateNodes?.[0]?.__renderPos?.y ??
            nodeCoordinate[curLayerIndex - 1][0].y) +
          nodeLength$3 / 3;
        arrowSX = leftX - 2 * kernelRectLength * 3 - 5;
        arrowSY =
          (intermediateNodes?.[0]?.__renderPos?.y ??
            nodeCoordinate[curLayerIndex - 1][0].y) +
          nodeLength$3 -
          10;
        dr = 50;
        sliderY2 =
          (intermediateNodes?.[2]?.__renderPos?.y ??
            nodeCoordinate[curLayerIndex - 1][2].y) - 3;
        arrowTY2 =
          (intermediateNodes?.[2]?.__renderPos?.y ??
            nodeCoordinate[curLayerIndex - 1][2].y) +
          kernelRectLength * 3 +
          6;
        arrowSY2 =
          (intermediateNodes?.[2]?.__renderPos?.y ??
            nodeCoordinate[curLayerIndex - 1][2].y) + 26;
      }

      let slideText = kernelAnnotation
        .append("text")
        .attr("x", sliderX)
        .attr("y", sliderY)
        .attr("class", "annotation-text")
        .style("dominant-baseline", "hanging")
        .style("text-anchor", isFirstConv ? "start" : "end");

      slideText
        .append("tspan")
        .style("dominant-baseline", "hanging")
        .text("Slide kernel over input channel");

      slideText
        .append("tspan")
        .attr("x", sliderX)
        .attr("dy", "1em")
        .style("dominant-baseline", "hanging")
        .text("to get intermediate result.");


      drawArrow({
        group: group,
        tx: leftX - 7,
        ty:
          (intermediateNodes?.[0]?.__renderPos?.y ??
            nodeCoordinate[curLayerIndex - 1][0].y) +
          nodeLength$3 / 2,
        sx: arrowSX,
        sy: arrowSY,
        hFlip: !isFirstConv,
        dr: dr,
        marker: "marker",
      });


      // Add annotation for the sum operation
      let plusAnnotation = group.append("g").attr("class", "plus-annotation");

      let intermediateX2 = leftX + 2 * nodeLength$3 + 2.5 * intermediateGap;
      let textX = intermediateX2;
      let textY =
        nodeCoordinate[curLayerIndex][i].y + nodeLength$3 + kernelRectLength * 3;

      // Special case 1: first node
      if (i === 0) {
        textX += 30;
      }

      // Special case 2: last node
      if (i === 9) {
        textX = intermediateX2 + plusSymbolRadius - 10;
        textY -= 2.5 * nodeLength$3;
      }

      let plusText = plusAnnotation
        .append("text")
        .attr("x", textX)
        .attr("y", textY)
        .attr("class", "annotation-text")
        .style("dominant-baseline", "hanging")
        .style("text-anchor", "start");

      plusText
        .append("tspan")
        .style("dominant-baseline", "hanging")
        .text("Add up all intermediate");

      plusText
        .append("tspan")
        .attr("x", textX)
        .attr("dy", "1em")
        .style("dominant-baseline", "hanging")
        .text("results and then add bias.");

      if (i === 9) {
        drawArrow({
          group: group,
          sx: intermediateX2 + 50,
          sy:
            nodeCoordinate[curLayerIndex][i].y -
            (nodeLength$3 / 2 + kernelRectLength * 2),
          tx: intermediateX2 + 2 * plusSymbolRadius + 5,
          ty:
            nodeCoordinate[curLayerIndex][i].y + nodeLength$3 / 2 - plusSymbolRadius,
          dr: 50,
          hFlip: false,
          marker: "marker-alt",
        });
      } else {
        drawArrow({
          group: group,
          sx: intermediateX2 + 35,
          sy:
            nodeCoordinate[curLayerIndex][i].y + nodeLength$3 + kernelRectLength * 2,
          tx: intermediateX2 + 2 * plusSymbolRadius + 5,
          ty:
            nodeCoordinate[curLayerIndex][i].y + nodeLength$3 / 2 + plusSymbolRadius,
          dr: 30,
          hFlip: true,
          marker: "marker-alt",
        });
      }
    };

    /**
     * Append a filled rectangle under a pair of nodes.
     * @param {number} curLayerIndex Index of the selected layer
     * @param {number} i Index of the selected node
     * @param {number} leftX X value of the left border of intermediate layer
     * @param {number} intermediateGap Inner gap of this intermediate layer
     * @param {number} padding Padding around the rect
     * @param {function} intermediateNodeMouseOverHandler Mouse over handler
     * @param {function} intermediateNodeMouseLeaveHandler Mouse leave handler
     * @param {function} intermediateNodeClicked Mouse click handler
     */
    const addUnderneathRect = (
      curLayerIndex,
      i,
      leftX,
      intermediateGap,
      padding,
      intermediateNodeMouseOverHandler,
      intermediateNodeMouseLeaveHandler,
      intermediateNodeClicked
    ) => {
      // Add underneath rects
      let underGroup = svg$1.select("g.underneath");

      for (let n = 0; n < cnn[curLayerIndex - 1].length; n++) {
        underGroup
          .append("rect")
          .attr("class", "underneath-gateway")
          .attr("id", `underneath-gateway-${n}`)
          .attr("x", leftX - padding)
          .attr("y", nodeCoordinate[curLayerIndex - 1][n].y - padding)
          .attr("width", 2 * nodeLength$3 + intermediateGap + 2 * padding)
          .attr("height", nodeLength$3 + 2 * padding)
          .attr("rx", 10)
          .style("fill", "rgba(160, 160, 160, 0.2)")
          .style("opacity", 0);

        // Register new events for input layer nodes
        svg$1
          .select(`g#layer-${curLayerIndex - 1}-node-${n}`)
          .style("pointer-events", "all")
          .style("cursor", "pointer")
          .on("mouseover", intermediateNodeMouseOverHandler)
          .on("mouseleave", intermediateNodeMouseLeaveHandler)
          .on("click", (d, ni, g) =>
            intermediateNodeClicked(d, ni, g, i, curLayerIndex)
          );
      }
      underGroup.lower();
    };

    /**
     * Add an overlaying rect
     * @param {string} gradientName Gradient name of overlay rect
     * @param {number} x X value of the overlaying rect
     * @param {number} y Y value of the overlaying rect
     * @param {number} width Rect width
     * @param {number} height Rect height
     */
    const addOverlayRect = (gradientName, x, y, width, height) => {
      if (svg$1.select(".intermediate-layer-overlay").empty()) {
        svg$1.append("g").attr("class", "intermediate-layer-overlay");
      }

      let intermediateLayerOverlay = svg$1.select(".intermediate-layer-overlay");

      let overlayRect = intermediateLayerOverlay
        .append("rect")
        .attr("class", "overlay")
        .style("fill", `url(#${gradientName})`)
        .style("stroke", "none")
        .attr("width", width)
        .attr("height", height)
        .attr("x", x)
        .attr("y", y)
        .style("opacity", 0);

      overlayRect
        .transition("move")
        .duration(800)
        .ease(d3.easeCubicInOut)
        .style("opacity", 1);
    };

    /**
     * Draw the intermediate layer before conv_1_1
     * @param {number} curLayerIndex Index of the selected layer
     * @param {object} d Bounded d3 data
     * @param {number} i Index of the selected node
     * @param {number} width CNN group width
     * @param {number} height CNN group height
     * @param {function} intermediateNodeMouseOverHandler mouse over handler
     * @param {function} intermediateNodeMouseLeaveHandler mouse leave handler
     * @param {function} intermediateNodeClicked node clicking handler
     */
    const drawConv1 = (
      curLayerIndex,
      d,
      i,
      width,
      height,
      intermediateNodeMouseOverHandler,
      intermediateNodeMouseLeaveHandler,
      intermediateNodeClicked
    ) => {
      // Compute the target location
      let targetX =
        nodeCoordinate[curLayerIndex - 1][0].x +
        2 * nodeLength$3 +
        2 * hSpaceAroundGap * gapRatio +
        plusSymbolRadius * 2;
      let intermediateGap = (hSpaceAroundGap * gapRatio * 2) / 3;
      let leftX = nodeCoordinate[curLayerIndex - 1][0].x;
      targetX = Math.max(targetX, leftX + 160);

      // Record the left x position for dynamic detial view positioning
      intermediateLayerPosition["conv_1"] = targetX + nodeLength$3;
      intermediateLayerPositionStore.set(intermediateLayerPosition);

      // Hide the edges
      svg$1.select("g.edge-group").style("visibility", "hidden");

      // Move the selected layer
      moveLayerX({
        layerIndex: curLayerIndex,
        targetX: targetX,
        disable: true,
        delay: 0,
        opacity: 0.15,
        specialIndex: i,
      });

      // Compute the gap in the right shrink region
      let rightStart = targetX + nodeLength$3 + hSpaceAroundGap * gapRatio;
      let rightGap = (width - rightStart - 10 * nodeLength$3) / 10;

      // Move the right layers
      for (let i = curLayerIndex + 1; i < cnn.length; i++) {
        let curX = rightStart + (i - (curLayerIndex + 1)) * (nodeLength$3 + rightGap);
        moveLayerX({ layerIndex: i, targetX: curX, disable: true, delay: 0 });
      }

      // Add an overlay gradient and rect
      let stops = [
        { offset: "0%", color: "rgb(255, 255, 255)", opacity: 0.85 },
        { offset: "50%", color: "rgb(255, 255, 255)", opacity: 0.95 },
        { offset: "100%", color: "rgb(255, 255, 255)", opacity: 1 },
      ];
      addOverlayGradient("overlay-gradient", stops);

      addOverlayRect(
        "overlay-gradient",
        rightStart - overlayRectOffset / 2,
        0,
        width - rightStart + overlayRectOffset,
        height + svgPaddings$1.top + svgPaddings$1.bottom
      );

      // Draw the intermediate layer
      let { intermediateLayer, intermediateMinMax, kernelRange, kernelMinMax } =
        drawIntermediateLayer(
          curLayerIndex,
          leftX,
          targetX,
          rightStart,
          intermediateGap,
          d,
          i,
          intermediateNodeMouseOverHandler,
          intermediateNodeMouseLeaveHandler,
          intermediateNodeClicked
        );
      addUnderneathRect(
        curLayerIndex,
        i,
        leftX,
        intermediateGap,
        8,
        intermediateNodeMouseOverHandler,
        intermediateNodeMouseLeaveHandler,
        intermediateNodeClicked
      );

      // Compute the selected node's min max
      // Selected node
      let min = Infinity,
        max = -Infinity;
      let n = cnn[curLayerIndex][i];
      for (let r = 0; r < n.output.length; r++) {
        for (let c = 0; c < n.output[0].length; c++) {
          if (n.output[r][c] < min) {
            min = n.output[r][c];
          }
          if (n.output[r][c] > max) {
            max = n.output[r][c];
          }
        }
      }

      let finalMinMax = {
        min: Math.min(min, intermediateMinMax.min),
        max: Math.max(max, intermediateMinMax.max),
      };

      // Add annotation to the intermediate layer
      let intermediateLayerAnnotation = svg$1
        .append("g")
        .attr("class", "intermediate-layer-annotation")
        .style("opacity", 0);

      drawIntermediateLayerAnnotation({
        leftX: leftX,
        curLayerIndex: curLayerIndex,
        group: intermediateLayerAnnotation,
        intermediateGap: intermediateGap,
        isFirstConv: true,
        i: i,
      });

      let range = cnnLayerRanges.local[curLayerIndex];
      const legendWidth = Math.max(106, 2 * nodeLength$3 + intermediateGap);
      const legendLeft = Math.max(8, leftX - 50);

      // Preserve the original two-row arrangement below the calculation chain.
      const inputLegend = drawIntermediateLayerLegend({
        legendHeight: 5,
        compact: true,
        curLayerIndex: curLayerIndex,
        range: 1,
        group: intermediateLayer,
        width: legendWidth,
        isInput: true,
        x: legendLeft,
        y: 0,
        legendTitle: "Input Chanel"
      });
      positionIntermediateLegendInFooter(inputLegend, legendLeft);

      const kernelLegendX = legendLeft;
      const kernelLegend = drawIntermediateLayerLegend({
        legendHeight: 5,
        compact: true,
        curLayerIndex: curLayerIndex,
        range: kernelRange,
        minMax: kernelMinMax,
        group: intermediateLayer,
        width: legendWidth,
        x: kernelLegendX,
        y: 0,
        gradientAppendingName: "kernelColorGradient",
        colorScale: layerColorScales$2.weight,
        gradientGap: 0.2,
        legendTitle: "Convolution Kernel"
      });
      positionIntermediateLegendInFooter(kernelLegend, kernelLegendX);
      positionIntermediateLegendInFooter(inputLegend, legendLeft,
        12 + kernelLegend.node().getBBox().height + 8);

      const outputLegendX = Math.max(
        targetX + nodeLength$3 - legendWidth - 75,
        legendLeft + legendWidth + 16
      );
      const outputLegend = drawIntermediateLayerLegend({
        legendHeight: 5,
        compact: true,
        curLayerIndex: curLayerIndex,
        range: range,
        minMax: finalMinMax,
        group: intermediateLayer,
        width: legendWidth,
        x: outputLegendX,
        y: 0,
        legendTitle: "Output Result"
      });
      positionIntermediateLegendInFooter(outputLegend, outputLegendX);

      // Show everything
      svg$1
        .selectAll("g.intermediate-layer, g.intermediate-layer-annotation")
        .transition()
        .delay(500)
        .duration(500)
        .ease(d3.easeCubicInOut)
        .style("opacity", 1);
    };

    /* global d3, SmoothScroll */

    // Configs
    const layerColorScales$3 = overviewConfig.layerColorScales;
    const nodeLength$4 = overviewConfig.nodeLength;
    const plusSymbolRadius$1 = overviewConfig.plusSymbolRadius;
    const intermediateColor$2 = overviewConfig.intermediateColor;
    const kernelRectLength$1 = overviewConfig.kernelRectLength;
    const svgPaddings$2 = overviewConfig.svgPaddings;
    const gapRatio$1 = overviewConfig.gapRatio;
    const classList = overviewConfig.classLists;
    const formater$1 = d3.format(".4f");
    const bottomLegendLift = 12;
    const bottomLegendNodeClearance = 12;

    // Shared variables
    let svg$2 = undefined;
    svgStore.subscribe((value) => {
      svg$2 = value;
    });

    let vSpaceAroundGap$2 = undefined;
    vSpaceAroundGapStore.subscribe((value) => {
      vSpaceAroundGap$2 = value;
    });

    let hSpaceAroundGap$1 = undefined;
    hSpaceAroundGapStore.subscribe((value) => {
      hSpaceAroundGap$1 = value;
    });

    let cnn$1 = undefined;
    cnnStore.subscribe((value) => {
      cnn$1 = value;
    });

    let nodeCoordinate$1 = undefined;
    nodeCoordinateStore.subscribe((value) => {
      nodeCoordinate$1 = value;
    });

    let selectedScaleLevel$1 = undefined;
    selectedScaleLevelStore.subscribe((value) => {
      selectedScaleLevel$1 = value;
    });

    let cnnLayerRanges$1 = undefined;
    cnnLayerRangesStore.subscribe((value) => {
      cnnLayerRanges$1 = value;
    });

    let isInSoftmax = undefined;
    isInSoftmaxStore.subscribe((value) => {
      isInSoftmax = value;
    });

    let allowsSoftmaxAnimation = undefined;
    allowsSoftmaxAnimationStore.subscribe((value) => {
      allowsSoftmaxAnimation = value;
    });

    let softmaxDetailViewInfo = undefined;
    softmaxDetailViewStore.subscribe((value) => {
      softmaxDetailViewInfo = value;
    });

    let hoverInfo = undefined;
    hoverInfoStore.subscribe((value) => {
      hoverInfo = value;
    });

    let detailedMode$1 = undefined;
    detailedModeStore.subscribe((value) => {
      detailedMode$1 = value;
    });

    const layerIndexDict = {
      input: 0,
      conv_1: 1,
      block_1_layer_1_out: 2,
      block_1_layer_2_out: 3,
      block_1_layer_3_out: 4,
      block_1_layer_4_out: 5,
      block_2_layer_1_out: 6,
      block_2_layer_2_out: 7,
      block_2_layer_3_out: 8,
      block_2_layer_4_out: 9,
      block_3_layer_1_out: 10,
      block_3_layer_2_out: 11,
      block_3_layer_3_out: 12,
      block_3_layer_4_out: 13,
      norm: 14,
      relu: 15,
      pool: 16,
      output: 17,
    };

    let hasInitialized = false;
    let logits = [];
    let flattenFactoredFDict = {};

    const moveLegend = (d, i, g, moveX, duration, restore) => {
      let legend = d3.select(g[i]);

      if (!restore) {
        const transform = legend.node().transform.baseVal.consolidate().matrix;
        let previousLegendX = transform.e;
        let previousLegendY = transform.f;

        legend
          .transition("softmax")
          .duration(duration)
          .ease(d3.easeCubicInOut)
          .attr(
            "transform",
            `translate(${previousLegendX - moveX}, ${previousLegendY})`
          );

        // If not in restore mode, we register the previous location to the DOM element
        legend.attr("data-preX", previousLegendX);
        legend.attr("data-preY", previousLegendY);
      } else {
        // Restore the recorded location
        let previousLegendX = +legend.attr("data-preX");
        let previousLegendY = +legend.attr("data-preY");

        legend
          .transition("softmax")
          .duration(duration)
          .ease(d3.easeCubicInOut)
          .attr("transform", `translate(${previousLegendX}, ${previousLegendY})`);
      }
    };

    const logitCircleMouseOverHandler = (i) => {
      // Update the hover info UI
      hoverInfoStore.set({
        show: true,
        text: `Logit: ${formater$1(logits[i])}`,
      });

      // Highlight the text in the detail view
      softmaxDetailViewInfo.highlightI = i;
      softmaxDetailViewStore.set(softmaxDetailViewInfo);

      let logitLayer = svg$2.select(".logit-layer");
      let logitLayerLower = svg$2.select(".underneath");
      let intermediateLayer = svg$2.select(".intermediate-layer");

      // Highlight the circle
      logitLayer.select(`#logit-circle-${i}`).style("stroke-width", 2);

      // Highlight the associated plus symbol
      intermediateLayer
        .select(`#plus-symbol-clone-${i}`)
        .style("opacity", 1)
        .select("circle")
        .style("fill", (d) => d.fill);

      // Raise the associated edge group
      logitLayerLower.select(`#logit-lower-${i}`).raise();

      // Highlight the associated edges
      logitLayerLower
        .selectAll(`.softmax-abstract-edge-${i}`)
        .style("stroke-width", 0.8)
        .style("stroke", "#E0E0E0");

      logitLayerLower
        .selectAll(`.softmax-edge-${i}`)
        .style("stroke-width", 1)
        .style("stroke", "#E0E0E0");

      logitLayerLower
        .selectAll(`.logit-output-edge-${i}`)
        .style("stroke-width", 3)
        .style("stroke", "#E0E0E0");

      logitLayer
        .selectAll(`.logit-output-edge-${i}`)
        .style("stroke-width", 3)
        .style("stroke", "#E0E0E0");
    };

    const logitCircleMouseLeaveHandler = (i) => {
      // Update the hover info UI
      hoverInfoStore.set({
        show: false,
        text: `Logit: ${formater$1(logits[i])}`,
      });

      // Dehighlight the text in the detail view
      softmaxDetailViewInfo.highlightI = -1;
      softmaxDetailViewStore.set(softmaxDetailViewInfo);

      let logitLayer = svg$2.select(".logit-layer");
      let logitLayerLower = svg$2.select(".underneath");
      let intermediateLayer = svg$2.select(".intermediate-layer");

      // Restore the circle
      logitLayer.select(`#logit-circle-${i}`).style("stroke-width", 1);

      // Restore the associated plus symbol
      intermediateLayer.select(`#plus-symbol-clone-${i}`).style("opacity", 0.2);

      // Restore the associated edges
      logitLayerLower
        .selectAll(`.softmax-abstract-edge-${i}`)
        .style("stroke-width", 0.2)
        .style("stroke", "#EDEDED");

      logitLayerLower
        .selectAll(`.softmax-edge-${i}`)
        .style("stroke-width", 0.2)
        .style("stroke", "#F1F1F1");

      logitLayerLower
        .selectAll(`.logit-output-edge-${i}`)
        .style("stroke-width", 1.2)
        .style("stroke", "#E5E5E5");

      logitLayer
        .selectAll(`.logit-output-edge-${i}`)
        .style("stroke-width", 1.2)
        .style("stroke", "#E5E5E5");
    };

    // This function is binded to the detail view in Overview.svelte
    const softmaxDetailViewMouseOverHandler = (event) => {
      logitCircleMouseOverHandler(event.detail.curI);
    };

    // This function is binded to the detail view in Overview.svelte
    const softmaxDetailViewMouseLeaveHandler = (event) => {
      logitCircleMouseLeaveHandler(event.detail.curI);
    };

    const drawLogitLayer = (arg) => {
      let curLayerIndex = arg.curLayerIndex,
        moveX = arg.moveX,
        softmaxLeftMid = arg.softmaxLeftMid,
        selectedI = arg.selectedI,
        intermediateX1 = arg.intermediateX1,
        intermediateX2 = arg.intermediateX2,
        pixelWidth = arg.pixelWidth,
        pixelHeight = arg.pixelHeight,
        topY = arg.topY,
        bottomY = arg.bottomY,
        softmaxX = arg.softmaxX,
        middleGap = arg.middleGap,
        middleRectHeight = arg.middleRectHeight,
        symbolGroup = arg.symbolGroup,
        symbolX = arg.symbolX,
        flattenRange = arg.flattenRange;

      let logitLayer = svg$2
        .select(".intermediate-layer")
        .append("g")
        .attr("class", "logit-layer")
        .raise();

      // Minotr layer ordering change
      let tempClone = svg$2
        .select(".intermediate-layer")
        .select(".flatten-layer")
        .select(".plus-symbol")
        .clone(true)
        .attr("class", "temp-clone-plus-symbol")
        .attr(
          "transform",
          `translate(${symbolX - moveX},
      ${nodeCoordinate$1[curLayerIndex][selectedI].y + nodeLength$4 / 2})`
        )
        // Cool hack -> d3 clone doesnt clone events, make the front object pointer
        // event transparent so users can trigger the underlying object's event!
        .style("pointer-events", "none")
        .remove();

      let tempPlusSymbol = logitLayer.append(() => tempClone.node());

      svg$2.select(".softmax-symbol").raise();

      let logitLayerLower = svg$2
        .select(".underneath")
        .append("g")
        .attr("class", "logit-layer-lower")
        .lower();

      // Use circles to encode logit values
      let centerX = softmaxLeftMid - (moveX * 4) / 5;

      // Get all logits
      logits = [];
      for (let i = 0; i < cnn$1[layerIndexDict["output"]].length; i++) {
        logits.push(cnn$1[layerIndexDict["output"]][i].logit);
      }


      // Construct a color scale for the logit values
      let logitColorScale = d3
        .scaleLinear()
        .domain(d3.extent(logits))
        .range([0.2, 1]);

      // Draw the current logit circle before animation
      let logitRadius = 8;
      logitLayer
        .append("circle")
        .attr("class", "logit-circle")
        .attr("id", `logit-circle-${selectedI}`)
        .attr("cx", centerX)
        .attr("cy", nodeCoordinate$1[curLayerIndex - 1][selectedI].y + nodeLength$4 / 2)
        .attr("r", logitRadius)
        .style("fill", layerColorScales$3.logit(logitColorScale(logits[selectedI])))
        .style("cursor", "crosshair")
        .style("pointer-events", "all")
        .style("stroke", intermediateColor$2)
        .on("mouseover", () => logitCircleMouseOverHandler(selectedI))
        .on("mouseleave", () => logitCircleMouseLeaveHandler(selectedI))
        .on("click", () => {
          d3.event.stopPropagation();
        });

      // Show the logit circle corresponding label
      let softmaxDetailAnnotation = svg$2
        .select(".intermediate-layer-annotation")
        .select(".softmax-detail-annoataion");

      softmaxDetailAnnotation
        .select(`#logit-text-${selectedI}`)
        .style("opacity", 1);

      tempPlusSymbol.raise();

      // Draw another line from plus symbol to softmax symbol
      logitLayer
        .append("line")
        .attr("class", `logit-output-edge-${selectedI}`)
        .attr("x1", intermediateX2 - moveX + plusSymbolRadius$1 * 2)
        .attr("x2", softmaxX)
        .attr("y1", nodeCoordinate$1[curLayerIndex - 1][selectedI].y + nodeLength$4 / 2)
        .attr("y2", nodeCoordinate$1[curLayerIndex - 1][selectedI].y + nodeLength$4 / 2)
        .style("fill", "none")
        .style("stroke", "#FFFFFF")
        .style("stroke-width", "1.2")
        .lower();

      // Add the flatten to logit links
      let linkData = [];
      let flattenLength = cnn$1.flatten.length / cnn$1[1].length;
      let underneathIs = [
        ...Array(cnn$1[layerIndexDict["output"]].length).keys(),
      ].filter((d) => d != selectedI);
      let curIIndex = 0;
      let linkGen = d3
        .linkHorizontal()
        .x((d) => d.x)
        .y((d) => d.y);

      const drawOneEdgeGroup = () => {
        // Only draw the new group if it is in the softmax mode
        if (!allowsSoftmaxAnimation) {
          svg$2.select(".underneath").selectAll(`.logit-lower`).remove();
          return;
        }

        let curI = underneathIs[curIIndex];

        let curEdgeGroup = svg$2.select(".underneath").select(`#logit-lower-${curI}`);

        if (curEdgeGroup.empty()) {
          curEdgeGroup = svg$2
            .select(".underneath")
            .append("g")
            .attr("class", "logit-lower")
            .attr("id", `logit-lower-${curI}`)
            .style("opacity", 0);

          // Hack: now show all edges, only draw 1/3 of the actual edges
          for (let f = 0; f < flattenLength; f += 3) {
            let loopFactors = [0, 9];
            loopFactors.forEach((l) => {
              let factoredF = f + l * flattenLength;

              // Flatten -> output
              linkData.push({
                source: {
                  x: intermediateX1 + pixelWidth + 3 - moveX,
                  y: l === 0 ? topY + f * pixelHeight : bottomY + f * pixelHeight,
                },
                target: {
                  x: intermediateX2 - moveX,
                  y: nodeCoordinate$1[curLayerIndex][curI].y + nodeLength$4 / 2,
                },
                index: factoredF,
                weight: cnn$1.flatten[factoredF].outputLinks[curI].weight,
                color: "#F1F1F1",
                width: 0.5,
                opacity: 1,
                class: `softmax-edge-${curI}`,
              });
            });
          }

          // Draw middle rect to logits
          for (let vi = 0; vi < cnn$1[layerIndexDict["output"]].length - 2; vi++) {
            linkData.push({
              source: {
                x: intermediateX1 + pixelWidth + 3 - moveX,
                y:
                  topY +
                  flattenLength * pixelHeight +
                  middleGap * (vi + 1) +
                  middleRectHeight * (vi + 0.5),
              },
              target: {
                x: intermediateX2 - moveX,
                y: nodeCoordinate$1[curLayerIndex][curI].y + nodeLength$4 / 2,
              },
              index: -1,
              color: "#EDEDED",
              width: 0.5,
              opacity: 1,
              class: `softmax-abstract-edge-${curI}`,
            });
          }

          // Render the edges on the underneath layer
          curEdgeGroup
            .selectAll(`path.softmax-edge-${curI}`)
            .data(linkData)
            .enter()
            .append("path")
            .attr("class", (d) => d.class)
            .attr("id", (d) => `edge-${d.name}`)
            .attr("d", (d) => linkGen({ source: d.source, target: d.target }))
            .style("fill", "none")
            .style("stroke-width", (d) => d.width)
            .style("stroke", (d) =>
              d.color === undefined ? intermediateColor$2 : d.color
            )
            .style("opacity", (d) => d.opacity)
            .style("pointer-events", "none");
        }

        let curNodeGroup = logitLayer
          .append("g")
          .attr("class", `logit-layer-${curI}`)
          .style("opacity", 0);

        // Draw the plus symbol
        let symbolClone = symbolGroup.clone(true).style("opacity", 0);

        // Change the style of the clone
        symbolClone
          .attr("class", "plus-symbol-clone")
          .attr("id", `plus-symbol-clone-${curI}`)
          .select("circle")
          .datum({
            fill: gappedColorScale(
              layerColorScales$3.weight,
              flattenRange,
              cnn$1[layerIndexDict["output"]][curI].bias,
              0.35
            ),
          })
          .style("pointer-events", "none")
          .style("fill", "#E5E5E5");

        symbolClone.attr(
          "transform",
          `translate(${symbolX},
      ${nodeCoordinate$1[curLayerIndex][curI].y + nodeLength$4 / 2})`
        );

        // Draw the outter link using only merged path
        let outputEdgeD1 = linkGen({
          source: {
            x: intermediateX2 - moveX + plusSymbolRadius$1 * 2,
            y: nodeCoordinate$1[curLayerIndex][curI].y + nodeLength$4 / 2,
          },
          target: {
            x: centerX + logitRadius,
            y: nodeCoordinate$1[curLayerIndex][curI].y + nodeLength$4 / 2,
          },
        });

        let outputEdgeD2 = linkGen({
          source: {
            x: centerX + logitRadius,
            y: nodeCoordinate$1[curLayerIndex][curI].y + nodeLength$4 / 2,
          },
          target: {
            x: softmaxX,
            y: nodeCoordinate$1[curLayerIndex][selectedI].y + nodeLength$4 / 2,
          },
        });

        // There are ways to combine these two paths into one. However, the animation
        // for merged path is not continuous, so we use two saperate paths here.

        let outputEdge1 = logitLayerLower
          .append("path")
          .attr("class", `logit-output-edge-${curI}`)
          .attr("d", outputEdgeD1)
          .style("fill", "none")
          .style("stroke", "#FFFFFF")
          .style("stroke-width", "1.2");

        let outputEdge2 = logitLayerLower
          .append("path")
          .attr("class", `logit-output-edge-${curI}`)
          .attr("d", outputEdgeD2)
          .style("fill", "none")
          .style("stroke", "#FFFFFF")
          .style("stroke-width", "1.2");

        let outputEdgeLength1 = outputEdge1.node().getTotalLength();
        let outputEdgeLength2 = outputEdge2.node().getTotalLength();
        let totalLength = outputEdgeLength1 + outputEdgeLength2;
        let totalDuration = hasInitialized ? 500 : 800;
        let opacityDuration = hasInitialized ? 400 : 600;

        outputEdge1
          .attr("stroke-dasharray", outputEdgeLength1 + " " + outputEdgeLength1)
          .attr("stroke-dashoffset", outputEdgeLength1);

        outputEdge2
          .attr("stroke-dasharray", outputEdgeLength2 + " " + outputEdgeLength2)
          .attr("stroke-dashoffset", outputEdgeLength2);

        outputEdge1
          .transition("softmax-output-edge")
          .duration((outputEdgeLength1 / totalLength) * totalDuration)
          .attr("stroke-dashoffset", 0);

        outputEdge2
          .transition("softmax-output-edge")
          .delay((outputEdgeLength1 / totalLength) * totalDuration)
          .duration((outputEdgeLength2 / totalLength) * totalDuration)
          .attr("stroke-dashoffset", 0);

        // Draw the logit circle
        curNodeGroup
          .append("circle")
          .attr("class", "logit-circle")
          .attr("id", `logit-circle-${curI}`)
          .attr("cx", centerX)
          .attr("cy", nodeCoordinate$1[curLayerIndex - 1][curI].y + nodeLength$4 / 2)
          .attr("r", 7)
          .style("fill", layerColorScales$3.logit(logitColorScale(logits[curI])))
          .style("stroke", intermediateColor$2)
          .style("cursor", "crosshair")
          .on("mouseover", () => logitCircleMouseOverHandler(curI))
          .on("mouseleave", () => logitCircleMouseLeaveHandler(curI))
          .on("click", () => {
            d3.event.stopPropagation();
          });

        // Show the element in the detailed view
        softmaxDetailViewInfo.startAnimation = {
          i: curI,
          duration: opacityDuration,
          // Always show the animation
          hasInitialized: false,
        };
        softmaxDetailViewStore.set(softmaxDetailViewInfo);

        // Show the elements with animation
        curNodeGroup
          .transition("softmax-edge")
          .duration(opacityDuration)
          .style("opacity", 1);

        if ((selectedI < 3 && curI == 9) || (selectedI >= 3 && curI == 0)) {
          // Show the hover text
          softmaxDetailAnnotation
            .select(".softmax-detail-hover-annotation")
            .transition("softmax-edge")
            .duration(opacityDuration)
            .style("opacity", 1);
        }

        softmaxDetailAnnotation
          .select(`#logit-text-${curI}`)
          .transition("softmax-edge")
          .duration(opacityDuration)
          .style("opacity", 1);

        curEdgeGroup
          .transition("softmax-edge")
          .duration(opacityDuration)
          .style("opacity", 1)
          .on("end", () => {
            // Recursive animaiton
            curIIndex++;
            if (curIIndex < underneathIs.length) {
              linkData = [];
              drawOneEdgeGroup();
            } else {
              hasInitialized = true;
              softmaxDetailViewInfo.hasInitialized = true;
              softmaxDetailViewStore.set(softmaxDetailViewInfo);
            }
          });

        symbolClone
          .transition("softmax-edge")
          .duration(opacityDuration)
          .style("opacity", 0.2);
      };

      // Show the softmax detail view
      let anchorElement = svg$2
        .select(".intermediate-layer")
        .select(".layer-label")
        .node();
      let pos = getMidCoords(svg$2, anchorElement);
      let wholeSvg = d3.select("#cnn-svg");
      let svgYMid = +wholeSvg.style("height").replace("px", "") / 2;
      let detailViewTop = 100 + svgYMid - 192 / 2;

      const detailview = document.getElementById("detailview");
      detailview.style.top = `${detailViewTop}px`;
      detailview.style.left = `${pos.left - 490 - 50}px`;
      detailview.style.position = "absolute";

      const showDetail = svg$2.select('.softmax-symbol').attr('data-detail-hidden') !== 'true';
      svg$2.select('.softmax-symbol').attr('data-detail-hidden', null);
      softmaxDetailViewStore.set({
        show: showDetail,
        logits: logits,
        logitColors: logits.map((d) => layerColorScales$3.logit(logitColorScale(d))),
        selectedI: selectedI,
        highlightI: -1,
        outputName: classList[selectedI],
        outputValue: cnn$1[layerIndexDict["output"]][selectedI].output,
        startAnimation: { i: -1, duration: 0, hasInitialized: hasInitialized },
      });

      drawOneEdgeGroup();

      // Draw logit circle color scale
      const logitLegendX = intermediateX2 + plusSymbolRadius$1 * 2 - moveX + 10;
      const logitLegend = drawIntermediateLayerLegend({
        legendHeight: 6,
        compact: true,
        curLayerIndex: curLayerIndex,
        range: d3.extent(logits)[1] - d3.extent(logits)[0],
        minMax: { min: d3.extent(logits)[0], max: d3.extent(logits)[1] },
        group: logitLayer,
        width: softmaxX - logitLegendX - 5,
        gradientAppendingName: "flatten-logit-gradient",
        colorScale: layerColorScales$3.logit,
        colorForValue: (value) =>
          layerColorScales$3.logit(logitColorScale(value)),
        x: logitLegendX,
        y: 0,
        legendName: 'Logit',
        legendTitle: 'Logit',
      });
      positionIntermediateLegendInFooter(logitLegend, logitLegendX, bottomLegendLift);

      // Draw logit layer label
      let logitLabel = logitLayer
        .append("g")
        .attr("class", "layer-label")
        .classed("hidden", detailedMode$1)
        .attr("transform", () => {
          let x = centerX;
          let y = (svgPaddings$2.top + vSpaceAroundGap$2) / 2 + 5;
          return `translate(${x}, ${y})`;
        });

      logitLabel
        .append("text")
        .style("text-anchor", "middle")
        .style("dominant-baseline", "middle")
        .style("opacity", 0.8)
        .style("font-weight", 800)
        .text("Logit");
    };

    const removeLogitLayer = () => {
      svg$2.select(".logit-layer").remove();
      svg$2.select(".logit-layer-lower").remove();
      svg$2.selectAll(".plus-symbol-clone").remove();

      // Instead of removing the paths, we hide them, so it is faster to load in
      // the future
      svg$2.select(".underneath").selectAll(".logit-lower").style("opacity", 0);

      softmaxDetailViewStore.set({
        show: false,
        logits: [],
      });
    };

    const softmaxClicked = (arg) => {
      let curLayerIndex = arg.curLayerIndex,
        moveX = arg.moveX,
        symbolX = arg.symbolX,
        symbolY = arg.symbolY,
        outputX = arg.outputX,
        outputY = arg.outputY,
        softmaxLeftMid = arg.softmaxLeftMid,
        selectedI = arg.selectedI,
        intermediateX1 = arg.intermediateX1,
        intermediateX2 = arg.intermediateX2,
        pixelWidth = arg.pixelWidth,
        pixelHeight = arg.pixelHeight,
        topY = arg.topY,
        bottomY = arg.bottomY,
        middleGap = arg.middleGap,
        middleRectHeight = arg.middleRectHeight,
        softmaxX = arg.softmaxX,
        softmaxTextY = arg.softmaxTextY,
        softmaxWidth = arg.softmaxWidth,
        symbolGroup = arg.symbolGroup,
        flattenRange = arg.flattenRange;

      let duration = 600;
      let centerX = softmaxLeftMid - (moveX * 4) / 5;
      d3.event.stopPropagation();

      // Clean up the logit elemends before moving anything
      if (isInSoftmax) {
        allowsSoftmaxAnimationStore.set(false);
        removeLogitLayer();
      } else {
        allowsSoftmaxAnimationStore.set(true);
      }

      // Move the overlay gradient
      svg$2
        .select(".intermediate-layer-overlay")
        .select("rect.overlay")
        .transition("softmax")
        .ease(d3.easeCubicInOut)
        .duration(duration)
        .attr("transform", `translate(${isInSoftmax ? 0 : -moveX}, ${0})`);

      // Move the legends
      svg$2
        .selectAll(`.intermediate-legend-${curLayerIndex - 1}`)
        .each((d, i, g) => moveLegend(d, i, g, moveX, duration, isInSoftmax));

      svg$2
        .select(".intermediate-layer")
        .select(`.layer-label`)
        .each((d, i, g) => moveLegend(d, i, g, moveX, duration, isInSoftmax));

      svg$2
        .select(".intermediate-layer")
        .select(`.layer-detailed-label`)
        .each((d, i, g) => moveLegend(d, i, g, moveX, duration, isInSoftmax));

      // Also move all layers on the left
      for (let i = curLayerIndex - 1; i >= 0; i--) {
        let curLayer = svg$2.select(`g#cnn-layer-group-${i}`);
        let previousX = +curLayer.select("image").attr("x");
        let newX = isInSoftmax ? previousX + moveX : previousX - moveX;
        moveLayerX({
          layerIndex: i,
          targetX: newX,
          disable: true,
          delay: 0,
          transitionName: "softmax",
          duration: duration,
        });
      }

      // Hide the sum up annotation
      svg$2
        .select(".plus-annotation")
        .transition("softmax")
        .duration(duration)
        .style("opacity", isInSoftmax ? 1 : 0)
        .style("pointer-events", isInSoftmax ? "all" : "none");

      // Hide the softmax annotation
      let softmaxAnnotation = svg$2
        .select(".softmax-annotation")
        .style("pointer-events", isInSoftmax ? "all" : "none");

      let softmaxDetailAnnotation = softmaxAnnotation
        .selectAll(".softmax-detail-annoataion")
        .data([0])
        .enter()
        .append("g")
        .attr("class", "softmax-detail-annoataion");

      // Remove the detailed annoatioan when quitting the detail view
      if (isInSoftmax) {
        softmaxAnnotation.selectAll(".softmax-detail-annoataion").remove();
      }

      softmaxAnnotation
        .select(".arrow-group")
        .transition("softmax")
        .duration(duration)
        .style("opacity", isInSoftmax ? 1 : 0);

      softmaxAnnotation
        .select(".annotation-text")
        .style("cursor", "help")
        .style("pointer-events", "all")
        .on("click", () => {
          d3.event.stopPropagation();
          // Scroll to the article element
          document.querySelector(`#article-softmax`).scrollIntoView({
            behavior: "smooth",
          });
        })
        .transition("softmax")
        .duration(duration)
        .style("opacity", isInSoftmax ? 1 : 0)
        .on("end", () => {
          if (!isInSoftmax) {
            // Add new annotation for the softmax button
            let textX = softmaxX + softmaxWidth / 2;
            let textY = softmaxTextY - 10;

            if (selectedI === 0) {
              textY = softmaxTextY + 70;
            }

            let text = softmaxDetailAnnotation
              .append("text")
              .attr("x", textX)
              .attr("y", textY)
              .attr("class", "annotation-text softmax-detail-text")
              .style("dominant-baseline", "baseline")
              .style("text-anchor", "middle")
              .text("Normalize ");

            text
              .append("tspan")
              .attr("dx", 1)
              .style("fill", "#E56014")
              .text("Logits");

            text.append("tspan").attr("dx", 1).text(" into");

            text
              .append("tspan")
              .attr("x", textX)
              .attr("dy", "1.1em")
              .text("class probabilities");

            if (selectedI === 0) {
              drawArrow({
                group: softmaxDetailAnnotation,
                sx: softmaxX + softmaxWidth / 2 - 5,
                sy: softmaxTextY + 44,
                tx: softmaxX + softmaxWidth / 2,
                ty: textY - 12,
                dr: 50,
                hFlip: true,
                marker: "marker-alt",
              });
            } else {
              drawArrow({
                group: softmaxDetailAnnotation,
                sx: softmaxX + softmaxWidth / 2 - 5,
                sy: softmaxTextY + 4,
                tx: softmaxX + softmaxWidth / 2,
                ty: symbolY - plusSymbolRadius$1 - 4,
                dr: 50,
                hFlip: true,
                marker: "marker-alt",
              });
            }

            // Add annotation for the logit layer label
            textX = centerX + 45;
            textY = (svgPaddings$2.top + vSpaceAroundGap$2) / 2 + 5;
            let arrowTX = centerX + 20;
            let arrowTY = (svgPaddings$2.top + vSpaceAroundGap$2) / 2 + 5;

            softmaxDetailAnnotation
              .append("g")
              .attr("class", "layer-detailed-label")
              .attr("transform", () => {
                let x = centerX;
                let y = (svgPaddings$2.top + vSpaceAroundGap$2) / 2 - 5;
                return `translate(${x}, ${y})`;
              })
              .classed("hidden", !detailedMode$1)
              .append("text")
              // .attr('x', centerX)
              // .attr('y',  (svgPaddings.top + vSpaceAroundGap) / 2 - 6)
              .style("opacity", 1)
              .style("dominant-baseline", "middle")
              .style("font-size", "12px")
              .style("font-weight", "800")
              .append("tspan")
              .attr("x", 0)
              .text("Logit")
              .append("tspan")
              .attr("x", 0)
              .style("font-size", "8px")
              .style("font-weight", "normal")
              .attr("dy", "1.5em")
              .text("(10)");

            softmaxDetailAnnotation
              .append("text")
              .attr("class", "annotation-text")
              .attr("x", textX)
              .attr("y", (svgPaddings$2.top + vSpaceAroundGap$2) / 2 + 3)
              .style("text-anchor", "start")
              .text("Before")
              .append("tspan")
              .attr("x", textX)
              .attr("dy", "1em")
              .text("normalization");

            drawArrow({
              group: softmaxDetailAnnotation,
              tx: arrowTX,
              ty: arrowTY,
              sx: textX - 6,
              sy: textY + 2,
              dr: 60,
              hFlip: false,
              marker: "marker-alt",
            });

            softmaxDetailAnnotation
              .append("text")
              .attr("class", "annotation-text")
              .attr("x", nodeCoordinate$1[layerIndexDict["output"]][0].x - 35)
              .attr("y", (svgPaddings$2.top + vSpaceAroundGap$2) / 2 + 3)
              .style("text-anchor", "end")
              .text("After")
              .append("tspan")
              .attr("x", nodeCoordinate$1[layerIndexDict["output"]][0].x - 35)
              .attr("dy", "1em")
              .text("normalization");

            drawArrow({
              group: softmaxDetailAnnotation,
              tx: nodeCoordinate$1[layerIndexDict["output"]][0].x - 8,
              ty: arrowTY,
              sx: nodeCoordinate$1[layerIndexDict["output"]][0].x - 27,
              sy: textY + 2,
              dr: 60,
              hFlip: true,
              marker: "marker-alt",
            });

            // Add annotation for the logit circle
            for (let i = 0; i < 10; i++) {
              softmaxDetailAnnotation
                .append("text")
                .attr("x", centerX)
                .attr(
                  "y",
                  nodeCoordinate$1[curLayerIndex - 1][i].y + nodeLength$4 / 2 + 8
                )
                .attr("class", "annotation-text softmax-detail-text")
                .attr("id", `logit-text-${i}`)
                .style("text-anchor", "middle")
                .style("dominant-baseline", "hanging")
                .style("opacity", 0)
                .text(`${classList[i]}`);
            }

            let hoverTextGroup = softmaxDetailAnnotation
              .append("g")
              .attr("class", "softmax-detail-hover-annotation")
              .style("opacity", 0);

            textX = centerX + 50;
            textY = nodeCoordinate$1[curLayerIndex - 1][0].y + nodeLength$4 / 2;

            if (selectedI < 3) {
              textY = nodeCoordinate$1[curLayerIndex - 1][9].y + nodeLength$4 / 2;
            }

            // Add annotation to prompt user to check the logit value
            let hoverText = hoverTextGroup
              .append("text")
              .attr("x", textX)
              .attr("y", textY)
              .attr(
                "class",
                "annotation-text softmax-detail-text softmax-hover-text"
              )
              .style("text-anchor", "start")
              .style("dominant-baseline", "baseline")
              .append("tspan")
              .style("font-weight", 700)
              .style("dominant-baseline", "baseline")
              .text(`Hover over `)
              .append("tspan")
              .style("font-weight", 400)
              .style("dominant-baseline", "baseline")
              .text("to see");

            hoverText
              .append("tspan")
              .style("dominant-baseline", "baseline")
              .attr("x", textX)
              .attr("dy", "1em")
              .text("its ");

            hoverText
              .append("tspan")
              .style("dominant-baseline", "baseline")
              .attr("dx", 1)
              .style("fill", "#E56014")
              .text("Logit");

            hoverText
              .append("tspan")
              .style("dominant-baseline", "baseline")
              .attr("dx", 1)
              .text(" value");

            drawArrow({
              group: hoverTextGroup,
              tx: centerX + 15,
              ty: textY,
              sx: textX - 8,
              sy: textY + 2,
              dr: 60,
              hFlip: false,
            });
          }
        });

      // Hide the annotation
      svg$2
        .select(".flatten-annotation")
        .transition("softmax")
        .duration(duration)
        .style("opacity", isInSoftmax ? 1 : 0)
        .style("pointer-events", isInSoftmax ? "all" : "none");

      // Move the left part of faltten layer elements
      let flattenLeftPart = svg$2.select(".flatten-layer-left");
      flattenLeftPart
        .transition("softmax")
        .duration(duration)
        .ease(d3.easeCubicInOut)
        .attr("transform", `translate(${isInSoftmax ? 0 : -moveX}, ${0})`)
        .on("end", () => {
          // Add the logit layer
          if (!isInSoftmax) {
            let logitArg = {
              curLayerIndex: curLayerIndex,
              moveX: moveX,
              softmaxLeftMid: softmaxLeftMid,
              selectedI: selectedI,
              intermediateX1: intermediateX1,
              intermediateX2: intermediateX2,
              pixelWidth: pixelWidth,
              pixelHeight: pixelHeight,
              topY: topY,
              bottomY: bottomY,
              middleGap: middleGap,
              middleRectHeight: middleRectHeight,
              softmaxX: softmaxX,
              symbolGroup: symbolGroup,
              symbolX: symbolX,
              flattenRange: flattenRange,
            };
            drawLogitLayer(logitArg);
          }

          // Redraw the line from the plus symbol to the output node
          if (!isInSoftmax) {
            let newLine = flattenLeftPart
              .select(".edge-group")
              .append("line")
              .attr("class", "symbol-output-line")
              .attr("x1", symbolX)
              .attr("y1", symbolY)
              .attr("x2", outputX + moveX)
              .attr("y2", outputY)
              .style("stroke-width", 1.2)
              .style("stroke", "#E5E5E5")
              .style("opacity", 0);

            newLine
              .transition("softmax")
              .delay(duration / 3)
              .duration((duration * 2) / 3)
              .style("opacity", 1);
          } else {
            flattenLeftPart.select(".symbol-output-line").remove();
          }

          isInSoftmax = !isInSoftmax;
          isInSoftmaxStore.set(isInSoftmax);
        });
    };

    /**
     * Draw the flatten layer before output layer
     * @param {number} curLayerIndex Index of the selected layer
     * @param {object} d Bounded d3 data
     * @param {number} i Index of the selected node
     * @param {number} width CNN group width
     * @param {number} height CNN group height
     */
    const drawFlatten = (curLayerIndex, d, i, width, height) => {
      let pixelWidth = nodeLength$4 / 2;
      let pixelHeight = 1.1;
      let intermediateGap = Math.max(150, (hSpaceAroundGap$1 * gapRatio$1 * 4) / 2);
      let totalLength = 2 * nodeLength$4 + 2.75 * intermediateGap + pixelWidth;
      
      let leftX = nodeCoordinate$1[curLayerIndex][0].x - totalLength;
      const minimumGap = 20;
      let linkGen = d3
        .linkHorizontal()
        .x((d) => d.x)
        .y((d) => d.y);

      // Hide the edges
      svg$2.select("g.edge-group").style("visibility", "hidden");

      // Move the previous layer
      moveLayerX({
        layerIndex: curLayerIndex - 1,
        targetX: leftX,
        disable: true,
        delay: 0,
      });

      // Disable the current layer (output layer)
      moveLayerX({
        layerIndex: curLayerIndex,
        targetX: nodeCoordinate$1[curLayerIndex][0].x,
        disable: true,
        delay: 0,
        opacity: 0.15,
        specialIndex: i,
      });

      // Compute the gap in the left shrink region
      let leftEnd = leftX - hSpaceAroundGap$1;
      let leftGap = (leftEnd - nodeCoordinate$1[0][0].x - 20 * nodeLength$4) / 10;

      // Different from other intermediate view, we push the left part dynamically
      // 1. If there is enough space, we fix the first layer position and move all
      // other layers;
      // 2. If there is not enough space, we maintain the minimum gap and push all
      // left layers to the left (could be out-of-screen)
      if (leftGap > minimumGap) {
        // Move the left layers
        for (let i = 0; i < curLayerIndex - 1; i++) {
          let curX = nodeCoordinate$1[0][0].x + i * (nodeLength$4 + leftGap);
          moveLayerX({ layerIndex: i, targetX: curX, disable: true, delay: 0 });
        }
      } else {
        leftGap = minimumGap;
        let curLeftBound = leftX - leftGap * 2 - nodeLength$4;
        // Move the left layers
        for (let i = curLayerIndex - 2; i >= 0; i--) {
          moveLayerX({
            layerIndex: i,
            targetX: curLeftBound,
            disable: true,
            delay: 0,
          });
          curLeftBound = curLeftBound - leftGap - nodeLength$4;
        }
      }

      // Add an overlay
      let stops = [
        { offset: "0%", color: "rgb(255, 255, 255)", opacity: 1 },
        { offset: "50%", color: "rgb(255, 255, 255)", opacity: 0.95 },
        { offset: "100%", color: "rgb(255, 255, 255)", opacity: 0.85 },
      ];
      addOverlayGradient("overlay-gradient-left", stops);

      let intermediateLayerOverlay = svg$2
        .append("g")
        .attr("class", "intermediate-layer-overlay");

      intermediateLayerOverlay
        .append("rect")
        .attr("class", "overlay")
        .style("fill", "url(#overlay-gradient-left)")
        .style("stroke", "none")
        .attr("width", leftX + svgPaddings$2.left - leftGap * 2 + 3)
        .attr("height", height + svgPaddings$2.top + svgPaddings$2.bottom)
        .attr("x", -svgPaddings$2.left)
        .attr("y", 0)
        .style("opacity", 0);

      intermediateLayerOverlay
        .selectAll("rect.overlay")
        .transition("move")
        .duration(800)
        .ease(d3.easeCubicInOut)
        .style("opacity", 1);

      // Add the intermediate layer
      let intermediateLayer = svg$2
        .append("g")
        .attr("class", "intermediate-layer")
        .style("opacity", 0);

      let intermediateX1 = leftX + nodeLength$4 + intermediateGap;
      let intermediateX2 = intermediateX1 + intermediateGap + pixelWidth;
      let range = cnnLayerRanges$1[selectedScaleLevel$1][curLayerIndex - 1];
      let colorScale = layerColorScales$3.conv;
      let flattenLength = cnn$1.flatten.length / cnn$1[1].length;
      let flattenValueExtent = d3.extent(cnn$1.flatten.map((d) => d.output));
      let linkData = [];

      let flattenLayer = intermediateLayer
        .append("g")
        .attr("class", "flatten-layer");

      let flattenLayerLeftPart = flattenLayer
        .append("g")
        .attr("class", "flatten-layer-left");

      let topY = nodeCoordinate$1[curLayerIndex - 1][0].y;
      let bottomY =
        nodeCoordinate$1[curLayerIndex - 1][9].y +
        nodeLength$4 -
        flattenLength * pixelHeight;

      // Compute the pre-layer gap
      let preLayerDimension = cnn$1[curLayerIndex - 1][0].output.length;
      let preLayerGap = nodeLength$4 / (2 * preLayerDimension);

      // Compute bounding box length
      let boundingBoxLength = nodeLength$4 / preLayerDimension;

      // Compute the weight color scale
      let lastVisibleNodeIndex = cnn$1[curLayerIndex - 1].length - 1;
      let visibleFlattenNodes = cnn$1.flatten
        .slice(0, flattenLength)
        .concat(
          cnn$1.flatten.slice(
            lastVisibleNodeIndex * flattenLength,
            (lastVisibleNodeIndex + 1) * flattenLength
          )
        );
      let flattenExtent = d3.extent(
        visibleFlattenNodes.map((d) => d.outputLinks[i].weight)
      );

      let flattenRange =
        2 * Math.max(
          Math.ceil(Math.max(...flattenExtent.map(Math.abs)) * 1000) / 1000,
          Number.EPSILON
        );

      let flattenMouseOverHandler = (d) => {
        let index = d.index;

        // Update the hover info UI
        if (d.weight === undefined) {
          hoverInfo = {
            show: true,
            text: `Pixel value: ${formater$1(flattenFactoredFDict[index])}`,
          };
        } else {
          hoverInfo = {
            show: true,
            text: `Weight: ${formater$1(d.weight)}`,
          };
        }
        hoverInfoStore.set(hoverInfo);

        flattenLayerLeftPart
          .select(`#edge-flatten-${index}`)
          .raise()
          .style("stroke", intermediateColor$2)
          .style("stroke-width", 1);

        flattenLayerLeftPart
          .select(`#edge-flatten-${index}-output`)
          .raise()
          .style("stroke-width", 1)
          .style("stroke", (da) =>
            gappedColorScale(layerColorScales$3.weight, flattenRange, da.weight, 0.1)
          );

        flattenLayerLeftPart
          .select(`#bounding-${index}`)
          .raise()
          .style("opacity", 1);
      };

      let flattenMouseLeaveHandler = (d) => {
        let index = d.index;

        // Update the hover info UI
        if (d.weight === undefined) {
          hoverInfo = {
            show: false,
            text: `Pixel value: ${formater$1(flattenFactoredFDict[index])}`,
          };
        } else {
          hoverInfo = {
            show: false,
            text: `Weight: ${formater$1(d.weight)}`,
          };
        }
        hoverInfoStore.set(hoverInfo);

        flattenLayerLeftPart
          .select(`#edge-flatten-${index}`)
          .style("stroke-width", 0.6)
          .style("stroke", "#E5E5E5");

        flattenLayerLeftPart
          .select(`#edge-flatten-${index}-output`)
          .style("stroke-width", 0.6)
          .style("stroke", (da) =>
            gappedColorScale(layerColorScales$3.weight, flattenRange, da.weight, 0.35)
          );

        flattenLayerLeftPart
          .select(`#bounding-${index}`)
          .raise()
          .style("opacity", 0);
      };

      flattenFactoredFDict = {};
      for (let f = 0; f < flattenLength; f++) {
        let loopFactors = [0, 9];
        loopFactors.forEach((l) => {
          let factoredF = f + l * flattenLength;
          factoredF = parseInt(factoredF);

          flattenFactoredFDict[factoredF] = cnn$1.flatten[factoredF].output;
          flattenLayerLeftPart
            .append("rect")
            .attr("x", intermediateX1)
            .attr("y", l === 0 ? topY + f * pixelHeight : bottomY + f * pixelHeight)
            .attr("width", pixelWidth)
            .attr("height", pixelHeight)
            .style("cursor", "crosshair")
            .style(
              "fill",
              colorScale((cnn$1.flatten[factoredF].output + range / 2) / range)
            )
            .on("mouseover", () => flattenMouseOverHandler({ index: factoredF }))
            .on("mouseleave", () => flattenMouseLeaveHandler({ index: factoredF }))
            .on("click", () => {
              d3.event.stopPropagation();
            });

          // Flatten -> output
          linkData.push({
            source: {
              x: intermediateX1 + pixelWidth + 3,
              y: l === 0 ? topY + f * pixelHeight : bottomY + f * pixelHeight,
            },
            target: {
              x: intermediateX2,
              //nodeCoordinate[curLayerIndex][i].x - nodeLength,
              y: nodeCoordinate$1[curLayerIndex][i].y + nodeLength$4 / 2,
            },
            index: factoredF,
            weight: cnn$1.flatten[factoredF].outputLinks[i].weight,
            name: `flatten-${factoredF}-output`,
            color: gappedColorScale(
              layerColorScales$3.weight,
              flattenRange,
              cnn$1.flatten[factoredF].outputLinks[i].weight,
              0.35
            ),
            width: 0.6,
            opacity: 1,
            class: `flatten-output`,
          });

          // Pre-layer -> flatten
          let row = Math.floor(f / preLayerDimension);
          linkData.push({
            target: {
              x: intermediateX1 - 3,
              y: l === 0 ? topY + f * pixelHeight : bottomY + f * pixelHeight,
            },
            source: {
              x: leftX + nodeLength$4 + 3,
              y:
                nodeCoordinate$1[curLayerIndex - 1][l].y +
                (2 * row + 1) * preLayerGap,
            },
            index: factoredF,
            name: `flatten-${factoredF}`,
            color: "#E5E5E5",
            width: 0.6,
            opacity: 1,
            class: `flatten`,
          });

          // Add original pixel bounding box
          let loc = cnn$1.flatten[factoredF].inputLinks[0].weight;
          flattenLayerLeftPart
            .append("rect")
            .attr("id", `bounding-${factoredF}`)
            .attr("class", "flatten-bounding")
            .attr("x", leftX + loc[1] * boundingBoxLength)
            .attr(
              "y",
              nodeCoordinate$1[curLayerIndex - 1][l].y + loc[0] * boundingBoxLength
            )
            .attr("width", boundingBoxLength)
            .attr("height", boundingBoxLength)
            .style("fill", "none")
            .style("stroke", intermediateColor$2)
            .style("stroke-length", "0.5")
            .style("pointer-events", "all")
            .style("cursor", "crosshair")
            .style("opacity", 0)
            .on("mouseover", () => flattenMouseOverHandler({ index: factoredF }))
            .on("mouseleave", () => flattenMouseLeaveHandler({ index: factoredF }))
            .on("click", () => {
              d3.event.stopPropagation();
            });
        });
      }

      // Use abstract symbol to represent the flatten nodes in between (between
      // the first and the last nodes)
      // Compute the average value of input node and weights
      let meanValues = [];
      for (let n = 1; n < cnn$1[curLayerIndex - 1].length - 1; n++) {
        /*
        let meanOutput = d3.mean(cnn.flatten.slice(flattenLength * n,
          flattenLength * (n + 1)).map(d => d.output));
        let meanWeight= d3.mean(cnn.flatten.slice(flattenLength * n,
          flattenLength * (n + 1)).map(d => d.outputLinks[i].weight));
        meanValues.push({index: n, output: meanOutput, weight: meanWeight});
        */
        meanValues.push({ index: n });
      }

      // Compute the middle gap
      let middleGap = 5;
      let middleRectHeight =
        (10 * nodeLength$4 +
          (10 - 1) * vSpaceAroundGap$2 -
          pixelHeight * flattenLength * 2 -
          5 * (8 + 1)) /
        8;

      // Add middle nodes
      meanValues.forEach((v, vi) => {
        // Add a small rectangle
        flattenLayerLeftPart
          .append("rect")
          .attr("x", intermediateX1 + pixelWidth / 4)
          .attr(
            "y",
            topY +
              flattenLength * pixelHeight +
              middleGap * (vi + 1) +
              middleRectHeight * vi
          )
          .attr("width", pixelWidth / 2)
          .attr("height", middleRectHeight)
          // .style('fill', colorScale((v.output + range / 2) / range));
          .style("fill", "#E5E5E5");

        // Add a triangle next to the input node
        flattenLayerLeftPart
          .append("polyline")
          .attr(
            "points",
            `${leftX + nodeLength$4 + 3}
        ${nodeCoordinate$1[curLayerIndex - 1][v.index].y},
        ${leftX + nodeLength$4 + 10}
        ${nodeCoordinate$1[curLayerIndex - 1][v.index].y + nodeLength$4 / 2},
        ${leftX + nodeLength$4 + 3}
        ${nodeCoordinate$1[curLayerIndex - 1][v.index].y + nodeLength$4}`
          )
          .style("fill", "#E5E5E5")
          .style("opacity", 1);

        // Input -> flatten
        linkData.push({
          source: {
            x: leftX + nodeLength$4 + 10,
            y: nodeCoordinate$1[curLayerIndex - 1][v.index].y + nodeLength$4 / 2,
          },
          target: {
            x: intermediateX1 - 3,
            y:
              topY +
              flattenLength * pixelHeight +
              middleGap * (vi + 1) +
              middleRectHeight * (vi + 0.5),
          },
          index: -1,
          width: 1,
          opacity: 1,
          name: `flatten-abstract-${v.index}`,
          color: "#E5E5E5",
          class: `flatten-abstract`,
        });

        // Flatten -> output
        linkData.push({
          source: {
            x: intermediateX1 + pixelWidth + 3,
            y:
              topY +
              flattenLength * pixelHeight +
              middleGap * (vi + 1) +
              middleRectHeight * (vi + 0.5),
          },
          target: {
            x: intermediateX2,
            y: nodeCoordinate$1[curLayerIndex][i].y + nodeLength$4 / 2,
          },
          index: -1,
          name: `flatten-abstract-${v.index}-output`,
          color: "#E5E5E5",
          weight: v.weight,
          width: 1,
          opacity: 1,
          class: `flatten-abstract-output`,
        });
      });

      // Draw the plus operation symbol
      let symbolX = intermediateX2 + plusSymbolRadius$1;
      let symbolY = nodeCoordinate$1[curLayerIndex][i].y + nodeLength$4 / 2;
      let symbolRectHeight = 1;
      let symbolGroup = flattenLayerLeftPart
        .append("g")
        .attr("class", "plus-symbol")
        .attr("transform", `translate(${symbolX}, ${symbolY})`);

      symbolGroup
        .append("rect")
        .attr("x", -plusSymbolRadius$1)
        .attr("y", -plusSymbolRadius$1)
        .attr("width", plusSymbolRadius$1 * 2)
        .attr("height", plusSymbolRadius$1 * 2)
        .attr("rx", 3)
        .attr("ry", 3)
        .style("fill", "none")
        .style("stroke", intermediateColor$2);

      symbolGroup
        .append("rect")
        .attr("x", -(plusSymbolRadius$1 - 3))
        .attr("y", -symbolRectHeight / 2)
        .attr("width", 2 * (plusSymbolRadius$1 - 3))
        .attr("height", symbolRectHeight)
        .style("fill", intermediateColor$2);

      symbolGroup
        .append("rect")
        .attr("x", -symbolRectHeight / 2)
        .attr("y", -(plusSymbolRadius$1 - 3))
        .attr("width", symbolRectHeight)
        .attr("height", 2 * (plusSymbolRadius$1 - 3))
        .style("fill", intermediateColor$2);

      // Place the bias rectangle below the plus sign if user clicks the first
      // conv node (no need now, since we added annotaiton for softmax to make it
      // look better aligned)
      // Add bias symbol to the plus symbol
      symbolGroup
        .append("circle")
        .attr("cx", 0)
        .attr("cy", -nodeLength$4 / 2 - 0.5 * kernelRectLength$1)
        .attr("r", kernelRectLength$1 * 1.5)
        .style("stroke", intermediateColor$2)
        .style("cursor", "crosshair")
        .style(
          "fill",
          gappedColorScale(layerColorScales$3.weight, flattenRange, d.bias, 0.35)
        )
        .on("mouseover", () => {
          hoverInfoStore.set({ show: true, text: `Bias: ${formater$1(d.bias)}` });
        })
        .on("mouseleave", () => {
          hoverInfoStore.set({ show: false, text: `Bias: ${formater$1(d.bias)}` });
        })
        .on("click", () => {
          d3.event.stopPropagation();
        });

      // Link from bias to the plus symbol
      symbolGroup
        .append("path")
        .attr(
          "d",
          linkGen({
            source: { x: 0, y: 0 },
            target: { x: 0, y: -nodeLength$4 / 2 - 0.5 * kernelRectLength$1 },
          })
        )
        .attr("id", "bias-plus")
        .attr("stroke-width", 1.2)
        .attr("stroke", "#E5E5E5")
        .lower();

      // Link from the plus symbol to the output
      linkData.push({
        source: getOutputKnot({
          x: intermediateX2 + 2 * plusSymbolRadius$1 - nodeLength$4,
          y: nodeCoordinate$1[curLayerIndex][i].y,
        }),
        target: getInputKnot({
          x: nodeCoordinate$1[curLayerIndex][i].x - 3,
          y: nodeCoordinate$1[curLayerIndex][i].y,
        }),
        name: `symbol-output`,
        width: 1.2,
        color: "#E5E5E5",
      });

      // Draw softmax operation symbol
      let softmaxWidth = 55;
      let emptySpace =
        (totalLength - 2 * nodeLength$4 - 2 * intermediateGap - softmaxWidth) / 2;
      let symbolEndX = intermediateX2 + plusSymbolRadius$1 * 2;
      let softmaxX = emptySpace + symbolEndX;
      let softmaxLeftMid = emptySpace / 2 + symbolEndX;
      let softmaxTextY =
        nodeCoordinate$1[curLayerIndex][i].y - 2 * kernelRectLength$1 - 6;
      let moveX = ((intermediateX2 - (intermediateX1 + pixelWidth + 3)) * 2) / 3;

      let softmaxArg = {
        curLayerIndex: curLayerIndex,
        moveX: moveX,
        symbolX: symbolX,
        symbolY: symbolY,
        outputX: nodeCoordinate$1[curLayerIndex][i].x,
        outputY: symbolY,
        softmaxLeftMid: softmaxLeftMid,
        selectedI: i,
        intermediateX1: intermediateX1,
        intermediateX2: intermediateX2,
        pixelWidth: pixelWidth,
        pixelHeight: pixelHeight,
        topY: topY,
        bottomY: bottomY,
        middleGap: middleGap,
        middleRectHeight: middleRectHeight,
        softmaxX: softmaxX,
        softmaxWidth: softmaxWidth,
        softmaxTextY: softmaxTextY,
        symbolGroup: symbolGroup,
        flattenRange: flattenRange,
      };

      let softmaxSymbol = intermediateLayer
        .append("g")
        .attr("class", "softmax-symbol")
        .attr("transform", `translate(${softmaxX}, ${symbolY})`)
        .style("pointer-event", "all")
        .style("cursor", "pointer")
        .on("click", () => softmaxClicked(softmaxArg));

      softmaxSymbol
        .append("rect")
        .attr("x", 0)
        .attr("y", -plusSymbolRadius$1)
        .attr("width", softmaxWidth)
        .attr("height", plusSymbolRadius$1 * 2)
        .attr("stroke", intermediateColor$2)
        .attr("rx", 2)
        .attr("ry", 2)
        .attr("fill", "#FAFAFA");

      softmaxSymbol
        .append("text")
        .attr("x", 5)
        .attr("y", 1)
        .style("dominant-baseline", "middle")
        .style("font-size", "12px")
        .style("opacity", 0.5)
        .text("softmax");

      // Draw the layer label
      let layerLabel = intermediateLayer
        .append("g")
        .attr("class", "layer-label")
        .classed("hidden", detailedMode$1)
        .attr("transform", () => {
          let x =
            leftX + nodeLength$4 + (4 * hSpaceAroundGap$1 * gapRatio$1 + pixelWidth) / 2;
          let y = (svgPaddings$2.top + vSpaceAroundGap$2) / 2 + 5;
          return `translate(${x}, ${y})`;
        })
        .style("cursor", "help")
        .on("click", () => {
          d3.event.stopPropagation();
          // Scroll to the article element
          document.querySelector(`#article-flatten`).scrollIntoView({
            behavior: "smooth",
          });
        });

      layerLabel
        .append("text")
        .style("dominant-baseline", "middle")
        .style("opacity", 0.8)
        .style("font-weight", 800)
        .text("Flatten");

      let svgHeight =
        Number(d3.select("#cnn-svg").style("height").replace("px", "")) + 300;
      let scroll = new SmoothScroll('a[href*="#"]', { offset: -svgHeight });

      let detailedLabelGroup = intermediateLayer
        .append("g")
        .attr("transform", () => {
          let x =
            leftX + nodeLength$4 + (4 * hSpaceAroundGap$1 * gapRatio$1 + pixelWidth) / 2;
          let y = (svgPaddings$2.top + vSpaceAroundGap$2) / 2 - 5;
          return `translate(${x}, ${y})`;
        })
        .attr("class", "layer-detailed-label")
        .classed("hidden", !detailedMode$1)
        .style("cursor", "help")
        .on("click", () => {
          d3.event.stopPropagation();
          // Scroll to the article element
          let anchor = document.querySelector(`#article-flatten`);
          scroll.animateScroll(anchor);
        });

      detailedLabelGroup.append("title").text("Move to article section");

      let detailedLabelText = detailedLabelGroup
        .append("text")
        .style("text-anchor", "middle")
        .style("dominant-baseline", "middle")
        .style("opacity", "1")
        .style("font-weight", 800)
        .append("tspan")
        .text("Flatten");

      let dimension =
        cnn$1[layerIndexDict["pool"]].length *
        cnn$1[layerIndexDict["pool"]][0].output.length *
        cnn$1[layerIndexDict["pool"]][0].output[0].length;

      detailedLabelText
        .append("tspan")
        .attr("x", 0)
        .attr("dy", "1.5em")
        .style("font-size", "8px")
        .style("font-weight", "normal")
        .text(`(${dimension})`);

      // Add edges between nodes
      let edgeGroup = flattenLayerLeftPart
        .append("g")
        .attr("class", "edge-group")
        .lower();

      edgeGroup
        .selectAll("path")
        .data(linkData)
        .enter()
        .append("path")
        .attr("class", (d) => d.class)
        .attr("id", (d) => `edge-${d.name}`)
        .attr("d", (d) => linkGen({ source: d.source, target: d.target }))
        .style("fill", "none")
        .style("stroke-width", (d) => d.width)
        .style("stroke", (d) =>
          d.color === undefined ? intermediateColor$2 : d.color
        )
        .style("opacity", (d) => d.opacity);

      edgeGroup.selectAll("path.flatten-abstract-output").lower();

      edgeGroup
        .selectAll("path.flatten,path.flatten-output")
        .style("cursor", "crosshair")
        .style("pointer-events", "all")
        .on("mouseover", flattenMouseOverHandler)
        .on("mouseleave", flattenMouseLeaveHandler)
        .on("click", () => {
          d3.event.stopPropagation();
        });

      // Add legend
      const featureLegend = drawIntermediateLayerLegend({
        legendHeight: 6,
        compact: true,
        curLayerIndex: curLayerIndex,
        range: range,
        minMax: { min: flattenValueExtent[0], max: flattenValueExtent[1] },
        group: intermediateLayer,
        width: intermediateGap - bottomLegendNodeClearance - 10,
        x: leftX + nodeLength$4 + bottomLegendNodeClearance,
        colorForValue: (value) =>
          gappedColorScale(colorScale, range, value),
        y: 0,
        legendName: 'Pool / Flatten',
        legendTitle: 'Pool / Flatten',
      });
      positionIntermediateLegendInFooter(featureLegend,
        leftX + nodeLength$4 + bottomLegendNodeClearance, bottomLegendLift);

      const weightLegend = drawIntermediateLayerLegend({
        legendHeight: 6,
        compact: true,
        curLayerIndex: curLayerIndex,
        range: flattenRange,
        minMax: { min: flattenExtent[0], max: flattenExtent[1] },
        group: intermediateLayer,
        width: intermediateGap - 16,
        gradientAppendingName: "flatten-weight-gradient",
        colorScale: layerColorScales$3.weight,
        colorForValue: (value) =>
          gappedColorScale(layerColorScales$3.weight, flattenRange, value, 0.35),
        x: intermediateX1 + pixelWidth + 8,
        y: 0,
        legendName: 'Classifier Weights',
        legendTitle: 'Classifier Weights',
      });
      positionIntermediateLegendInFooter(weightLegend,
        intermediateX1 + pixelWidth + 8, bottomLegendLift);

      // Add annotation to the intermediate layer
      let intermediateLayerAnnotation = svg$2
        .append("g")
        .attr("class", "intermediate-layer-annotation")
        .style("opacity", 0);

      // Add annotation for the sum operation
      let plusAnnotation = intermediateLayerAnnotation
        .append("g")
        .attr("class", "plus-annotation");

      let textX = intermediateX2;
      let textY =
        nodeCoordinate$1[curLayerIndex][i].y + nodeLength$4 + kernelRectLength$1 * 3;
      let arrowSY =
        nodeCoordinate$1[curLayerIndex][i].y + nodeLength$4 + kernelRectLength$1 * 2;
      let arrowTY =
        nodeCoordinate$1[curLayerIndex][i].y + nodeLength$4 / 2 + plusSymbolRadius$1;

      if (i == 9) {
        textY -= 110;
        arrowSY -= 70;
        arrowTY -= 18;
      }

      let plusText = plusAnnotation
        .append("text")
        .attr("x", textX)
        .attr("y", textY)
        .attr("class", "annotation-text")
        .style("dominant-baseline", "hanging")
        .style("text-anchor", "middle");

      plusText
        .append("tspan")
        .style("dominant-baseline", "hanging")
        .text("Add up all products");

      plusText
        .append("tspan")
        .attr("x", textX)
        .attr("dy", "1em")
        .style("dominant-baseline", "hanging")
        .text("(");

      plusText
        .append("tspan")
        .style("fill", "#66a3c8")
        .style("dominant-baseline", "hanging")
        .text("element");

      plusText.append("tspan").style("dominant-baseline", "hanging").text(" × ");

      plusText
        .append("tspan")
        .style("dominant-baseline", "hanging")
        .style("fill", "#b58946")
        .text("weight");

      plusText.append("tspan").style("dominant-baseline", "hanging").text(")");

      plusText
        .append("tspan")
        .attr("x", textX)
        .attr("dy", "1em")
        .style("dominant-baseline", "hanging")
        .text("and then add");

      plusText
        .append("tspan")
        .style("dominant-baseline", "hanging")
        .style("fill", "#479d94")
        .text("bias.");

      drawArrow({
        group: plusAnnotation,
        sx: intermediateX2 - 2 * plusSymbolRadius$1 - 3,
        sy: arrowSY,
        tx: intermediateX2 - 5,
        ty: arrowTY,
        dr: 30,
        hFlip: i === 9,
        marker: "marker-alt",
      });

      // Add annotation for the bias
      let biasTextY = nodeCoordinate$1[curLayerIndex][i].y;
      biasTextY -= 2 * kernelRectLength$1 + 4;

      flattenLayerLeftPart
        .append("text")
        .attr("class", "annotation-text")
        .attr("x", intermediateX2 + plusSymbolRadius$1)
        .attr("y", biasTextY)
        .style("text-anchor", "middle")
        .style("dominant-baseline", "baseline")
        .text("Bias");

      // Add annotation for the softmax symbol
      let softmaxAnnotation = intermediateLayerAnnotation
        .append("g")
        .attr("class", "softmax-annotation");

      softmaxAnnotation
        .append("text")
        .attr("x", softmaxX + softmaxWidth / 2)
        .attr("y", softmaxTextY)
        .attr("class", "annotation-text")
        .style("dominant-baseline", "baseline")
        .style("text-anchor", "middle")
        .style("font-weight", 700)
        .text("Click ")
        .append("tspan")
        .attr("dx", 1)
        .style("font-weight", 400)
        .text("to learn more");

      drawArrow({
        group: softmaxAnnotation,
        sx: softmaxX + softmaxWidth / 2 - 5,
        sy: softmaxTextY + 4,
        tx: softmaxX + softmaxWidth / 2,
        ty: symbolY - plusSymbolRadius$1 - 4,
        dr: 50,
        hFlip: true,
      });

      // Add annotation for the flatten layer
      let flattenAnnotation = intermediateLayerAnnotation
        .append("g")
        .attr("class", "flatten-annotation");

      textX = leftX - 120;
      textY = nodeCoordinate$1[curLayerIndex - 1][0].y;

      let flattenText = flattenAnnotation
        .append("text")
        .attr("x", textX)
        .attr("y", textY)
        .attr("class", "annotation-text")
        .style("dominant-baseline", "hanging")
        .style("text-anchor", "middle");

      let tempTspan = flattenText
        .append("tspan")
        .style("dominant-baseline", "hanging")
        .style("font-weight", 700)
        .text("Hover over ");

      tempTspan
        .append("tspan")
        .attr("dx", 1)
        .style("font-weight", 400)
        .style("dominant-baseline", "hanging")
        .text("matrix to");

      flattenText
        .append("tspan")
        .style("dominant-baseline", "hanging")
        .attr("x", textX)
        .attr("dy", "1em")
        .text("see how it is flattened");

      flattenText
        .append("tspan")
        .style("dominant-baseline", "hanging")
        .attr("x", textX)
        .attr("dy", "1em")
        .text("into a 1D array!");

      drawArrow({
        group: flattenAnnotation,
        sx: textX + 65,
        sy: textY + nodeLength$4 * 0.4 + 12,
        tx: leftX - 10,
        ty: textY + nodeLength$4 / 2,
        dr: 80,
        hFlip: true,
      });

      // Add annotation to explain the middle images
      textY = nodeCoordinate$1[curLayerIndex - 1][1].y;

      let middleText = flattenAnnotation
        .append("text")
        .attr("x", textX)
        .attr("y", textY)
        .attr("class", "annotation-text")
        .style("dominant-baseline", "hanging")
        .style("text-anchor", "middle");

      middleText
        .append("tspan")
        .style("dominant-baseline", "hanging")
        .text("Same flattening");

      middleText
        .append("tspan")
        .style("dominant-baseline", "hanging")
        .attr("x", textX)
        .attr("dy", "1em")
        .text("operation for");

      middleText
        .append("tspan")
        .style("dominant-baseline", "hanging")
        .attr("x", textX)
        .attr("dy", "1em")
        .text("each neuron.");

      drawArrow({
        group: flattenAnnotation,
        sx: textX + 39,
        sy: textY + 25,
        tx: leftX - 10,
        ty: textY + nodeLength$4 / 2 - 2,
        dr: 80,
        hFlip: true,
        marker: "marker-alt",
      });

      

      // Show everything
      svg$2
        .selectAll("g.intermediate-layer, g.intermediate-layer-annotation")
        .transition()
        .delay(500)
        .duration(500)
        .ease(d3.easeCubicInOut)
        .style("opacity", 1);
    };

    // The liquid level is a fixed, linear 0–1 scale, never a per-node autoscale.
    // Numeric labels retain the original value; only the visible fill is bounded.
    function liquidLevel(value) {
      return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : null;
    }

    function liquidWavePath(value, radius, phase = 0) {
      const fraction = liquidLevel(value);
      if (fraction === null) return null;
      const level = radius * (1 - 2 * fraction);
      const amplitude = Math.min(radius * 0.075,
        radius * fraction * 0.36, radius * (1 - fraction) * 0.36);
      const points = Array.from({ length: 65 }, (_, index) => {
        const x = -radius + 2 * radius * index / 64;
        const y = level + amplitude * Math.sin(index / 64 * Math.PI * 2 + phase);
        return `${x.toFixed(3)},${y.toFixed(3)}`;
      });
      return `M${points.join(' L')} L${radius},${radius} L${-radius},${radius} Z`;
    }

    function getACCTPanelWidth(svgWidth) {
      return Math.min(400, Math.max(260, svgWidth * 0.105));
    }

    function getACCTChainLayout(width, height, controlsBottom = 196) {
      const designWidth = 380;
      const inset = 6;
      const radius = 33;
      const captionHeight = 44;
      const badgeHeight = 54;
      const minimumGap = 12;
      const bottomInset = 24;
      const top = Math.max(66, controlsBottom + 18);
      const availableHeight = Math.max(1, height - top - bottomInset);
      const rowHeight = radius * 2 + captionHeight;
      const minimumHeight = badgeHeight * 2 + rowHeight * 3 + minimumGap * 4;
      // Use the full remaining height for node positions, but scale every glyph
      // uniformly so liquid gauges remain circles, not vertically stretched ovals.
      const scale = Math.max(0.1, Math.min(1, (width - inset * 2) / designWidth,
        availableHeight / minimumHeight));
      const contentHeight = availableHeight / scale;
      const gap = (contentHeight - badgeHeight * 2 - rowHeight * 3) / 4;
      const firstRow = badgeHeight + gap + radius;
      const rows = [firstRow, firstRow + rowHeight + gap, firstRow + rowHeight * 2 + gap * 2];
      return {
        scale,
        left: inset + Math.max(0, (width - inset * 2 - designWidth * scale) / 2),
        top,
        // Move the threshold a little farther into the reserved output gap;
        // keep the summation and waterballs fixed so their spacing is preserved.
        threshold: { x: -12, y: rows[1], radius: 32 },
        sum: { x: 76, y: rows[1], radius: 24 },
        branchX: 38,
        resultX: 167,
        statisticX: 255,
        weightX: 343,
        radius,
        captionHeight,
        rows,
        adopt: { x: 134, y: badgeHeight / 2, width: 210, height: badgeHeight },
        discard: { x: 134, y: contentHeight - badgeHeight / 2, width: 210, height: badgeHeight },
      };
    }

    const formatValue = (value, digits = 3) => Number.isFinite(value) ? value.toFixed(digits) : '—';
    const ink = '#243958';
    // Input and decision branches share a screen-space width, even though only
    // the branches are inside the responsive diagram's scaled SVG group.
    const decisionLinkWidth = 2;
    let graphSerial = 0;

    function text$1(group, className, x, y, value, size, color = ink) {
      return group.append('text').attr('class', className)
        .attr('x', x).attr('y', y).attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle').attr('font-size', size)
        .attr('fill', color).text(value);
    }

    // Long cubic turns soften both changes of direction, like the model's
    // feature links. Their vertical tangents join the unchanged clear lane;
    // horizontal end tangents meet the output and destination without elbows.
    function bezierDecisionRoute(start, end, laneX, startReach, endReach) {
      const direction = end.y >= start.y ? 1 : -1;
      const distance = Math.abs(end.y - start.y);
      const startTurn = Math.min(startReach, distance * 0.32);
      const endTurn = Math.min(endReach, distance * 0.32);
      const entryY = start.y + direction * startTurn;
      const exitY = end.y - direction * endTurn;
      const laneHeight = exitY - entryY;
      return `M${start.x},${start.y} C${laneX},${start.y} ${laneX},${entryY - direction * startTurn * 0.65} ${laneX},${entryY}`
        + ` C${laneX},${entryY + laneHeight / 3} ${laneX},${entryY + laneHeight * 2 / 3} ${laneX},${exitY}`
        + ` C${laneX},${end.y - direction * endTurn * 0.35} ${laneX},${end.y} ${end.x},${end.y}`;
    }

    function waterball(group, defs, graphId, options) {
      const { key, kind, x, y, radius, value, label, accessibleLabel } = options;
      const level = liquidLevel(value);
      const ball = group.append('g')
        .attr('class', `acct-waterball acct-${kind}-node`)
        .attr('transform', `translate(${x},${y})`)
        .attr('data-component', key).attr('data-value', Number.isFinite(value) ? value : '')
        .attr('data-fill-level', level === null ? '' : level)
        .attr('data-scale-min', 0).attr('data-scale-max', 1)
        .attr('role', 'img').attr('aria-label', `${accessibleLabel}: ${formatValue(value)}`);
      if (kind === 'component') {
        ball.attr('data-component-value', Number.isFinite(value) ? value : '')
          .attr('data-component-raw-value', Number.isFinite(value) ? value : '');
      }
      const innerRadius = radius - 3;
      const clipId = `${graphId}-${kind}-${key}`;
      // A fresh ID per redraw prevents clipping against a previous checkpoint.
      defs.append('clipPath').attr('id', clipId).attr('clipPathUnits', 'userSpaceOnUse')
        .append('circle').attr('r', innerRadius).attr('cx', 0).attr('cy', 0);
      ball.append('circle').attr('class', 'acct-waterball-outline')
        .attr('r', radius).attr('fill', 'white').attr('stroke', '#f4a900').attr('stroke-width', 1.15);
      if (level !== null) {
        const liquid = ball.append('g').attr('class', 'acct-liquid')
          .attr('clip-path', `url(#${clipId})`);
        liquid.append('path').attr('class', 'acct-liquid-back')
          .attr('d', liquidWavePath(value, innerRadius, Math.PI / 2))
          .attr('fill', '#fbd17c');
        liquid.append('path').attr('class', 'acct-liquid-front')
          .attr('d', liquidWavePath(value, innerRadius, -Math.PI / 2))
          .attr('fill', '#ffb414');
      }
      text$1(ball, 'acct-waterball-value', 0, radius+17,
        formatValue(value, kind === 'weight' ? 2 : 3), 22, '#141414');
      if (label) {
        text$1(ball, 'acct-waterball-label', 0, 2*radius + 18, label,
          kind === 'weight' ? 26 : 18, '#141414');
      }
      return ball;
    }

    function drawACCTDecisionGraph(group, options) {
      const { width, height, data, weights, components, threshold, decision, origin,
        controlsBottom, titleX = 16 } = options;
      const layout = getACCTChainLayout(width, height, controlsBottom);
      const graphId = `acct-liquid-${++graphSerial}`;
      group.attr('data-acct-layout', 'liquid-decision-chain')
        .attr('data-weight-scale-min', 0).attr('data-weight-scale-max', 1)
        .attr('font-family', 'Arial, sans-serif');
      const defs = group.append('defs');
      const arrowId = `${graphId}-sum-arrow`;
      defs.append('marker').attr('id', arrowId).attr('viewBox', '0 -4 8 8')
        .attr('refX', 7).attr('refY', 0).attr('markerWidth', 5).attr('markerHeight', 5)
        .attr('orient', 'auto').append('path').attr('d', 'M0,-4L8,0L0,4Z').attr('fill', '#8b8b8b');

      // Leave room for the HTML Reset button at the far right of this header.
      const safeTitleX = Math.max(12, Math.min(titleX, width - 240));
      const titleSize = Math.min(22, (width - safeTitleX - 82) / 8.6);
      text$1(group, 'acct-title acct-chain-title', safeTitleX, 26, 'ACCT Adjustment', titleSize, '#000')
        .attr('text-anchor', 'start').attr('font-weight', 700)
        .attr('style', `--acct-title-font-size: ${titleSize}px`);

      const graph = group.append('g').attr('class', 'acct-chain-body')
        .attr('transform', `translate(${layout.left},${layout.top}) scale(${layout.scale})`);
      const { threshold: tau, sum, radius, resultX, statisticX, weightX } = layout;
      // Every connector stays behind every glyph and caption, even after redraws.
      const links = graph.append('g').attr('class', 'acct-chain-links').attr('aria-hidden', 'true');
      const nodes = graph.append('g').attr('class', 'acct-chain-nodes');

      // Connect the selected model output to this class's threshold, not to a
      // hard-coded probability or a statistic from another class/checkpoint.
      if (origin) {
        const target = {
          x: layout.left + (tau.x - tau.radius) * layout.scale,
          y: layout.top + tau.y * layout.scale
        };
        // Ease out horizontally from the selected output into its clear lane.
        // Keep that lane fixed beside the output labels as tau moves left, and
        // stop the final smooth turn at the threshold's left edge.
        const laneX = target.x - Math.max(12, 16 * layout.scale);
        group.insert('path', '.acct-chain-body').attr('class', 'curve-link curve-link-input')
          .attr('data-route', 'output-clearance')
          .attr('d', bezierDecisionRoute(origin, target, laneX, 64 * layout.scale, 56 * layout.scale))
          .attr('fill', 'none').attr('stroke', decision === 'KEEP' ? '#258146' : decision === 'DROP' ? '#c53243' : '#999')
          .attr('stroke-width', decisionLinkWidth).attr('vector-effect', 'non-scaling-stroke')
          .attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round');
        group.append('circle').attr('class', 'acct-origin-node')
          .attr('cx', origin.x).attr('cy', origin.y).attr('r', 3)
          .attr('fill', decision === 'KEEP' ? '#258146' : decision === 'DROP' ? '#c53243' : '#999');
      }

      for (const [key, label, active, box, color] of [
        ['keep', 'Adopt', decision === 'KEEP', layout.adopt, '#008d3e'],
        ['drop', 'Discard', decision === 'DROP', layout.discard, '#b42332'],
      ]) {
        const offset = tau.radius * Math.SQRT1_2;
        const startX = tau.x + offset;
        const direction = key === 'keep' ? -1 : 1;
        const startY = tau.y + direction * offset;
        const spineX = layout.branchX;
        // Broad cubic corner transitions stay outside the threshold captions.
        // The middle lane remains to their right and to the left of Σ.
        links.append('path').attr('class', `curve-link curve-link-${key}`)
          .attr('data-active', active)
          .attr('d', bezierDecisionRoute({ x: startX, y: startY }, box, spineX, 56, 64))
          .attr('fill', 'none').attr('stroke', active ? color : '#8c9aaa')
          .attr('stroke-width', decisionLinkWidth).attr('vector-effect', 'non-scaling-stroke')
          .attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round');
        const badge = nodes.append('g').attr('class', `acct-decision acct-decision-${key}`)
          .attr('data-active', active).attr('role', 'img')
          .attr('aria-label', `${label}: ${active ? 'selected' : 'not selected'}`);
        badge.append('rect').attr('x', box.x).attr('y', box.y - box.height / 2)
          .attr('width', box.width).attr('height', box.height).attr('rx', 6)
          .attr('fill', active ? (key === 'drop' ? '#fde6e8' : '#cce6b7') : '#edf0f3')
          .attr('fill-opacity', 1)
          .attr('stroke', active ? color : '#8c9aaa').attr('stroke-width', active ? 2.2 : 1.4);
        text$1(badge, 'acct-chain-decision-label', box.x + box.width / 2, box.y, label, 28,
          active ? color : '#6b7280').attr('font-weight', 700);
      }

      nodes.append('circle').attr('class', 'threshold-node')
        .attr('data-threshold-value', Number.isFinite(threshold) ? threshold : '')
        .attr('cx', tau.x).attr('cy', tau.y).attr('r', tau.radius)
        .attr('fill', '#ffdc60').attr('stroke', ink).attr('stroke-width', 1.8);
      text$1(nodes, 'acct-chain-threshold-value', tau.x, tau.y, formatValue(threshold), 22, '#111').attr('font-weight', 700);
      text$1(
        nodes,
        'acct-chain-threshold-symbol',
        tau.x,
        tau.y + tau.radius + 16,
        'τ',
        30,
        '#111'
      )
        .attr('font-weight', 700)
        .append('tspan')
        .attr('baseline-shift', '-20%')
        .attr('font-size', 21)
        .attr('font-weight', 700)
        .text('c');

      text$1(
        nodes,
        'acct-chain-threshold-label',
        tau.x,
        tau.y + tau.radius + 43,
        'Threshold',
        18,
        '#111'
      )
      .attr('font-weight', 600);

      links.append('line').attr('class', 'acct-sum-threshold-link')
        .attr('x1', tau.x + tau.radius).attr('x2', sum.x - sum.radius)
        .attr('y1', sum.y).attr('y2', sum.y).attr('stroke', '#8b8b8b')
        .attr('stroke-width', 1.5).attr('stroke-dasharray', '6,5');
      nodes.append('circle').attr('class', 'acct-sum-node')
        .attr('cx', sum.x).attr('cy', sum.y).attr('r', sum.radius)
        .attr('fill', 'white').attr('stroke', ink).attr('stroke-width', 1.6);
      text$1(nodes, 'acct-sum-symbol', sum.x, sum.y + 1, 'Σ', 32, '#111');

      const rows = [
        { key: 'confidence', statistic: data.S_c, label: 'Confidence', weight: weights.alpha, symbol: 'α', factor: 'S_c' },
        { key: 'uncertainty', statistic: data.U_c, label: 'Uncertainty', weight: weights.beta, symbol: 'β', factor: 'U_c' },
        { key: 'balance', statistic: data.B_c, label: 'Class balance', weight: weights.gamma, symbol: 'γ', factor: 'B_c' },
      ];
      rows.forEach((row, index) => {
        const y = layout.rows[index];
        const component = components.find((item) => item.key === row.key);
        const result = component ? component.value : NaN;
        const resultLeft = resultX - radius;
        const endX = index === 1 ? sum.x + sum.radius : sum.x;
        const endY = index === 0 ? sum.y - sum.radius : index === 2 ? sum.y + sum.radius : sum.y;
        links.append('path').attr('class', `acct-component-sum-link acct-${row.key}-sum-link`)
          .attr('d', index === 1 ? `M${resultLeft},${y} H${endX}` : `M${resultLeft},${y} H${endX} V${endY}`)
          .attr('fill', 'none').attr('stroke', '#8b8b8b').attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '6,5').attr('marker-end', `url(#${arrowId})`);
        waterball(nodes, defs, graphId, {
          key: row.key, kind: 'component', x: resultX, y, radius,
          value: result, label: '', accessibleLabel: `${row.symbol} × ${row.factor}`
        });
        text$1(nodes, 'acct-formula-equals', (resultX + statisticX) / 2, y, '=', 30, '#b0acac').attr('font-weight', 700);
        waterball(nodes, defs, graphId, {
          key: row.key, kind: 'statistic', x: statisticX, y, radius,
          value: row.statistic, label: row.label, accessibleLabel: row.label
        });
        text$1(nodes, 'acct-formula-times', (statisticX + weightX) / 2, y, '×', 28, '#b0acac').attr('font-weight', 700);
        waterball(nodes, defs, graphId, {
          key: row.key, kind: 'weight', x: weightX, y, radius,
          value: row.weight, label: row.symbol, accessibleLabel: row.symbol
        });
      });
    }

    /* global d3, SmoothScroll */


    // Configs
    const layerColorScales$4 = overviewConfig.layerColorScales;
    const nodeLength$5 = overviewConfig.nodeLength;
    const numLayers = overviewConfig.numLayers;
    const edgeOpacity = overviewConfig.edgeOpacity;
    const edgeInitColor = overviewConfig.edgeInitColor;
    const edgeStrokeWidth = overviewConfig.edgeStrokeWidth;
    const svgPaddings$3 = overviewConfig.svgPaddings;
    const gapRatio$2 = overviewConfig.gapRatio;
    const classLists = overviewConfig.classLists;
    const formater$2 = d3.format(".4f");
    const GRAD_CAM_Y = 92;
    const outputImageCache = new WeakMap();

    // Shared variables
    let svg$3 = undefined;
    svgStore.subscribe((value) => {
      svg$3 = value;
    });

    let vSpaceAroundGap$3 = undefined;
    vSpaceAroundGapStore.subscribe((value) => {
      vSpaceAroundGap$3 = value;
    });

    let hSpaceAroundGap$2 = undefined;
    hSpaceAroundGapStore.subscribe((value) => {
      hSpaceAroundGap$2 = value;
    });

    let cnn$2 = undefined;
    cnnStore.subscribe((value) => {
      cnn$2 = value;
    });

    let nodeCoordinate$2 = undefined;
    nodeCoordinateStore.subscribe((value) => {
      nodeCoordinate$2 = value;
    });

    let selectedScaleLevel$2 = undefined;
    selectedScaleLevelStore.subscribe((value) => {
      selectedScaleLevel$2 = value;
    });

    let cnnLayerRanges$2 = undefined;
    cnnLayerRangesStore.subscribe((value) => {
      cnnLayerRanges$2 = value;
    });

    let cnnLayerMinMax = undefined;
    cnnLayerMinMaxStore.subscribe((value) => {
      cnnLayerMinMax = value;
    });

    let modelColorDomain;
    modelColorDomainStore.subscribe((value) => {
      modelColorDomain = value;
    });

    let detailedMode$2 = undefined;
    detailedModeStore.subscribe((value) => {
      detailedMode$2 = value;
    });

    // ACCT threshold parameters
    let alpha = undefined;
    alphaStore.subscribe((value) => {
      alpha = value;
    });

    let beta = undefined;
    betaStore.subscribe((value) => {
      beta = value;
    });

    let gamma = undefined;
    gammaStore.subscribe((value) => {
      gamma = value;
    });

    // ACCT data and selection
    let ACCTdata = [];
    let ACCTselected = null;

    /**
     * Use bounded d3 data to draw one canvas
     * @param {object} d d3 data
     * @param {index} i d3 data index
     * @param {[object]} g d3 group
     * @param {number} range color range map (max - min)
     */
    const drawOutput = (d, i, g, range) => {
      let image = g[i];
      let colorScale = layerColorScales$4[d.type];

      if (d.type === "input") {
        colorScale = colorScale[d.index];
      }

      const colorDomain = modelColorDomain || { min: -range / 2, max: range / 2 };
      const cached = outputImageCache.get(d);
      const useCachedImage = cached && cached.output === d.output &&
        cached.type === d.type && cached.index === d.index && cached.range === range &&
        cached.min === colorDomain.min && cached.max === colorDomain.max;
      if (useCachedImage) {
        d3.select(image)
          .attr('xlink:href', cached.url)
          .attr('data-spatial-resolution', cached.resolution)
          .attr('data-color-min', d.type === 'input' || d.type === 'fc' ? null : colorDomain.min)
          .attr('data-color-max', d.type === 'input' || d.type === 'fc' ? null : colorDomain.max)
          .style('image-rendering', 'pixelated');
        return;
      }
      const featureColor = (value) => d3.rgb(colorScale(
        normalizeColorValue(value, colorDomain.min, colorDomain.max)
      ));

      // Set up a second convas in order to resize image
      let imageLength = d.output.length === undefined ? 1 : d.output.length;
      let bufferCanvas = document.createElement("canvas");
      let bufferContext = bufferCanvas.getContext("2d");
      bufferCanvas.width = imageLength;
      bufferCanvas.height = imageLength;
      bufferContext.imageSmoothingEnabled = false;

      // Fill image pixel array
      let imageSingle = bufferContext.getImageData(0, 0, imageLength, imageLength);
      let imageSingleArray = imageSingle.data;

      if (imageLength === 1) {
        const value = typeof d.output === "number" ? d.output : d.output[0][0];
        const color = d.type === "input" || d.type === "fc"
          ? d3.rgb(colorScale(value)) : featureColor(value);
        imageSingleArray[0] = color.r;
        imageSingleArray[1] = color.g;
        imageSingleArray[2] = color.b;
        imageSingleArray[3] = 255;
      } else {
        for (let i = 0; i < imageSingleArray.length; i += 4) {
          let pixeIndex = Math.floor(i / 4);
          let row = Math.floor(pixeIndex / imageLength);
          let column = pixeIndex % imageLength;
          let color = undefined;
          if (d.type === "input" || d.type === "fc") {
            color = d3.rgb(colorScale(1 - d.output[row][column]));
          } else {
            color = featureColor(d.output[row][column]);
          }

          imageSingleArray[i] = color.r;
          imageSingleArray[i + 1] = color.g;
          imageSingleArray[i + 2] = color.b;
          imageSingleArray[i + 3] = 255;
        }
      }

      // canvas.toDataURL() only exports image in 96 DPI, so we can hack it to have
      // higher DPI by rescaling the image using canvas magic
      let largeCanvas = document.createElement("canvas");
      largeCanvas.width = nodeLength$5 * 3;
      largeCanvas.height = nodeLength$5 * 3;
      let largeCanvasContext = largeCanvas.getContext("2d");
      largeCanvasContext.imageSmoothingEnabled = false;

      // Use drawImage to resize the original pixel array, and put the new image
      // (canvas) into corresponding canvas
      bufferContext.putImageData(imageSingle, 0, 0);
      largeCanvasContext.drawImage(
        bufferCanvas,
        0,
        0,
        imageLength,
        imageLength,
        0,
        0,
        nodeLength$5 * 3,
        nodeLength$5 * 3
      );

      let imageDataURL = largeCanvas.toDataURL();
      // Re-spacing a detail diagram changes only geometry. Reuse the exact
      // bitmap while its tensor, range, and color domain remain identical.
      outputImageCache.set(d, { output: d.output, type: d.type, index: d.index,
        range, min: colorDomain.min, max: colorDomain.max, url: imageDataURL,
        resolution: `${imageLength}x${imageLength}` });
      d3.select(image)
        .attr("xlink:href", imageDataURL)
        .attr("data-spatial-resolution", `${imageLength}x${imageLength}`)
        .attr("data-color-min", d.type === "input" || d.type === "fc" ? null : colorDomain.min)
        .attr("data-color-max", d.type === "input" || d.type === "fc" ? null : colorDomain.max)
        .style("image-rendering", "pixelated");

      // Destory the buffer canvas
      bufferCanvas.remove();
      largeCanvas.remove();
    };

    function drawGradCAM(layerGroup, left) {
      layerGroup.selectAll(".gradcam-node-image, .gradcam-color-legend").remove();
      const cam = cnn$2.gradcam;
      if (!cam) return;

      layerGroup.append("image")
        .attr("class", "gradcam-node-image")
        .attr("width", nodeLength$5)
        .attr("height", nodeLength$5)
        .attr("x", left)
        .attr("y", GRAD_CAM_Y)
        .attr("xlink:href", cam.imageUrl)
        .attr("data-model-name", cam.modelName)
        .attr("data-target-class", cam.target)
        .attr("data-color-min", cam.min)
        .attr("data-color-max", cam.max);

      const legend = layerGroup.append("g")
        .attr("class", "gradcam-color-legend")
        .attr("data-model-name", cam.modelName)
        .attr("data-color-min", cam.min)
        .attr("data-color-max", cam.max)
        .style("pointer-events", "none");
      const gradient = legend.append("defs").append("linearGradient")
        .attr("id", "gradcam-color-gradient")
        .attr("x1", "0%").attr("x2", "0%")
        .attr("y1", "100%").attr("y2", "0%");
      for (let i = 0; i <= 20; i++) {
        const [r, g, b] = gradCAMColor(i / 20);
        gradient.append("stop")
          .attr("offset", `${i * 5}%`)
          .attr("stop-color", d3.rgb(r, g, b).toString());
      }

      const barX = left - 20;
      legend.append("rect")
        .attr("class", "gradcam-color-bar")
        .attr("x", barX).attr("y", GRAD_CAM_Y)
        .attr("width", 8).attr("height", nodeLength$5)
        .attr("fill", "url(#gradcam-color-gradient)")
        .attr("stroke", "#bbb").attr("stroke-width", 0.5);
      [{ value: cam.max, y: GRAD_CAM_Y, type: "max" },
        { value: cam.min, y: GRAD_CAM_Y + nodeLength$5, type: "min" }]
        .forEach(({ value, y, type }) => {
          legend.append("text")
            .attr("class", `gradcam-scale-${type}`)
            .attr("x", barX - 5).attr("y", y)
            .attr("text-anchor", "end")
            .style("dominant-baseline", "middle")
            .style("font-size", "12px")
            .style("fill", "#4a4a4a")
            .text(formatColorValue(value));
        });
      legend.append("title").text(
        `Grad-CAM · ${cam.modelName} · ${classLists[cam.target]}: ${formatColorValue(cam.min)} to ${formatColorValue(cam.max)}`
      );
    }

    /**
     * Draw bar chart to encode the output value
     * @param {object} d d3 data
     * @param {index} i d3 data index
     * @param {[object]} g d3 group
     * @param {function} scale map value to length
     */
    const drawOutputScore = (d, i, g, scale) => {
      let group = d3.select(g[i]);

      // Update the score rectangle width
      group
        .select("rect.output-rect")
        .transition("output")
        .delay(500)
        .duration(800)
        .ease(d3.easeCubicIn)
        .attr("width", scale(d.output));

      // Update the probability text annotation
      d3.select(`#output-prob-${i}`)
        .transition("output")
        .delay(500)
        .duration(800)
        .tween("text", function () {
          const textNode = this;
          const oldValue = parseFloat(textNode.textContent.match(/\d+\.\d+/)?.[0] || d.output);
          const newValue = d.output;
          const interpolator = d3.interpolate(oldValue, newValue);
          return function (t) {
            textNode.textContent = `(${d3.format(".4f")(interpolator(t))})`;
          };
        });
    };

    const drawCustomImage = (image, inputLayer) => {
      let imageWidth = image.width;
      // Set up a second convas in order to resize image
      let imageLength = inputLayer[0].output.length;
      let bufferCanvas = document.createElement("canvas");
      let bufferContext = bufferCanvas.getContext("2d");
      bufferCanvas.width = imageLength;
      bufferCanvas.height = imageLength;

      // Fill image pixel array
      let imageSingle = bufferContext.getImageData(0, 0, imageLength, imageLength);
      let imageSingleArray = imageSingle.data;

      for (let i = 0; i < imageSingleArray.length; i += 4) {
        let pixeIndex = Math.floor(i / 4);
        let row = Math.floor(pixeIndex / imageLength);
        let column = pixeIndex % imageLength;

        let red = inputLayer[0].output[row][column];
        let green = inputLayer[1].output[row][column];
        let blue = inputLayer[2].output[row][column];

        imageSingleArray[i] = red * 255;
        imageSingleArray[i + 1] = green * 255;
        imageSingleArray[i + 2] = blue * 255;
        imageSingleArray[i + 3] = 255;
      }

      // canvas.toDataURL() only exports image in 96 DPI, so we can hack it to have
      // higher DPI by rescaling the image using canvas magic
      let largeCanvas = document.createElement("canvas");
      largeCanvas.width = imageWidth * 3;
      largeCanvas.height = imageWidth * 3;
      let largeCanvasContext = largeCanvas.getContext("2d");

      // Use drawImage to resize the original pixel array, and put the new image
      // (canvas) into corresponding canvas
      bufferContext.putImageData(imageSingle, 0, 0);
      largeCanvasContext.drawImage(
        bufferCanvas,
        0,
        0,
        imageLength,
        imageLength,
        0,
        0,
        imageWidth * 3,
        imageWidth * 3
      );

      let imageDataURL = largeCanvas.toDataURL();
      image.src = imageDataURL;

      // Destory the buffer canvas
      bufferCanvas.remove();
      largeCanvas.remove();
    };

    /**
     * Map internal layer names to display names
     * @param {string} layerName - The internal layer name
     * @returns {string} display name
     */
    const getDisplayName = (layerName) => {
      let displayName;
      if (layerName === "input") {
        displayName = "Input";
      } else if (layerName === "norm") {
        displayName = "Norm";
      } else if (layerName === "pool" || layerName.includes("max_pool")) {
        displayName = "Pool";
      } else if (layerName === "output") {
        displayName = "Output";
      } else if (layerName.includes("conv")) {
        displayName = "Conv";
      } else if (layerName.includes("relu")) {
        displayName = "Relu";
      } else if (layerName.includes("block")) {
        // Convert block_1_layer_2_out to layer1.2
        const parts = layerName.split("_");
        if (parts.length >= 4) {
          const blockNum = parts[1];
          const layerNum = parts[3];
          displayName = `Layer${blockNum}.${layerNum}`;
        } else {
          displayName = layerName.replace("block_", "").replace("_", "");
        }
      } else {
        displayName = layerName;
      }
      return displayName;
    };

    /**
     * Draw the overview
     * @param {number} width Width of the cnn group
     * @param {number} height Height of the cnn group
     * @param {object} cnnGroup Group to appen cnn elements to
     * @param {function} nodeMouseOverHandler Callback func for mouseOver
     * @param {function} nodeMouseLeaveHandler Callback func for mouseLeave
     * @param {function} nodeClickHandler Callback func for click
     */
    const drawCNN = (
      width,
      height,
      cnnGroup,
      nodeMouseOverHandler,
      nodeMouseLeaveHandler,
      nodeClickHandler
    ) => {
      nodeCoordinate$2 = [];
      const model_name = get_store_value(model_nameStore);
      // These labels are owned by the main SVG rather than cnnGroup. Recreate
      // them with the nodes so a resize cannot leave old labels over ACCT.
      svg$3.selectAll("g.layer-label, g.layer-detailed-label").remove();

      // 清空并初始化 ACCT 数据
      ACCTdata = [];
      ACCTselected = null;

      // Reserve a separate lane for all nine liquid gauges and the decision
      // branch. Size the CNN gaps from its actual layers so Output never sits
      // underneath the ACCT diagram, including on high-DPI displays.
      const layerGapFactors = cnn$2.map((layer) => {
        const first = layer[0];
        if (first.layerName === "output" || first.type === "conv" ||
          first.layerName.includes("layer_1")) return gapRatio$2;
        if (["norm", "relu", "pool"].includes(first.type)) return 0.5;
        return 1;
      });
      const modelWidth = width - getACCTPanelWidth(width + svgPaddings$3.left + svgPaddings$3.right) - 92;
      hSpaceAroundGap$2 = Math.max(2, (modelWidth - nodeLength$5 * cnn$2.length) /
        layerGapFactors.reduce((sum, factor) => sum + factor, 0));
      hSpaceAroundGapStore.set(hSpaceAroundGap$2);
      let leftAccuumulatedSpace = 0;

      // Iterate through the cnn to draw nodes in each layer
      for (let l = 0; l < cnn$2.length; l++) {
        let curLayer = cnn$2[l];
        let isOutput = curLayer[0].layerName === "output";

        nodeCoordinate$2.push([]);

        // Compute the x coordinate of the whole layer
        // Output layer and conv layer has long gaps
        if (
          isOutput ||
          curLayer[0].type === "conv" ||
          curLayer[0].layerName.includes("layer_1")
        ) {
          leftAccuumulatedSpace += hSpaceAroundGap$2 * gapRatio$2;
        } else if (
          curLayer[0].type === "norm" ||
          curLayer[0].type === "relu" ||
          curLayer[0].type === "pool"
        ) {
          leftAccuumulatedSpace += hSpaceAroundGap$2 * 0.5;
        } else {
          leftAccuumulatedSpace += hSpaceAroundGap$2;
        }

        // All nodes share the same x coordiante (left in div style)
        let left = leftAccuumulatedSpace;

        let layerGroup = cnnGroup
          .append("g")
          .attr("class", "cnn-layer-group")
          .attr("id", `cnn-layer-group-${l}`);

        vSpaceAroundGap$3 =
          (height - nodeLength$5 * curLayer.length) / (curLayer.length + 1);
        vSpaceAroundGapStore.set(vSpaceAroundGap$3);

        let nodeGroups = layerGroup
          .selectAll("g.node-group")
          .data(curLayer, (d) => d.index)
          .enter()
          .append("g")
          .attr("class", "node-group")
          .style("cursor", "pointer")
          .style("pointer-events", "all")
          .on("click", nodeClickHandler)
          .on("mouseover", nodeMouseOverHandler)
          .on("mouseleave", nodeMouseLeaveHandler)
          .classed("node-output", isOutput)
          .attr("id", (d, i) => {
            // Compute the coordinate
            // Not using transform on the group object because of a decade old
            // bug on webkit (safari)
            // https://bugs.webkit.org/show_bug.cgi?id=23113
            let top = i * nodeLength$5 + (i + 1) * vSpaceAroundGap$3;
            top += svgPaddings$3.top;
            // Reserve a clear label band above every visual node. The extra
            // offset changes only layout; the activation-map glyphs themselves
            // retain their original size and appearance.
            if (curLayer[0].layerName === "input") {
              top += 60;
            } else {
              top += 22;
            }
            nodeCoordinate$2[l].push({
              x: left,
              y: top,
              size: getNodeRenderSize(),
            });
            return `layer-${l}-node-${i}`;
          });

        // Overwrite the mouseover and mouseleave function for output nodes to show
        // hover info in the UI
        layerGroup
          .selectAll("g.node-output")
          .on("mouseover", (d, i, g) => {
            nodeMouseOverHandler(d, i, g);
            hoverInfoStore.set({
              show: true,
              text: `Output value: ${formater$2(d.output)}`,
            });
          })
          .on("mouseleave", (d, i, g) => {
            nodeMouseLeaveHandler(d, i, g);
            hoverInfoStore.set({
              show: false,
              text: `Output value: ${formater$2(d.output)}`,
            });
          });

        // Special handling for the input layer
        if (curLayer[0].layerName === "input") {
          // Embed original input channels
          nodeGroups
            .filter((d, i) => i < 3)
            .append("image")
            .attr("class", "node-image")
            .attr("width", (d) => getNodeRenderSize())
            .attr("height", (d) => getNodeRenderSize())
            .attr("x", (d) => left + getNodeRenderOffset())
            .attr("y", (d, i) =>
              nodeCoordinate$2[l][i].y + getNodeRenderOffset());

          drawGradCAM(layerGroup, left);

          // Add bounding boxes
          nodeGroups
            .append("rect")
            .attr("class", "bounding")
            .attr("width", (d) => getNodeRenderSize())
            .attr("height", (d) => getNodeRenderSize())
            .attr("x", (d) => left + getNodeRenderOffset())
            .attr("y", (d, i) =>
              nodeCoordinate$2[l][i].y + getNodeRenderOffset())
            .style("fill", "none")
            .style("stroke", "gray")
            .style("stroke-width", 1)
            .classed("hidden", true);

        } else if (curLayer[0].layerName !== "output") {
          // Embed raster image in these groups
          nodeGroups
            .append("image")
            .attr("class", "node-image")
            .attr("width", (d) => getNodeRenderSize())
            .attr("height", (d) => getNodeRenderSize())
            .attr("x", (d) => left + getNodeRenderOffset())
            .attr("y", (d, i) =>
              nodeCoordinate$2[l][i].y + getNodeRenderOffset());

          // Add a rectangle to show the border
          nodeGroups
            .append("rect")
            .attr("class", "bounding")
            .attr("width", (d) => getNodeRenderSize())
            .attr("height", (d) => getNodeRenderSize())
            .attr("x", (d) => left + getNodeRenderOffset())
            .attr("y", (d, i) =>
              nodeCoordinate$2[l][i].y + getNodeRenderOffset())
            .style("fill", "none")
            .style("stroke", "gray")
            .style("stroke-width", 1)
            .classed("hidden", true);

        } else {
          nodeGroups
            .append("rect")
            .attr("class", "output-rect")
            .attr("x", left)
            .attr("y", (d, i) => nodeCoordinate$2[l][i].y + nodeLength$5 / 2 + 12)
            .attr("height", nodeLength$5 / 4)
            .attr("width", 0)
            .style("fill", "gray");

          nodeGroups
            .append("text")
            .attr("class", "output-text")
            .attr("x", left)
            .attr("y", (d, i) => nodeCoordinate$2[l][i].y + nodeLength$5 / 2)
            .style("dominant-baseline", "middle")
            .style("font-size", "12px")
            .style("fill", "black")
            .style("opacity", 1)
            .text((d, i) => classLists[i]);

          // Add annotation text to tell readers the exact output probability
          nodeGroups
            .append("text")
            .attr("class", "annotation-text")
            .attr("id", (d, i) => `output-prob-${i}`)
            .attr("x", left)
            .attr("y", (d, i) => nodeCoordinate$2[l][i].y + 8)
            .text((d, i) => {
              const classProb = d.output;
              const classStatistics = getACCTClassStatistics(model_name, i);

              ACCTdata.push({
                id: i,
                prob: classProb,
                ...classStatistics,
              });
              return `(${d3.format(".4f")(d.output)})`;
            });

          // ******************************************************************
          // 选出 prob 最大的那个
          ACCTselected = ACCTdata.reduce((a, b) => (a.prob > b.prob ? a : b));

          // 绘制 ACCT 可视化
          drawACCT(ACCTdata);
          // ******************************************************************
        }

        leftAccuumulatedSpace += nodeLength$5;
      }

      // Share the nodeCoordinate
      nodeCoordinateStore.set(nodeCoordinate$2);

      // Compute the scale of the output score width (mapping the the node
      // width to the max output score)
      let outputRectScale = d3
        .scaleLinear()
        .domain(cnnLayerRanges$2.output)
        .range([0, nodeLength$5]);

      // Draw the canvas
      for (let l = 0; l < cnn$2.length; l++) {
        let range = cnnLayerRanges$2[selectedScaleLevel$2][l];
        svg$3
          .select(`g#cnn-layer-group-${l}`)
          .selectAll("image.node-image")
          .each((d, i, g) => drawOutput(d, i, g, range));
      }

      svg$3
        .selectAll("g.node-output")
        .each((d, i, g) => drawOutputScore(d, i, g, outputRectScale));

      // Add layer label
      let layerNames = cnn$2.map((d) => {
        if (d[0].layerName === "output") {
          return {
            name: d[0].layerName,
            dimension: `(${d.length})`,
          };
        } else {
          return {
            name: d[0].layerName,
            dimension: `(${d[0].output.length},${d[0].output.length},${d.length})`,
          };
        }
      });

      let svgHeight =
        Number(d3.select("#cnn-svg").style("height").replace("px", "")) + 400;
      let scroll = new SmoothScroll('a[href*="#"]', { offset: -svgHeight });


      const names = layerNames.map(({ name, dimension }) => ({
        name: getDisplayName(name),
        dimension,
      }));

      let detailedLabels = svg$3
        .selectAll("g.layer-detailed-label")
        .data(names)
        .enter()
        .append("g")
        .attr("class", "layer-detailed-label")
        .attr("id", (d, i) => `layer-detailed-label-${i}`)
        .classed("hidden", !detailedMode$2)
        .attr("transform", (d, i) => {
          let x = nodeCoordinate$2[i][0].x + nodeLength$5 / 2;
          let y = (svgPaddings$3.top + vSpaceAroundGap$3) / 2 - 6;
          return `translate(${x}, ${y})`;
        })
        .style("cursor", (d) =>
          d.name.toLowerCase().includes("output") ? "default" : "help"
        )
        .on("click", (d) => {
          let target = "";
          const normalizedName = d.name.toLowerCase();
          if (normalizedName.includes("conv")) {
            target = "convolution";
          }
          if (normalizedName.includes("relu")) {
            target = "relu";
          }
          if (normalizedName.includes("pool")) {
            target = "pooling";
          }
          if (normalizedName.includes("input")) {
            target = "input";
          }

          // Scroll to a article element
          let anchor = document.querySelector(`#article-${target}`);
          scroll.animateScroll(anchor);
        });

      detailedLabels
        .append("text")
        .style("opacity", 1)
        .style("dominant-baseline", "hanging")
        .style("text-anchor", "middle")
        .each(function (d) {
          const textElement = d3.select(this).attr("transform", "translate(0,-11)");

          // 层名称
          textElement.append("tspan")
            .style("font-size", "12px")
            .style("font-weight", "600")
            .style("font-style", "normal")
            .style("fill", "black")
            .attr("x", 0)
            .attr("y", 2)
            .text(d.name);

          // 维度信息
          textElement.append("tspan")
            .style("font-size", "8px")
            .style("font-weight", "normal")
            .attr("x", 0)
            .attr("y", 29)
            .text(d.dimension);

          // 格式标签 [H,W,C] 或 (Number of categories)
          textElement.append("tspan")
            .style("font-size", "8px")
            .style("font-weight", "normal")
            .style("font-style", "italic")
            .attr("x", 0)
            .attr("y", 43)
            .text(() => {
              // Output层显示 (Number of categories)
              if (d.name.includes("output")) {
                return "(Number of categories)";
              }
              // 其他层显示 [H,W,C]
              return "[H,W,C]";
            });
        });

      let labels = svg$3
        .selectAll("g.layer-label")
        .data(names)
        .enter()
        .append("g")
        .attr("class", "layer-label")
        .attr("id", (d, i) => `layer-label-${i}`)
        .classed("hidden", detailedMode$2)
        .attr("transform", (d, i) => {
          let x = nodeCoordinate$2[i][0].x + nodeLength$5 / 2;
          let y = (svgPaddings$3.top + vSpaceAroundGap$3) / 2 + 5;
          return `translate(${x}, ${y})`;
        })
        .style("cursor", (d) => (d.name.includes("output") ? "default" : "help"))
        .on("click", (d) => {
          let target = "";
          if (d.name.includes("conv")) {
            target = "convolution";
          }
          if (d.name.includes("relu")) {
            target = "relu";
          }
          if (d.name.includes("pool")) {
            target = "pooling";
          }
          if (d.name.includes("input")) {
            target = "input";
          }

          // Scroll to a article element
          let anchor = document.querySelector(`#article-${target}`);
          scroll.animateScroll(anchor);
        });

      labels.append("title").text("Move to article section");

      labels
        .append("text")
        .style("dominant-baseline", "middle")
        .style("opacity", 1)
        .text((d) => {
          if (d.name.includes("conv")) {
            return "conv";
          }
          if (d.name.includes("relu")) {
            return "relu";
          }
          if (d.name.includes("max_pool")) {
            return "max_pool";
          }
          return d.name;
        });

      // Add edges between nodes
      let linkGen = d3
        .linkHorizontal()
        .x((d) => d.x)
        .y((d) => d.y);

      let linkData = getLinkData(nodeCoordinate$2, cnn$2);

      let edgeGroup = cnnGroup.append("g").attr("class", "edge-group");

      edgeGroup
        .selectAll("path.edge")
        .data(linkData)
        .enter()
        .append("path")
        .attr(
          "class",
          (d) =>
            `edge edge-${d.targetLayerIndex} edge-${d.targetLayerIndex}-${d.targetNodeIndex}`
        )
        .attr(
          "id",
          (d) =>
            `edge-${d.targetLayerIndex}-${d.targetNodeIndex}-${d.sourceNodeIndex}`
        )
        .attr("d", (d) => linkGen({ source: d.source, target: d.target }))
        .style("fill", "none")
        .style("stroke-width", edgeStrokeWidth)
        .style("opacity", edgeOpacity)
        .style("stroke", edgeInitColor);

      // Add input channel annotations
      let inputAnnotation = cnnGroup.append("g").attr("class", "input-annotation");

      // Keep the label directly below the fixed-position Grad-CAM glyph.
      inputAnnotation
        .append("text")
        .attr("x", nodeCoordinate$2[0][0].x + nodeLength$5 / 2)
        .attr("y", GRAD_CAM_Y + nodeLength$5 + 4)
        .attr("class", "annotation-text")
        .style("dominant-baseline", "hanging")
        .style("text-anchor", "middle")
        .style("fill", "#666")
        .style("font-size", "12px")
        .text("Grad CAM");

      // Red Channel label for first input node
      let redChannel = inputAnnotation
        .append("text")
        .attr("x", nodeCoordinate$2[0][0].x + nodeLength$5 / 2)
        .attr("y", nodeCoordinate$2[0][0].y + nodeLength$5 + 5)
        .attr("class", "annotation-text")
        .style("dominant-baseline", "hanging")
        .style("text-anchor", "middle");

      redChannel
        .append("tspan")
        .style("dominant-baseline", "hanging")
        .style("fill", "#C95E67")
        .text("Red");

      redChannel
        .append("tspan")
        .style("dominant-baseline", "hanging")
        .text(" Channel");

      // Green Channel label for second input node
      let greenChannel = inputAnnotation
        .append("text")
        .attr("x", nodeCoordinate$2[0][1].x + nodeLength$5 / 2)
        .attr("y", nodeCoordinate$2[0][1].y + nodeLength$5 + 5)
        .attr("class", "annotation-text")
        .style("dominant-baseline", "hanging")
        .style("text-anchor", "middle");

      greenChannel
        .append("tspan")
        .style("dominant-baseline", "hanging")
        .style("fill", "#3DB665")
        .text("Green");

      greenChannel
        .append("tspan")
        .style("dominant-baseline", "hanging")
        .text(" Channel");

      // Blue Channel label for third input node
      let blueChannel = inputAnnotation
        .append("text")
        .attr("x", nodeCoordinate$2[0][2].x + nodeLength$5 / 2)
        .attr("y", nodeCoordinate$2[0][2].y + nodeLength$5 + 5)
        .attr("class", "annotation-text")
        .style("dominant-baseline", "hanging")
        .style("text-anchor", "middle");

      blueChannel
        .append("tspan")
        .style("dominant-baseline", "hanging")
        .style("fill", "#3F7FBC")
        .text("Blue");

      blueChannel
        .append("tspan")
        .style("dominant-baseline", "hanging")
        .text(" Channel");
    };

    /**
     * Update canvas values when user changes input image
     */
    const updateCNN = () => {
      // Compute the scale of the output score width (mapping the the node
      // width to the max output score)
      let outputRectScale = d3
        .scaleLinear()
        .domain(cnnLayerRanges$2.output)
        .range([0, nodeLength$5]);

      // Rebind the cnn data to layer groups layer by layer
      for (let l = 0; l < cnn$2.length; l++) {
        let curLayer = cnn$2[l];
        let range = cnnLayerRanges$2[selectedScaleLevel$2][l];
        let layerGroup = svg$3.select(`g#cnn-layer-group-${l}`);

        let nodeGroups = layerGroup.selectAll("g.node-group").data(curLayer);

        const model_name = get_store_value(model_nameStore);

        if (l < cnn$2.length - 1) {
          if (curLayer[0].layerName === "input") {
            drawGradCAM(layerGroup, nodeCoordinate$2[l][0].x);
          }
          // Redraw the canvas and output node
          nodeGroups
            .transition("disappear")
            .duration(300)
            .ease(d3.easeCubicOut)
            .style("opacity", 0)
            .on("end", function () {
              d3.select(this)
                .select("image.node-image")
                .each((d, i, g) => drawOutput(d, i, g, range));
              d3.select(this)
                .transition("appear")
                .duration(700)
                .ease(d3.easeCubicIn)
                .style("opacity", 1);
            });
        } else {
          // Clear old ACCTdata
          ACCTdata = [];

          nodeGroups.each((d, i, g) => {
            drawOutputScore(d, i, g, outputRectScale);

            const classProb = d.output;
            const classStatistics = getACCTClassStatistics(model_name, i);

            // Regenerate ACCTdata with new probabilities
            ACCTdata.push({
              id: i,
              prob: classProb,
              ...classStatistics,
            });
          });

          // Select the class with highest probability
          ACCTselected = ACCTdata.reduce((a, b) => (a.prob > b.prob ? a : b));

          // Redraw ACCT visualization with new data
          drawACCT(ACCTdata);
        }
      }

    };

    /**
     * Update the ranges for current CNN layers
     */
    const updateCNNLayerRanges = () => {
      // Iterate through all nodes to find a output ranges for each layer
      let cnnLayerRangesLocal = [1];
      let curRange = undefined;

      // Also track the min/max of each layer (avoid computing during intermediate
      // layer)
      cnnLayerMinMax = [];

      for (let l = 0; l < cnn$2.length - 1; l++) {
        let curLayer = cnn$2[l];

        // Compute the min max
        let outputExtents = curLayer.map((l) => getExtent(l.output));
        let aggregatedExtent = outputExtents.reduce((acc, cur) => {
          return [Math.min(acc[0], cur[0]), Math.max(acc[1], cur[1])];
        });
        cnnLayerMinMax.push({ min: aggregatedExtent[0], max: aggregatedExtent[1] });

        // conv layer refreshes curRange counting
        if (curLayer[0].type === "conv" || curLayer[0].type === "fc") {
          aggregatedExtent = aggregatedExtent.map(Math.abs);
          // Plus 0.1 to offset the rounding error (avoid black color)
          curRange =
            2 * (0.1 + Math.round(Math.max(...aggregatedExtent) * 1000) / 1000);
        }

        if (curRange !== undefined) {
          cnnLayerRangesLocal.push(curRange);
        }
      }

      // Finally, add the output layer range
      cnnLayerRangesLocal.push(1);
      cnnLayerMinMax.push({ min: 0, max: 1 });

      // Support different levels of scales (1) lcoal, (2) component, (3) global
      let cnnLayerRangesComponent = [1];
      let numOfComponent = (numLayers - 2) / 5;
      for (let i = 0; i < numOfComponent; i++) {
        let curArray = cnnLayerRangesLocal.slice(1 + 5 * i, 1 + 5 * i + 5);
        let maxRange = Math.max(...curArray);
        for (let j = 0; j < 5; j++) {
          cnnLayerRangesComponent.push(maxRange);
        }
      }
      cnnLayerRangesComponent.push(1);

      let cnnLayerRangesGlobal = [1];
      let maxRange = Math.max(
        ...cnnLayerRangesLocal.slice(1, cnnLayerRangesLocal.length - 1)
      );
      for (let i = 0; i < numLayers - 2; i++) {
        cnnLayerRangesGlobal.push(maxRange);
      }
      cnnLayerRangesGlobal.push(1);

      // Update the ranges dictionary
      cnnLayerRanges$2.local = cnnLayerRangesLocal;
      cnnLayerRanges$2.module = cnnLayerRangesComponent;
      cnnLayerRanges$2.global = cnnLayerRangesGlobal;
      cnnLayerRanges$2.output = [0, d3.max(cnn$2[cnn$2.length - 1].map((d) => d.output))];

      cnnLayerRangesStore.set(cnnLayerRanges$2);
      cnnLayerMinMaxStore.set(cnnLayerMinMax);

      const featureExtents = cnnLayerMinMax.slice(1, -1);
      modelColorDomainStore.set({
        min: Math.min(...featureExtents.map(({ min }) => min)),
        max: Math.max(...featureExtents.map(({ max }) => max)),
        modelName: cnn$2.gradcam?.modelName || get_store_value(model_nameStore),
        imageName: get_store_value(selectedImageStore),
      });
    };

    function getThresholdComponents(d) {
      return getACCTThresholdComponents(d, { alpha, beta, gamma });
    }

    function getThreshold(d) {
      return getThresholdComponents(d).reduce(
        (sum, component) => sum + component.value,
        0,
      );
    }

    function getACCTDecision(d, threshold) {
      return Number.isFinite(threshold) ? (d.prob >= threshold ? "KEEP" : "DROP") : "UNKNOWN";
    }

    function drawACCT(data) {
      d3.select("#cnn-svg").selectAll(".acctcontain").remove();
      if (!ACCTselected || data.length === 0) return;
      const target = d3.select("#cnn-svg");
      const svgWidth = Number(target.style("width").replace("px", ""));
      const svgHeight = Number(target.style("height").replace("px", ""));
      const panelWidth = getACCTPanelWidth(svgWidth);
      const xPosition = svgWidth - panelWidth;
      const controls = document.querySelector('.slider-group');
      const controlsBottom = controls ? controls.offsetTop + controls.offsetHeight : 196;
      const titleX = controls ? controls.offsetLeft - xPosition : 16;
      const selectedOutput = nodeCoordinate$2?.[nodeCoordinate$2.length - 1]?.[ACCTselected.id];
      const maximumProbability = d3.max(data, (item) => item.prob) || 1;
      const outputRight = selectedOutput
        ? svgPaddings$3.left + selectedOutput.x + nodeLength$5 * ACCTselected.prob / maximumProbability
        : null;
      const threshold = getThreshold(ACCTselected);
      const decision = getACCTDecision(ACCTselected, threshold);
      const group = target.append("g").attr("class", "acctcontain")
        .attr("data-base-x", xPosition).attr("data-output-x", selectedOutput?.x ?? "")
        .attr("data-panel-width", panelWidth)
        .attr("transform", `translate(${xPosition},0)`)
        .attr("data-s-c", ACCTselected.S_c).attr("data-u-c", ACCTselected.U_c)
        .attr("data-b-c", ACCTselected.B_c).attr("data-alpha", alpha)
        .attr("data-beta", beta).attr("data-gamma", gamma)
        .attr("data-class-index", ACCTselected.id)
        .attr("data-sample-count", ACCTselected.sampleCount)
        .attr("data-acct-formula", "alpha*S_c + beta*U_c + gamma*B_c")
        .attr("data-acct-threshold", Number.isFinite(threshold) ? threshold : "")
        .attr("data-acct-decision", decision);
      drawACCTDecisionGraph(group, {
        width: panelWidth, height: svgHeight, data: ACCTselected, controlsBottom, titleX,
        weights: { alpha, beta, gamma },
        components: getThresholdComponents(ACCTselected), threshold, decision,
        origin: selectedOutput ? {
          x: outputRight - xPosition,
          y: selectedOutput.y + nodeLength$5 / 2 + 12 + nodeLength$5 / 8,
        } : null,
      });
    }

    function updateThresholds() {
      drawACCT(ACCTdata);
    }

    /* src\overview\Overview.svelte generated by Svelte v3.59.2 */

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[120] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[123] = list[i];
    	return child_ctx;
    }

    // (1945:65) 
    function create_if_block_9(ctx) {
    	let div;
    	let img;
    	let img_src_value;
    	let t0;
    	let span;

    	return {
    		c() {
    			div = element("div");
    			img = element("img");
    			t0 = space();
    			span = element("span");
    			span.textContent = "Custom Image";
    			if (!src_url_equal(img.src, img_src_value = /*customImageURL*/ ctx[14])) attr(img, "src", img_src_value);
    			attr(img, "alt", "Uploaded input");
    			attr(img, "class", "current-image-thumb svelte-1k3u2qb");
    			attr(span, "class", "current-image-name svelte-1k3u2qb");
    			attr(div, "class", "current-image-info svelte-1k3u2qb");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, img);
    			append(div, t0);
    			append(div, span);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*customImageURL*/ 16384 && !src_url_equal(img.src, img_src_value = /*customImageURL*/ ctx[14])) {
    				attr(img, "src", img_src_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (1940:10) {#if selectedImage && selectedImage !== 'custom'}
    function create_if_block_8(ctx) {
    	let div;
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let t0;
    	let span;
    	let t1_value = /*getImageDisplayName*/ ctx[34](/*selectedImage*/ ctx[9]) + "";
    	let t1;

    	return {
    		c() {
    			div = element("div");
    			img = element("img");
    			t0 = space();
    			span = element("span");
    			t1 = text(t1_value);
    			if (!src_url_equal(img.src, img_src_value = demoImageURL(/*$imagePreviewRootStore*/ ctx[22], /*selectedImage*/ ctx[9], /*$imageVersionStore*/ ctx[19]))) attr(img, "src", img_src_value);
    			attr(img, "alt", img_alt_value = /*getImageDisplayName*/ ctx[34](/*selectedImage*/ ctx[9]));
    			attr(img, "class", "current-image-thumb svelte-1k3u2qb");
    			attr(span, "class", "current-image-name svelte-1k3u2qb");
    			attr(div, "class", "current-image-info svelte-1k3u2qb");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, img);
    			append(div, t0);
    			append(div, span);
    			append(span, t1);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*$imagePreviewRootStore, selectedImage, $imageVersionStore*/ 4719104 && !src_url_equal(img.src, img_src_value = demoImageURL(/*$imagePreviewRootStore*/ ctx[22], /*selectedImage*/ ctx[9], /*$imageVersionStore*/ ctx[19]))) {
    				attr(img, "src", img_src_value);
    			}

    			if (dirty[0] & /*selectedImage*/ 512 && img_alt_value !== (img_alt_value = /*getImageDisplayName*/ ctx[34](/*selectedImage*/ ctx[9]))) {
    				attr(img, "alt", img_alt_value);
    			}

    			if (dirty[0] & /*selectedImage*/ 512 && t1_value !== (t1_value = /*getImageDisplayName*/ ctx[34](/*selectedImage*/ ctx[9]) + "")) set_data(t1, t1_value);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (1989:16) {#each $availableModelsStore as checkpoint (checkpoint.name)}
    function create_each_block_1$1(key_1, ctx) {
    	let option;
    	let t_value = /*checkpoint*/ ctx[123].label + "";
    	let t;
    	let option_value_value;

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*checkpoint*/ ctx[123].name;
    			option.value = option.__value;
    			this.first = option;
    		},
    		m(target, anchor) {
    			insert(target, option, anchor);
    			append(option, t);
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*$availableModelsStore*/ 16777216 && t_value !== (t_value = /*checkpoint*/ ctx[123].label + "")) set_data(t, t_value);

    			if (dirty[0] & /*$availableModelsStore*/ 16777216 && option_value_value !== (option_value_value = /*checkpoint*/ ctx[123].name)) {
    				option.__value = option_value_value;
    				option.value = option.__value;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(option);
    		}
    	};
    }

    // (2008:49) 
    function create_if_block_7(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			div.textContent = "Loading the selected trained model and its data…";
    			attr(div, "class", "model-status svelte-1k3u2qb");
    			attr(div, "role", "status");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (2006:4) {#if $runErrorStore}
    function create_if_block_6(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			div.textContent = "The selected model could not be loaded. Choose another configuration or checkpoint to retry.";
    			attr(div, "class", "model-status svelte-1k3u2qb");
    			attr(div, "role", "alert");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (2017:6) {#each weightControls as control (control.name)}
    function create_each_block$2(key_1, ctx) {
    	let div1;
    	let div0;
    	let t0_value = /*control*/ ctx[120].symbol + "";
    	let t0;
    	let t1;
    	let label;
    	let span0;
    	let t2_value = /*control*/ ctx[120].range.min + "";
    	let t2;
    	let t3;
    	let input;
    	let input_min_value;
    	let input_max_value;
    	let input_step_value;
    	let input_value_value;
    	let input_aria_label_value;
    	let input_disabled_value;
    	let t4;
    	let span1;
    	let t5_value = /*control*/ ctx[120].range.max + "";
    	let t5;
    	let t6;
    	let span2;
    	let t7_value = Number(/*control*/ ctx[120].value).toFixed(2) + "";
    	let t7;
    	let t8;
    	let mounted;
    	let dispose;

    	function input_handler(...args) {
    		return /*input_handler*/ ctx[49](/*control*/ ctx[120], ...args);
    	}

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			div1 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			label = element("label");
    			span0 = element("span");
    			t2 = text(t2_value);
    			t3 = space();
    			input = element("input");
    			t4 = space();
    			span1 = element("span");
    			t5 = text(t5_value);
    			t6 = space();
    			span2 = element("span");
    			t7 = text(t7_value);
    			t8 = space();
    			attr(div0, "class", "slider-name svelte-1k3u2qb");
    			attr(span0, "class", "slider-min svelte-1k3u2qb");
    			attr(input, "type", "range");
    			attr(input, "min", input_min_value = /*control*/ ctx[120].range.min);
    			attr(input, "max", input_max_value = /*control*/ ctx[120].range.max);
    			attr(input, "step", input_step_value = /*control*/ ctx[120].range.step);
    			input.value = input_value_value = /*control*/ ctx[120].value;
    			attr(input, "aria-label", input_aria_label_value = "ACCT " + /*control*/ ctx[120].name + " weight");
    			input.disabled = input_disabled_value = /*isModelLoading*/ ctx[0] || /*$runLoadingStore*/ ctx[20] || !!/*$runErrorStore*/ ctx[21] || /*disableControl*/ ctx[1];
    			attr(input, "class", "small-slider svelte-1k3u2qb");
    			attr(span1, "class", "slider-max svelte-1k3u2qb");
    			attr(label, "class", "slider-label-range svelte-1k3u2qb");
    			attr(span2, "class", "slider-value-display svelte-1k3u2qb");
    			attr(div1, "class", "slider-control svelte-1k3u2qb");
    			set_style(div1, "--fill-percent", /*control*/ ctx[120].percent);
    			this.first = div1;
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, div0);
    			append(div0, t0);
    			append(div1, t1);
    			append(div1, label);
    			append(label, span0);
    			append(span0, t2);
    			append(label, t3);
    			append(label, input);
    			append(label, t4);
    			append(label, span1);
    			append(span1, t5);
    			append(div1, t6);
    			append(div1, span2);
    			append(span2, t7);
    			append(div1, t8);

    			if (!mounted) {
    				dispose = listen(input, "input", input_handler);
    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*weightControls*/ 262144 && t0_value !== (t0_value = /*control*/ ctx[120].symbol + "")) set_data(t0, t0_value);
    			if (dirty[0] & /*weightControls*/ 262144 && t2_value !== (t2_value = /*control*/ ctx[120].range.min + "")) set_data(t2, t2_value);

    			if (dirty[0] & /*weightControls*/ 262144 && input_min_value !== (input_min_value = /*control*/ ctx[120].range.min)) {
    				attr(input, "min", input_min_value);
    			}

    			if (dirty[0] & /*weightControls*/ 262144 && input_max_value !== (input_max_value = /*control*/ ctx[120].range.max)) {
    				attr(input, "max", input_max_value);
    			}

    			if (dirty[0] & /*weightControls*/ 262144 && input_step_value !== (input_step_value = /*control*/ ctx[120].range.step)) {
    				attr(input, "step", input_step_value);
    			}

    			if (dirty[0] & /*weightControls*/ 262144 && input_value_value !== (input_value_value = /*control*/ ctx[120].value)) {
    				input.value = input_value_value;
    			}

    			if (dirty[0] & /*weightControls*/ 262144 && input_aria_label_value !== (input_aria_label_value = "ACCT " + /*control*/ ctx[120].name + " weight")) {
    				attr(input, "aria-label", input_aria_label_value);
    			}

    			if (dirty[0] & /*isModelLoading, $runLoadingStore, $runErrorStore, disableControl*/ 3145731 && input_disabled_value !== (input_disabled_value = /*isModelLoading*/ ctx[0] || /*$runLoadingStore*/ ctx[20] || !!/*$runErrorStore*/ ctx[21] || /*disableControl*/ ctx[1])) {
    				input.disabled = input_disabled_value;
    			}

    			if (dirty[0] & /*weightControls*/ 262144 && t5_value !== (t5_value = /*control*/ ctx[120].range.max + "")) set_data(t5, t5_value);
    			if (dirty[0] & /*weightControls*/ 262144 && t7_value !== (t7_value = Number(/*control*/ ctx[120].value).toFixed(2) + "")) set_data(t7, t7_value);

    			if (dirty[0] & /*weightControls*/ 262144) {
    				set_style(div1, "--fill-percent", /*control*/ ctx[120].percent);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div1);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (2069:41) 
    function create_if_block_5(ctx) {
    	let softmaxview;
    	let current;

    	softmaxview = new Softmaxview({
    			props: {
    				logits: /*softmaxDetailViewInfo*/ ctx[7].logits,
    				logitColors: /*softmaxDetailViewInfo*/ ctx[7].logitColors,
    				selectedI: /*softmaxDetailViewInfo*/ ctx[7].selectedI,
    				highlightI: /*softmaxDetailViewInfo*/ ctx[7].highlightI,
    				outputName: /*softmaxDetailViewInfo*/ ctx[7].outputName,
    				outputValue: /*softmaxDetailViewInfo*/ ctx[7].outputValue,
    				startAnimation: /*softmaxDetailViewInfo*/ ctx[7].startAnimation
    			}
    		});

    	softmaxview.$on("xClicked", /*handleExitFromDetiledSoftmaxView*/ ctx[41]);
    	softmaxview.$on("mouseOver", softmaxDetailViewMouseOverHandler);
    	softmaxview.$on("mouseLeave", softmaxDetailViewMouseLeaveHandler);

    	return {
    		c() {
    			create_component(softmaxview.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(softmaxview, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const softmaxview_changes = {};
    			if (dirty[0] & /*softmaxDetailViewInfo*/ 128) softmaxview_changes.logits = /*softmaxDetailViewInfo*/ ctx[7].logits;
    			if (dirty[0] & /*softmaxDetailViewInfo*/ 128) softmaxview_changes.logitColors = /*softmaxDetailViewInfo*/ ctx[7].logitColors;
    			if (dirty[0] & /*softmaxDetailViewInfo*/ 128) softmaxview_changes.selectedI = /*softmaxDetailViewInfo*/ ctx[7].selectedI;
    			if (dirty[0] & /*softmaxDetailViewInfo*/ 128) softmaxview_changes.highlightI = /*softmaxDetailViewInfo*/ ctx[7].highlightI;
    			if (dirty[0] & /*softmaxDetailViewInfo*/ 128) softmaxview_changes.outputName = /*softmaxDetailViewInfo*/ ctx[7].outputName;
    			if (dirty[0] & /*softmaxDetailViewInfo*/ 128) softmaxview_changes.outputValue = /*softmaxDetailViewInfo*/ ctx[7].outputValue;
    			if (dirty[0] & /*softmaxDetailViewInfo*/ 128) softmaxview_changes.startAnimation = /*softmaxDetailViewInfo*/ ctx[7].startAnimation;
    			softmaxview.$set(softmaxview_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(softmaxview.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(softmaxview.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(softmaxview, detaching);
    		}
    	};
    }

    // (2064:69) 
    function create_if_block_4$2(ctx) {
    	let poolview;
    	let current;

    	poolview = new Poolview({
    			props: {
    				input: /*nodeData*/ ctx[10][0].input,
    				kernelLength: 2,
    				dataRange: /*nodeData*/ ctx[10].colorRange,
    				isExited: /*isExitedFromDetailedView*/ ctx[12]
    			}
    		});

    	poolview.$on("message", /*handleExitFromDetiledPoolView*/ ctx[38]);

    	return {
    		c() {
    			create_component(poolview.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(poolview, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const poolview_changes = {};
    			if (dirty[0] & /*nodeData*/ 1024) poolview_changes.input = /*nodeData*/ ctx[10][0].input;
    			if (dirty[0] & /*nodeData*/ 1024) poolview_changes.dataRange = /*nodeData*/ ctx[10].colorRange;
    			if (dirty[0] & /*isExitedFromDetailedView*/ 4096) poolview_changes.isExited = /*isExitedFromDetailedView*/ ctx[12];
    			poolview.$set(poolview_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(poolview.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(poolview.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(poolview, detaching);
    		}
    	};
    }

    // (2053:69) 
    function create_if_block_3$2(ctx) {
    	let normalizationview;
    	let current;

    	normalizationview = new Normalizationview({
    			props: {
    				input: /*nodeData*/ ctx[10][0].input,
    				output: /*nodeData*/ ctx[10][0].output,
    				dataRange: /*nodeData*/ ctx[10].colorRange,
    				mean: /*nodeData*/ ctx[10].mean,
    				variance: /*nodeData*/ ctx[10].variance,
    				gamma: /*nodeData*/ ctx[10].gamma,
    				beta: /*nodeData*/ ctx[10].beta,
    				epsilon: /*nodeData*/ ctx[10].epsilon,
    				isExited: /*isExitedFromDetailedView*/ ctx[12]
    			}
    		});

    	normalizationview.$on("message", /*handleExitFromDetiledNormalizationView*/ ctx[40]);

    	return {
    		c() {
    			create_component(normalizationview.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(normalizationview, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const normalizationview_changes = {};
    			if (dirty[0] & /*nodeData*/ 1024) normalizationview_changes.input = /*nodeData*/ ctx[10][0].input;
    			if (dirty[0] & /*nodeData*/ 1024) normalizationview_changes.output = /*nodeData*/ ctx[10][0].output;
    			if (dirty[0] & /*nodeData*/ 1024) normalizationview_changes.dataRange = /*nodeData*/ ctx[10].colorRange;
    			if (dirty[0] & /*nodeData*/ 1024) normalizationview_changes.mean = /*nodeData*/ ctx[10].mean;
    			if (dirty[0] & /*nodeData*/ 1024) normalizationview_changes.variance = /*nodeData*/ ctx[10].variance;
    			if (dirty[0] & /*nodeData*/ 1024) normalizationview_changes.gamma = /*nodeData*/ ctx[10].gamma;
    			if (dirty[0] & /*nodeData*/ 1024) normalizationview_changes.beta = /*nodeData*/ ctx[10].beta;
    			if (dirty[0] & /*nodeData*/ 1024) normalizationview_changes.epsilon = /*nodeData*/ ctx[10].epsilon;
    			if (dirty[0] & /*isExitedFromDetailedView*/ 4096) normalizationview_changes.isExited = /*isExitedFromDetailedView*/ ctx[12];
    			normalizationview.$set(normalizationview_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(normalizationview.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(normalizationview.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(normalizationview, detaching);
    		}
    	};
    }

    // (2047:69) 
    function create_if_block_2$2(ctx) {
    	let activationview;
    	let current;

    	activationview = new Activationview({
    			props: {
    				input: /*nodeData*/ ctx[10][0].input,
    				output: /*nodeData*/ ctx[10][0].output,
    				dataRange: /*nodeData*/ ctx[10].colorRange,
    				isExited: /*isExitedFromDetailedView*/ ctx[12]
    			}
    		});

    	activationview.$on("message", /*handleExitFromDetiledActivationView*/ ctx[39]);

    	return {
    		c() {
    			create_component(activationview.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(activationview, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const activationview_changes = {};
    			if (dirty[0] & /*nodeData*/ 1024) activationview_changes.input = /*nodeData*/ ctx[10][0].input;
    			if (dirty[0] & /*nodeData*/ 1024) activationview_changes.output = /*nodeData*/ ctx[10][0].output;
    			if (dirty[0] & /*nodeData*/ 1024) activationview_changes.dataRange = /*nodeData*/ ctx[10].colorRange;
    			if (dirty[0] & /*isExitedFromDetailedView*/ 4096) activationview_changes.isExited = /*isExitedFromDetailedView*/ ctx[12];
    			activationview.$set(activationview_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(activationview.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(activationview.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(activationview, detaching);
    		}
    	};
    }

    // (2036:4) {#if selectedNode.data && selectedNode.data.type === 'conv' && selectedNodeIndex != -1}
    function create_if_block_1$2(ctx) {
    	let convolutionview;
    	let current;

    	convolutionview = new Convolutionview({
    			props: {
    				input: /*nodeData*/ ctx[10][/*selectedNodeIndex*/ ctx[11]].input,
    				kernel: /*nodeData*/ ctx[10][/*selectedNodeIndex*/ ctx[11]].kernel,
    				kernelMinMax: /*nodeData*/ ctx[10].kernelMinMax,
    				kernelColorRange: /*nodeData*/ ctx[10].kernelRange,
    				inputChannelIndex: /*selectedNodeIndex*/ ctx[11],
    				dataRange: /*nodeData*/ ctx[10].colorRange,
    				colorScale: /*nodeData*/ ctx[10].inputIsInputLayer
    				? /*layerColorScales*/ ctx[27].input[0]
    				: /*layerColorScales*/ ctx[27].conv,
    				isInputInputLayer: /*nodeData*/ ctx[10].inputIsInputLayer,
    				isExited: /*isExitedFromCollapse*/ ctx[13]
    			}
    		});

    	convolutionview.$on("message", /*handleExitFromDetiledConvView*/ ctx[37]);

    	return {
    		c() {
    			create_component(convolutionview.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(convolutionview, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const convolutionview_changes = {};
    			if (dirty[0] & /*nodeData, selectedNodeIndex*/ 3072) convolutionview_changes.input = /*nodeData*/ ctx[10][/*selectedNodeIndex*/ ctx[11]].input;
    			if (dirty[0] & /*nodeData, selectedNodeIndex*/ 3072) convolutionview_changes.kernel = /*nodeData*/ ctx[10][/*selectedNodeIndex*/ ctx[11]].kernel;
    			if (dirty[0] & /*nodeData*/ 1024) convolutionview_changes.kernelMinMax = /*nodeData*/ ctx[10].kernelMinMax;
    			if (dirty[0] & /*nodeData*/ 1024) convolutionview_changes.kernelColorRange = /*nodeData*/ ctx[10].kernelRange;
    			if (dirty[0] & /*selectedNodeIndex*/ 2048) convolutionview_changes.inputChannelIndex = /*selectedNodeIndex*/ ctx[11];
    			if (dirty[0] & /*nodeData*/ 1024) convolutionview_changes.dataRange = /*nodeData*/ ctx[10].colorRange;

    			if (dirty[0] & /*nodeData*/ 1024) convolutionview_changes.colorScale = /*nodeData*/ ctx[10].inputIsInputLayer
    			? /*layerColorScales*/ ctx[27].input[0]
    			: /*layerColorScales*/ ctx[27].conv;

    			if (dirty[0] & /*nodeData*/ 1024) convolutionview_changes.isInputInputLayer = /*nodeData*/ ctx[10].inputIsInputLayer;
    			if (dirty[0] & /*isExitedFromCollapse*/ 8192) convolutionview_changes.isExited = /*isExitedFromCollapse*/ ctx[13];
    			convolutionview.$set(convolutionview_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(convolutionview.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(convolutionview.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(convolutionview, detaching);
    		}
    	};
    }

    // (2082:2) {#if showLossPopup}
    function create_if_block$7(ctx) {
    	let losspopup;
    	let current;
    	losspopup = new LossPopup({});
    	losspopup.$on("close", /*close_handler*/ ctx[50]);

    	return {
    		c() {
    			create_component(losspopup.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(losspopup, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(losspopup.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(losspopup.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(losspopup, detaching);
    		}
    	};
    }

    function create_fragment$k(ctx) {
    	let div17;
    	let div13;
    	let div12;
    	let div2;
    	let div0;
    	let button0;
    	let span0;
    	let t0;
    	let span1;
    	let button0_disabled_value;
    	let t2;
    	let button1;
    	let span2;
    	let t3;
    	let span3;
    	let button1_disabled_value;
    	let t5;
    	let div1;
    	let t6;
    	let div3;
    	let t10;
    	let div11;
    	let div6;
    	let span5;
    	let t12;
    	let div5;
    	let span6;
    	let t13_value = formatColorValue(/*$modelColorDomainStore*/ ctx[23] && /*$modelColorDomainStore*/ ctx[23].min) + "";
    	let t13;
    	let t14;
    	let div4;
    	let t15;
    	let span7;
    	let t16_value = formatColorValue(/*$modelColorDomainStore*/ ctx[23] && /*$modelColorDomainStore*/ ctx[23].max) + "";
    	let t16;
    	let div6_data_model_name_value;
    	let div6_data_color_min_value;
    	let div6_data_color_max_value;
    	let div6_title_value;
    	let t17;
    	let div10;
    	let div7;
    	let t19;
    	let div9;
    	let span8;
    	let t20;
    	let div8;
    	let select;
    	let each_blocks_1 = [];
    	let each0_lookup = new Map();
    	let select_disabled_value;
    	let t21;
    	let button2;
    	let t22;
    	let t23;
    	let div15;
    	let t24;
    	let svg_1;
    	let t25;
    	let div14;
    	let button3;
    	let t26;
    	let button3_disabled_value;
    	let t27;
    	let each_blocks = [];
    	let each1_lookup = new Map();
    	let div15_aria_busy_value;
    	let t28;
    	let div16;
    	let current_block_type_index;
    	let if_block2;
    	let t29;
    	let t30;
    	let plot;
    	let t31;
    	let modal;
    	let t32;
    	let imageselector;
    	let updating_show;
    	let t33;
    	let imageuploader;
    	let updating_show_1;
    	let current;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*selectedImage*/ ctx[9] && /*selectedImage*/ ctx[9] !== 'custom') return create_if_block_8;
    		if (/*selectedImage*/ ctx[9] === 'custom' && /*customImageURL*/ ctx[14]) return create_if_block_9;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type && current_block_type(ctx);
    	let each_value_1 = /*$availableModelsStore*/ ctx[24];
    	const get_key = ctx => /*checkpoint*/ ctx[123].name;

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1$1(ctx, each_value_1, i);
    		let key = get_key(child_ctx);
    		each0_lookup.set(key, each_blocks_1[i] = create_each_block_1$1(key, child_ctx));
    	}

    	function select_block_type_1(ctx, dirty) {
    		if (/*$runErrorStore*/ ctx[21]) return create_if_block_6;
    		if (/*isModelLoading*/ ctx[0] || /*$runLoadingStore*/ ctx[20]) return create_if_block_7;
    	}

    	let current_block_type_1 = select_block_type_1(ctx);
    	let if_block1 = current_block_type_1 && current_block_type_1(ctx);
    	let each_value = /*weightControls*/ ctx[18];
    	const get_key_1 = ctx => /*control*/ ctx[120].name;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$2(ctx, each_value, i);
    		let key = get_key_1(child_ctx);
    		each1_lookup.set(key, each_blocks[i] = create_each_block$2(key, child_ctx));
    	}

    	const if_block_creators = [
    		create_if_block_1$2,
    		create_if_block_2$2,
    		create_if_block_3$2,
    		create_if_block_4$2,
    		create_if_block_5
    	];

    	const if_blocks = [];

    	function select_block_type_2(ctx, dirty) {
    		if (/*selectedNode*/ ctx[8].data && /*selectedNode*/ ctx[8].data.type === 'conv' && /*selectedNodeIndex*/ ctx[11] != -1) return 0;
    		if (/*selectedNode*/ ctx[8].data && /*selectedNode*/ ctx[8].data.type === 'relu') return 1;
    		if (/*selectedNode*/ ctx[8].data && /*selectedNode*/ ctx[8].data.type === 'norm') return 2;
    		if (/*selectedNode*/ ctx[8].data && /*selectedNode*/ ctx[8].data.type === 'pool') return 3;
    		if (/*softmaxDetailViewInfo*/ ctx[7].show) return 4;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type_2(ctx))) {
    		if_block2 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	let if_block3 = /*showLossPopup*/ ctx[6] && create_if_block$7(ctx);
    	plot = new Plot({});
    	modal = new Modal({});
    	modal.$on("xClicked", /*handleModalCanceled*/ ctx[35]);
    	modal.$on("urlTyped", /*handleCustomImage*/ ctx[36]);

    	function imageselector_show_binding(value) {
    		/*imageselector_show_binding*/ ctx[52](value);
    	}

    	let imageselector_props = {
    		imageOptions: /*imageOptions*/ ctx[17],
    		imageRoot: /*$imagePreviewRootStore*/ ctx[22],
    		imageVersion: /*$imageVersionStore*/ ctx[19],
    		selectedImage: /*selectedImage*/ ctx[9]
    	};

    	if (/*showImageSelectionModal*/ ctx[15] !== void 0) {
    		imageselector_props.show = /*showImageSelectionModal*/ ctx[15];
    	}

    	imageselector = new ImageSelector({ props: imageselector_props });
    	binding_callbacks.push(() => bind(imageselector, 'show', imageselector_show_binding));
    	imageselector.$on("imageSelected", /*handleImageSelection*/ ctx[31]);
    	imageselector.$on("canceled", /*handleImageSelectionCanceled*/ ctx[32]);

    	function imageuploader_show_binding(value) {
    		/*imageuploader_show_binding*/ ctx[53](value);
    	}

    	let imageuploader_props = {};

    	if (/*showUploadModal*/ ctx[16] !== void 0) {
    		imageuploader_props.show = /*showUploadModal*/ ctx[16];
    	}

    	imageuploader = new ImageUploader({ props: imageuploader_props });
    	binding_callbacks.push(() => bind(imageuploader, 'show', imageuploader_show_binding));
    	imageuploader.$on("imageUploaded", /*handleCustomImage*/ ctx[36]);
    	imageuploader.$on("canceled", /*handleUploadModalCanceled*/ ctx[33]);

    	return {
    		c() {
    			div17 = element("div");
    			div13 = element("div");
    			div12 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			button0 = element("button");
    			span0 = element("span");
    			span0.innerHTML = `<i class="fas fa-images"></i>`;
    			t0 = space();
    			span1 = element("span");
    			span1.textContent = "Select Image";
    			t2 = space();
    			button1 = element("button");
    			span2 = element("span");
    			span2.innerHTML = `<i class="fas fa-upload"></i>`;
    			t3 = space();
    			span3 = element("span");
    			span3.textContent = "Upload Image";
    			t5 = space();
    			div1 = element("div");
    			if (if_block0) if_block0.c();
    			t6 = space();
    			div3 = element("div");

    			div3.innerHTML = `<span class="header-dimension-note svelte-1k3u2qb">Note: H, W, and C represent Height, Width, and Channel, respectively.</span> 
        <h1 class="overview-title svelte-1k3u2qb">WideResNet Model Analysis</h1>`;

    			t10 = space();
    			div11 = element("div");
    			div6 = element("div");
    			span5 = element("span");
    			span5.textContent = "Feature Value";
    			t12 = space();
    			div5 = element("div");
    			span6 = element("span");
    			t13 = text(t13_value);
    			t14 = space();
    			div4 = element("div");
    			t15 = space();
    			span7 = element("span");
    			t16 = text(t16_value);
    			t17 = space();
    			div10 = element("div");
    			div7 = element("div");
    			div7.innerHTML = `<label class="label is-small svelte-1k3u2qb" for="epoch-select">Select Training Epoch</label>`;
    			t19 = space();
    			div9 = element("div");
    			span8 = element("span");
    			span8.innerHTML = `<i class="fas fa-clock"></i>`;
    			t20 = space();
    			div8 = element("div");
    			select = element("select");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t21 = space();
    			button2 = element("button");
    			t22 = text("Loss");
    			t23 = space();
    			div15 = element("div");
    			if (if_block1) if_block1.c();
    			t24 = space();
    			svg_1 = svg_element("svg");
    			t25 = space();
    			div14 = element("div");
    			button3 = element("button");
    			t26 = text("Reset");
    			t27 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t28 = space();
    			div16 = element("div");
    			if (if_block2) if_block2.c();
    			t29 = space();
    			if (if_block3) if_block3.c();
    			t30 = space();
    			create_component(plot.$$.fragment);
    			t31 = space();
    			create_component(modal.$$.fragment);
    			t32 = space();
    			create_component(imageselector.$$.fragment);
    			t33 = space();
    			create_component(imageuploader.$$.fragment);
    			attr(span0, "class", "icon");
    			attr(button0, "class", "button is-small is-primary svelte-1k3u2qb");
    			button0.disabled = button0_disabled_value = /*disableControl*/ ctx[1] || /*isModelLoading*/ ctx[0] || /*$runLoadingStore*/ ctx[20] || !!/*$runErrorStore*/ ctx[21];
    			attr(span2, "class", "icon");
    			attr(button1, "class", "button is-small is-info svelte-1k3u2qb");
    			button1.disabled = button1_disabled_value = /*disableControl*/ ctx[1] || /*isModelLoading*/ ctx[0] || /*$runLoadingStore*/ ctx[20] || !!/*$runErrorStore*/ ctx[21];
    			attr(div0, "class", "image-selection-buttons svelte-1k3u2qb");
    			attr(div1, "class", "current-image-display svelte-1k3u2qb");
    			toggle_class(div1, "hidden", !/*selectedImage*/ ctx[9]);
    			attr(div2, "class", "header-left-controls svelte-1k3u2qb");
    			attr(div3, "class", "overview-title-cluster svelte-1k3u2qb");
    			attr(span5, "class", "model-color-legend-title svelte-1k3u2qb");
    			attr(span6, "class", "model-scale-min");
    			attr(div4, "class", "model-color-bar svelte-1k3u2qb");
    			set_style(div4, "background", /*featureColorGradient*/ ctx[28]);
    			attr(span7, "class", "model-scale-max");
    			attr(div5, "class", "model-color-legend-scale svelte-1k3u2qb");
    			attr(div6, "class", "model-color-legend svelte-1k3u2qb");
    			attr(div6, "role", "img");
    			attr(div6, "aria-label", "Feature value color scale for the current checkpoint");

    			attr(div6, "data-model-name", div6_data_model_name_value = /*$modelColorDomainStore*/ ctx[23]
    			? /*$modelColorDomainStore*/ ctx[23].modelName
    			: '');

    			attr(div6, "data-color-min", div6_data_color_min_value = /*$modelColorDomainStore*/ ctx[23]
    			? /*$modelColorDomainStore*/ ctx[23].min
    			: '');

    			attr(div6, "data-color-max", div6_data_color_max_value = /*$modelColorDomainStore*/ ctx[23]
    			? /*$modelColorDomainStore*/ ctx[23].max
    			: '');

    			attr(div6, "title", div6_title_value = /*$modelColorDomainStore*/ ctx[23]
    			? `Current checkpoint feature maps: ${formatColorValue(/*$modelColorDomainStore*/ ctx[23].min)} to ${formatColorValue(/*$modelColorDomainStore*/ ctx[23].max)}`
    			: 'Loading current checkpoint feature maps');

    			attr(div7, "class", "control svelte-1k3u2qb");
    			attr(span8, "class", "icon is-left svelte-1k3u2qb");
    			attr(select, "id", "epoch-select");
    			select.disabled = select_disabled_value = /*disableControl*/ ctx[1] || /*isModelLoading*/ ctx[0] || /*$runLoadingStore*/ ctx[20];
    			attr(select, "class", "svelte-1k3u2qb");
    			if (/*$model_nameStore*/ ctx[2] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[47].call(select));
    			attr(div8, "class", "select svelte-1k3u2qb");
    			attr(div9, "class", "control is-very-small has-icons-left svelte-1k3u2qb");
    			attr(div10, "class", "field is-grouped is-grouped-centered svelte-1k3u2qb");
    			attr(button2, "type", "button");
    			attr(button2, "class", "loss-button svelte-1k3u2qb");
    			attr(button2, "aria-haspopup", "dialog");
    			attr(button2, "aria-expanded", /*showLossPopup*/ ctx[6]);
    			attr(div11, "class", "header-right-controls svelte-1k3u2qb");
    			attr(div12, "class", "header-controls-row svelte-1k3u2qb");
    			attr(div13, "class", "overview-header svelte-1k3u2qb");
    			attr(svg_1, "id", "cnn-svg");
    			attr(svg_1, "class", "svelte-1k3u2qb");
    			attr(button3, "type", "button");
    			attr(button3, "class", "acct-reset svelte-1k3u2qb");
    			button3.disabled = button3_disabled_value = /*isModelLoading*/ ctx[0] || /*$runLoadingStore*/ ctx[20] || !!/*$runErrorStore*/ ctx[21] || /*disableControl*/ ctx[1];
    			attr(div14, "class", "slider-group svelte-1k3u2qb");
    			attr(div15, "class", "cnn svelte-1k3u2qb");
    			attr(div15, "aria-busy", div15_aria_busy_value = /*isModelLoading*/ ctx[0] || /*$runLoadingStore*/ ctx[20]);
    			attr(div15, "data-loaded-model", /*loadedModelKey*/ ctx[5]);
    			attr(div15, "data-selected-run", /*$trainingDataPathStore*/ ctx[3]);
    			toggle_class(div15, "model-loading", /*isModelLoading*/ ctx[0] || /*$runLoadingStore*/ ctx[20]);
    			toggle_class(div15, "model-error", !!/*$runErrorStore*/ ctx[21]);
    			attr(div16, "id", "detailview");
    			attr(div16, "class", "svelte-1k3u2qb");
    			attr(div17, "class", "overview svelte-1k3u2qb");
    		},
    		m(target, anchor) {
    			insert(target, div17, anchor);
    			append(div17, div13);
    			append(div13, div12);
    			append(div12, div2);
    			append(div2, div0);
    			append(div0, button0);
    			append(button0, span0);
    			append(button0, t0);
    			append(button0, span1);
    			append(div0, t2);
    			append(div0, button1);
    			append(button1, span2);
    			append(button1, t3);
    			append(button1, span3);
    			append(div2, t5);
    			append(div2, div1);
    			if (if_block0) if_block0.m(div1, null);
    			append(div12, t6);
    			append(div12, div3);
    			append(div12, t10);
    			append(div12, div11);
    			append(div11, div6);
    			append(div6, span5);
    			append(div6, t12);
    			append(div6, div5);
    			append(div5, span6);
    			append(span6, t13);
    			append(div5, t14);
    			append(div5, div4);
    			append(div5, t15);
    			append(div5, span7);
    			append(span7, t16);
    			append(div11, t17);
    			append(div11, div10);
    			append(div10, div7);
    			append(div10, t19);
    			append(div10, div9);
    			append(div9, span8);
    			append(div9, t20);
    			append(div9, div8);
    			append(div8, select);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				if (each_blocks_1[i]) {
    					each_blocks_1[i].m(select, null);
    				}
    			}

    			select_option(select, /*$model_nameStore*/ ctx[2], true);
    			append(div11, t21);
    			append(div11, button2);
    			append(button2, t22);
    			append(div17, t23);
    			append(div17, div15);
    			if (if_block1) if_block1.m(div15, null);
    			append(div15, t24);
    			append(div15, svg_1);
    			append(div15, t25);
    			append(div15, div14);
    			append(div14, button3);
    			append(button3, t26);
    			append(div14, t27);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div14, null);
    				}
    			}

    			append(div17, t28);
    			append(div17, div16);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(div16, null);
    			}

    			append(div17, t29);
    			if (if_block3) if_block3.m(div17, null);
    			/*div17_binding*/ ctx[51](div17);
    			insert(target, t30, anchor);
    			mount_component(plot, target, anchor);
    			insert(target, t31, anchor);
    			mount_component(modal, target, anchor);
    			insert(target, t32, anchor);
    			mount_component(imageselector, target, anchor);
    			insert(target, t33, anchor);
    			mount_component(imageuploader, target, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(button0, "click", /*selectExistingImageClicked*/ ctx[29]),
    					listen(button1, "click", /*uploadNewImageClicked*/ ctx[30]),
    					listen(select, "change", /*select_change_handler*/ ctx[47]),
    					listen(button2, "click", /*click_handler*/ ctx[48]),
    					listen(button3, "click", /*resetACCTWeights*/ ctx[26])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (!current || dirty[0] & /*disableControl, isModelLoading, $runLoadingStore, $runErrorStore*/ 3145731 && button0_disabled_value !== (button0_disabled_value = /*disableControl*/ ctx[1] || /*isModelLoading*/ ctx[0] || /*$runLoadingStore*/ ctx[20] || !!/*$runErrorStore*/ ctx[21])) {
    				button0.disabled = button0_disabled_value;
    			}

    			if (!current || dirty[0] & /*disableControl, isModelLoading, $runLoadingStore, $runErrorStore*/ 3145731 && button1_disabled_value !== (button1_disabled_value = /*disableControl*/ ctx[1] || /*isModelLoading*/ ctx[0] || /*$runLoadingStore*/ ctx[20] || !!/*$runErrorStore*/ ctx[21])) {
    				button1.disabled = button1_disabled_value;
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if (if_block0) if_block0.d(1);
    				if_block0 = current_block_type && current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div1, null);
    				}
    			}

    			if (!current || dirty[0] & /*selectedImage*/ 512) {
    				toggle_class(div1, "hidden", !/*selectedImage*/ ctx[9]);
    			}

    			if ((!current || dirty[0] & /*$modelColorDomainStore*/ 8388608) && t13_value !== (t13_value = formatColorValue(/*$modelColorDomainStore*/ ctx[23] && /*$modelColorDomainStore*/ ctx[23].min) + "")) set_data(t13, t13_value);
    			if ((!current || dirty[0] & /*$modelColorDomainStore*/ 8388608) && t16_value !== (t16_value = formatColorValue(/*$modelColorDomainStore*/ ctx[23] && /*$modelColorDomainStore*/ ctx[23].max) + "")) set_data(t16, t16_value);

    			if (!current || dirty[0] & /*$modelColorDomainStore*/ 8388608 && div6_data_model_name_value !== (div6_data_model_name_value = /*$modelColorDomainStore*/ ctx[23]
    			? /*$modelColorDomainStore*/ ctx[23].modelName
    			: '')) {
    				attr(div6, "data-model-name", div6_data_model_name_value);
    			}

    			if (!current || dirty[0] & /*$modelColorDomainStore*/ 8388608 && div6_data_color_min_value !== (div6_data_color_min_value = /*$modelColorDomainStore*/ ctx[23]
    			? /*$modelColorDomainStore*/ ctx[23].min
    			: '')) {
    				attr(div6, "data-color-min", div6_data_color_min_value);
    			}

    			if (!current || dirty[0] & /*$modelColorDomainStore*/ 8388608 && div6_data_color_max_value !== (div6_data_color_max_value = /*$modelColorDomainStore*/ ctx[23]
    			? /*$modelColorDomainStore*/ ctx[23].max
    			: '')) {
    				attr(div6, "data-color-max", div6_data_color_max_value);
    			}

    			if (!current || dirty[0] & /*$modelColorDomainStore*/ 8388608 && div6_title_value !== (div6_title_value = /*$modelColorDomainStore*/ ctx[23]
    			? `Current checkpoint feature maps: ${formatColorValue(/*$modelColorDomainStore*/ ctx[23].min)} to ${formatColorValue(/*$modelColorDomainStore*/ ctx[23].max)}`
    			: 'Loading current checkpoint feature maps')) {
    				attr(div6, "title", div6_title_value);
    			}

    			if (dirty[0] & /*$availableModelsStore*/ 16777216) {
    				each_value_1 = /*$availableModelsStore*/ ctx[24];
    				each_blocks_1 = update_keyed_each(each_blocks_1, dirty, get_key, 1, ctx, each_value_1, each0_lookup, select, destroy_block, create_each_block_1$1, null, get_each_context_1$1);
    			}

    			if (!current || dirty[0] & /*disableControl, isModelLoading, $runLoadingStore*/ 1048579 && select_disabled_value !== (select_disabled_value = /*disableControl*/ ctx[1] || /*isModelLoading*/ ctx[0] || /*$runLoadingStore*/ ctx[20])) {
    				select.disabled = select_disabled_value;
    			}

    			if (dirty[0] & /*$model_nameStore, $availableModelsStore*/ 16777220) {
    				select_option(select, /*$model_nameStore*/ ctx[2]);
    			}

    			if (!current || dirty[0] & /*showLossPopup*/ 64) {
    				attr(button2, "aria-expanded", /*showLossPopup*/ ctx[6]);
    			}

    			if (current_block_type_1 !== (current_block_type_1 = select_block_type_1(ctx))) {
    				if (if_block1) if_block1.d(1);
    				if_block1 = current_block_type_1 && current_block_type_1(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(div15, t24);
    				}
    			}

    			if (!current || dirty[0] & /*isModelLoading, $runLoadingStore, $runErrorStore, disableControl*/ 3145731 && button3_disabled_value !== (button3_disabled_value = /*isModelLoading*/ ctx[0] || /*$runLoadingStore*/ ctx[20] || !!/*$runErrorStore*/ ctx[21] || /*disableControl*/ ctx[1])) {
    				button3.disabled = button3_disabled_value;
    			}

    			if (dirty[0] & /*weightControls, isModelLoading, $runLoadingStore, $runErrorStore, disableControl, changeACCTWeight*/ 36962307) {
    				each_value = /*weightControls*/ ctx[18];
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key_1, 1, ctx, each_value, each1_lookup, div14, destroy_block, create_each_block$2, null, get_each_context$2);
    			}

    			if (!current || dirty[0] & /*isModelLoading, $runLoadingStore*/ 1048577 && div15_aria_busy_value !== (div15_aria_busy_value = /*isModelLoading*/ ctx[0] || /*$runLoadingStore*/ ctx[20])) {
    				attr(div15, "aria-busy", div15_aria_busy_value);
    			}

    			if (!current || dirty[0] & /*loadedModelKey*/ 32) {
    				attr(div15, "data-loaded-model", /*loadedModelKey*/ ctx[5]);
    			}

    			if (!current || dirty[0] & /*$trainingDataPathStore*/ 8) {
    				attr(div15, "data-selected-run", /*$trainingDataPathStore*/ ctx[3]);
    			}

    			if (!current || dirty[0] & /*isModelLoading, $runLoadingStore*/ 1048577) {
    				toggle_class(div15, "model-loading", /*isModelLoading*/ ctx[0] || /*$runLoadingStore*/ ctx[20]);
    			}

    			if (!current || dirty[0] & /*$runErrorStore*/ 2097152) {
    				toggle_class(div15, "model-error", !!/*$runErrorStore*/ ctx[21]);
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_2(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if (~current_block_type_index) {
    					if_blocks[current_block_type_index].p(ctx, dirty);
    				}
    			} else {
    				if (if_block2) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block2 = if_blocks[current_block_type_index];

    					if (!if_block2) {
    						if_block2 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block2.c();
    					} else {
    						if_block2.p(ctx, dirty);
    					}

    					transition_in(if_block2, 1);
    					if_block2.m(div16, null);
    				} else {
    					if_block2 = null;
    				}
    			}

    			if (/*showLossPopup*/ ctx[6]) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);

    					if (dirty[0] & /*showLossPopup*/ 64) {
    						transition_in(if_block3, 1);
    					}
    				} else {
    					if_block3 = create_if_block$7(ctx);
    					if_block3.c();
    					transition_in(if_block3, 1);
    					if_block3.m(div17, null);
    				}
    			} else if (if_block3) {
    				group_outros();

    				transition_out(if_block3, 1, 1, () => {
    					if_block3 = null;
    				});

    				check_outros();
    			}

    			const imageselector_changes = {};
    			if (dirty[0] & /*imageOptions*/ 131072) imageselector_changes.imageOptions = /*imageOptions*/ ctx[17];
    			if (dirty[0] & /*$imagePreviewRootStore*/ 4194304) imageselector_changes.imageRoot = /*$imagePreviewRootStore*/ ctx[22];
    			if (dirty[0] & /*$imageVersionStore*/ 524288) imageselector_changes.imageVersion = /*$imageVersionStore*/ ctx[19];
    			if (dirty[0] & /*selectedImage*/ 512) imageselector_changes.selectedImage = /*selectedImage*/ ctx[9];

    			if (!updating_show && dirty[0] & /*showImageSelectionModal*/ 32768) {
    				updating_show = true;
    				imageselector_changes.show = /*showImageSelectionModal*/ ctx[15];
    				add_flush_callback(() => updating_show = false);
    			}

    			imageselector.$set(imageselector_changes);
    			const imageuploader_changes = {};

    			if (!updating_show_1 && dirty[0] & /*showUploadModal*/ 65536) {
    				updating_show_1 = true;
    				imageuploader_changes.show = /*showUploadModal*/ ctx[16];
    				add_flush_callback(() => updating_show_1 = false);
    			}

    			imageuploader.$set(imageuploader_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block2);
    			transition_in(if_block3);
    			transition_in(plot.$$.fragment, local);
    			transition_in(modal.$$.fragment, local);
    			transition_in(imageselector.$$.fragment, local);
    			transition_in(imageuploader.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block2);
    			transition_out(if_block3);
    			transition_out(plot.$$.fragment, local);
    			transition_out(modal.$$.fragment, local);
    			transition_out(imageselector.$$.fragment, local);
    			transition_out(imageuploader.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div17);

    			if (if_block0) {
    				if_block0.d();
    			}

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].d();
    			}

    			if (if_block1) {
    				if_block1.d();
    			}

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d();
    			}

    			if (if_block3) if_block3.d();
    			/*div17_binding*/ ctx[51](null);
    			if (detaching) detach(t30);
    			destroy_component(plot, detaching);
    			if (detaching) detach(t31);
    			destroy_component(modal, detaching);
    			if (detaching) detach(t32);
    			destroy_component(imageselector, detaching);
    			if (detaching) detach(t33);
    			destroy_component(imageuploader, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    let selectedScaleLevel$3 = 'local';

    function instance$k($$self, $$props, $$invalidate) {
    	let weightControls;
    	let imageOptions;
    	let $imageVersionStore;
    	let $imageRootStore;
    	let $runLoadingStore;
    	let $model_nameStore;
    	let $trainingDataPathStore;
    	let $allowsSoftmaxAnimationStore;
    	let $imageOptionsStore;
    	let $runErrorStore;
    	let $gammaStore;
    	let $betaStore;
    	let $alphaStore;
    	let $imagePreviewRootStore;
    	let $modelColorDomainStore;
    	let $availableModelsStore;
    	component_subscribe($$self, imageVersionStore, $$value => $$invalidate(19, $imageVersionStore = $$value));
    	component_subscribe($$self, imageRootStore, $$value => $$invalidate(86, $imageRootStore = $$value));
    	component_subscribe($$self, runLoadingStore, $$value => $$invalidate(20, $runLoadingStore = $$value));
    	component_subscribe($$self, model_nameStore, $$value => $$invalidate(2, $model_nameStore = $$value));
    	component_subscribe($$self, trainingDataPathStore, $$value => $$invalidate(3, $trainingDataPathStore = $$value));
    	component_subscribe($$self, allowsSoftmaxAnimationStore, $$value => $$invalidate(87, $allowsSoftmaxAnimationStore = $$value));
    	component_subscribe($$self, imageOptionsStore, $$value => $$invalidate(43, $imageOptionsStore = $$value));
    	component_subscribe($$self, runErrorStore, $$value => $$invalidate(21, $runErrorStore = $$value));
    	component_subscribe($$self, gammaStore, $$value => $$invalidate(44, $gammaStore = $$value));
    	component_subscribe($$self, betaStore, $$value => $$invalidate(45, $betaStore = $$value));
    	component_subscribe($$self, alphaStore, $$value => $$invalidate(46, $alphaStore = $$value));
    	component_subscribe($$self, imagePreviewRootStore, $$value => $$invalidate(22, $imagePreviewRootStore = $$value));
    	component_subscribe($$self, modelColorDomainStore, $$value => $$invalidate(23, $modelColorDomainStore = $$value));
    	component_subscribe($$self, availableModelsStore, $$value => $$invalidate(24, $availableModelsStore = $$value));
    	let overviewComponent;
    	selectedScaleLevelStore.set(selectedScaleLevel$3);
    	let previousSelectedScaleLevel = selectedScaleLevel$3;
    	let wholeSvg = undefined;
    	let svg = undefined;
    	let model_name = 'model_best';
    	model_nameStore.set(model_name);
    	let previousModelKey = '';
    	let loadedModelKey = '';
    	let overviewReady = false;
    	let overviewRequest = 0;
    	let isModelLoading = true;
    	let showLossPopup = false;
    	let acctResizeObserver;
    	let acctResizeFrame;

    	onDestroy(() => {
    		intermediateRelayoutToken++;
    		acctResizeObserver?.disconnect();
    		if (acctResizeFrame !== undefined) cancelAnimationFrame(acctResizeFrame);
    	});

    	function setCheckpointACCTWeights() {
    		const weights = getACCTModelWeights(model_name);
    		alphaStore.set(weights.alpha);
    		betaStore.set(weights.beta);
    		gammaStore.set(weights.gamma);
    	}

    	function changeACCTWeight(name, event) {
    		if (isModelLoading || $runLoadingStore || $runErrorStore || disableControl) return;
    		const range = ACCT_PARAMETER_RANGES[name];

    		const store = ({
    			alpha: alphaStore,
    			beta: betaStore,
    			gamma: gammaStore
    		})[name];

    		const value = Number(event.currentTarget.value);
    		if (!range || !store || !Number.isFinite(value)) return;

    		// Explore the recorded class statistics without modifying training results.
    		store.set(Math.max(range.min, Math.min(range.max, value)));

    		updateThresholds();
    	}

    	function resetACCTWeights() {
    		if (isModelLoading || $runLoadingStore || $runErrorStore || disableControl) return;
    		setCheckpointACCTWeights();
    		updateThresholds();
    	}

    	const model_nameChanged = () => {
    		// 当模型名称改变时， 重新加载模型
    		const modelKey = `${$trainingDataPathStore}|${model_name}`;

    		if (overviewReady && modelKey !== previousModelKey) {
    			previousModelKey = modelKey;
    			const selectedModelName = model_name;
    			const dataPath = $trainingDataPathStore;
    			const request = ++overviewRequest;
    			updateSelectedEpoch(selectedModelName);
    			$$invalidate(0, isModelLoading = true);
    			runErrorStore.set('');
    			modelColorDomainStore.set(null);

    			loadTrainedModel(`${dataPath}/${selectedModelName}.onnx?v=${Date.now()}`).then(async newModel => {
    				if (request !== overviewRequest) {
    					if (newModel.release) await newModel.release();
    					return;
    				}

    				let nextCNN;

    				try {
    					nextCNN = await constructCNN(
    						selectedImage === 'custom'
    						? customImageURL
    						: demoImageURL($imageRootStore, selectedImage, $imageVersionStore),
    						newModel,
    						selectedModelName,
    						dataPath
    					);
    				} catch(error) {
    					if (newModel.release) await newModel.release();
    					throw error;
    				}

    				if (request !== overviewRequest) {
    					if (newModel.release) await newModel.release();
    					return;
    				}

    				const previousModel = model;
    				model = newModel;
    				cnn = nextCNN;
    				$$invalidate(5, loadedModelKey = modelKey);
    				setCheckpointACCTWeights();
    				if (previousModel && previousModel.release) await previousModel.release();

    				// Ignore the flatten layer for now
    				let flatten = cnn[cnn.length - 2];

    				cnn.splice(cnn.length - 2, 1);
    				cnn.flatten = flatten;
    				cnnStore.set(cnn);
    				updateCNNLayerRanges();

    				// Clear and redraw the CNN visualization
    				svg.select('g.cnn-group').remove();

    				let cnnGroup = svg.append('g').attr('class', 'cnn-group');
    				drawCNN(width, height, cnnGroup, nodeMouseOverHandler, nodeMouseLeaveHandler, nodeClickHandler);
    			}).catch(error => {
    				console.error('Failed to load the selected checkpoint:', error);
    				if (request === overviewRequest) runErrorStore.set(`Unable to load ${selectedModelName}: ${error.message}`);
    			}).finally(() => {
    				if (request === overviewRequest) $$invalidate(0, isModelLoading = false);
    			});
    		}
    	};

    	// Configs
    	const layerColorScales = overviewConfig.layerColorScales;

    	const featureColorGradient = `linear-gradient(to right, ${Array.from({ length: 21 }, (_, i) => `${layerColorScales.conv(i / 20)} ${i * 5}%`).join(', ')})`;
    	const nodeLength = overviewConfig.nodeLength;
    	const edgeOpacity = overviewConfig.edgeOpacity;
    	const edgeInitColor = overviewConfig.edgeInitColor;
    	const edgeHoverColor = overviewConfig.edgeHoverColor;
    	const edgeStrokeWidth = overviewConfig.edgeStrokeWidth;
    	const svgPaddings = overviewConfig.svgPaddings;
    	const overlayRectOffset = overviewConfig.overlayRectOffset;

    	// Shared properties
    	let needRedraw = [undefined, undefined];

    	needRedrawStore.subscribe(value => {
    		needRedraw = value;
    	});

    	let nodeCoordinate = undefined;

    	nodeCoordinateStore.subscribe(value => {
    		nodeCoordinate = value;
    	});

    	let cnnLayerRanges = undefined;

    	cnnLayerRangesStore.subscribe(value => {
    		cnnLayerRanges = value;
    	});

    	cnnLayerMinMaxStore.subscribe(value => {
    	});

    	shouldIntermediateAnimateStore.subscribe(value => {
    	});

    	vSpaceAroundGapStore.subscribe(value => {
    	});

    	let hSpaceAroundGap = undefined;

    	hSpaceAroundGapStore.subscribe(value => {
    		hSpaceAroundGap = value;
    	});

    	let isInSoftmax = undefined;

    	isInSoftmaxStore.subscribe(value => {
    		isInSoftmax = value;
    	});

    	let softmaxDetailViewInfo = undefined;

    	softmaxDetailViewStore.subscribe(value => {
    		$$invalidate(7, softmaxDetailViewInfo = value);
    	});

    	modalStore.subscribe(value => {
    	});

    	hoverInfoStore.subscribe(value => {
    	});

    	intermediateLayerPositionStore.subscribe(value => {
    	});

    	let width = undefined;
    	let height = undefined;
    	let model = undefined;
    	let selectedNode = { layerName: '', index: -1, data: null };
    	let isInIntermediateView = false;
    	let intermediateFooterReserved = false;
    	let intermediateRelayoutToken = 0;
    	let isInActPoolDetailView = false;
    	let actPoolDetailViewNodeIndex = -1;
    	let actPoolDetailViewLayerIndex = -1;
    	let detailedViewNum = undefined;
    	let disableControl = false;

    	// Wait to load
    	let cnn = undefined;

    	let detailedViewAbsCoords = {
    		1: [600, 270, 490, 290],
    		2: [500, 270, 490, 290],
    		3: [700, 270, 490, 290],
    		4: [600, 270, 490, 290],
    		5: [650, 270, 490, 290],
    		6: [775, 270, 490, 290],
    		7: [100, 270, 490, 290],
    		8: [60, 270, 490, 290],
    		9: [200, 270, 490, 290],
    		10: [300, 270, 490, 290]
    	};

    	const layerIndexDict = {
    		'input': 0,
    		'conv_1': 1,
    		'block_1_layer_1_out': 2,
    		'block_1_layer_2_out': 3,
    		'block_1_layer_3_out': 4,
    		'block_1_layer_4_out': 5,
    		'block_2_layer_1_out': 6,
    		'block_2_layer_2_out': 7,
    		'block_2_layer_3_out': 8,
    		'block_2_layer_4_out': 9,
    		'block_3_layer_1_out': 10,
    		'block_3_layer_2_out': 11,
    		'block_3_layer_3_out': 12,
    		'block_3_layer_4_out': 13,
    		'norm': 14,
    		'relu': 15,
    		'pool': 16,
    		'output': 17
    	};

    	let selectedImage = 'airplane.png';
    	selectedImageStore.subscribe(value => $$invalidate(9, selectedImage = value));
    	selectedImageStore.set('airplane.png');
    	let customImage = false;

    	customImageStore.subscribe(value => {
    		customImage = value;
    	});

    	let nodeData;
    	let selectedNodeIndex = -1;
    	let isExitedFromDetailedView = true;
    	let isExitedFromCollapse = true;
    	let customImageURL = null;

    	// Helper functions
    	const selectedScaleLevelChanged = () => {
    		if (svg !== undefined) {
    			if (selectedScaleLevel$3 != previousSelectedScaleLevel) {
    				// We can simply redraw all nodes using the new color scale, or we can
    				// make it faster by only redraw certian nodes
    				let updatingLayerIndexDict = {
    					local: {
    						module: [1, 2, 8, 9, 10],
    						global: [1, 2, 3, 4, 5, 8, 9, 10]
    					},
    					module: {
    						local: [1, 2, 8, 9, 10],
    						global: [1, 2, 3, 4, 5, 8, 9, 10]
    					},
    					global: {
    						local: [1, 2, 3, 4, 5, 8, 9, 10],
    						module: [1, 2, 3, 4, 5]
    					}
    				};

    				let updatingLayerIndex = updatingLayerIndexDict[previousSelectedScaleLevel][selectedScaleLevel$3];

    				updatingLayerIndex.forEach(l => {
    					let range = cnnLayerRanges[selectedScaleLevel$3][l];
    					svg.select(`#cnn-layer-group-${l}`).selectAll('.node-image').each((d, i, g) => drawOutput(d, i, g, range));
    				});
    			}

    			previousSelectedScaleLevel = selectedScaleLevel$3;
    			selectedScaleLevelStore.set(selectedScaleLevel$3);
    		}
    	};

    	const intermediateNodeMouseOverHandler = (d, i, g) => {
    		if (detailedViewNum !== undefined) {
    			return;
    		}

    		svg.select(`rect#underneath-gateway-${d.index}`).style('opacity', 1);
    	};

    	const intermediateNodeMouseLeaveHandler = (d, i, g) => {
    		if (detailedViewNum !== undefined) {
    			return;
    		}

    		svg.select(`rect#underneath-gateway-${d.index}`).style('opacity', 0);
    	};

    	const intermediateNodeClicked = (d, i, g, selectedI, curLayerIndex) => {
    		d3.event.stopPropagation();
    		$$invalidate(13, isExitedFromCollapse = false);

    		// Use this event to trigger the detailed view
    		if (detailedViewNum === d.index) {
    			$$invalidate(11, selectedNodeIndex = -1);

    			// User clicks this node again -> rewind
    			detailedViewNum = undefined;

    			svg.select(`rect#underneath-gateway-${d.index}`).style('opacity', 0);
    		} else // We need to show a new detailed view (two cases: if we need to close the
    		// old detailed view or not)
    		{
    			$$invalidate(11, selectedNodeIndex = d.index);

    			// Compute the color range
    			let rangePre = cnnLayerRanges[selectedScaleLevel$3][curLayerIndex - 1];

    			let rangeCur = cnnLayerRanges[selectedScaleLevel$3][curLayerIndex];
    			let range = Math.max(rangePre, rangeCur);

    			// User triggers a different detailed view
    			if (detailedViewNum !== undefined) {
    				// Change the underneath highlight
    				svg.select(`rect#underneath-gateway-${detailedViewNum}`).style('opacity', 0);

    				svg.select(`rect#underneath-gateway-${d.index}`).style('opacity', 1);
    			}

    			detailedViewNum = d.index;

    			// Send the currently used color range to detailed view
    			$$invalidate(10, nodeData.colorRange = range, nodeData);

    			$$invalidate(10, nodeData.inputIsInputLayer = curLayerIndex <= 1, nodeData);
    		}
    	};

    	// The order of the if/else statements in this function is very critical
    	const emptySpaceClicked = () => {
    		// If detail view -> rewind to intermediate view
    		if (detailedViewNum !== undefined) {
    			$$invalidate(11, selectedNodeIndex = -1);

    			// User clicks this node again -> rewind
    			svg.select(`rect#underneath-gateway-${detailedViewNum}`).style('opacity', 0);

    			detailedViewNum = undefined;
    		} else // If softmax view -> rewind to flatten layer view
    		if (isInSoftmax) {
    			svg.select('.softmax-symbol').dispatch('click');
    		} else // If intermediate view -> rewind to overview
    		if (isInIntermediateView) {
    			let curLayerIndex = layerIndexDict[selectedNode.layerName];
    			quitIntermediateView(curLayerIndex, selectedNode.domG, selectedNode.domI);
    			d3.select(selectedNode.domG[selectedNode.domI]).dispatch('mouseleave');
    		} else // If pool/act detail view -> rewind to overview
    		if (isInActPoolDetailView) {
    			quitActPoolDetailView();
    		}
    	};

    	const prepareToEnterIntermediateView = (d, g, i, curLayerIndex) => {
    		isInIntermediateView = true;

    		// Hide the input annotation
    		svg.select('.input-annotation').classed('hidden', true);

    		// Highlight the previous layer and this node
    		svg.select(`g#cnn-layer-group-${curLayerIndex - 1}`).selectAll('rect.bounding').style('stroke-width', 2);

    		d3.select(g[i]).select('rect.bounding').style('stroke-width', 2);
    		$$invalidate(1, disableControl = true);

    		// Allow infinite animation loop
    		shouldIntermediateAnimateStore.set(true);

    		// Highlight the labels
    		svg.selectAll(`g#layer-label-${curLayerIndex - 1},
      g#layer-detailed-label-${curLayerIndex - 1},
      g#layer-label-${curLayerIndex},
      g#layer-detailed-label-${curLayerIndex}`).style('font-weight', '800');

    		d3.select('#cnn-svg').on('click', function () {
    			if (d3.event.target.closest('.intermediate-node')) {
    				return; // Intermediate Node 内部点击，不退出
    			}

    			emptySpaceClicked();
    		});
    	};

    	const quitActPoolDetailView = () => {
    		isInActPoolDetailView = false;
    		actPoolDetailViewNodeIndex = -1;
    		let layerIndex = layerIndexDict[selectedNode.layerName];
    		let nodeIndex = selectedNode.index;
    		svg.select(`g#layer-${layerIndex}-node-${nodeIndex}`).select('rect.bounding').classed('hidden', true);

    		selectedNode.data.inputLinks.forEach(link => {
    			let layerIndex = layerIndexDict[link.source.layerName];
    			let nodeIndex = link.source.index;
    			svg.select(`g#layer-${layerIndex}-node-${nodeIndex}`).select('rect.bounding').classed('hidden', true);
    		});

    		// Clean up the underneath rects
    		svg.select('g.underneath').selectAll('rect').remove();

    		// Show all edges
    		let unimportantEdges = svg.select('g.edge-group').selectAll('.edge').filter(d => {
    			return d.targetLayerIndex !== actPoolDetailViewLayerIndex;
    		}).style('visibility', null);

    		// Recover control UI
    		$$invalidate(1, disableControl = false);

    		// Also dehighlight the edge
    		let edgeGroup = svg.select('g.cnn-group').select('g.edge-group');

    		edgeGroup.selectAll(`path.edge-${layerIndex}-${nodeIndex}`).transition().ease(d3.easeCubicOut).duration(200).style('stroke', edgeInitColor).style('stroke-width', edgeStrokeWidth).style('opacity', edgeOpacity);

    		// Remove the overlay rect
    		svg.selectAll('g.intermediate-layer-overlay, g.intermediate-layer-annotation').transition('remove').duration(500).ease(d3.easeCubicInOut).style('opacity', 0).on('end', (d, i, g) => {
    			svg.selectAll('g.intermediate-layer-overlay, g.intermediate-layer-annotation').remove();
    			svg.selectAll('defs.overlay-gradient').remove();
    			svg.select('.input-annotation').classed('hidden', false);
    		});

    		// Turn the fade out nodes back
    		svg.select(`g#cnn-layer-group-${layerIndex}`).selectAll('g.node-group').each((sd, si, sg) => {
    			d3.select(sg[si]).style('pointer-events', 'all');
    		});

    		svg.select(`g#cnn-layer-group-${layerIndex - 1}`).selectAll('g.node-group').each((sd, si, sg) => {
    			// Recover the old events
    			d3.select(sg[si]).style('pointer-events', 'all').on('mouseover', nodeMouseOverHandler).on('mouseleave', nodeMouseLeaveHandler).on('click', nodeClickHandler);
    		});

    		// Deselect the node
    		$$invalidate(8, selectedNode.layerName = '', selectedNode);

    		$$invalidate(8, selectedNode.index = -1, selectedNode);
    		$$invalidate(8, selectedNode.data = null, selectedNode);
    		actPoolDetailViewLayerIndex = -1;
    	};

    	const actPoolDetailViewPreNodeMouseOverHandler = (d, i, g) => {
    		// Highlight the edges
    		let layerIndex = layerIndexDict[d.layerName];

    		let nodeIndex = d.index;
    		let edgeGroup = svg.select('g.cnn-group').select('g.edge-group');
    		edgeGroup.selectAll(`path.edge-${actPoolDetailViewLayerIndex}-${nodeIndex}`).raise().transition().ease(d3.easeCubicInOut).duration(400).style('stroke', edgeHoverColor).style('stroke-width', '1').style('opacity', 1);

    		// Highlight its border
    		d3.select(g[i]).select('rect.bounding').classed('hidden', false);

    		// Highlight node's pair
    		let associatedLayerIndex = layerIndex - 1;

    		if (layerIndex === actPoolDetailViewLayerIndex - 1) {
    			associatedLayerIndex = layerIndex + 1;
    		}

    		svg.select(`g#layer-${associatedLayerIndex}-node-${nodeIndex}`).select('rect.bounding').classed('hidden', false);
    	};

    	const actPoolDetailViewPreNodeMouseLeaveHandler = (d, i, g) => {
    		// De-highlight the edges
    		let layerIndex = layerIndexDict[d.layerName];

    		let nodeIndex = d.index;
    		let edgeGroup = svg.select('g.cnn-group').select('g.edge-group');
    		edgeGroup.selectAll(`path.edge-${actPoolDetailViewLayerIndex}-${nodeIndex}`).transition().ease(d3.easeCubicOut).duration(200).style('stroke', edgeInitColor).style('stroke-width', edgeStrokeWidth).style('opacity', edgeOpacity);

    		// De-highlight its border
    		d3.select(g[i]).select('rect.bounding').classed('hidden', true);

    		// De-highlight node's pair
    		let associatedLayerIndex = layerIndex - 1;

    		if (layerIndex === actPoolDetailViewLayerIndex - 1) {
    			associatedLayerIndex = layerIndex + 1;
    		}

    		svg.select(`g#layer-${associatedLayerIndex}-node-${nodeIndex}`).select('rect.bounding').classed('hidden', true);
    	};

    	const actPoolDetailViewPreNodeClickHandler = (d, i, g) => {
    		let layerIndex = layerIndexDict[d.layerName];
    		let nodeIndex = d.index;

    		// Click the pre-layer node in detail view has the same effect as clicking
    		// the cur-layer node, which is to open a new detail view window
    		svg.select(`g#layer-${layerIndex + 1}-node-${nodeIndex}`).node().dispatchEvent(new Event('click'));
    	};

    	const enterDetailView = (curLayerIndex, i) => {
    		isInActPoolDetailView = true;
    		actPoolDetailViewNodeIndex = i;
    		actPoolDetailViewLayerIndex = curLayerIndex;

    		// Hide all edges
    		let unimportantEdges = svg.select('g.edge-group').selectAll('.edge').filter(d => {
    			return d.targetLayerIndex !== curLayerIndex;
    		}).style('visibility', 'hidden');

    		// Disable UI
    		$$invalidate(1, disableControl = true);

    		// Hide input annotaitons
    		svg.select('.input-annotation').classed('hidden', true);

    		// Add overlay rects
    		let leftX = nodeCoordinate[curLayerIndex - 1][i].x;

    		// +5 to cover the detailed mode long label
    		let rightStart = nodeCoordinate[curLayerIndex][i].x + nodeLength + 5;

    		// Compute the left and right overlay rect width
    		let rightWidth = width - rightStart - overlayRectOffset / 2;

    		let leftWidth = leftX - nodeCoordinate[0][0].x;

    		// The overlay rects should be symmetric
    		if (rightWidth > leftWidth) {
    			let stops = [
    				{
    					offset: '0%',
    					color: 'rgb(255, 255, 255)',
    					opacity: 0.85
    				},
    				{
    					offset: '50%',
    					color: 'rgb(255, 255, 255)',
    					opacity: 0.9
    				},
    				{
    					offset: '100%',
    					color: 'rgb(255, 255, 255)',
    					opacity: 1
    				}
    			];

    			addOverlayGradient('overlay-gradient-right', stops);
    			let leftEndOpacity = 0.85 + (0.95 - 0.85) * (leftWidth / rightWidth);

    			stops = [
    				{
    					offset: '0%',
    					color: 'rgb(255, 255, 255)',
    					opacity: leftEndOpacity
    				},
    				{
    					offset: '100%',
    					color: 'rgb(255, 255, 255)',
    					opacity: 0.85
    				}
    			];

    			addOverlayGradient('overlay-gradient-left', stops);
    		} else {
    			let stops = [
    				{
    					offset: '0%',
    					color: 'rgb(255, 255, 255)',
    					opacity: 1
    				},
    				{
    					offset: '50%',
    					color: 'rgb(255, 255, 255)',
    					opacity: 0.9
    				},
    				{
    					offset: '100%',
    					color: 'rgb(255, 255, 255)',
    					opacity: 0.85
    				}
    			];

    			addOverlayGradient('overlay-gradient-left', stops);
    			let rightEndOpacity = 0.85 + (0.95 - 0.85) * (rightWidth / leftWidth);

    			stops = [
    				{
    					offset: '0%',
    					color: 'rgb(255, 255, 255)',
    					opacity: 0.85
    				},
    				{
    					offset: '100%',
    					color: 'rgb(255, 255, 255)',
    					opacity: rightEndOpacity
    				}
    			];

    			addOverlayGradient('overlay-gradient-right', stops);
    		}

    		addOverlayRect('overlay-gradient-right', rightStart + overlayRectOffset / 2 + 0.5, 0, rightWidth, height + svgPaddings.top);
    		addOverlayRect('overlay-gradient-left', nodeCoordinate[0][0].x - overlayRectOffset / 2, 0, leftWidth, height + svgPaddings.top);
    		svg.selectAll('rect.overlay').on('click', emptySpaceClicked);

    		// Add underneath rectangles
    		let underGroup = svg.select('g.underneath');

    		let padding = 7;

    		for (let n = 0; n < cnn[curLayerIndex - 1].length; n++) {
    			underGroup.append('rect').attr('class', 'underneath-gateway').attr('id', `underneath-gateway-${n}`).attr('x', nodeCoordinate[curLayerIndex - 1][n].x - padding).attr('y', nodeCoordinate[curLayerIndex - 1][n].y - padding).attr('width', 2 * nodeLength + hSpaceAroundGap + 2 * padding).attr('height', nodeLength + 2 * padding).attr('rx', 10).style('fill', 'rgba(160, 160, 160, 0.3)').style('opacity', 0);

    			// Update the event functions for these two layers
    			svg.select(`g#layer-${curLayerIndex - 1}-node-${n}`).style('pointer-events', 'all').style('cursor', 'pointer').on('mouseover', actPoolDetailViewPreNodeMouseOverHandler).on('mouseleave', actPoolDetailViewPreNodeMouseLeaveHandler).on('click', actPoolDetailViewPreNodeClickHandler);
    		}

    		underGroup.lower();

    		// Highlight the selcted pair
    		underGroup.select(`#underneath-gateway-${i}`).style('opacity', 1);
    	};

    	const quitIntermediateView = (curLayerIndex, g, i) => {
    		intermediateRelayoutToken++;

    		// If it is the softmax detail view, quit that view first
    		if (isInSoftmax) {
    			svg.select('.logit-layer').remove();
    			svg.select('.logit-layer-lower').remove();
    			svg.selectAll('.plus-symbol-clone').remove();

    			// Instead of removing the paths, we hide them, so it is faster to load in
    			// the future
    			svg.select('.underneath').selectAll('.logit-lower').style('opacity', 0);

    			softmaxDetailViewStore.set({ show: false, logits: [] });
    			allowsSoftmaxAnimationStore.set(false);
    		}

    		isInSoftmaxStore.set(false);
    		isInIntermediateView = false;

    		// Recover control panel UI
    		$$invalidate(1, disableControl = false);

    		// Recover the input layer node's event
    		for (let n = 0; n < cnn[curLayerIndex - 1].length; n++) {
    			svg.select(`g#layer-${curLayerIndex - 1}-node-${n}`).on('mouseover', nodeMouseOverHandler).on('mouseleave', nodeMouseLeaveHandler).on('click', nodeClickHandler);
    		}

    		// Clean up the underneath rects
    		svg.select('g.underneath').selectAll('rect').remove();

    		detailedViewNum = undefined;

    		// Highlight the previous layer and this node
    		svg.select(`g#cnn-layer-group-${curLayerIndex - 1}`).selectAll('rect.bounding').style('stroke-width', 1);

    		d3.select(g[i]).select('rect.bounding').style('stroke-width', 1);

    		// Highlight the labels
    		svg.selectAll(`g#layer-label-${curLayerIndex - 1},
      g#layer-detailed-label-${curLayerIndex - 1},
      g#layer-label-${curLayerIndex},
      g#layer-detailed-label-${curLayerIndex}`).style('font-weight', 'normal');

    		// Also unclick the node
    		// Record the current clicked node
    		$$invalidate(8, selectedNode.layerName = '', selectedNode);

    		$$invalidate(8, selectedNode.index = -1, selectedNode);
    		$$invalidate(8, selectedNode.data = null, selectedNode);
    		$$invalidate(13, isExitedFromCollapse = true);

    		// Remove the intermediate layer
    		let intermediateLayer = svg.select('g.intermediate-layer');

    		// Kill the infinite animation loop
    		shouldIntermediateAnimateStore.set(false);

    		intermediateLayer.transition('remove').duration(500).ease(d3.easeCubicInOut).style('opacity', 0).on('end', (d, i, g) => {
    			d3.select(g[i]).remove();
    		});

    		// Remove the output node overlay mask
    		svg.selectAll('.overlay-group').remove();

    		// Remove the overlay rect
    		svg.selectAll('g.intermediate-layer-overlay, g.intermediate-layer-annotation').transition('remove').duration(500).ease(d3.easeCubicInOut).style('opacity', 0).on('end', (d, i, g) => {
    			svg.selectAll('g.intermediate-layer-overlay, g.intermediate-layer-annotation').remove();
    			svg.selectAll('defs.overlay-gradient').remove();
    		});

    		// Recover the layer if we have drdrawn it
    		if (needRedraw[0] !== undefined) {
    			let redrawRange = cnnLayerRanges[selectedScaleLevel$3][needRedraw[0]];

    			if (needRedraw[1] !== undefined) {
    				svg.select(`g#layer-${needRedraw[0]}-node-${needRedraw[1]}`).select('image.node-image').each((d, i, g) => drawOutput(d, i, g, redrawRange));
    			} else {
    				svg.select(`g#cnn-layer-group-${needRedraw[0]}`).selectAll('image.node-image').each((d, i, g) => drawOutput(d, i, g, redrawRange));
    			}
    		}

    		// Move all layers to their original place
    		for (let i = 0; i < nodeCoordinate.length; i++) {
    			moveLayerX({
    				layerIndex: i,
    				targetX: nodeCoordinate[i][0].x,
    				disable: false,
    				delay: 500,
    				opacity: 1
    			});
    		}

    		const lastLayerIndex = nodeCoordinate.length - 1;

    		moveLayerX({
    			layerIndex: lastLayerIndex,
    			targetX: nodeCoordinate[lastLayerIndex][0].x,
    			opacity: 1,
    			disable: false,
    			delay: 500,
    			onEndFunc: () => {
    				// Show all edges on the last moving animation end
    				svg.select('g.edge-group').style('visibility', 'visible');

    				// Recover the input annotation
    				svg.select('.input-annotation').classed('hidden', false);

    				if (intermediateFooterReserved) {
    					intermediateFooterReserved = false;
    					svg.select('g.cnn-group').remove();
    					const restoredGroup = svg.append('g').attr('class', 'cnn-group');
    					drawCNN(width, height, restoredGroup, nodeMouseOverHandler, nodeMouseLeaveHandler, nodeClickHandler);
    				}
    			}
    		});

    		svg.select(`g#cnn-layer-group-${curLayerIndex - 1}`).selectAll('g.node-group').each((sd, si, sg) => {
    			// Recover the old events
    			d3.select(sg[si]).style('pointer-events', 'all').on('mouseover', nodeMouseOverHandler).on('mouseleave', nodeMouseLeaveHandler).on('click', nodeClickHandler);
    		});

    		svg.select(`g#cnn-layer-group-${curLayerIndex}`).selectAll('g.node-group').each((sd, si, sg) => {
    			d3.select(sg[si]).style('pointer-events', 'all').on('mouseover', nodeMouseOverHandler).on('mouseleave', nodeMouseLeaveHandler).on('click', nodeClickHandler);
    		});
    	};

    	const nodeClickHandler = (d, i, g) => {
    		d3.event.stopPropagation();
    		let nodeIndex = d.index;

    		// Record the current clicked node
    		$$invalidate(8, selectedNode.layerName = d.layerName, selectedNode);

    		$$invalidate(8, selectedNode.index = d.index, selectedNode);
    		$$invalidate(8, selectedNode.data = d, selectedNode);
    		$$invalidate(8, selectedNode.domI = i, selectedNode);
    		$$invalidate(8, selectedNode.domG = g, selectedNode);

    		// Record data for detailed view.
    		if (d.type === 'conv' || d.type === 'relu' || d.type === 'pool' || d.type === 'norm') {
    			let data = [];

    			for (let j = 0; j < d.inputLinks.length; j++) {
    				data.push({
    					input: d.inputLinks[j].source.output,
    					kernel: d.inputLinks[j].weight,
    					output: d.inputLinks[j].dest.output
    				});
    			}

    			if (d.type === 'conv') {
    				const kernelExtents = d.inputLinks.map(link => getExtent(link.weight));
    				const kernelExtent = kernelExtents.reduce((acc, cur) => [Math.min(acc[0], cur[0]), Math.max(acc[1], cur[1])]);

    				data.kernelMinMax = {
    					min: kernelExtent[0],
    					max: kernelExtent[1]
    				};

    				data.kernelRange = 2 * (Math.round(Math.max(...kernelExtent.map(Math.abs)) * 1000) / 1000);
    			}

    			let curLayerIndex = layerIndexDict[d.layerName];
    			data.colorRange = cnnLayerRanges[selectedScaleLevel$3][curLayerIndex];
    			data.isInputInputLayer = curLayerIndex <= 1;
    			data.mean = d.inputLinks[0].mean;
    			data.variance = d.inputLinks[0].variance;
    			data.gamma = d.inputLinks[0].gamma;
    			data.beta = d.inputLinks[0].beta;
    			data.epsilon = d.inputLinks[0].epsilon;
    			$$invalidate(10, nodeData = data);
    		}

    		let curLayerIndex = layerIndexDict[d.layerName];

    		if ((d.layerName.includes("_out") || d.type === 'norm') && isInIntermediateView) {
    			quitIntermediateView(curLayerIndex, g, i);
    		}

    		if (d.type === 'relu' || d.type === 'pool' || d.type === 'norm') {
    			$$invalidate(12, isExitedFromDetailedView = false);

    			if (!isInActPoolDetailView) {
    				// Enter the act pool detail view
    				enterDetailView(curLayerIndex, d.index);
    			} else {
    				if (d.index === actPoolDetailViewNodeIndex) {
    					// Quit the act pool detail view
    					quitActPoolDetailView();
    				} else {
    					// Switch the detail view input to the new clicked pair
    					// Remove the previous selection effect
    					svg.select(`g#layer-${curLayerIndex}-node-${actPoolDetailViewNodeIndex}`).select('rect.bounding').classed('hidden', true);

    					svg.select(`g#layer-${curLayerIndex - 1}-node-${actPoolDetailViewNodeIndex}`).select('rect.bounding').classed('hidden', true);
    					let edgeGroup = svg.select('g.cnn-group').select('g.edge-group');
    					edgeGroup.selectAll(`path.edge-${curLayerIndex}-${actPoolDetailViewNodeIndex}`).transition().ease(d3.easeCubicOut).duration(200).style('stroke', edgeInitColor).style('stroke-width', edgeStrokeWidth).style('opacity', edgeOpacity);
    					let underGroup = svg.select('g.underneath');
    					underGroup.select(`#underneath-gateway-${actPoolDetailViewNodeIndex}`).style('opacity', 0);

    					// Add selection effect on the new selected pair
    					svg.select(`g#layer-${curLayerIndex}-node-${nodeIndex}`).select('rect.bounding').classed('hidden', false);

    					svg.select(`g#layer-${curLayerIndex - 1}-node-${nodeIndex}`).select('rect.bounding').classed('hidden', false);
    					edgeGroup.selectAll(`path.edge-${curLayerIndex}-${nodeIndex}`).raise().transition().ease(d3.easeCubicInOut).duration(400).style('stroke', edgeHoverColor).style('stroke-width', '1').style('opacity', 1);
    					underGroup.select(`#underneath-gateway-${nodeIndex}`).style('opacity', 1);
    					actPoolDetailViewNodeIndex = nodeIndex;
    				}
    			}
    		}

    		// Enter the second view (layer-view) when user clicks a conv node
    		if ((d.type === 'conv' || d.layerName === 'output') && !isInIntermediateView) {
    			// Keep the original legend locations in a clear footer within the same
    			// canvas. Only neuron spacing changes while a detail diagram is open.
    			const footerReserve = d.layerName === 'conv_1' ? 70 : 60;

    			const canvasBounds = wholeSvg.node().getBoundingClientRect();
    			width = canvasBounds.width - svgPaddings.left - svgPaddings.right;
    			height = canvasBounds.height - svgPaddings.top - svgPaddings.bottom;
    			intermediateFooterReserved = true;
    			svg.select('g.cnn-group').remove();
    			const detailGroup = svg.append('g').attr('class', 'cnn-group');
    			drawCNN(width, height - footerReserve, detailGroup, nodeMouseOverHandler, nodeMouseLeaveHandler, nodeClickHandler);
    			g = svg.select(`#cnn-layer-group-${curLayerIndex}`).selectAll('g.node-group').nodes();
    			i = nodeIndex;
    			$$invalidate(8, selectedNode.domG = g, selectedNode);
    			$$invalidate(8, selectedNode.domI = i, selectedNode);
    			prepareToEnterIntermediateView(d, g, nodeIndex, curLayerIndex);

    			if (d.layerName === 'conv_1') {
    				drawConv1(curLayerIndex, d, nodeIndex, width, height, intermediateNodeMouseOverHandler, intermediateNodeMouseLeaveHandler, intermediateNodeClicked);
    			} else if (d.layerName === 'output') {
    				drawFlatten(curLayerIndex, d, nodeIndex, width, height);
    			}
    		} else // Quit the layerview
    		if ((d.type === 'conv' || d.layerName === 'output') && isInIntermediateView) {
    			quitIntermediateView(curLayerIndex, g, i);
    		}
    	};

    	const nodeMouseOverHandler = (d, i, g) => {
    		if (isInIntermediateView) {
    			return;
    		}

    		// Highlight the edges
    		let layerIndex = layerIndexDict[d.layerName];

    		let nodeIndex = d.index;
    		let edgeGroup = svg.select('g.cnn-group').select('g.edge-group');
    		edgeGroup.selectAll(`path.edge-${layerIndex}-${nodeIndex}`).raise().transition().ease(d3.easeCubicInOut).duration(400).style('stroke', edgeHoverColor).style('stroke-width', '1').style('opacity', 1);

    		// Highlight its border
    		d3.select(g[i]).select('rect.bounding').classed('hidden', false);

    		// Highlight source's border
    		if (d.inputLinks.length === 1) {
    			let link = d.inputLinks[0];
    			let layerIndex = layerIndexDict[link.source.layerName];
    			let nodeIndex = link.source.index;
    			svg.select(`g#layer-${layerIndex}-node-${nodeIndex}`).select('rect.bounding').classed('hidden', false);
    		} else {
    			svg.select(`g#cnn-layer-group-${layerIndex - 1}`).selectAll('g.node-group').selectAll('rect.bounding').classed('hidden', false);
    		}

    		// Highlight the output text
    		if (d.layerName === 'output') {
    			d3.select(g[i]).select('.output-text').style('opacity', 0.8).style('text-decoration', 'underline');
    		}
    	};

    	const nodeMouseLeaveHandler = (d, i, g) => {
    		if (isInIntermediateView) {
    			return;
    		}

    		// Keep the highlight if user has clicked
    		if (isInActPoolDetailView || (d.layerName !== selectedNode.layerName || d.index !== selectedNode.index)) {
    			let layerIndex = layerIndexDict[d.layerName];
    			let nodeIndex = d.index;
    			let edgeGroup = svg.select('g.cnn-group').select('g.edge-group');
    			edgeGroup.selectAll(`path.edge-${layerIndex}-${nodeIndex}`).transition().ease(d3.easeCubicOut).duration(200).style('stroke', edgeInitColor).style('stroke-width', edgeStrokeWidth).style('opacity', edgeOpacity);
    			d3.select(g[i]).select('rect.bounding').classed('hidden', true);

    			if (d.inputLinks.length === 1) {
    				let link = d.inputLinks[0];
    				let layerIndex = layerIndexDict[link.source.layerName];
    				let nodeIndex = link.source.index;
    				svg.select(`g#layer-${layerIndex}-node-${nodeIndex}`).select('rect.bounding').classed('hidden', true);
    			} else {
    				svg.select(`g#cnn-layer-group-${layerIndex - 1}`).selectAll('g.node-group').selectAll('rect.bounding').classed('hidden', d => d.layerName !== selectedNode.layerName || d.index !== selectedNode.index);
    			}

    			// Dehighlight the output text
    			if (d.layerName === 'output') {
    				d3.select(g[i]).select('.output-text').style('fill', 'black').style('opacity', 1).style('text-decoration', 'none');
    			}
    		}
    	};

    	const relayoutIntermediateView = async (nextWidth, nextHeight) => {
    		const data = selectedNode.data;
    		const nodeIndex = selectedNode.index;
    		const layerIndex = layerIndexDict[selectedNode.layerName];
    		if (!data) return;
    		const token = ++intermediateRelayoutToken;
    		const reopenSoftmax = data.layerName === 'output' && $allowsSoftmaxAnimationStore;
    		const formulaWasVisible = softmaxDetailViewInfo.show || !isInSoftmax && reopenSoftmax;
    		width = nextWidth;
    		height = nextHeight;
    		shouldIntermediateAnimateStore.set(false);
    		allowsSoftmaxAnimationStore.set(false);

    		svg.selectAll('g.intermediate-layer, g.intermediate-layer-overlay, g.intermediate-layer-annotation').each((d, i, groups) => {
    			const group = d3.select(groups[i]);
    			group.selectAll('*').interrupt('move').interrupt('softmax').interrupt('softmax-edge').interrupt();
    			group.interrupt('move').interrupt('softmax').interrupt().remove();
    		});

    		svg.selectAll('defs.overlay-gradient').remove();
    		svg.select('g.underneath').selectAll('*').remove();
    		isInSoftmaxStore.set(false);
    		softmaxDetailViewStore.set({ show: false, logits: [] });
    		svg.select('g.cnn-group').remove();
    		const resizedGroup = svg.append('g').attr('class', 'cnn-group');
    		const footerReserve = data.layerName === 'conv_1' ? 70 : 60;
    		drawCNN(width, height - footerReserve, resizedGroup, nodeMouseOverHandler, nodeMouseLeaveHandler, nodeClickHandler);
    		const groups = svg.select(`#cnn-layer-group-${layerIndex}`).selectAll('g.node-group').nodes();
    		$$invalidate(8, selectedNode.domG = groups, selectedNode);
    		$$invalidate(8, selectedNode.domI = nodeIndex, selectedNode);
    		prepareToEnterIntermediateView(data, groups, nodeIndex, layerIndex);

    		if (data.layerName === 'conv_1') {
    			drawConv1(layerIndex, data, nodeIndex, width, height, intermediateNodeMouseOverHandler, intermediateNodeMouseLeaveHandler, intermediateNodeClicked);
    		} else {
    			drawFlatten(layerIndex, data, nodeIndex, width, height);
    		}

    		if (reopenSoftmax) {
    			// Finish the 500 ms layer movement before restoring the Softmax stage.
    			await new Promise(resolve => setTimeout(resolve, 550));

    			if (token !== intermediateRelayoutToken || !isInIntermediateView || selectedNode.data !== data) return;
    			svg.select('.softmax-symbol').attr('data-detail-hidden', formulaWasVisible ? null : 'true').dispatch('click');
    		}
    	};

    	onMount(async () => {
    		try {
    			// Create SVG
    			wholeSvg = d3.select(overviewComponent).select('#cnn-svg');

    			svg = wholeSvg.append('g').attr('class', 'main-svg').attr('transform', `translate(${svgPaddings.left}, 0)`);
    			svgStore.set(svg);
    			width = Number(wholeSvg.style('width').replace('px', '')) - svgPaddings.left - svgPaddings.right;
    			height = Number(wholeSvg.style('height').replace('px', '')) - svgPaddings.top - svgPaddings.bottom;
    			let cnnGroup = svg.append('g').attr('class', 'cnn-group');
    			let underGroup = svg.append('g').attr('class', 'underneath');
    			let svgYMid = +wholeSvg.style('height').replace('px', '') / 2;

    			detailedViewAbsCoords = {
    				1: [600, 100 + svgYMid - 220 / 2, 490, 290],
    				2: [500, 100 + svgYMid - 220 / 2, 490, 290],
    				3: [700, 100 + svgYMid - 220 / 2, 490, 290],
    				4: [600, 100 + svgYMid - 220 / 2, 490, 290],
    				5: [650, 100 + svgYMid - 220 / 2, 490, 290],
    				6: [850, 100 + svgYMid - 220 / 2, 490, 290],
    				7: [100, 100 + svgYMid - 220 / 2, 490, 290],
    				8: [60, 100 + svgYMid - 220 / 2, 490, 290],
    				9: [200, 100 + svgYMid - 220 / 2, 490, 290],
    				10: [300, 100 + svgYMid - 220 / 2, 490, 290]
    			};

    			// Define global arrow marker end
    			svg.append("defs").append("marker").attr("id", 'marker').attr("viewBox", "0 -5 10 10").attr("refX", 6).attr("refY", 0).attr("markerWidth", 6).attr("markerHeight", 6).attr("orient", "auto").append("path").style('stroke-width', 1.2).style('fill', 'gray').style('stroke', 'gray').attr("d", "M0,-5L10,0L0,5");

    			// Alternative arrow head style for non-interactive annotation
    			svg.append("defs").append("marker").attr("id", 'marker-alt').attr("viewBox", "0 -5 10 10").attr("refX", 6).attr("refY", 0).attr("markerWidth", 6).attr("markerHeight", 6).attr("orient", "auto").append("path").style('fill', 'none').style('stroke', 'gray').style('stroke-width', 2).attr("d", "M-5,-10L10,0L-5,10");

    			await initializeRunCatalog();
    			const dataPath = $trainingDataPathStore;
    			$$invalidate(42, model_name = $model_nameStore);
    			updateSelectedEpoch(model_name);
    			previousModelKey = `${dataPath}|${model_name}`;

    			// Keep configuration switching usable even if this first ONNX load fails.
    			overviewReady = true;

    			// Add timestamp to bypass browser cache
    			const cacheBuster = Date.now();

    			model = await loadTrainedModel(`${dataPath}/${model_name}.onnx?v=${cacheBuster}`);
    			await loadACCTStatistics(dataPath);
    			setCheckpointACCTWeights();
    			cnn = await constructCNN(demoImageURL($imageRootStore, selectedImage, $imageVersionStore), model, model_name, dataPath);
    			$$invalidate(5, loadedModelKey = `${dataPath}|${model_name}`);
    			cnnStore.set(cnn);

    			// Ignore the flatten layer for now
    			let flatten = cnn[cnn.length - 2];

    			cnn.splice(cnn.length - 2, 1);
    			cnn.flatten = flatten;
    			updateCNNLayerRanges();

    			// Create and draw the CNN view
    			drawCNN(width, height, cnnGroup, nodeMouseOverHandler, nodeMouseLeaveHandler, nodeClickHandler);

    			acctResizeObserver = new ResizeObserver(() => {
    					if (isModelLoading || $runLoadingStore) return;
    					if (acctResizeFrame !== undefined) cancelAnimationFrame(acctResizeFrame);

    					acctResizeFrame = requestAnimationFrame(() => {
    						acctResizeFrame = undefined;
    						if (isModelLoading || $runLoadingStore) return;
    						const canvasBounds = wholeSvg.node().getBoundingClientRect();
    						const nextWidth = canvasBounds.width - svgPaddings.left - svgPaddings.right;
    						const nextHeight = canvasBounds.height - svgPaddings.top - svgPaddings.bottom;

    						if (Math.abs(nextWidth - width) > 0.5 || Math.abs(nextHeight - height) > 0.5) {
    							if (isInIntermediateView) {
    								relayoutIntermediateView(nextWidth, nextHeight);
    								return;
    							}

    							if (disableControl) return;

    							// Keep Output and its ACCT connector in the same coordinate system
    							// when the overview changes size; weights and model data stay intact.
    							width = nextWidth;

    							height = nextHeight;
    							svg.select('g.cnn-group').remove();
    							const resizedGroup = svg.append('g').attr('class', 'cnn-group');
    							drawCNN(width, height, resizedGroup, nodeMouseOverHandler, nodeMouseLeaveHandler, nodeClickHandler);
    						} else if (!disableControl) {
    							updateThresholds();
    						}
    					});
    				});

    			acctResizeObserver.observe(wholeSvg.node());
    			acctResizeObserver.observe(overviewComponent.querySelector('.slider-group'));
    			overviewReady = true;
    		} catch(error) {
    			console.error('Failed to initialize the model overview:', error);
    			runErrorStore.set(error.message);
    		} finally {
    			$$invalidate(0, isModelLoading = false);
    		}
    	});

    	// Add new state for image selection modal
    	let showImageSelectionModal = false;

    	let showUploadModal = false;

    	const selectExistingImageClicked = () => {
    		$$invalidate(15, showImageSelectionModal = true);
    	};

    	const uploadNewImageClicked = () => {
    		$$invalidate(16, showUploadModal = true);
    	};

    	const handleImageSelection = async event => {
    		const imageName = event.detail.imageName;
    		$$invalidate(15, showImageSelectionModal = false);

    		// Directly execute the image change logic
    		customImage = false;

    		customImageStore.set(customImage);

    		if (imageName !== selectedImage) {
    			$$invalidate(9, selectedImage = imageName);
    			selectedImageStore.set(imageName);
    			$$invalidate(0, isModelLoading = true);
    			modelColorDomainStore.set(null);

    			try {
    				cnn = await constructCNN(demoImageURL($imageRootStore, selectedImage, $imageVersionStore), model, model_name);
    				let flatten = cnn[cnn.length - 2];
    				cnn.splice(cnn.length - 2, 1);
    				cnn.flatten = flatten;
    				cnnStore.set(cnn);
    				updateCNNLayerRanges();
    				updateCNN();
    			} catch(error) {
    				console.error('Failed to load the selected image:', error);
    			} finally {
    				$$invalidate(0, isModelLoading = false);
    			}
    		}
    	};

    	const handleImageSelectionCanceled = () => {
    		$$invalidate(15, showImageSelectionModal = false);
    	};

    	const handleUploadModalCanceled = () => {
    		$$invalidate(16, showUploadModal = false);
    	};

    	const getImageDisplayName = imageName => {
    		const imageOption = imageOptions.find(img => img.file === imageName);
    		return imageOption ? imageOption.class : imageName;
    	};

    	const handleModalCanceled = event => {
    		// User cancels the modal without a successful image, so we restore the
    		// previous selected image as input
    		$$invalidate(9, selectedImage = event.detail.preImage);
    	};

    	// Handle Image Logistic
    	const handleCustomImage = async event => {
    		// User gives a valid image URL
    		$$invalidate(14, customImageURL = event.detail.url);

    		$$invalidate(0, isModelLoading = true);
    		modelColorDomainStore.set(null);

    		try {
    			cnn = await constructCNN(customImageURL, model, model_name);
    			let flatten = cnn[cnn.length - 2];
    			cnn.splice(cnn.length - 2, 1);
    			cnn.flatten = flatten;
    			cnnStore.set(cnn);
    			let customImageSlot = d3.select(overviewComponent).select('.custom-image').node();
    			drawCustomImage(customImageSlot, cnn[0]);
    			updateCNNLayerRanges();
    			updateCNN();
    		} catch(error) {
    			console.error('Failed to load the uploaded image:', error);
    		} finally {
    			$$invalidate(0, isModelLoading = false);
    		}
    	};

    	function handleExitFromDetiledConvView(event) {
    		if (event.detail.text) {
    			detailedViewNum = undefined;
    			svg.select(`rect#underneath-gateway-${selectedNodeIndex}`).style('opacity', 0);
    			$$invalidate(11, selectedNodeIndex = -1);
    		}
    	}

    	function handleExitFromDetiledPoolView(event) {
    		if (event.detail.text) {
    			quitActPoolDetailView();
    			$$invalidate(12, isExitedFromDetailedView = true);
    		}
    	}

    	function handleExitFromDetiledActivationView(event) {
    		if (event.detail.text) {
    			quitActPoolDetailView();
    			$$invalidate(12, isExitedFromDetailedView = true);
    		}
    	}

    	function handleExitFromDetiledNormalizationView(event) {
    		if (event.detail.text) {
    			quitActPoolDetailView();
    			$$invalidate(12, isExitedFromDetailedView = true);
    		}
    	}

    	function handleExitFromDetiledSoftmaxView(event) {
    		$$invalidate(7, softmaxDetailViewInfo.show = false, softmaxDetailViewInfo);
    		softmaxDetailViewStore.set(softmaxDetailViewInfo);
    	}

    	function select_change_handler() {
    		$model_nameStore = select_value(this);
    		model_nameStore.set($model_nameStore);
    	}

    	const click_handler = () => $$invalidate(6, showLossPopup = true);
    	const input_handler = (control, event) => changeACCTWeight(control.name, event);
    	const close_handler = () => $$invalidate(6, showLossPopup = false);

    	function div17_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			overviewComponent = $$value;
    			$$invalidate(4, overviewComponent);
    		});
    	}

    	function imageselector_show_binding(value) {
    		showImageSelectionModal = value;
    		$$invalidate(15, showImageSelectionModal);
    	}

    	function imageuploader_show_binding(value) {
    		showUploadModal = value;
    		$$invalidate(16, showUploadModal);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[1] & /*$alphaStore, $betaStore, $gammaStore*/ 57344) {
    			 $$invalidate(18, weightControls = [
    				{
    					name: 'alpha',
    					symbol: 'α',
    					value: $alphaStore
    				},
    				{
    					name: 'beta',
    					symbol: 'β',
    					value: $betaStore
    				},
    				{
    					name: 'gamma',
    					symbol: 'γ',
    					value: $gammaStore
    				}
    			].map(control => ({
    				...control,
    				range: ACCT_PARAMETER_RANGES[control.name],
    				percent: getRangePercent(control.value, ACCT_PARAMETER_RANGES[control.name])
    			})));
    		}

    		if ($$self.$$.dirty[0] & /*$model_nameStore*/ 4) {
    			 $$invalidate(42, model_name = $model_nameStore || 'model_best');
    		}

    		if ($$self.$$.dirty[0] & /*isModelLoading*/ 1) {
    			 modelLoadingStore.set(isModelLoading);
    		}

    		if ($$self.$$.dirty[0] & /*$trainingDataPathStore*/ 8 | $$self.$$.dirty[1] & /*model_name*/ 2048) {
    			 (model_nameChanged());
    		}

    		if ($$self.$$.dirty[0] & /*disableControl*/ 2) {
    			 datasetSelectionDisabledStore.set(disableControl);
    		}

    		if ($$self.$$.dirty[1] & /*$imageOptionsStore*/ 4096) {
    			// Display Image 
    			 $$invalidate(17, imageOptions = $imageOptionsStore);
    		}
    	};

    	 (selectedScaleLevelChanged());

    	return [
    		isModelLoading,
    		disableControl,
    		$model_nameStore,
    		$trainingDataPathStore,
    		overviewComponent,
    		loadedModelKey,
    		showLossPopup,
    		softmaxDetailViewInfo,
    		selectedNode,
    		selectedImage,
    		nodeData,
    		selectedNodeIndex,
    		isExitedFromDetailedView,
    		isExitedFromCollapse,
    		customImageURL,
    		showImageSelectionModal,
    		showUploadModal,
    		imageOptions,
    		weightControls,
    		$imageVersionStore,
    		$runLoadingStore,
    		$runErrorStore,
    		$imagePreviewRootStore,
    		$modelColorDomainStore,
    		$availableModelsStore,
    		changeACCTWeight,
    		resetACCTWeights,
    		layerColorScales,
    		featureColorGradient,
    		selectExistingImageClicked,
    		uploadNewImageClicked,
    		handleImageSelection,
    		handleImageSelectionCanceled,
    		handleUploadModalCanceled,
    		getImageDisplayName,
    		handleModalCanceled,
    		handleCustomImage,
    		handleExitFromDetiledConvView,
    		handleExitFromDetiledPoolView,
    		handleExitFromDetiledActivationView,
    		handleExitFromDetiledNormalizationView,
    		handleExitFromDetiledSoftmaxView,
    		model_name,
    		$imageOptionsStore,
    		$gammaStore,
    		$betaStore,
    		$alphaStore,
    		select_change_handler,
    		click_handler,
    		input_handler,
    		close_handler,
    		div17_binding,
    		imageselector_show_binding,
    		imageuploader_show_binding
    	];
    }

    class Overview extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$k, create_fragment$k, safe_not_equal, {}, null, [-1, -1, -1, -1, -1]);
    	}
    }

    /* src\Explainer.svelte generated by Svelte v3.59.2 */

    function create_fragment$l(ctx) {
    	let div;
    	let overview;
    	let current;
    	overview = new Overview({});

    	return {
    		c() {
    			div = element("div");
    			create_component(overview.$$.fragment);
    			attr(div, "id", "explainer");
    			attr(div, "class", "svelte-zlc8sw");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			mount_component(overview, div, null);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(overview.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(overview.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_component(overview);
    		}
    	};
    }

    class Explainer extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$l, safe_not_equal, {});
    	}
    }

    /* src\overview\DatasetSelector.svelte generated by Svelte v3.59.2 */

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	return child_ctx;
    }

    // (35:4) {#each $datasetsStore as dataset (dataset.id)}
    function create_each_block$3(key_1, ctx) {
    	let option;
    	let t_value = /*dataset*/ ctx[8].name + "";
    	let t;
    	let option_value_value;

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*dataset*/ ctx[8].id;
    			option.value = option.__value;
    			this.first = option;
    		},
    		m(target, anchor) {
    			insert(target, option, anchor);
    			append(option, t);
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*$datasetsStore*/ 4 && t_value !== (t_value = /*dataset*/ ctx[8].name + "")) set_data(t, t_value);

    			if (dirty & /*$datasetsStore*/ 4 && option_value_value !== (option_value_value = /*dataset*/ ctx[8].id)) {
    				option.__value = option_value_value;
    				option.value = option.__value;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(option);
    		}
    	};
    }

    // (39:2) {#if message}
    function create_if_block$8(ctx) {
    	let div;
    	let span;
    	let t0;
    	let t1;
    	let button;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div = element("div");
    			span = element("span");
    			t0 = text(/*message*/ ctx[0]);
    			t1 = space();
    			button = element("button");
    			button.textContent = "×";
    			attr(button, "type", "button");
    			attr(button, "aria-label", "Close dataset message");
    			attr(button, "class", "svelte-n2ztag");
    			attr(div, "class", "dataset-message svelte-n2ztag");
    			attr(div, "role", "alert");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, span);
    			append(span, t0);
    			append(div, t1);
    			append(div, button);

    			if (!mounted) {
    				dispose = listen(button, "click", /*click_handler*/ ctx[7]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*message*/ 1) set_data(t0, /*message*/ ctx[0]);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function create_fragment$m(ctx) {
    	let div;
    	let select;
    	let option;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let select_value_value;
    	let select_disabled_value;
    	let t1;
    	let mounted;
    	let dispose;
    	let each_value = /*$datasetsStore*/ ctx[2];
    	const get_key = ctx => /*dataset*/ ctx[8].id;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$3(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$3(key, child_ctx));
    	}

    	let if_block = /*message*/ ctx[0] && create_if_block$8(ctx);

    	return {
    		c() {
    			div = element("div");
    			select = element("select");
    			option = element("option");
    			option.textContent = "Select dataset";

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t1 = space();
    			if (if_block) if_block.c();
    			option.__value = "";
    			option.value = option.__value;
    			option.disabled = true;
    			attr(select, "id", "dataset-select");
    			attr(select, "aria-label", "Select dataset");
    			attr(select, "title", "Select dataset");
    			select.disabled = select_disabled_value = /*$runLoadingStore*/ ctx[3] || /*$modelLoadingStore*/ ctx[4] || /*$datasetSelectionDisabledStore*/ ctx[5];
    			attr(select, "class", "svelte-n2ztag");
    			attr(div, "class", "dataset-menu svelte-n2ztag");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, select);
    			append(select, option);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(select, null);
    				}
    			}

    			select_option(select, /*$selectedDatasetStore*/ ctx[1]?.id || '');
    			append(div, t1);
    			if (if_block) if_block.m(div, null);

    			if (!mounted) {
    				dispose = listen(select, "change", /*choose*/ ctx[6]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*$datasetsStore*/ 4) {
    				each_value = /*$datasetsStore*/ ctx[2];
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, select, destroy_block, create_each_block$3, null, get_each_context$3);
    			}

    			if (dirty & /*$selectedDatasetStore, $datasetsStore*/ 6 && select_value_value !== (select_value_value = /*$selectedDatasetStore*/ ctx[1]?.id || '')) {
    				select_option(select, /*$selectedDatasetStore*/ ctx[1]?.id || '');
    			}

    			if (dirty & /*$runLoadingStore, $modelLoadingStore, $datasetSelectionDisabledStore*/ 56 && select_disabled_value !== (select_disabled_value = /*$runLoadingStore*/ ctx[3] || /*$modelLoadingStore*/ ctx[4] || /*$datasetSelectionDisabledStore*/ ctx[5])) {
    				select.disabled = select_disabled_value;
    			}

    			if (/*message*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$8(ctx);
    					if_block.c();
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			if (if_block) if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$l($$self, $$props, $$invalidate) {
    	let $selectedDatasetStore;
    	let $datasetsStore;
    	let $runLoadingStore;
    	let $modelLoadingStore;
    	let $datasetSelectionDisabledStore;
    	component_subscribe($$self, selectedDatasetStore, $$value => $$invalidate(1, $selectedDatasetStore = $$value));
    	component_subscribe($$self, datasetsStore, $$value => $$invalidate(2, $datasetsStore = $$value));
    	component_subscribe($$self, runLoadingStore, $$value => $$invalidate(3, $runLoadingStore = $$value));
    	component_subscribe($$self, modelLoadingStore, $$value => $$invalidate(4, $modelLoadingStore = $$value));
    	component_subscribe($$self, datasetSelectionDisabledStore, $$value => $$invalidate(5, $datasetSelectionDisabledStore = $$value));
    	let message = '';

    	async function choose(event) {
    		const menu = event.currentTarget;
    		const id = menu.value;
    		$$invalidate(0, message = '');

    		try {
    			await selectDataset(id);
    		} catch(error) {
    			const dataset = $datasetsStore.find(item => item.id === id);

    			$$invalidate(0, message = dataset && !dataset.available
    			? `${dataset.name} 的训练结果尚未导入，请完成训练并执行 deploy_frontend.py。`
    			: error.message);
    		} finally {
    			// A failed or superseded switch must not leave the menu showing a
    			// different dataset from the model, metrics and images on the page.
    			menu.value = $selectedDatasetStore?.id || '';
    		}
    	}

    	const click_handler = () => $$invalidate(0, message = '');

    	return [
    		message,
    		$selectedDatasetStore,
    		$datasetsStore,
    		$runLoadingStore,
    		$modelLoadingStore,
    		$datasetSelectionDisabledStore,
    		choose,
    		click_handler
    	];
    }

    class DatasetSelector extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$l, create_fragment$m, safe_not_equal, {});
    	}
    }

    /* src\Header.svelte generated by Svelte v3.59.2 */

    function create_fragment$n(ctx) {
    	let div3;
    	let div0;
    	let datasetselector;
    	let t0;
    	let div2;
    	let current;
    	datasetselector = new DatasetSelector({});

    	return {
    		c() {
    			div3 = element("div");
    			div0 = element("div");
    			create_component(datasetselector.$$.fragment);
    			t0 = space();
    			div2 = element("div");
    			div2.innerHTML = `<div id="logo-text" class="svelte-1s16tbd">AdaptMatch-Vis</div>`;
    			attr(div0, "class", "dataset-switcher svelte-1s16tbd");
    			attr(div2, "id", "logo");
    			attr(div2, "class", "svelte-1s16tbd");
    			attr(div3, "id", "header");
    			attr(div3, "class", "svelte-1s16tbd");
    		},
    		m(target, anchor) {
    			insert(target, div3, anchor);
    			append(div3, div0);
    			mount_component(datasetselector, div0, null);
    			append(div3, t0);
    			append(div3, div2);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(datasetselector.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(datasetselector.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div3);
    			destroy_component(datasetselector);
    		}
    	};
    }

    class Header extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$n, safe_not_equal, {});
    	}
    }

    /* src\App.svelte generated by Svelte v3.59.2 */

    function create_fragment$o(ctx) {
    	let div;
    	let header;
    	let t;
    	let explainer;
    	let current;
    	header = new Header({});
    	explainer = new Explainer({});

    	return {
    		c() {
    			div = element("div");
    			create_component(header.$$.fragment);
    			t = space();
    			create_component(explainer.$$.fragment);
    			attr(div, "id", "app-page");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			mount_component(header, div, null);
    			append(div, t);
    			mount_component(explainer, div, null);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);
    			transition_in(explainer.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(header.$$.fragment, local);
    			transition_out(explainer.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_component(header);
    			destroy_component(explainer);
    		}
    	};
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$o, safe_not_equal, {});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {}
    });

    return app;

}(d3v7));
//# sourceMappingURL=bundle.js.map
