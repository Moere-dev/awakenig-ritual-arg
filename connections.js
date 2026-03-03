// ============================================================
//  CONNECTIONS DROPDOWN — Quick navigation to visited pages
//  Tracks visited locations and provides German-friendly names
// ============================================================
var CONNECTIONS = (function() {
    'use strict';

    // Page definitions with friendly German names
    var PAGES = {
        'index':         { name: 'Terminal',        file: 'index.html' },
        's33l3nreich':   { name: 'Dr. Watson login', file: 's33l3nreich.html' },
        'aufzeichnung':  { name: 'Aufzeichnung',    file: 'aufzeichnung.html' },
        'fragment0':     { name: 'Fragment #0',     file: 'fragment0.html' }
    };

    var LS_KEY = 'arg-visited';
    var dropdown, menu;
    var isOpen = false;

    // Get current page ID from filename
    function getCurrentPageId() {
        var path = window.location.pathname;
        var filename = path.split('/').pop() || 'index.html';
        for (var id in PAGES) {
            if (PAGES[id].file === filename) {
                return id;
            }
        }
        return null;
    }

    // Mark current page as visited
    function markVisited() {
        var pageId = getCurrentPageId();
        if (!pageId) return;

        var visited = getVisited();
        if (visited.indexOf(pageId) === -1) {
            visited.push(pageId);
            localStorage.setItem(LS_KEY, JSON.stringify(visited));
        }
    }

    // Get list of visited page IDs
    function getVisited() {
        try {
            var data = localStorage.getItem(LS_KEY);
            return data ? JSON.parse(data) : [];
        } catch(e) {
            return [];
        }
    }

    // Create dropdown HTML
    function createDropdown() {
        var container = document.createElement('div');
        container.className = 'connections-dropdown';

        var trigger = document.createElement('button');
        trigger.className = 'conn-trigger';
        trigger.innerHTML = '<span class="conn-arrow">▼</span> VERBINDUNGEN';
        trigger.setAttribute('aria-expanded', 'false');

        var menu = document.createElement('div');
        menu.className = 'conn-menu';
        menu.id = 'conn-menu';

        container.appendChild(trigger);
        container.appendChild(menu);

        return { container, trigger, menu };
    }

    // Render menu items
    function renderMenu() {
        if (!menu) return;

        var visited = getVisited();
        var currentPageId = getCurrentPageId();
        menu.innerHTML = '';

        if (visited.length === 0) {
            var empty = document.createElement('div');
            empty.className = 'conn-empty';
            empty.textContent = 'Keine Verbindungen';
            menu.appendChild(empty);
            return;
        }

        var list = document.createElement('div');
        list.className = 'conn-list';

        visited.forEach(function(pageId) {
            var page = PAGES[pageId];
            if (!page) return;

            var item = document.createElement('a');
            item.className = 'conn-item';
            if (pageId === currentPageId) {
                item.classList.add('conn-current');
            }
            item.href = page.file + '?nav=1';
            item.innerHTML = '<span class="conn-arrow-right">→</span> ' + page.name;
            list.appendChild(item);
        });

        menu.appendChild(list);
    }

    // Toggle dropdown
    function toggle() {
        isOpen = !isOpen;
        menu.classList.toggle('conn-open', isOpen);
        if (dropdown) {
            dropdown.classList.toggle('conn-open', isOpen);
        }
    }

    // Close dropdown
    function close() {
        isOpen = false;
        menu.classList.remove('conn-open');
        if (dropdown) {
            dropdown.classList.remove('conn-open');
        }
    }

    // Initialize
    function init(targetSelector) {
        targetSelector = targetSelector || '.status-bar .sb-right';
        var target = document.querySelector(targetSelector);

        if (!target) {
            // If no status bar, create a floating dropdown
            var floating = document.createElement('div');
            floating.className = 'conn-floating';
            document.body.appendChild(floating);
            target = floating;
        }

        var result = createDropdown();
        dropdown = result.container;
        var trigger = result.trigger;
        menu = result.menu;

        if (target.querySelector('.connections-dropdown')) {
            // Already exists
            return;
        }

        if (target.classList.contains('sb-right')) {
            // Insert into status bar
            target.insertBefore(dropdown, target.firstChild);
        } else {
            // Use floating container
            target.appendChild(dropdown);
        }

        renderMenu();

        // Event listeners
        trigger.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggle();
            if (typeof SFXCore !== 'undefined' && SFXCore.typeClick) {
                SFXCore.typeClick();
            }
        });

        // Close on click outside
        document.addEventListener('click', function(e) {
            if (isOpen && !dropdown.contains(e.target)) {
                close();
            }
        });

        // Close on Escape
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && isOpen) {
                close();
            }
        });

        // Track visit
        markVisited();
    }

    // Refresh menu (call after visiting new page)
    function refresh() {
        renderMenu();
    }

    // Public API
    return {
        init: init,
        refresh: refresh,
        getVisited: getVisited,
        PAGES: PAGES
    };
})();