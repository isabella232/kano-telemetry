import { EventEmitter, subscribeDOM, Disposables } from '@kano/common/index.js';

const NAMES = Object.freeze({
    EXCEPTION: 'Exception',
    METRIC: 'Metric',
    TRACE: 'Trace',
    PAGE_VIEW: 'PageView',
});

export class TelemetryClient {
    constructor(opts = {}) {
        this._onDidTrackEvent = new EventEmitter();
        this.setScope(opts.scope);
        this._disposables = new Disposables();
        this._disposables.push(this._onDidTrackEvent);
        this._errorEmitter = window;
    }
    get onDidTrackEvent() {
        return this._onDidTrackEvent.event;
    }
    setScope(scope) {
        this._scope = scope;
    }
    collectExceptions() {
        this._collectsExceptions = true;
        subscribeDOM(this._errorEmitter, 'error', (e) => {
            if (e.error) {
                this.trackException({ exception: e.error });
            } else {
                this.trackException({
                    exception: new Error(e.message),
                });
            }
        }, null, this._disposables);
    }
    trackEvent(opts = {}) {
        if (!opts.name) {
            return;
        }
        let scope = opts.scope || [];
        scope = Array.isArray(scope) ? scope : [scope];
        if (this._scope) {
            scope.unshift(this._scope);
        }
        this._onDidTrackEvent.fire({
            name: opts.name,
            date: new Date(),
            scope,
            properties: opts.properties || {},
        });
    }
    trackException(opts = {}) {
        if (!opts.exception) {
            return;
        }
        if (opts.exception instanceof Error) {
            this.trackEvent({
                name: NAMES.EXCEPTION,
                properties: {
                    name: opts.exception.name,
                    message: opts.exception.message,
                    stack: opts.exception.stack,
                },
            });
        } else if (typeof opts.exception === 'string') {
            const errInstance = new Error(opts.exception);
            this.trackEvent({
                name: NAMES.EXCEPTION,
                properties: {
                    name: errInstance.name,
                    message: errInstance.message,
                    stack: errInstance.stack || '',
                },
            });
        }
    }
    conditionalTrackException(passedObject, contitionalProperties, errorLabel) {
        let currentProperty = null;
        let propertiesExist = true;
        contitionalProperties.forEach((cp) => {
            const object = currentProperty ? currentProperty : passedObject;
            if (propertiesExist && object.hasOwnProperty(cp)) {
                currentProperty = object[cp]
            } else {
              propertiesExist = false;
           }
        })
        
        if (propertiesExist) {
            this.trackException({exception: new Error(`${errorLabel} for id: ${currentProperty}`)})
        } else {
            this.trackException({exception: new Error(`${errorLabel}`)});
        }
    }
    trackMetric(opts = {}) {
        if (!opts.name) {
            return;
        }
        this.trackEvent({
            name: NAMES.METRIC,
            properties: {
                name: opts.name,
                value: opts.value,
            },
        });
    }
    trackTrace(opts = {}) {
        if (!opts.message) {
            return;
        }
        this.trackEvent({
            name: NAMES.TRACE,
            properties: {
                message: opts.message,
            },
        });
    }
    trackPageView(opts = {}) {
        if (!opts.page) {
            return;
        }
        this.trackEvent({
            name: NAMES.PAGE_VIEW,
            properties: {
                page: opts.page,
                previousPage: this._prevPage ? this._prevPage : null,
                duration: this._prevPageTimestamp ? Date.now() - this._prevPageTimestamp : null,
            },
        });
        this._prevPage = opts.page;
        this._prevPageTimestamp = Date.now();
    }
    mount(client) {
        return client.onDidTrackEvent(event => this.trackEvent(event));
    }
    dispose() {
        this._disposables.dispose();
    }
}

export default TelemetryClient;
