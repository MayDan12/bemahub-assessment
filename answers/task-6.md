# Task 6 — Infrastructure

## Incident 1 — the invisible deploy

I first check the deployed commit or image digest against the commit that contains the fix. This rules out a green build or deployment that did not actually publish the intended revision. I then inspect the browser's loaded asset URLs and source maps, hard-refresh with the cache disabled, and compare the response headers and HTML with a private window; this separates browser cache from an origin or CDN cache. Next I check the CDN and reverse-proxy cache status and purge only the affected assets if needed. Finally I verify that the request is reaching the expected environment and replica, because a colleague may be routed to a different deployment, region, or feature-flag state.

## Incident 2 — 502 after deploy

I start with the proxy and application logs at the same timestamp. That tells me whether the 502 is a connection refusal, a timeout, or an upstream process crash. I check the container health status, listening port, and startup logs, then compare the deployed configuration names with the application's required environment variables. A newly read configuration value commonly causes startup failure when it is missing, malformed, or named differently in production; I confirm this by inspecting the non-secret variable presence and validating the configuration at startup.

I then make a request from inside the network to the upstream service and check DNS/service discovery, proxy target, and TLS settings. This rules out a bad route or an incompatible protocol. Finally I compare the previous image and configuration, roll back if the previous version responds, and add a startup health check plus explicit configuration validation so the next deploy fails before traffic is routed.

## Incident 3 — the vanishing change

The running container is ephemeral. Installing a tool interactively changed only that container's writable layer, not the image or the source-controlled deployment definition. The next deploy created a fresh container from the original image, so the tool and the manual fix disappeared as designed.

The durable change should be made in the Dockerfile or image build configuration, committed, built, scanned, and deployed through the normal pipeline. If the tool is only needed for debugging, I would use an approved debug image or an ephemeral sidecar instead of modifying the application container. Any application fix belongs in source control with a test and a new image, not in a live shell session.
