"use strict"
const version = '0.0.10';
const appCache = location.pathname.split("/").slice(1, -1).join("/") + "#"; // Unique across origin (Current Path)
const versionedCache = appCache + version; // Unique across versions
const sharedCache = appCache + "shared"
const staticCache = versionedCache + '/static';
const filesToCache = [
    '.',
    './index.html',
    './glMatrix.js',
    './index.js',
    './touchlistener.js',
    './manifest.json',
    './rust-rendering/rendering.js',
];
// Start the service worker and cache all of the app's content
self.addEventListener('install', function (e) {
    e.waitUntil(
        caches.open(staticCache).then(function (cache) {
            return cache.addAll(filesToCache);
        }).then(() => self.skipWaiting()));
});

self.addEventListener('activate', function (event) {
    console.log("Running new service worker " + versionedCache);
    return event.waitUntil(
        caches.keys().then(function (cacheNames) {
            return Promise.all(
                cacheNames.filter(function (cacheName) {
                    return (cacheName.startsWith(appCache) && !(cacheName.startsWith(versionedCache) || cacheName.startsWith(sharedCache)))
                }).map(function (cacheName) {
                    return caches.delete(cacheName);
                })
            ).then(() => self.clients.claim());
        })
    );
});
function urlIn(url, list) {
    for (let file of list) {
        let ourl = new URL(file, location.href);
        if (ourl.hostname + ourl.pathname === url.hostname + url.pathname) {
            return true;
        }
    }
    return false;
}
self.addEventListener('fetch', function (event) {
    const url = new URL(event.request.url);
    if (event.request.method.toUpperCase() === "GET") {
        if (urlIn(url, filesToCache)) { // Static Cache

            event.respondWith(caches.open(staticCache).then(cache => cache.match(event.request)));
        }
        else { // Foreign Cache
            event.respondWith(fetch(event.request));
        }
    }
});