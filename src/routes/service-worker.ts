import { setupServiceWorker } from "@builder.io/qwik-city/service-worker";
import type { PrecacheEntry } from "workbox-precaching";
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";

import { NavigationRoute, registerRoute } from "workbox-routing";

const assets = [...publicDirAssets, ...emittedAssets];

cleanupOutdatedCaches();

precacheAndRoute(
  urlsToEntries([...routes.map((r) => r.pathname), ...assets], manifestHash)
);

// should be registered after precacheAndRoute
for (const route of routes) {
  registerRoute(
    new NavigationRoute(createHandlerBoundToURL(route.pathname), {
      allowlist: [route.pattern],
    })
  );
}

setupServiceWorker();

addEventListener("install", () => self.skipWaiting());

addEventListener("activate", () => self.clients.claim());

const base = "/build/"; // temp, it should be dynamic based on the build
const qprefetchEvent = new MessageEvent<ServiceWorkerMessage>("message", {
  data: {
    type: "qprefetch",
    base,
    links: routes.map((route) => route.pathname),
    bundles: appBundles.map((appBundle) => appBundle[0]),
  },
});

self.dispatchEvent(qprefetchEvent);

function urlsToEntries(urls: string[], hash: string): PrecacheEntry[] {
  const matcher = /^build\/q-([a-f0-9]{8})\./;
  return urls.map((url) => {
    // we should think about enabling this https://github.com/GoogleChrome/workbox/issues/2024
    // revision: hash
    const match = url.match(matcher);
    return {
      url,
      revision: `${match ? match[1] : hash}`,
    };
  });
}

declare const self: ServiceWorkerGlobalScope;

export type AppSymbols = Map<string, string>;
export type AppBundle =
  | [bundleName: string, importedBundleIds: number[]]
  | [
      bundleName: string,
      importedBundleIds: number[],
      symbolHashesInBundle: string[],
    ];

export type LinkBundle = [routePattern: RegExp, bundleIds: number[]];

export interface QPrefetchData {
  links?: string[];
  bundles?: string[];
  symbols?: string[];
}

export interface QPrefetchMessage extends QPrefetchData {
  type: "qprefetch";
  base: string;
}

export type ServiceWorkerMessage = QPrefetchMessage;

export interface ServiceWorkerMessageEvent {
  data: ServiceWorkerMessage;
}
declare const appBundles: AppBundle[];

declare const publicDirAssets: string[];
declare const emittedAssets: string[];
declare const routes: { pathname: string; pattern: RegExp }[];
declare const manifestHash: string;
