import type {
  CloudFrontHeaders,
  CloudFrontRequest,
  CloudFrontRequestEvent,
  CloudFrontResultResponse,
} from "aws-lambda";
import { createApp } from "./app";

const app = createApp();

function createRequestUrl(request: CloudFrontRequest) {
  const hostHeader = request.headers.host?.[0]?.value ?? "local.jobseek";
  const protocol = request.headers["x-forwarded-proto"]?.[0]?.value ?? "https";
  const queryString = request.querystring ? `?${request.querystring}` : "";
  return `${protocol}://${hostHeader}${request.uri}${queryString}`;
}

function toFetchHeaders(request: CloudFrontRequest) {
  const headers = new Headers();

  for (const [headerKey, headerValues] of Object.entries(request.headers)) {
    for (const header of headerValues ?? []) {
      headers.append(headerKey, header.value);
    }
  }

  const clientIp = request.clientIp;
  if (clientIp) {
    const forwardedFor = headers.get("x-forwarded-for");
    headers.set(
      "x-forwarded-for",
      forwardedFor ? `${clientIp}, ${forwardedFor}` : clientIp
    );
    if (!headers.has("x-real-ip")) {
      headers.set("x-real-ip", clientIp);
    }
  }

  return headers;
}

function decodeRequestBody(
  request: CloudFrontRequest
): string | Uint8Array | undefined {
  if (!request.body || !request.body.data) {
    return undefined;
  }

  const body = request.body;
  const encoding = body.encoding ?? "text";

  if (encoding === "base64") {
    return Buffer.from(body.data, "base64");
  }

  return body.data;
}

function isTextContent(contentType: string | null) {
  if (!contentType) {
    return false;
  }

  const textTypes = ["text/", "application/json", "application/javascript", "application/xml", "application/x-www-form-urlencoded"];
  return textTypes.some((type) => contentType.toLowerCase().startsWith(type));
}

function toCloudFrontHeaders(headers: Headers): CloudFrontHeaders {
  const cfHeaders: CloudFrontHeaders = {};

  headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (lowerKey === "set-cookie") {
      // handled separately via getSetCookie
      return;
    }

    if (!cfHeaders[lowerKey]) {
      cfHeaders[lowerKey] = [];
    }

    cfHeaders[lowerKey].push({ key, value });
  });

  const getSetCookie = (headers as Headers & {
    getSetCookie?: () => string[];
  }).getSetCookie;

  if (typeof getSetCookie === "function") {
    const cookies = getSetCookie();
    if (cookies.length > 0) {
      cfHeaders["set-cookie"] = cookies.map((cookie) => ({
        key: "Set-Cookie",
        value: cookie,
      }));
    }
  } else if (headers.has("set-cookie")) {
    const cookieHeader = headers.get("set-cookie");
    if (cookieHeader) {
      cfHeaders["set-cookie"] = cookieHeader.split(",").map((cookie) => ({
        key: "Set-Cookie",
        value: cookie.trim(),
      }));
    }
  }

  return cfHeaders;
}

export async function handler(
  event: CloudFrontRequestEvent
): Promise<CloudFrontResultResponse> {
  try {
    const request = event.Records[0].cf.request;
    const url = createRequestUrl(request);
    const headers = toFetchHeaders(request);
    const body = decodeRequestBody(request);

    const init: RequestInit = {
      method: request.method,
      headers,
    };

    if (body !== undefined && request.method !== "GET" && request.method !== "HEAD") {
      init.body = body;
    }

    const response = await app.fetch(url, init);
    const responseHeaders = toCloudFrontHeaders(response.headers);
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type");
    const textResponse = isTextContent(contentType);

    return {
      status: response.status.toString(),
      statusDescription: response.statusText || `${response.status}`,
      headers: responseHeaders,
      body: textResponse ? buffer.toString("utf8") : buffer.toString("base64"),
      bodyEncoding: textResponse ? "text" : "base64",
    };
  } catch (error) {
    console.error("Failed to handle Lambda@Edge request", error);
    return {
      status: "500",
      statusDescription: "Internal Server Error",
      headers: {
        "content-type": [
          { key: "Content-Type", value: "application/json; charset=utf-8" },
        ],
      },
      body: JSON.stringify({ error: "Internal Server Error" }),
      bodyEncoding: "text",
    };
  }
}
