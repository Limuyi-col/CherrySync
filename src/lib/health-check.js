import http from "node:http";
import https from "node:https";

export function performHealthCheck(url, options = {}) {
  return new Promise((resolve) => {
    const timeout = options.timeout ?? 10000;
    const maxRedirects = options.maxRedirects ?? 5;
    const startTime = Date.now();

    function doRequest(currentUrl, redirectsLeft) {
      const parsed = new URL(currentUrl);
      const transport = parsed.protocol === "https:" ? https : http;

      const req = transport.request(
        {
          hostname: parsed.hostname,
          port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
          path: parsed.pathname + parsed.search,
          method: "GET",
          timeout,
          rejectUnauthorized: false,
        },
        (res) => {
          if (
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location &&
            redirectsLeft > 0
          ) {
            req.destroy();
            doRequest(
              new URL(res.headers.location, currentUrl).toString(),
              redirectsLeft - 1,
            );
            return;
          }

          let body = "";
          res.on("data", (chunk) => {
            body += chunk.toString();
            if (body.length > 5000) {
              body = body.slice(0, 5000) + "...";
              res.destroy();
            }
          });
          res.on("end", () => {
            const duration = Date.now() - startTime;
            const healthy = res.statusCode >= 200 && res.statusCode < 400;
            resolve({
              healthy,
              statusCode: res.statusCode,
              duration,
              body: body.slice(0, 500),
            });
          });
        },
      );

      req.on("timeout", () => {
        req.destroy();
        resolve({
          healthy: false,
          statusCode: null,
          duration: Date.now() - startTime,
          error: `Request timed out after ${timeout}ms`,
        });
      });

      req.on("error", (err) => {
        resolve({
          healthy: false,
          statusCode: null,
          duration: Date.now() - startTime,
          error: err.message,
        });
      });

      req.end();
    }

    doRequest(url, maxRedirects);
  });
}
