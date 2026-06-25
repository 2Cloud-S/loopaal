import { createHash, createHmac } from "node:crypto";
import { config } from "./config.ts";

type AttributeValue = { S?: string; N?: string; BOOL?: boolean; NULL?: boolean; M?: Record<string, AttributeValue>; L?: AttributeValue[] };

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value).digest();
}

function signingKey(secret: string, date: string, region: string) {
  return hmac(hmac(hmac(hmac(`AWS4${secret}`, date), region), "dynamodb"), "aws4_request");
}

function amzDate(date = new Date()) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function toAttr(value: unknown): AttributeValue {
  if (value === null || value === undefined) return { NULL: true };
  if (typeof value === "string") return { S: value };
  if (typeof value === "number") return { N: String(value) };
  if (typeof value === "boolean") return { BOOL: value };
  if (Array.isArray(value)) return { L: value.map(toAttr) };
  if (typeof value === "object") return { M: Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, toAttr(v)])) };
  return { S: String(value) };
}

function fromAttr(attr: AttributeValue): unknown {
  if ("S" in attr) return attr.S || "";
  if ("N" in attr) return Number(attr.N || 0);
  if ("BOOL" in attr) return Boolean(attr.BOOL);
  if ("NULL" in attr) return null;
  if ("L" in attr) return (attr.L || []).map(fromAttr);
  if ("M" in attr) return Object.fromEntries(Object.entries(attr.M || {}).map(([k, v]) => [k, fromAttr(v)]));
  return undefined;
}

export function marshal(item: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(item).filter(([, v]) => v !== undefined).map(([k, v]) => [k, toAttr(v)]));
}

export function unmarshal(item: Record<string, AttributeValue>) {
  return Object.fromEntries(Object.entries(item).map(([k, v]) => [k, fromAttr(v)]));
}

export async function dynamoRequest<T>(target: string, payload: Record<string, unknown>): Promise<T> {
  const host = `dynamodb.${config.aws.region}.amazonaws.com`;
  const endpoint = `https://${host}/`;
  const body = JSON.stringify(payload);
  const timestamp = amzDate();
  const date = timestamp.slice(0, 8);
  const canonicalHeaders = `content-type:application/x-amz-json-1.0\nhost:${host}\nx-amz-date:${timestamp}\nx-amz-target:${target}\n`;
  const signedHeaders = "content-type;host;x-amz-date;x-amz-target";
  const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${hash(body)}`;
  const credentialScope = `${date}/${config.aws.region}/dynamodb/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${hash(canonicalRequest)}`;
  const signature = createHmac("sha256", signingKey(config.aws.secretAccessKey, date, config.aws.region)).update(stringToSign).digest("hex");
  const headers: Record<string, string> = {
    "content-type": "application/x-amz-json-1.0",
    "x-amz-date": timestamp,
    "x-amz-target": target,
    authorization: `AWS4-HMAC-SHA256 Credential=${config.aws.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  };
  if (config.aws.sessionToken) headers["x-amz-security-token"] = config.aws.sessionToken;
  const response = await fetch(endpoint, { method: "POST", headers, body });
  if (!response.ok) throw new Error(`DynamoDB ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}
