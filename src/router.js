// ============================================================
// TraderPro — Simple Hash Router
// ============================================================

export class Router {
    constructor() {
        this.routes = {};
        this.currentPage = 'dashboard';
        window.addEventListener('hashchange', () => this.handleRoute());
    }

    register(page, handler) {
        this.routes[page] = handler;
    }

    navigate(page) {
        window.location.hash = page;
    }

    handleRoute() {
        const hash = window.location.hash.slice(1) || 'dashboard';
        this.currentPage = hash;
        const handler = this.routes[hash];
        if (handler) handler(hash);
    }

    getCurrentPage() {
        return window.location.hash.slice(1) || 'dashboard';
    }
}
